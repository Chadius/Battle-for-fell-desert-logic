# Requirements for the game logic submodule (`2025-11-battle-of-fell-desert-logic`)

**Requested by:** `fell-desert-html-canvas`, the browser front end being built against this engine.

Six asks, each unblocking one item in `docs/html-interface-architecture.md` or
`docs/action-animation-plan.md`. They are independent — land them in any order. #1, #2 and #4 are
closed; #3 and #6 are fully specified and waiting on `logic`; #5 needs a design decision before it
can be specified.

| # | Unblocks | Size | Shape |
| - | -------- | ---- | ----- |
| 1 | Undo button (§5) | small | new read-only `MissionEngine` query — **DONE** |
| 2 | Non-player movement-range preview (§5) | medium | AP override on the movement queries — **DONE** |
| 3 | Audio voice/music cues (§2.4) | small | optional fields on movie scene types — **not started** |
| 4 | Combat-target list (§4) | none | confirm `readyAction` already supports it — **CONFIRMED, front-end-only — built** |
| 5 | Objective progress in the situation report (§4) | small–medium | display text for `MissionObjective` — **needs a decision** |
| 6 | Battle stage text and results (action animation plan) | small | two fields on `TargetResult` — **not started** |

---

## 1. Undo button — a read-only "can the player undo?" query

### Background

`MissionEngine.undoLastPlayerUndoableAction()` does two jobs at once: it decides whether an undo is
legal *and* performs it, returning `{ success, removedAction?, reason? }`.

The browser HUD needs an Undo button that is **disabled** whenever an undo isn't currently valid —
at the start of a turn, after an attack has resolved, when the last action targeted an enemy, and so
on. To render that state the front end has to know the answer *without changing anything*, and there
is no side-effect-free way to get it today. Reconstructing the precheck in the front end would mean
reaching through `engine.missionManager.getLastSquaddieTurnActionRecord()`, rebuilding the
`squaddieAffiliations` map, and calling the exported
`SquaddieTurnActionRecordService.isPlayerAllowedToUndo(...)` — duplicating engine-internal
orchestration and reaching past the engine boundary into the manager layer.

### What's needed

A read-only sibling method on `MissionEngine`:

```ts
canUndoLastPlayerUndoableAction(): { canUndo: boolean; reason?: string }
```

- Runs the **same precheck** `undoLastPlayerUndoableAction()` already runs, with **no state
  change**:
    - `missionManager.getLastSquaddieTurnActionRecord()` returns `undefined`
      ⇒ `{ canUndo: false, reason: "no action to undo" }`
    - build the `squaddieAffiliations` map from the record's `results`
    - `missionManager.squaddieActionManager?.get(record.action.id)` ⇒ the `SquaddieAction`
    - `SquaddieTurnActionRecordService.isPlayerAllowedToUndo({ squaddieTurnActionRecord,
      squaddieAffiliations, squaddieAction })` returns a non-null string
      ⇒ `{ canUndo: false, reason: <that string> }`
    - otherwise ⇒ `{ canUndo: true }`
- `undoLastPlayerUndoableAction()` should call this first and bail on `canUndo === false`, returning
  `{ success: false, reason }` with the same `reason`, so the check and the action can never drift
  apart.
- Throws the same "missionManager is undefined" style error its sibling throws when the engine has
  no manager.

### Open question for `logic` to settle — RESOLVED

> "disabled at **start of turn**." Does `getLastSquaddieTurnActionRecord()` still return an action
> from the **previous** turn once the player's turn has advanced?

No. `MissionManager.getLastSquaddieTurnActionRecord()` already scopes the lookup to the current
turn (`missionState.turn.turnCount`). A freshly-advanced turn has no history entry yet, so the
record is `undefined` and both `canUndoLastPlayerUndoableAction()` and
`undoLastPlayerUndoableAction()` report `"no action to undo"`. No extra "turn is over" rule was
needed — the turn-scoping lives in the manager and both methods share the same precheck.

### Delivered

- `MissionEngine.canUndoLastPlayerUndoableAction(): { canUndo: boolean; reason?: string }` — the
  read-only sibling. Throws the same `"missionManager is undefined"` error when the engine has no
  manager.
- `undoLastPlayerUndoableAction()` now runs the exact same precheck (shared private helper) and
  bails with `{ success: false, reason }` before mutating anything; its return shape and observable
  behaviour are otherwise unchanged.
- `reason` strings are unchanged: `"no action to undo"`, `"action has no recorded results"`,
  `"action type cannot be undone"`, `"action did not succeed"`,
  `"action targeted enemies and cannot be reversed"`.

### Not required

- No change to `undoLastPlayerUndoableAction()`'s return shape or observable behaviour beyond the
  shared-precheck refactor.
- No new undo *capability*. The front end only needs to *ask* whether an undo is currently legal.
- No serialization, `MissionHistory`, or `SquaddieTurnActionRecord` API changes.

---

## 2. Non-player movement-range preview — an action-point override on the movement queries

### Background

The canvas already highlights the **selected player** squaddie's reachable hexes while they choose a
move (`getSquaddieActionValidity(...).reachableCoordinates`). We want the same highlight for an
enemy or ally when the player selects them on the player's turn — a "here's how far they could move"
preview.

`getSquaddieActionValidity()` and `getMovementOptionsWithCosts()` both scope movement to the
squaddie's **current remaining** action points and effectively assume it is that squaddie's turn. On
the player's turn an enemy's remaining AP is 0, so both queries report no movement. What the preview
wants is the squaddie's reach at the **start of its next turn**: its maximum action points, already
reduced by any relevant conditions (a SLOWED enemy previews 2 AP of movement, not 3 —
`getMaximumActionPoints` / `SquaddieInfo.maximumActionPoints` already computes that number).

### What's needed

An opt-in way to ask for the movement range at maximum action points, regardless of whose turn it
is. Either shape works for the front end:

- an optional parameter, e.g.
  `getMovementOptionsWithCosts(squaddieId, { actionPoints: "maximum" })`, or
- a dedicated query, e.g. `getPotentialMovementRange(squaddieId): OffsetCoordinate[]`.

It must still honour everything the normal path honours — terrain movement cost, walls/pits,
blocking squaddies, and the movement-affecting conditions (ELUSIVE lets it path through unfriendly
squaddies, HUSTLE floors movement cost at 1). The only differences from the current behaviour are
the AP budget (maximum, not remaining) and dropping the "must be this squaddie's turn" gate.

### Open question for `logic` to settle

Whether this belongs as a flag on the existing queries or as a separate method — `logic` owns that
call. The front end only needs *some* documented way to get "reachable coordinates at full AP for a
squaddie whose turn it isn't."

### Not required

- No pathfinding changes — this is the same search with a different starting AP budget.
- No AI or turn-order changes.
- No preview of *actions other than movement* for non-player squaddies.

### Delivered

Landed across `2d33a6d` ("query movement options based on action points") and `2a41b31` ("Add preview
for coordinates squaddies can move to and reach with actions"), backed by a new
`ReachablePreviewCalculator` (`src/squaddieAction/calculate/reachablePreview/`) that every preview
query delegates to:

- `getMovementOptionsWithCosts(actor, options?)` — reachable movement destinations with AP costs.
  `options.actionPoints` is `"current"` (default) or `"maximum"` (the squaddie's max AP, already
  reduced by conditions like SLOWED, ignoring whose turn it is) — this is the requested override.
- `getActionableCoordinates(actor, options?)` — every coordinate the squaddie could target with an
  ability from its current position (action id, target coordinate, squaddies standing there, AP
  cost), same `actionPoints` option.
- `getTargetDestinationsForAction(actor, actionId, options?)` — destinations a movement-granting
  action (Leap, Rescue, etc.) could send the actor/target to.
- `getReachableActionTargets(actor, options?)` — the squaddie's full threat range: every coordinate
  it could hit this turn after first moving into position, cheapest move+act AP cost per target. This
  goes beyond what was asked and covers the "here's how far they could move *and act*" case too.
- No turn-gate: `actionPointsOverride`/`positionOverride` flow straight into
  `SquaddieActionValidationService.generateValidSquaddieActions`, with no "must be this squaddie's
  turn" check anywhere in the path — confirmed by reading the validation service, not just the doc
  comment.
- Terrain cost, walls/pits, blocking squaddies, and movement conditions (ELUSIVE, HUSTLE) are honored
  in every mode, same as the existing current-AP queries — verified via SPEC.md's updated Movement
  section and the `reachablePreview` test suites
  (`getActionableCoordinates.test.ts`, `getReachableActionTargets.test.ts`).

This closes the front-end blocker for §5's non-player movement-range preview — no further `logic`
change needed for this item.

---

## 3. Audio voice/music cues — optional sound-cue fields on movie scene types

### Background

`ResourceManifestType` already carries `AUDIO` and `VIDEO` (this half of the old §2.4 gap is
closed). What's still missing is a way to *attach* a sound to a cutscene: nothing on
`MovieSceneConversation` / `MovieSceneImage` / `DialogLine` points at an audio resource, so the
browser has nothing to play.

### What's needed

Additive, optional fields — nothing existing changes shape:

1. `DialogLine.voiceResourceManifestEntryId?: string` — a per-line voice-over clip.
2. A scene-level music cue, e.g. `MovieSceneConversation.musicResourceManifestEntryId?: string` and
   the same on `MovieSceneImage` (or one shared mechanism if that's cleaner).
3. Surface both through the movie status the engine already returns
   (`ConversationSceneStatus` / the image-scene equivalent), the same way `portrait` is surfaced
   today — the front end resolves the id to a URL via its media collection and plays it through a
   plain `<audio>` element.

### Not required

- No new engine playback state, timing, or "audio finished" events — the browser owns playback.
- No change to how `AUDIO` resources are declared or resolved (that machinery exists).
- Ambient/UI sound (menu blips, hover ticks) and the mute/volume control are pure front-end, no
  engine involvement.

### Status

Still needed. Checked against `logic` @ `9a909d9`: no `voiceResourceManifestEntryId` or
`musicResourceManifestEntryId` field exists anywhere in `logic/src`. The `AUDIO`/`VIDEO` resource
types and the content/media split (`ResourceManifestMediaEntry`, resolved by id, where "no media yet"
is a normal `undefined` result) are already in place, so once the cue fields exist the front end can
resolve them the same way it resolves portraits. The front end has no `<audio>` playback yet.

---

## 4. Combat-target list — confirm `readyAction` already supports choosing among targets

### Background

The map list view lets a screen-reader player pick a squaddie and a move destination, but not an
attack target, because the front-end command layer refuses any action that resolves to more than one
target candidate. We want each candidate target to be a selectable list entry.

Reading the engine, this looks like a **front-end-only** change: `readyAction({ actor, targets,
action })` already takes an explicit `targets` array and validates it through
`SquaddieActionValidationService.isActionValid`, and `useActionAndGetResults()` acts on exactly the
readied `targets`. `getAimCoordinatesForAction()` / `getTargetsForAimCoordinate()` already enumerate
the options.

### What's needed from `logic`

Just confirmation (or a correction if any of this is wrong):

1. `readyAction()` accepts **any legal** target among several candidates — it does not silently
   re-resolve to one canonical/auto-selected target.
2. `getSquaddieActionValidity(squaddieId).validActions[].aimCoordinateResults` enumerates **every**
   targetable candidate for a single-target action, not just the first.
3. There is no hidden turn/order assumption that breaks when the caller picks the second or third
   candidate rather than the first.

If all three hold, there is no `logic` change here and this becomes a front-end slice. Area-of-effect
targeting (LINE/CONE/BLOOM) is explicitly out of scope for this item.

### Confirmed — no `logic` change; front-end-only

Read `SquaddieActionValidationService.isActionValid` end-to-end (verified against `logic` @ `4250e87`):

1. `readyAction()` → `validateReadiedAction()` → `isActionValid({ targets, ... })` validates the
   **actual passed-in `targets` array**, never re-resolving to a canonical/first candidate.
2. `validateTargetsInRange` filters the given `targets` by affiliation, range, and line-of-sight and
   fails only if any given target drops out of those filters — it doesn't special-case "the first
   target" or assume there's exactly one.
3. `ValidSquaddieAction.aimCoordinateResults` (`AimCoordinateResult[]`) already enumerates every
   targetable aim coordinate for a single-target action, not just one.
4. No turn/order assumption favors one candidate over another in this path.

The front end's part is built. Choosing an action with several distinct sets of possible targets
enters an aim-selection phase and lists each set in the map list view
(`src/mission/aimChoices.ts`, `commandProcessor.chooseAim`); with only one set it goes straight to
confirmation. No `logic` change was needed.

---

## 5. Objective progress — display text for `MissionObjective`

### Background

The situation report tells a screen-reader player the turn, whose phase it is, how many enemies
remain and where the nearest one is. It cannot yet say what the mission is asking of them or how far
along they are ("Defeat all enemies: 3 left", "Keep Sir Camil alive"), because a `MissionObjective`
(`logic/src/mission/missionObjective.ts`) is only `{ id, rewards, hasGivenReward, criteria, hidden? }`.
There is no display text, and the criteria are structured data. Many of the temple-defense objectives
are cutscene triggers rather than goals a player would want read out.

### What's needed

A decision from `logic` on where the words come from. Either works for the front end:

- **Objective descriptions as data.** An optional localized description on `MissionObjective` (the
  `localization` module already has the `LocalizedText` shape), authored in campaign data. The front
  end shows it verbatim, and would still need a way to ask the engine for the progress numbers.
- **Criteria-to-prose in the front end.** No `logic` change beyond exposing whatever the criteria need
  (squaddie-name resolution, remaining counts) through a read-only query. The wording lives in the
  front end's `UI_TEXT` catalog, and the CLI's `missionObjectiveInspector.ts` is the existing example
  of formatting them.

Descriptions as data is the smaller front-end change and keeps wording with the campaign author.
Criteria-to-prose keeps `logic` free of display text, consistent with the direction that `logic`
emits stable codes and clients own the wording. Either way, `hidden` objectives must stay out of the
report.

### Open question for `logic` to settle

Which of the two, and whether a read-only "progress toward this objective" query exists or must be
added.

### Not required

- No change to how objectives are evaluated or rewards are granted.
- No new objective types.

---

## 6. Battle stage text and results — odds and hit points on each `TargetResult`

### Background

The battle stage replays each melee attack after the fact. Next it should show text alongside the
animation: the actor, the target, the action, the degree of success and the chance of success. After
that it should show what the action did, such as an HP meter draining or the conditions added.

Most of this is already in `ActionResult`. Two things are not:

- **The odds.** `chanceOutOf36` only exists in `previewReadiedActionAndForecastResults()`, while an
  action is readied. Once `useActionAndGetResults()` runs, the result keeps the rolls (`actorRoll`,
  `targetRoll`) but not the odds they were rolled against.
- **Hit points at the time of the action.** Replays play after the phase that produced them, often
  after the whole enemy phase. By then `getSquaddieInfo()` returns each squaddie's end-of-phase hit
  points, not their hit points at that action. If the knight is bitten three times, all three replays
  read the same final HP, so an HP meter cannot drain from the right starting point and "Knight at 3
  of 10 HP" is wrong for every bite but the last.

The front end could work around the odds by calling the forecast just before each
`useActionAndGetResults()`, but that runs the calculation twice and relies on the forecast and the
roll never drifting apart. There is no workaround for the hit points short of snapshotting every
squaddie before every action.

### What's needed

Two fields on `TargetResult` (`logic/src/mission/targetResult.ts`), filled in for every squaddie in
`ActionResult.targetResults` by `useActionAndGetResults()`:

```ts
export interface TargetResult {
    degreeOfSuccess: TDegreeOfSuccess
    squaddieActionResults: SquaddieActionResult[]
    targetRoll?: [number, number]

    chanceOutOf36ByDegreeOfSuccess: Record<TDegreeOfSuccess, number>
    hitPoints: { before: number; after: number; maximum: number }
}
```

1. **`chanceOutOf36ByDegreeOfSuccess`** — the odds this target faced, as
   `SquaddieActionForecastCalculator.forecastChanceToHit` calculates them, recorded from the state the
   roll was made against. Every degree of success is listed, with `0` for a degree that cannot occur,
   so the four values add up to 36. An action that does not roll (it always succeeds) reports
   `SUCCESS: 36`. The front end decides how to word it: "75% to hit", "6% critical" and so on.
2. **`hitPoints`** — this squaddie's current hit points immediately before and immediately after this
   action, plus their maximum. A squaddie the action defeats reports `after: 0`.
3. Add both to `SerializedTargetResult` and carry them through `TargetResultService.new`,
   `serialize` and `deserialize`, so saved missions and undo records keep them.

### Not required

- **Names.** Squaddie and action names do not change during a mission, so the front end looks them up
  through `getSquaddieInfo()` and `getActionById()` as it does now. This also keeps display text out
  of `logic`, in line with the direction that `logic` emits stable codes and the front end owns the
  wording.
- **The action id.** `ActionResult.actionId` already carries it.
- **Damage, healing and conditions.** `SquaddieActionResult` already carries `damage` (`net`, `raw`,
  `absorbed`, `willKo`, `type`), `healing`, `conditionsAdded`, `dispel` and `treat`.
- **A snapshot of each squaddie's conditions before and after.** The added, dispelled and treated
  lists describe the change. Raise it separately if the stage ever shows a target's whole condition
  list.
- **The modifier breakdown.** `ForecastedActionResult.modifierBreakdown` explains why the odds were
  what they were (flanking, armour). It would be welcome on `TargetResult` in the same pass, but the
  stage does not need it yet.
- No change to how actions are resolved or rolled.

### Status

Not started. Checked against `logic` @ `b2a9bbb`: `TargetResult` is
`{ degreeOfSuccess, squaddieActionResults, targetRoll? }`, and `MissionEngine.useActionAndGetResults()`
copies the manager's per-target results into it unchanged (`serializeTargetResults`).

---

## Not a `logic` ask (recorded so it isn't re-raised)

- **Phase-change / mission-outcome narration** — the front end's `missionAdvancer` already sees
  phase transitions; it just needs to emit its own events. No engine change.
- **Campaign / mission-select screen** — built front-end-only. The `manifest.json` files it needed
  (static hosting has no directory listing) now exist in the **campaignData** submodule; nothing
  in `logic` was involved.
