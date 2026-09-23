import { beforeEach, describe, expect, it } from "vitest"
import { MissionObjectiveService } from "../../missionObjective.js"
import { MissionObjectiveRewardService } from "../../missionObjectiveReward.js"
import { MissionObjectiveCriteriaService } from "../../missionObjectiveCriteria.js"
import { MissionAffiliationTurn } from "../../missionTurn.js"
import { DEFAULT_INJURY_DURATION_IN_MISSIONS } from "../../../campaign/army/campaignSquaddie.js"
import {
    CampaignTestHarness,
    CampaignTestHarnessIds,
} from "../../../testUtils/campaign/campaignTestHarness.js"

const LINI_ID = CampaignTestHarnessIds.lini.campaignSquaddieId
const REM_ID = CampaignTestHarnessIds.rem.campaignSquaddieId
const WIN_OBJECTIVE_ID = "win"
const LOSE_OBJECTIVE_ID = "lose"

const objectiveCompleteFromTheStart = () =>
    MissionObjectiveCriteriaService.newPhaseReachedCriteria({
        turnCount: 0,
        missionAffiliationTurn: MissionAffiliationTurn.TURN_START,
    })

const newHarness = () =>
    new CampaignTestHarness({
        objectives: [
            MissionObjectiveService.new({
                id: WIN_OBJECTIVE_ID,
                rewards: [MissionObjectiveRewardService.newMissionEndsReward()],
                criteria: [objectiveCompleteFromTheStart()],
            }),
            MissionObjectiveService.new({
                id: LOSE_OBJECTIVE_ID,
                rewards: [
                    MissionObjectiveRewardService.newMissionFailureReward(),
                ],
                criteria: [objectiveCompleteFromTheStart()],
            }),
        ],
    })

const startMissionWithLiniAndRem = (harness: CampaignTestHarness) => {
    harness.finalizeLoadingMission()
    harness.deployCampaignSquaddie({
        coordinateId: CampaignTestHarnessIds.openCoordinateId,
        campaignSquaddieId: REM_ID,
    })
    harness.finalizeCampaignSquaddieDeploymentAndStartMission()
}

describe("MissionEngine campaign squaddie injuries", () => {
    let harness: CampaignTestHarness

    beforeEach(() => {
        harness = newHarness()
        startMissionWithLiniAndRem(harness)
        harness.knockOutSquaddie(
            CampaignTestHarnessIds.lini.outOfBattleSquaddieId
        )
    })

    describe("while the mission is still going", () => {
        it("has no army mission result", () => {
            expect(harness.getArmyMissionResult()).toBeUndefined()
        })
    })

    describe("when the mission is won with a squaddie knocked out", () => {
        beforeEach(() => {
            harness.markMissionObjectiveAsRewarded(WIN_OBJECTIVE_ID)
        })

        it("reports only the knocked out squaddie for this mission", () => {
            expect(harness.getArmyMissionResult()).toEqual({
                missionId: CampaignTestHarnessIds.missionStateId,
                knockedOutCampaignSquaddieIds: [LINI_ID],
            })
        })

        describe("when the host records the result with its army", () => {
            it("reports the knocked out squaddie as injured", () => {
                harness
                    .getArmyManager()
                    .recordMissionCompleted(harness.getArmyMissionResult()!)

                expect(harness.getInjuredCampaignSquaddies()).toEqual([
                    expect.objectContaining({
                        id: LINI_ID,
                        injury: {
                            duration: DEFAULT_INJURY_DURATION_IN_MISSIONS,
                        },
                    }),
                ])
            })
        })
    })

    describe("when the mission is lost", () => {
        it("has no army mission result to record", () => {
            harness.markMissionObjectiveAsRewarded(LOSE_OBJECTIVE_ID)

            expect(harness.getArmyMissionResult()).toBeUndefined()
        })
    })

    describe("when the mission is saved and loaded before it is won", () => {
        it("still reports the knocked out squaddie", () => {
            const loaded = harness.saveAndLoad()

            loaded.markMissionObjectiveAsRewarded(WIN_OBJECTIVE_ID)

            expect(
                loaded.getArmyMissionResult()?.knockedOutCampaignSquaddieIds
            ).toEqual([LINI_ID])
        })
    })
})

describe("MissionEngine injured campaign squaddies", () => {
    describe("when nobody in the army is injured", () => {
        it("reports no injured squaddies", () => {
            expect(newHarness().getInjuredCampaignSquaddies()).toEqual([])
        })
    })

    describe("when an army squaddie is injured", () => {
        it("reports the squaddie and the injury", () => {
            const harness = newHarness()
            harness.injureCampaignSquaddie({
                campaignSquaddieId: REM_ID,
                injury: {},
            })

            expect(harness.getInjuredCampaignSquaddies()).toEqual([
                expect.objectContaining({ id: REM_ID, injury: {} }),
            ])
        })
    })
})
