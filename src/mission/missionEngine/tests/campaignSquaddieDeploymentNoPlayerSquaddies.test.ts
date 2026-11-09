import { beforeEach, describe, expect, it } from "vitest"
import {
    CampaignTestHarness,
    CampaignTestHarnessIds,
} from "../../../testUtils/campaign/campaignTestHarness.js"
import { FinalizeLoadingMissionRejectionReason } from "../finalizeLoadingMissionRejection.js"

const injureWholeArmy = (harness: CampaignTestHarness) => {
    for (const campaignSquaddieId of [
        CampaignTestHarnessIds.lini.campaignSquaddieId,
        CampaignTestHarnessIds.rem.campaignSquaddieId,
    ]) {
        harness.injureCampaignSquaddie({
            campaignSquaddieId,
            injury: { duration: 1 },
        })
    }
}

describe("MissionEngine when no player squaddie can join the mission", () => {
    let harness: CampaignTestHarness

    beforeEach(() => {
        harness = new CampaignTestHarness()
    })

    describe("when every army squaddie is injured", () => {
        beforeEach(() => {
            injureWholeArmy(harness)
        })

        describe("when the mission has no player squaddies of its own", () => {
            it("rejects the mission because no player squaddie can deploy", () => {
                const result = harness.finalizeLoadingMission()

                expect(result).toEqual({
                    isValid: false,
                    rejection: {
                        reason: FinalizeLoadingMissionRejectionReason.NO_PLAYER_SQUADDIE_CAN_DEPLOY,
                    },
                })
            })

            it("does not begin deployment", () => {
                harness.finalizeLoadingMission()

                expect(harness.isCampaignSquaddieDeploymentInProgress()).toBe(
                    false
                )
            })
        })

        describe("when the mission has a player squaddie of its own", () => {
            it("begins deployment", () => {
                harness.addGuestPlayerSquaddie()

                harness.finalizeLoadingMission()

                expect(harness.isCampaignSquaddieDeploymentInProgress()).toBe(
                    true
                )
            })
        })
    })

    describe("when the player removes every campaign squaddie from deployment", () => {
        const beginDeploymentWithNobodyAssigned = () => {
            harness.finalizeLoadingMission()
            harness.undeployCampaignSquaddie(
                CampaignTestHarnessIds.lini.coordinateId
            )
        }

        describe("when the mission has no player squaddies of its own", () => {
            it("refuses to start the mission", () => {
                beginDeploymentWithNobodyAssigned()

                expect(() =>
                    harness.finalizeCampaignSquaddieDeploymentAndStartMission()
                ).toThrow("the mission cannot start")
            })
        })

        describe("when the mission has a player squaddie of its own", () => {
            it("starts the mission", () => {
                harness.addGuestPlayerSquaddie()
                beginDeploymentWithNobodyAssigned()

                expect(() =>
                    harness.finalizeCampaignSquaddieDeploymentAndStartMission()
                ).not.toThrow()
            })
        })
    })
})
