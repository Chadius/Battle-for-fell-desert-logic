# Target Rolls (Saving Throws) — Implementation Plan

## Context

Every `SquaddieAction` that involves a roll currently uses the **actor rolls** mechanic:
the actor rolls 2d6 once, adds their attack bonus, subtracts each target's defense bonus,
and the difference determines the degree of success for all targets simultaneously.

This plan introduces the **target rolls** mechanic (also called saving throws): the actor
sets a fixed Target Number based on their own stats, then each target independently rolls
2d6 and adds their own defense bonus to try to beat that number. The roles are reversed —
a high roll is now good *for the target*, not the actor.

The two mechanics can coexist on separate `SquaddieAction` definitions; an individual
action is one or the other.

---

## Math Summary

**Target Number** (set once by the actor):

```
targetNumber = 6 + actorProficiencyBonus + actorAttributeScore + actorRank + actorConditionBonus
```

**Per-target defense bonus** (same formula already used for actor-rolls defense):

```
targetDefenseBonus = targetDefendProficiencyBonus + targetAttributeScore + targetRank + targetConditionBonus
```

The defend proficiency is the same mapping already in `defendingProficiencyTypeByProficiencyType`
(`proficiencyLevel.ts`): e.g. `SKILL_SOUL` → `DEFEND_SOUL`.

**Each target rolls independently:**

```
degreeValue = targetRoll(2d6) + targetDefenseBonus - targetNumber
```

Which simplifies to:

```
degreeValue = targetRoll - 6 - (actorBonus - targetDefenseBonus)
```

This is **symmetric** with actor rolls — only the sign of the modifier is flipped.
The existing `probabilityLookup` table in `src/squaddieAction/calculate/probabilityLookup.ts`
works unchanged; supply `modifierForTarget = targetDefenseBonus - actorBonus` instead of
`modifierForActor = actorBonus - targetDefenseBonus`.

**Degree thresholds** (target's perspective — high is good for the target):
| degreeValue | Degree | Target outcome |
|---|---|---|
| ≥ +6 | CRITICAL | Fully resisted |
| ≥ 0 | SUCCESS | Partial resistance |
| > −6 | FAILURE | Normal damage |
| ≤ −6 | BOTCH | Devastating damage |

Max roll (6, 6) upgrades the degree; min roll (1, 1) downgrades — same logic as actor rolls.

---

## Phase 1 — Add `targetsRollToResist` to `SquaddieAction` (DONE)

**Goal:** Mark an action as using the target-rolls mechanic. No behavior change yet.

### Files

**`src/squaddieAction/squaddieAction.ts`**

- Add optional field `targetsRollToResist?: boolean` to the `SquaddieAction` interface
  (default `false`).
- In `SquaddieActionService.new()`, read the new field and default it to `false`.
- Throw an error if both `actorRollsToHit: true` and `targetsRollToResist: true` are supplied —
  an action cannot use both mechanics simultaneously.

### Tests

**`src/squaddieAction/squaddieAction.test.ts`**

- `targetsRollToResist` defaults to `false` when omitted.
- Setting `targetsRollToResist: true` with `actorRollsToHit: false` is accepted.
- Setting both `actorRollsToHit: true` and `targetsRollToResist: true` throws an error.

---

## Phase 2 — Store Per-Target Rolls in Result Structures (DONE)

**Goal:** `TargetResult` needs to carry the die roll that *that specific target* made, because
each target rolls independently (unlike actor rolls where a single `actorRoll` on `ActionResult`
covers all targets).

### Files

**`src/mission/targetResult.ts`**

- Add `targetRoll?: [number, number]` to the `TargetResult` interface.
- Add `targetRoll?: [number, number]` to `SerializedTargetResult`.
- Update `TargetResultService.new()`, `serialize()`, and `deserialize()` to carry the field
  through.

**`src/mission/actionResult.ts`** — no changes needed. The existing `actorRoll` field
remains for actor-rolls actions. For target-rolls actions, `actorRoll` will be `undefined`
and rolls will live on each `TargetResult`.

### Tests

**`src/mission/targetResult.test.ts`**

- `targetRoll` is preserved through `new → serialize → deserialize` round-trip.
- `targetRoll` is optional and defaults to `undefined`.

---

## Phase 3 — Result Calculator: Compute Per-Target Degrees (DONE)

**Goal:** When `targetsRollToResist` is `true`, calculate the actor's Target Number once,
then give each target their own 2d6 roll and degree of success.

### Files

**`src/squaddieAction/calculate/proficiencyCalculator.ts`**

- Add `calculateActorTargetNumber({ actor, action, inBattleSquaddieManager }): number`.
    - Returns `6 + actorProficiencyBonus + actorAttributeScore + actorRank + actorConditionBonus`.
    - Reuse the existing `getActorAttackBonus` helpers — only the constant offset (6) differs
      from the modifier already computed there.

**`src/squaddieAction/calculate/result/squaddieActionResultCalculator.ts`**

- In the top-level `calculate()` function, detect `action.targetsRollToResist === true`.
- When true, call a new private `calculateWithTargetRolls()` helper:
    1. Compute `targetNumber` once via `calculateActorTargetNumber`.
    2. Set `actorRoll: undefined` on the returned `ActionResult`.
    3. For each target independently:
        - Generate a fresh 2d6 roll (`RollGeneratorService.roll2d6()`).
        - Compute `targetDefenseBonus` via the existing `calculateTargetDefensiveBonus`.
        - Compute `degreeValue = roll[0] + roll[1] + targetDefenseBonus - targetNumber`.
        - Determine base degree using the same ≥6 / ≥0 / >−6 / ≤−6 thresholds.
        - Apply max-roll upgrade (6, 6) and min-roll downgrade (1, 1) using the existing
          `applyRollModifierToDegree` logic.
        - Redistribute unsupported degrees from `action.degreesOfSuccess` using existing
          `redistributeDegree` logic.
        - Store `targetRoll` on the resulting `TargetResult`.

### Tests

**`src/squaddieAction/calculate/result/squaddieActionResultCalculator.test.ts`**

- With `targetsRollToResist: true`: `actorRoll` is `undefined`.
- Each target in the result carries a `targetRoll`.
- Degree thresholds: supply a controlled roll and defense bonus to verify CRITICAL /
  SUCCESS / FAILURE / BOTCH boundaries.
- Two targets with different defense bonuses get independent degrees from the same action.
- Max roll (6, 6) upgrades a FAILURE to SUCCESS, etc.
- Unsupported degrees are redistributed correctly (e.g. no CRITICAL → SUCCESS).

---

## Phase 4 — Forecast Calculator: Per-Target Probability Distributions (DONE)

**Goal:** Preview the independent probability distribution for each target when
`targetsRollToResist` is `true`.

For actor rolls, the forecast produces a *single* probability map because one roll applies
to all targets. For target rolls, each target has their own independent distribution based
on their own defense bonus.

### Files

**`src/squaddieAction/calculate/forecast/squaddieActionForecastCalculator.ts`**

- In the top-level forecast function, detect `action.targetsRollToResist === true`.
- When true, call a new private `forecastWithTargetRolls()` helper:
    1. Compute `actorBonus` (proficiency + attribute + rank + conditions) via existing helpers.
    2. For each target:
        - Compute `targetDefenseBonus` via `calculateTargetDefensiveBonus`.
        - Compute `modifierForTarget = targetDefenseBonus - actorBonus`.
        - Look up the probability distribution using the existing
          `ProbabilityLookupService.lookup(modifierForTarget)`.
        - Apply degree redistribution for unsupported degrees.
    3. Return one probability map per target.

The existing `probabilityLookup` table is reused unchanged — only the sign of the modifier
differs. A target with a strong defense (`modifierForTarget` positive) will have a higher
CRITICAL/SUCCESS probability, exactly as a well-defended target in actor-rolls has a higher
miss chance.

### Tests

**`src/squaddieAction/calculate/forecast/squaddieActionForecastCalculator.test.ts`**

- `targetsRollToResist: true` produces one probability map per target (not one shared map).
- A target with defense bonus 0 against a Target Number of 6 has the same distribution as
  the mirror case in actor rolls (modifier 0) — verify numerically.
- Two targets with different defense bonuses produce different distributions.
- Unsupported degrees roll their probability into the adjacent supported degree.

---

## Phase 5 — Integration: Add a Target-Rolls Action to the Test Mission (DONE)

**Goal:** Exercise the full path through `MissionEngine` with at least one target-rolls action.

### Files

**`src/testUtils/mission/targetPracticeMission.ts`**

- Add or modify a Solar Sphere action for Lini using `SKILL_SOUL` proficiency,
  `targetsRollToResist: true`, `actorRollsToHit: false`, with `BLOOM` shape and two or
  more degrees defined.

**New test file** (e.g. `src/mission/missionEngine/tests/targetRollsAction.test.ts`)

- End-to-end test: ready the Solar Sphere action, supply controlled rolls for each target,
  call `useActionAndGetResults()`, verify the correct degree appears on each target's
  `TargetResult`.
- Verify `actorRoll` is `undefined` on the returned `ActionResult`.
- Verify each target's `targetRoll` is stored and matches the supplied roll.

---

## What Does NOT Change

- **`ApplyResultService`** — applies effects per target per degree; already works on the
  `TargetResult` structure. No changes needed.
- **`probabilityLookup.ts`** — the lookup table is symmetric; reused as-is.
- **`SquaddieActionValidationService`** — targeting range, reachability, and affiliation
  filtering work the same regardless of who rolls.
- **`AoeTargetResolutionService`** — unchanged.
- **`MissionEngine` / `MissionManager`** — the public API (`readyAction`, `useActionAndGetResults`)
  is unchanged; result structure is compatible.
- **`MissionHistory` / undo** — `ActionResult` is already stored per action; undo reads
  back the stored result, so no structural changes needed.

---

## Order of Phases

Phases must be executed in order because each builds on the prior:

1. Phase 1 must come before 3 — the calculator checks the flag.
2. Phase 2 must come before 3 — the calculator writes `targetRoll` onto `TargetResult`.
3. Phase 3 must come before 4 — the forecast mirrors the result calculator's bonus formula.
4. Phases 3 and 4 can be developed in parallel if desired.
5. Phase 5 depends on 1–4 being complete.
