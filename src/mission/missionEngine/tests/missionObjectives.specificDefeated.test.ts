import { beforeEach, describe, expect, it } from "vitest"
import { RollGenerator } from "../../../squaddieAction/calculate/roll/rollGenerator.js"
import {
    MissionEngineTestHarness,
    MissionEngineTestHarnessIds,
} from "../../../testUtils/mission/missionEngineTestHarness.js"
import { MissionObjectiveCriteriaService } from "../../missionObjectiveCriteria.js"
import { MissionObjectiveService } from "../../missionObjective.js"
import { MissionObjectiveRewardService } from "../../missionObjectiveReward.js"

const KILL_HIT = [6, 6]
const SUCCESS_HIT = [4, 3]
const GUARANTEED_MISS = [1, 1]

describe("MissionEngine — SPECIFIC_SQUADDIES_DEFEATED objective", () => {
    describe("when a matching squaddie is KO'd", () => {
        let harness: MissionEngineTestHarness

        beforeEach(() => {
            harness = new MissionEngineTestHarness(new RollGenerator(KILL_HIT))
            harness.placeSlitherDemonAdjacentToLini()
            harness.advanceToPlayerTurn()
        })

        it("the objective appears in the completed-but-not-rewarded list", () => {
            const demonId = harness.getSlitherDemonSquaddieId()
            const defeatedObjective = MissionObjectiveService.new({
                id: "demon-koed",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward("down!"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                        {
                            outOfBattleSquaddieIds: [
                                MissionEngineTestHarnessIds.slitherDemon
                                    .outOfBattleSquaddieId,
                            ],
                        }
                    ),
                ],
            })
            harness.addObjective(defeatedObjective)

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
            expect(completed.map((o) => o.id)).toContain("demon-koed")
        })

        it("the objective is not present before any action is taken", () => {
            const defeatedObjective = MissionObjectiveService.new({
                id: "demon-koed-no-action",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward("down!"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                        {
                            outOfBattleSquaddieIds: [
                                MissionEngineTestHarnessIds.slitherDemon
                                    .outOfBattleSquaddieId,
                            ],
                        }
                    ),
                ],
            })
            harness.addObjective(defeatedObjective)

            const completed =
                harness.getCompletedButNotRewardedMissionObjectives()
            expect(completed.map((o) => o.id)).not.toContain(
                "demon-koed-no-action"
            )
        })

        it("the objective does not fire when a different squaddie is targeted", () => {
            const defeatedObjective = MissionObjectiveService.new({
                id: "lini-koed-only",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward("down!"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                        {
                            outOfBattleSquaddieIds: [
                                MissionEngineTestHarnessIds.lini
                                    .outOfBattleSquaddieId,
                            ],
                        }
                    ),
                ],
            })
            harness.addObjective(defeatedObjective)

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
            expect(completed.map((o) => o.id)).not.toContain("lini-koed-only")
        })

        it("the objective can be marked as rewarded", () => {
            const demonId = harness.getSlitherDemonSquaddieId()
            const defeatedObjective = MissionObjectiveService.new({
                id: "demon-koed-mark-reward",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward("down!"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                        {
                            outOfBattleSquaddieIds: [
                                MissionEngineTestHarnessIds.slitherDemon
                                    .outOfBattleSquaddieId,
                            ],
                        }
                    ),
                ],
            })
            harness.addObjective(defeatedObjective)

            harness.readyAction({
                actor: harness.getLiniSquaddieId(),
                targets: [demonId],
                action: {
                    id: MissionEngineTestHarnessIds.lini.scimitarActionId,
                },
            })
            harness.useActionAndGetResults()

            harness.markMissionObjectiveAsRewarded("demon-koed-mark-reward")

            expect(
                harness
                    .getCompletedAndRewardedMissionObjectives()
                    .map((o) => o.id)
            ).toContain("demon-koed-mark-reward")
        })
    })

    describe("when the attack misses", () => {
        let harness: MissionEngineTestHarness

        beforeEach(() => {
            harness = new MissionEngineTestHarness(
                new RollGenerator(GUARANTEED_MISS)
            )
            harness.placeSlitherDemonAdjacentToLini()
            harness.advanceToPlayerTurn()
        })

        it("the objective does not fire", () => {
            const defeatedObjective = MissionObjectiveService.new({
                id: "demon-koed-miss",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward("down!"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                        {
                            outOfBattleSquaddieIds: [
                                MissionEngineTestHarnessIds.slitherDemon
                                    .outOfBattleSquaddieId,
                            ],
                        }
                    ),
                ],
            })
            harness.addObjective(defeatedObjective)

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
            expect(completed.map((o) => o.id)).not.toContain("demon-koed-miss")
        })
    })

    describe("when the attack hits but does not kill", () => {
        let harness: MissionEngineTestHarness

        beforeEach(() => {
            harness = new MissionEngineTestHarness(
                new RollGenerator(SUCCESS_HIT)
            )
            harness.placeSlitherDemonAdjacentToLini()
            harness.advanceToPlayerTurn()
        })

        it("the objective does not fire", () => {
            const defeatedObjective = MissionObjectiveService.new({
                id: "demon-koed-but-only-hurt",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward("down!"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                        {
                            outOfBattleSquaddieIds: [
                                MissionEngineTestHarnessIds.slitherDemon
                                    .outOfBattleSquaddieId,
                            ],
                        }
                    ),
                ],
            })
            harness.addObjective(defeatedObjective)

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
                "demon-koed-but-only-hurt"
            )
        })
    })

    describe("when matched by specific battle squaddie ID", () => {
        it("the objective fires", () => {
            const harness = new MissionEngineTestHarness(
                new RollGenerator(KILL_HIT)
            )
            harness.placeSlitherDemonAdjacentToLini()
            harness.advanceToPlayerTurn()

            const demonId = harness.getSlitherDemonSquaddieId()
            const defeatedObjective = MissionObjectiveService.new({
                id: "specific-demon-koed",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward("down!"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                        { battleSquaddieIds: [demonId] }
                    ),
                ],
            })
            harness.addObjective(defeatedObjective)

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
            expect(completed.map((o) => o.id)).toContain("specific-demon-koed")
        })
    })

    describe("before any action is taken", () => {
        it("the objective is listed as in-progress", () => {
            const harness = new MissionEngineTestHarness()
            harness.advanceToPlayerTurn()

            const defeatedObjective = MissionObjectiveService.new({
                id: "demon-koed-in-progress",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward("down!"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                        {
                            outOfBattleSquaddieIds: [
                                MissionEngineTestHarnessIds.slitherDemon
                                    .outOfBattleSquaddieId,
                            ],
                        }
                    ),
                ],
            })
            harness.addObjective(defeatedObjective)

            const inProgress = harness.getInProgressMissionObjectives()
            expect(inProgress.map((o) => o.id)).toContain(
                "demon-koed-in-progress"
            )
        })
    })
})
