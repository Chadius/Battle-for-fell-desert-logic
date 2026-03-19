# The Battle of Fell Desert — Game Specification

This document describes the technical requirements, current capabilities, known gaps, and phased
implementation plan for the game logic layer. It is intended to be read alongside `CLAUDE.md`
(code-style conventions) and to serve as the primary reference when implementing new features.

To auto-load this file into Claude's context, add `@SPEC.md` to `CLAUDE.md`.

---

## Game Concept

The Battle of Fell Desert is a turn-based tactical strategy game. Players control a squad of
squaddies on a grid map, taking turns against enemy and ally squads. The logic layer is
engine-agnostic: it produces and consumes pure data so any rendering engine can display the state.

A **mission** is a self-contained battle with a map, squaddies, objectives, and turn structure.
The mission ends when all objectives are resolved or a failure condition is met.

---

## Architecture Overview

The system follows a layered pattern:

```
Engine Layer       MissionEngine — receives player input, queues results, checks end state
Manager Layer      MissionManager, InBattleSquaddieManager, SquaddieActionManager, etc.
Collection Layer   InBattleSquaddieCollection, SquaddieActionCollection, CoordinateMapCollection, etc.
Data Layer         InBattleSquaddie, SquaddieAction, CoordinateMap, Squad, SquaddieItem, etc.
```

Key principle: **Data Objects are immutable**. Mutations produce a new clone. Managers hold state;
Collections are the equivalent of in-memory tables; Data Objects are pure value types.

### Domain Folders Under `src/`

| Folder                  | Purpose                                                         |
| ----------------------- | --------------------------------------------------------------- |
| `squaddie/inBattle/`    | In-mission character state (HP, action points, conditions)      |
| `squaddie/outOfBattle/` | Static character definition (attributes, action list)           |
| `squaddieAction/`       | Action definitions, targeting, calculation, application         |
| `squad/`                | Squad groupings and roles                                       |
| `squaddieItem/`         | Equipment and passive bonuses                                   |
| `affiliation/`          | Team constants (PLAYER, ALLY, ENEMY, NONE) and friendship rules |
| `proficiency/`          | Attribute scores, proficiency levels, condition types           |
| `coordinateMap/`        | Grid map, terrain, pathfinding adapter                          |
| `aStarSearch/`          | Generic A\* implementation                                      |
| `priorityQueue/`        | Min-heap used by A\*                                            |
| `degreesOfSuccess/`     | Hit probability (CRITICAL / SUCCESS / FAILURE / BOTCH)          |
| `mission/`              | MissionEngine, MissionManager, turn state, objectives, history  |

---

## Implemented Systems

### Characters (Squaddies)

- **Out-of-battle definition**: static attributes (BODY/MIND/SOUL scores), max HP, movement
  properties, proficiency levels (UNTRAINED → LEGENDARY), action list, affiliation, items held.
- **In-battle state**: current HP, remaining action points (default 3 per turn), active conditions,
  items used in this mission.
- Lookup by both in-battle ID and out-of-battle ID via `IdConverterService`.

### Actions and Combat

- Action definitions carry: attribute used, targeting profile, proficiency type, and four outcome
  tables (CRITICAL / SUCCESS / FAILURE / BOTCH), each specifying effects on actor and target.
- **Effects** include: spend/restore action points, deal damage, heal, apply/dispel/treat conditions,
  move to a destination.
- **Hit calculation**: actor rolls 2d6, adds proficiency bonus and attribute modifier, subtracts
  target defense; result maps to a degree of success.
- `SquaddieActionForecastCalculator` computes probability distributions (out of 36) for each
  outcome before committing.
- `SquaddieActionResultCalculator` commits an action given actual dice rolls.
- `ApplyResultService` writes calculated results back into in-battle state.
- Undo support: `SquaddieActionResultReverse` reverses the last undoable action.

### Movement and Pathfinding

- Grid-based 2D map with per-cell movement cost and walkability.
- A\* pathfinding via `AStarSearchService` + `CoordinateMapAStarAdapter`.
- Multiple movement types: WALK, JUMP, PHASE.
- Path is expressed as ordered `CoordinateMovePathStep` records.
- Squaddies block movement by default; the adapter supports `stopSearchOnSquaddie` flag.

### Targeting

- Range modes: MELEE (adjacent) and RANGED.
- Area shapes: BLOOM (single tile), LINE, CONE (constants defined; area expansion is per action).
- Affiliation filters: target self, friends, or foes; determined by `SquaddieAffiliationService`.
- `SquaddieActionValidationService` confirms a proposed target is legal before acting.

### Turn Structure

Phases cycle in order:

```
TURN_START
  PLAYER_TURN_START → PLAYER_TURN → PLAYER_TURN_END
  ALLY_TURN_START   → ALLY_TURN   → ALLY_TURN_END
  ENEMY_TURN_START  → ENEMY_TURN  → ENEMY_TURN_END
  NONE_AFFILIATION_TURN_START → NONE_AFFILIATION_TURN → NONE_AFFILIATION_TURN_END
TURN_END
```

`MissionTurnService` advances phases, resets action points for the newly-active affiliation, and
skips phases for affiliations that have no living squaddies.

During the PLAYER_TURN_START phase, the engine restores action points for all Player Affiliated squaddies.
If there are no Player Affiliated squaddies, the Player-based phases are skipped entirely.

Squaddie Conditions give effects either immediately or at the start of the phase, but the duration ticks down at the end
of the phase. For example, a bleed effect for a Player squaddie would reduce hit points during PLAYER_TURN_START, but
the duration would tick down during PLAYER_TURN_END.

### Squads and Affiliation

- Squaddies belong to a `Squad` with a named role; squads carry an `affiliation`.
- `SquaddieAffiliationService.areFriends()`: PLAYER and ALLY are mutual friends; ENEMY is only
  friendly with ENEMY; NONE has no allies.
- In general, the user will be able to control PLAYER squaddies. There may be situations where a PLAYER squaddie is
  paralyzed and unable to act, or they are enticed to move towards enemies. These squaddies will always move after the
  player controls all controllable PLAYER squaddies. To test the AI, we may allow the AI to control Player squaddies. We
  may also have decoy units that move with AI.
- In general, ENEMY, ALLY, and NONE squaddies are controlled by the game logic. For testing purposes, we may allow the
  Player to control these squaddies.

### Mission State

- `MissionState` holds the map ID, objectives list, and current turn.
- `MissionObjective` has completion criteria and rewards (MISSION_ENDS, MISSION_FAILURE,
  BONUS_EXPERIENCE, GAIN_ITEM).
- `MissionHistory` records every action taken by every squaddie each turn, enabling replay and undo.
- `InMissionSummary` is a snapshot (squaddies, map, turn, objectives) suitable for rendering.

### Items

Squaddies can carry a small inventory, ranging from 1 to 5 items. Some items provide a passive bonus, like equipment.
Other items are consumable, like healing potions.

The items are refilled between missions. So by equipping a healing potion, the squaddie can use the healing ability
once per mission.

- `SquaddieItem` provides passive proficiency bonuses and grants additional action IDs.
- `SquaddieItemManager` handles CRUD; items are attached to attribute sheets.

### Squaddie Conditions

Squaddies can have temporary or permanent Conditions that alter their combat stats and movement.

#### Mechanical Effects

| Condition | Effect                                       | Where Applied                                                                |
| --------- | -------------------------------------------- | ---------------------------------------------------------------------------- |
| ARMOR     | Reduces chance to be hit by attacks          | `calculateConditionAmount` → `ProficiencyCalculator.getTargetDefensiveBonus` |
| ABSORB    | Absorbs incoming damage before HP loss       | `dealDamageToSquaddie` via `drainAbsorbConditionsBySource`                   |
| SLOWED    | Reduces maximum action points at turn start  | `getMaximumActionPoints`                                                     |
| ELUSIVE   | Allows movement through unfriendly squaddies | `CoordinateMapAStarAdapter.canMoveToSquaddieLocation`                        |
| HUSTLE    | Reduces movement costs to a minimum of 1     | `CoordinateMapAStarAdapter.getCoordinateMapSearchLimitsFromSquaddie`         |

#### Condition Sources

Each condition carries a `source`: `NONE | ITEM | PHYSICAL | ELEMENTAL | SPIRITUAL`.

The source controls how multiple conditions of the same type stack:

- **Same type, same source**: only the largest positive value and the largest negative value apply.
  Adding a weaker condition of the same type and source has no effect. Adding a stronger one
  replaces it.
- **Same type, different sources**: the effective amount is the sum of the dominant value per source
  (largest positive + largest negative per source, then summed across sources).

The helper `effectiveConditionAmount` in `inBattleSquaddie.ts` implements this logic for all
game-logic paths.

#### Binary vs. Quantified Conditions

- **Binary conditions** (ELUSIVE, HUSTLE): the `amount` field is `undefined`. The condition is
  either active or not.
- **Quantified conditions** (ARMOR, ABSORB, SLOWED): the `amount` field holds
  `{ current: number; base: number | undefined }`.
    - `current` is the value used in calculations. It decreases when the condition absorbs damage
      (ABSORB) or is dispelled/treated.
    - `base` controls renewal behavior (see below).

#### Duration and Decay

A condition's `limit` field is either `undefined` (permanent, never expires) or
`{ duration: number; decaysAt: TSquaddieConditionDecaysAt }`.

`decaysAt` determines when the duration ticks down:

| Value        | Ticks down when…                                                 |
| ------------ | ---------------------------------------------------------------- |
| `TURN_END`   | The owning squaddie's affiliation exits its `*_TURN_END` phase   |
| `TURN_START` | The owning squaddie's affiliation exits its `*_TURN_START` phase |

When duration reaches 0 the condition is removed.

#### Amount Renewal

When duration ticks down (and the condition is still alive), `current` is restored to `base`:

- **`base: undefined`** — the condition is permanent in amount; `current` only decreases from
  damage absorption. It is removed when `current ≤ 0` from damage, but not from dispel/treat.
- **`base: N`** — each time the duration ticks down (while duration > 0), `current` resets to `N`.
  This models regenerating shields or recurring effects.

Dispelling or treating a condition changes only `current`; `base` is always preserved.

---

## Known Gaps

The following systems are **not yet implemented** and are required for a complete playable mission.

### Gap 1 — Enemy AI (No automated decision-making, DONE)

Enemy squaddies have turns allocated in the turn structure, but no logic decides what they do.
Required:

- A strategy interface that receives the current `InMissionSummary` and returns a `ReadiedAction`.
- A default "simple aggressor" strategy: find the nearest hostile, move toward them, use the
  highest-damage action available, then end turn.
- The `MissionEngine` must call the AI strategy during `ENEMY_TURN` (and `ALLY_TURN` and `NONE_TURN` for
  autonomous allies) and automatically advance when the strategy is done.

Eventually the AI strategy will be replaced with a more sophisticated AI system, but for now, the simple aggressor
strategy will suffice.

### Gap 2 — Affiliation Turn Controller (Who drives each phase? DONE)

Nothing currently distinguishes "a human controls this phase" from "the engine controls this phase."
Required:

- A `TurnController` concept that can calculate which squaddies are controlled by a HUMAN or AI. By default, PLAYER
  squaddies are controlled by a HUMAN, while ENEMY, ALLY, and NONE squaddies are controlled by the AI.
- TurnController pays attention to debug settings that can override controls on a per-affiliation or per squaddie basis.
- During an AI-controlled phase the engine auto-generates and executes actions without waiting for
  external input.
- During a human-controlled phase the engine waits for `readyAction()` / `executeReadiedAction()`
  calls from the outside.
- This enables allied squaddies to be autonomous (AI-controlled ALLY affiliation) while the player
  only controls PLAYER squaddies.

### Gap 3 — Status Effect Processing at Turn End (DONE)

Conditions are tracked on squaddies but are never automatically processed.
Required:

- On `*_TURN_END` for each affiliation: iterate all squaddies of that affiliation, tick down
  condition durations, and expire conditions whose duration reaches zero.
- Conditions with on-tick effects (e.g., ABSORB shields refreshing, SLOWED movement reduction) must
  be recalculated when they change.
- `MissionTurnService` or a new `ConditionDecayService` should own this logic, called by the engine
  at the right phase transition.
- During the `*_TURN_START` phase for each affiliation, some conditions will apply their effects. (For example, SLOWED
  would be applied to reduce the number of action points for a squaddie.)

### Gap 4 — Condition Effects in Calculations (DONE)

Eventually there will be new conditions.

- `SquaddieActionResultCalculator` must query active conditions on actor and target when computing
  net damage and movement.

### Gap 5 — LINE and CONE Area Targeting

Shape constants are defined but area expansion is not implemented.
Required:

- Given an origin coordinate and a direction (for LINE/CONE), generate the set of coordinates the
  action affects.
- CONE requires a direction parameter. This game uses a Hexagonal Grid, so we can use 1 of 6 directions.
- CONE requires a width parameter. This will indicate how wide the cone will spread. A width of 0 would collapse into a
  line. A width of 1 would expand into 2 more directions, so a direction of right would spread into upright and
  downright. A width of 4 would be a complete circle.
- LINE requires a width parameter. A width of 0 is the minimum width. A width of 1 would expand 2 more lines. A line
  pointing to the right would have 3 lines going to the right, one above and below the squaddie.
- `SquaddieActionValidationService` and the calculator must accept a set of target coordinates, not
  just one.

Red Blob Games has a great explanation of drawing lines.
https://www.redblobgames.com/grids/hexagons/implementation.html#line-drawing

### Gap 6 — Complete Turn Advancement in the Engine (DONE)

`MissionEngine` does not fully drive the turn lifecycle end-to-end.
Required:

- After all squaddies in the active affiliation have used all action points (or explicitly ended
  their turn), automatically advance to the next phase.
- Trigger condition decay (Gap 3) on `*_TURN_END` transitions.
- Trigger AI action generation (Gap 1) on `ENEMY_TURN` and `ALLY_TURN` entries.
- Evaluate objectives after each action and at turn boundaries.

### Gap 7 — Explicit End-Turn Action (DONE)

No mechanism exists for a squaddie (or the engine) to formally end that squaddie's turn and pass
control.

We have the "default-end-turn" action that spends all action points.

Required:

- An "end turn" signal on `MissionEngine` that marks the current squaddie's action points as
  exhausted.
- Once all squaddies in the active affiliation are exhausted, phase advances automatically.

### Gap 8 — Serialization Round-Trip

Partial serialization helpers exist but a full save/load round-trip is not implemented.
Required:

- Each Manager exposes `serialize()` / `deserialize()` methods producing plain JSON-compatible objects.
- `MissionEngine` serializes its complete state so the host application can pause and resume.

---

## Test Harness Mission

The test harness mission is a minimal but complete battle used to validate all game systems
end-to-end. It does not need to be balanced or fun — it must exercise every phase of play.

### Scenario

- **Map**: 5×5 grid; Has a mixture of tile types including pits, walls and difficult terrain.
- **Player squad**: one squaddie (`Lini`) — PLAYER affiliation, 5 HP. 1 Armor. More BODY and SOUL than MIND.
    - Actions: a melee attack ("Scimitar", 1 AP, MELEE, SUCCESS → 2 damage),
      a melee heal (Heal, 2 AP, heals 2 Hit Points. Always succeeds. Target Self and Friends.)
- **Enemy squad**: one squaddie (`Slither Demon`) — ENEMY affiliation, 2 HP.
    - Actions: a melee attack ("Bite", 1 AP, MELEE, SUCCESS → 2 damage).
- **Objectives**:
    - Defeat all enemies → MISSION_ENDS (win).
    - Lini is KO'd → MISSION_FAILURE (loss).

### Playthrough

1. Turn 1 — Player phase: player moves Lini adjacent to Goblin, then uses Longsword.
2. Turn 1 — Enemy phase: AI moves Slither Demon to Lini, uses Bite.
3. Turn 2 — Player phase: player uses Scimitar (Slither Demon now in range). Enemy is KO'd.
4. Engine detects "Defeat all enemies" objective is met → mission ends with win.

Each step must work through `MissionEngine`'s public API with no direct manager calls.

---

## Implementation Plan

### Phase 1 — End-Turn and Turn Advancement (Gap 6, Gap 7) (DONE)

**Goal**: The engine can drive a complete turn cycle without manual phase management from outside.

Tasks:

1. Add `endSquaddieTurn(inBattleSquaddieId)` to `MissionEngine`. Mark the squaddie's action points
   as 0 and record in history.
2. After every action execution in `MissionEngine`, check whether all active-affiliation squaddies
   are exhausted. If yes, call `MissionTurnService.advanceToNextPhase()`.
3. Advance phase automatically through `*_TURN_START` and `*_TURN_END` bookends; only pause at
   `*_TURN` phases if there are results to show or awaiting input or AI.
4. Write integration tests covering: player advances turn when exhausted; engine skips empty
   affiliations; objectives are evaluated at turn end.

### Phase 2 — Condition Decay (Gap 3) (DONE)

**Goal**: Conditions expire correctly at turn end and their duration is maintained per-turn.

Tasks:

1. Add a single function to `MissionManager`:
   `processEndOfAffiliationTurn(affiliation, inBattleSquaddieManager) → updated manager state`.
2. Decrement duration on all conditions belonging to squaddies of the given affiliation.
   InBattleSquaddieService.reduceConditionDurationsByOneRound does this for an individual squaddie.
3. Remove conditions with duration ≤ 0.
4. Call from Phase 1's turn-advance logic on each `*_TURN_END` event.
5. Tests: condition expires after N turns; permanent conditions (no duration) are unchanged.

### Phase 3 — Condition Effects in Combat (Gap 4) (DONE)

**Goal**: Active conditions change damage and movement calculations.

Tasks:

1. Update `SquaddieActionForecastCalculator` with the same condition checks so previews are accurate.
2. Tests: each condition's mechanical effect, including edge cases (absorb absorbs partial damage).

### Phase 4 — Affiliation Turn Controller (Gap 2) (DONE)

**Goal**: The engine knows which phases are human-controlled and which are AI-controlled.

Tasks:

1. Define `TurnControllerType`: HUMAN | AI.
2. Add `affiliationControllers: Map<SquaddieAffiliation, TurnControllerType>` to `MissionState` constructor.
3. Add `squaddieControllers: Map<BattleSquaddieId, TurnControllerType>` to `MissionState` constructor.
4. When the engine gets to a new phase, it must look for any squaddies with HUMAN controller types. Look for
   squaddieControllers or for affiliationControllers.
5. When the engine discovers a HUMAN controllable squaddie during the current phase who can act, it exposes
   `readyAction()` / `executeReadiedAction()` as before.
6. When the engine discovers no HUMAN controllable squaddies (or no HUMAN squaddies can act), it queues AI action
   generation instead of waiting.
7. Tests: if the phase has all human squaddies, the engine waits; If the phase has a mix of human and AI squaddies, it
   waits; If the phase has a mix but all human squaddies ended their turn, the AI takes over. A phase with all AI
   squaddies auto-advances.

### Phase 5 — Enemy AI — Simple Aggressor (Gap 1, DONE)

**Goal**: Enemy and autonomous ally squaddies take sensible actions without human input.

Tasks:

1. Define `AiStrategy` interface:
   `decideAction(summary: InMissionSummary, actorIds: {inBattle, outOfBattle}): ReadiedAction`.
2. Implement `SimpleAggressorStrategy`:
   a. Find nearest hostile squaddie (Manhattan distance or A\* cost).
   b. If not adjacent: generate movement action toward target, consuming movement action points.
   c. If adjacent or in range: choose highest base-damage attack action within remaining action
   points.
   d. If no action available: end turn.
3. Register strategy per affiliation in the engine. Default: ENEMY → SimpleAggressorStrategy,
   ALLY → SimpleAggressorStrategy (can be overridden).
4. The engine calls `decideAction()` iteratively until the squaddie's action points are exhausted,
   then calls `endSquaddieTurn()`.
5. Tests: Slither Demon moves toward player; Slither Demon attacks when in range; Slither Demon ends turn when out of
   AP.

### Phase 6 — LINE and CONE Area Targeting (Gap 5)

**Goal**: Actions with LINE or CONE shapes affect all tiles in the projected area.

Tasks:

1. Implement `AreaTargetCalculator.getAffectedCoordinates(origin, direction, shape, range, width)`.
2. Update `SquaddieActionValidationService` to validate area targets.
3. Update `SquaddieActionResultCalculator` to produce one `TargetResult` per affected tile that
   contains a living squaddie.
4. Tests: line hits exactly the tiles in a row; cone expands correctly; blocked tiles are excluded.

### Phase 7 — Serialization Round-Trip (Gap 8)

**Goal**: Full mission state can be saved and restored as plain JSON.

Tasks:

1. Each Manager implements `serialize() → SerializedT` and a static `deserialize(data) → Manager`.
2. `MissionEngine` exposes `serialize()` and static `MissionEngine.deserialize(data)`.
3. Tests: serialize then deserialize yields identical state; actions can continue after reload.

---

## Future Considerations (Out of Scope for Initial Playable Mission)

### Multiple Attack Penalty (DONE)

To discourage repeated attacks with a weapon, actions taken in a given turn get an increasing penalty.

- The first attack action has no penalty.
- The second attack action gets a -3 penalty to its attack.
- Attacks after the second get a -6 penalty. This is usually enough to discourage attacking a third time.

Attacks that use these proficiencies will by default increase the MAP.
ProficiencyType.WEAPON_NATURAL
ProficiencyType.WEAPON_SIMPLE
ProficiencyType.WEAPON_MARTIAL

Squaddie Actions can

- Contribution (how much MAP is applied?)
- Applies (does MAP apply to the action?)
  There are non-weapon actions that do apply MAP.

### Every +1 matters

If an attack would have hit, but misses due to an ARMOR condition, we should report that the attack was
Blocked/Absorbed/Dodged.
Conditions that affect chances to hit will have to have some kind of verb associated with them.

We should send a value representing the verb, instead of a raw string. The client is responsible for displaying the
verb.

- Shield: "Blocked"
- Parry: "Parried"
- Defensive Stance: "Dodged"

SquaddieActions that increase ARMOR can assign an Enum indicating which verb should be assigned.

When resolving which action to use, choose based on a priority. If the user has this verb available use it:

- Dodged
- Parried
- Blocked
- Absorbed

### Other

- **Multiplayer**: multiple human controllers on separate affiliations.
- **Scripted objectives**: lua-style or data-driven criteria for complex win conditions.
- **Character progression**: experience, leveling, permanent attribute gains.
- **Equipment upgrading**: item enhancement between missions.
- **Map hazards**: environmental damage zones or interactive terrain.
- **Difficulty scaling**: modifier tables applied per-affiliation.
