import { beforeEach, describe, expect, it } from "vitest"
import { RollGenerator } from "../../../squaddieAction/calculate/roll/rollGenerator.js"
import {
    MissionEngineTestHarness,
    MissionEngineTestHarnessIds,
} from "../../../testUtils/mission/missionEngineTestHarness.js"
import {
    MissionObjectiveCriteriaService,
    MissionObjectiveCriteriaType,
} from "../../missionObjectiveCriteria.js"
import { MissionObjectiveService } from "../../missionObjective.js"
import {
    MissionObjectiveRewardService,
    MissionObjectiveRewardType,
} from "../../missionObjectiveReward.js"
import type {
    MissionObjectiveCriteriaProgress,
    MissionObjectiveStatus,
} from "../../missionObjectiveProgress.js"
import { SquaddieAffiliation } from "../../../affiliation/affiliation.js"

const KILL_HIT = [6, 6]
const GOAL_OBJECTIVE_ID = "defeat-enemies"
const HIDDEN_CUTSCENE_OBJECTIVE_ID = "secret-cutscene"

const findStatus = (
    harness: MissionEngineTestHarness,
    id: string
): MissionObjectiveStatus | undefined =>
    harness
        .getMissionObjectiveStatuses()
        .find((objectiveStatus) => objectiveStatus.id === id)

const findDefeatAllEnemiesProgress = (
    harness: MissionEngineTestHarness
): MissionObjectiveCriteriaProgress | undefined =>
    findStatus(harness, GOAL_OBJECTIVE_ID)?.criteria.find(
        (criterion) =>
            criterion.type ===
            MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED
    )?.progress

const addDefeatAllEnemiesObjective = (
    harness: MissionEngineTestHarness,
    { id, hidden }: { id: string; hidden: boolean }
) => {
    harness.addObjective(
        MissionObjectiveService.new({
            id,
            rewards: hidden
                ? [MissionObjectiveRewardService.newPlayMovieReward("secret")]
                : [MissionObjectiveRewardService.newMissionEndsReward()],
            criteria: [
                MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {
                        affiliations: [SquaddieAffiliation.ENEMY],
                    }
                ),
            ],
            hidden,
        })
    )
}

describe("MissionEngine.getMissionObjectiveStatuses", () => {
    let harness: MissionEngineTestHarness

    beforeEach(() => {
        harness = new MissionEngineTestHarness(new RollGenerator(KILL_HIT))
        harness.placeSlitherDemonAdjacentToLini()
        harness.advanceToPlayerTurn()
        addDefeatAllEnemiesObjective(harness, {
            id: GOAL_OBJECTIVE_ID,
            hidden: false,
        })
        addDefeatAllEnemiesObjective(harness, {
            id: HIDDEN_CUTSCENE_OBJECTIVE_ID,
            hidden: true,
        })
    })

    describe("a hidden objective", () => {
        it("is included and marked hidden", () => {
            expect(
                findStatus(harness, HIDDEN_CUTSCENE_OBJECTIVE_ID)?.hidden
            ).toBe(true)
        })
    })

    describe("a visible objective", () => {
        it("is not marked hidden", () => {
            expect(findStatus(harness, GOAL_OBJECTIVE_ID)?.hidden).toBe(false)
        })
    })

    describe("an objective that ends the mission", () => {
        it("reports the MISSION_ENDS reward type", () => {
            expect(findStatus(harness, GOAL_OBJECTIVE_ID)?.rewardTypes).toEqual(
                [MissionObjectiveRewardType.MISSION_ENDS]
            )
        })
    })

    describe("an objective that triggers a cutscene", () => {
        it("reports the PLAY_MOVIE reward type", () => {
            expect(
                findStatus(harness, HIDDEN_CUTSCENE_OBJECTIVE_ID)?.rewardTypes
            ).toEqual([MissionObjectiveRewardType.PLAY_MOVIE])
        })
    })

    describe("before any enemy is defeated", () => {
        it("reports one enemy remaining", () => {
            expect(findDefeatAllEnemiesProgress(harness)).toEqual(
                expect.objectContaining({ remainingCount: 1 })
            )
        })
    })

    describe("when Lini defeats the only enemy", () => {
        beforeEach(() => {
            harness.readyAction({
                actor: harness.getLiniSquaddieId(),
                targets: [harness.getSlitherDemonSquaddieId()],
                action: {
                    id: MissionEngineTestHarnessIds.lini.scimitarActionId,
                },
            })
            harness.useActionAndGetResults()
        })

        it("completes the objective", () => {
            expect(findStatus(harness, GOAL_OBJECTIVE_ID)?.isCompleted).toBe(
                true
            )
        })

        it("reports no enemies remaining", () => {
            expect(findDefeatAllEnemiesProgress(harness)).toEqual(
                expect.objectContaining({ remainingCount: 0 })
            )
        })
    })
})
