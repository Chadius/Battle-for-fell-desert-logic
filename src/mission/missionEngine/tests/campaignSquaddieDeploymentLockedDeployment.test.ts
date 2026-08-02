import { describe, expect, it } from "vitest"
import {
    CampaignTestHarnessWithLockedDeployment,
    CampaignTestHarnessWithLockedDeploymentIds,
} from "../../../testUtils/campaign/campaignTestHarnessWithLockedDeployment.js"

const LINI_ID =
    CampaignTestHarnessWithLockedDeploymentIds.lini.campaignSquaddieId
const VALE_ID =
    CampaignTestHarnessWithLockedDeploymentIds.vale.campaignSquaddieId
const OTTO_ID =
    CampaignTestHarnessWithLockedDeploymentIds.otto.campaignSquaddieId
const ZAYA_ID =
    CampaignTestHarnessWithLockedDeploymentIds.zaya.campaignSquaddieId
const LEADER_COORDINATE_ID =
    CampaignTestHarnessWithLockedDeploymentIds.lini.leaderCoordinateId
const VALE_COORDINATE_ID =
    CampaignTestHarnessWithLockedDeploymentIds.vale.coordinateId
const OPEN_COORDINATE_ID =
    CampaignTestHarnessWithLockedDeploymentIds.openCoordinateId

describe("CampaignTestHarnessWithLockedDeployment", () => {
    describe("getCampaignDeploymentStatus after finalizeLoadingMission's default assignment pass", () => {
        it("assigns the leader to the locked LEADER coordinate, Vale to her locked coordinate, leaves the open coordinate open, and reports Otto and Zaya as unplaced", () => {
            const engine = new CampaignTestHarnessWithLockedDeployment()
            engine.finalizeLoadingMission()

            const status = engine.getCampaignDeploymentStatus()

            expect(status.assignments[LEADER_COORDINATE_ID].id).toBe(LINI_ID)
            expect(status.assignments[VALE_COORDINATE_ID].id).toBe(VALE_ID)
            expect(
                status.openCoordinates.map((coordinate) => coordinate.id)
            ).toEqual([OPEN_COORDINATE_ID])
            expect(
                status.unplacedEligibleCampaignSquaddies.map(
                    (campaignSquaddie) => campaignSquaddie.id
                )
            ).toEqual([OTTO_ID, ZAYA_ID])
        })
    })

    describe("undeployCampaignSquaddie", () => {
        describe("when the coordinate is locked and satisfied by its requested squaddie", () => {
            it("throws instead of clearing the assignment", () => {
                const engine = new CampaignTestHarnessWithLockedDeployment()
                engine.finalizeLoadingMission()

                expect(() =>
                    engine.undeployCampaignSquaddie(LEADER_COORDINATE_ID)
                ).toThrow()
            })
        })
    })

    describe("swapCampaignSquaddieDeployment", () => {
        describe("when one of the two coordinates is locked and satisfied", () => {
            it("throws instead of swapping the assignments", () => {
                const engine = new CampaignTestHarnessWithLockedDeployment()
                engine.finalizeLoadingMission()

                expect(() =>
                    engine.swapCampaignSquaddieDeployment({
                        coordinateIdA: VALE_COORDINATE_ID,
                        coordinateIdB: OPEN_COORDINATE_ID,
                    })
                ).toThrow()
            })
        })
    })

    describe("deployCampaignSquaddie", () => {
        describe("when assigning an unplaced squaddie to the unlocked open coordinate", () => {
            it("assigns the campaign squaddie to that coordinate", () => {
                const engine = new CampaignTestHarnessWithLockedDeployment()
                engine.finalizeLoadingMission()

                engine.deployCampaignSquaddie({
                    coordinateId: OPEN_COORDINATE_ID,
                    campaignSquaddieId: OTTO_ID,
                })

                const status = engine.getCampaignDeploymentStatus()
                expect(status.assignments[OPEN_COORDINATE_ID].id).toBe(OTTO_ID)
            })
        })
    })
})
