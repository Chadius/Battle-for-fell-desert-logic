import { beforeEach, describe, expect, it } from "vitest"
import { RollGenerator } from "../../../squaddieAction/calculate/roll/rollGenerator"
import {
    MissionEngineTestHarness,
    MissionEngineTestHarnessIds,
} from "../../../testUtils/mission/missionEngineTestHarness"
import { MissionObjectiveCriteriaService } from "../../missionObjectiveCriteria"
import { MissionObjectiveService } from "../../missionObjective"
import { MissionObjectiveRewardService } from "../../missionObjectiveReward"

// [4,3]: roll sum 7, modifier -5 (rank 1 - defense 0 - 6), value = 2 → SUCCESS (2 dmg, demon survives)
const SUCCESS_HIT = [4, 3]
const GUARANTEED_MISS = [1, 1]

function advanceHarnessToPlayerTurn(harness: MissionEngineTestHarness): void {
    harness.transitionToNextPhase()
    harness.transitionToNextPhase()
}

function placeSlitherDemonAdjacentToLini(
    harness: MissionEngineTestHarness
): void {
    const demonId = harness.getSlitherDemonSquaddieId()
    const coordinateMapManager =
        harness.missionManager!.coordinateMapCollectionManager!
    coordinateMapManager.removeSquaddie({
        mapId: MissionEngineTestHarnessIds.mapId,
        squaddieId: demonId,
    })
    coordinateMapManager.addSquaddie({
        mapId: MissionEngineTestHarnessIds.mapId,
        squaddieId: demonId,
        coordinate: { row: 0, col: 1 },
    })
}

describe("MissionEngine — SQUADDIES_INJURED objective", () => {
    describe("when a matching squaddie is injured", () => {
        let harness: MissionEngineTestHarness

        beforeEach(() => {
            harness = new MissionEngineTestHarness(
                new RollGenerator(SUCCESS_HIT)
            )
            placeSlitherDemonAdjacentToLini(harness)
            advanceHarnessToPlayerTurn(harness)
        })

        it("the objective appears in the completed-but-not-rewarded list", () => {
            const demonId = harness.getSlitherDemonSquaddieId()
            const injuryObjective = MissionObjectiveService.new({
                id: "injured-demon",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["ouch"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesInjuredCriteria(
                        {
                            outOfBattleSquaddieIds: [
                                MissionEngineTestHarnessIds.slitherDemon
                                    .outOfBattleSquaddieId,
                            ],
                        }
                    ),
                ],
            })
            harness.addObjective(injuryObjective)

            harness.readyAction({
                actor: harness.getLiniSquaddieId(),
                targets: [demonId],
                action: {
                    id: MissionEngineTestHarnessIds.lini.scimitarActionId,
                },
            })
            harness.useActionAndGetResults()

            const completed =
                harness.getCompletedButNotRewardedMissionObjectives()
            expect(completed.map((o) => o.id)).toContain("injured-demon")
        })

        it("the objective is not present before any action is taken", () => {
            const injuryObjective = MissionObjectiveService.new({
                id: "injured-demon-no-action",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["ouch"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesInjuredCriteria(
                        {
                            outOfBattleSquaddieIds: [
                                MissionEngineTestHarnessIds.slitherDemon
                                    .outOfBattleSquaddieId,
                            ],
                        }
                    ),
                ],
            })
            harness.addObjective(injuryObjective)

            const completed =
                harness.getCompletedButNotRewardedMissionObjectives()
            expect(completed.map((o) => o.id)).not.toContain(
                "injured-demon-no-action"
            )
        })

        it("the objective does not fire when targeting an untracked squaddie", () => {
            const injuryObjective = MissionObjectiveService.new({
                id: "injured-lini-only",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["ouch"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesInjuredCriteria(
                        {
                            outOfBattleSquaddieIds: [
                                MissionEngineTestHarnessIds.lini
                                    .outOfBattleSquaddieId,
                            ],
                        }
                    ),
                ],
            })
            harness.addObjective(injuryObjective)

            harness.readyAction({
                actor: harness.getLiniSquaddieId(),
                targets: [harness.getSlitherDemonSquaddieId()],
                action: {
                    id: MissionEngineTestHarnessIds.lini.scimitarActionId,
                },
            })
            harness.useActionAndGetResults()

            const completed =
                harness.getCompletedButNotRewardedMissionObjectives()
            expect(completed.map((o) => o.id)).not.toContain(
                "injured-lini-only"
            )
        })

        it("the objective does not fire when the attack kills the squaddie", () => {
            harness.missionManager!.inBattleSquaddieManager!.dealDamageToSquaddie(
                {
                    ...harness.getSlitherDemonSquaddieId(),
                    damage: { amount: 1, type: undefined },
                }
            )

            const injuryObjective = MissionObjectiveService.new({
                id: "injured-but-dead",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["ouch"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesInjuredCriteria(
                        {
                            outOfBattleSquaddieIds: [
                                MissionEngineTestHarnessIds.slitherDemon
                                    .outOfBattleSquaddieId,
                            ],
                        }
                    ),
                ],
            })
            harness.addObjective(injuryObjective)

            harness.readyAction({
                actor: harness.getLiniSquaddieId(),
                targets: [harness.getSlitherDemonSquaddieId()],
                action: {
                    id: MissionEngineTestHarnessIds.lini.scimitarActionId,
                },
            })
            harness.useActionAndGetResults()

            const completed =
                harness.getCompletedButNotRewardedMissionObjectives()
            expect(completed.map((o) => o.id)).not.toContain("injured-but-dead")
        })

        it("the objective can be marked as rewarded", () => {
            const demonId = harness.getSlitherDemonSquaddieId()
            const injuryObjective = MissionObjectiveService.new({
                id: "injured-mark-reward",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["ouch"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesInjuredCriteria(
                        {
                            outOfBattleSquaddieIds: [
                                MissionEngineTestHarnessIds.slitherDemon
                                    .outOfBattleSquaddieId,
                            ],
                        }
                    ),
                ],
            })
            harness.addObjective(injuryObjective)

            harness.readyAction({
                actor: harness.getLiniSquaddieId(),
                targets: [demonId],
                action: {
                    id: MissionEngineTestHarnessIds.lini.scimitarActionId,
                },
            })
            harness.useActionAndGetResults()

            harness.markMissionObjectiveAsRewarded("injured-mark-reward")

            expect(
                harness
                    .getCompletedAndRewardedMissionObjectives()
                    .map((o) => o.id)
            ).toContain("injured-mark-reward")
        })
    })

    describe("when the attack misses", () => {
        let harness: MissionEngineTestHarness

        beforeEach(() => {
            harness = new MissionEngineTestHarness(
                new RollGenerator(GUARANTEED_MISS)
            )
            placeSlitherDemonAdjacentToLini(harness)
            advanceHarnessToPlayerTurn(harness)
        })

        it("the objective does not fire", () => {
            const injuryObjective = MissionObjectiveService.new({
                id: "injured-demon-miss",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["ouch"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesInjuredCriteria(
                        {
                            outOfBattleSquaddieIds: [
                                MissionEngineTestHarnessIds.slitherDemon
                                    .outOfBattleSquaddieId,
                            ],
                        }
                    ),
                ],
            })
            harness.addObjective(injuryObjective)

            harness.readyAction({
                actor: harness.getLiniSquaddieId(),
                targets: [harness.getSlitherDemonSquaddieId()],
                action: {
                    id: MissionEngineTestHarnessIds.lini.scimitarActionId,
                },
            })
            harness.useActionAndGetResults()

            const completed =
                harness.getCompletedButNotRewardedMissionObjectives()
            expect(completed.map((o) => o.id)).not.toContain(
                "injured-demon-miss"
            )
        })
    })

    describe("when matched by specific battle squaddie ID", () => {
        it("the objective fires", () => {
            const harness = new MissionEngineTestHarness(
                new RollGenerator(SUCCESS_HIT)
            )
            placeSlitherDemonAdjacentToLini(harness)
            advanceHarnessToPlayerTurn(harness)

            const demonId = harness.getSlitherDemonSquaddieId()
            const injuryObjective = MissionObjectiveService.new({
                id: "injured-specific-demon",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["ouch"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesInjuredCriteria(
                        {
                            battleSquaddieIds: [demonId],
                        }
                    ),
                ],
            })
            harness.addObjective(injuryObjective)

            harness.readyAction({
                actor: harness.getLiniSquaddieId(),
                targets: [demonId],
                action: {
                    id: MissionEngineTestHarnessIds.lini.scimitarActionId,
                },
            })
            harness.useActionAndGetResults()

            const completed =
                harness.getCompletedButNotRewardedMissionObjectives()
            expect(completed.map((o) => o.id)).toContain(
                "injured-specific-demon"
            )
        })
    })

    describe("before any action is taken", () => {
        it("the objective is listed as in-progress", () => {
            const harness = new MissionEngineTestHarness()
            advanceHarnessToPlayerTurn(harness)

            const injuryObjective = MissionObjectiveService.new({
                id: "injured-in-progress",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["ouch"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesInjuredCriteria(
                        {
                            outOfBattleSquaddieIds: [
                                MissionEngineTestHarnessIds.slitherDemon
                                    .outOfBattleSquaddieId,
                            ],
                        }
                    ),
                ],
            })
            harness.addObjective(injuryObjective)

            const inProgress = harness.getInProgressMissionObjectives()
            expect(inProgress.map((o) => o.id)).toContain("injured-in-progress")
        })
    })
})
