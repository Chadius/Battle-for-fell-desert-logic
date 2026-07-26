import { describe, expect, it } from "vitest"
import {
    createDefaultCampaignMissionManager,
    DefaultCampaignIds,
} from "./defaultCampaign.js"
import { MissionEngineTestHarnessIds } from "./missionEngineTestHarness.js"
import { InBattleSquaddieCollectionService } from "../../squaddie/inBattle/inBattleSquaddieCollection.js"

describe("DefaultCampaign", () => {
    it("createDefaultCampaignMissionManager returns a manager with missions", () => {
        const campaignMissionManager = createDefaultCampaignMissionManager()

        const serialized = campaignMissionManager.getSerializedMissions()
        expect(serialized.length).greaterThan(0)
    })

    it("loadMissionById returns a MissionManager for the first mission", () => {
        const campaignMissionManager = createDefaultCampaignMissionManager()

        campaignMissionManager.loadMissionById(DefaultCampaignIds.mission1Id)

        expect(campaignMissionManager.getCurrentMission()).toBeDefined()
    })

    describe("the loaded first MissionManager has Lini and Slither Demon", () => {
        const loadFirstMission = () => {
            const campaignMissionManager = createDefaultCampaignMissionManager()
            campaignMissionManager.loadMissionById(
                DefaultCampaignIds.mission1Id
            )
            const missionManager = campaignMissionManager.getCurrentMission()!
            return missionManager.inBattleSquaddieManager!
                .inBattleSquaddieCollection!
        }

        it("has Lini", () => {
            const collection = loadFirstMission()
            const liniInstances =
                InBattleSquaddieCollectionService.getSquaddiesByOutOfBattleSquaddieId(
                    {
                        collection,
                        outOfBattleSquaddieId:
                            MissionEngineTestHarnessIds.lini
                                .outOfBattleSquaddieId,
                    }
                )
            expect(liniInstances).toHaveLength(1)
        })

        it("has Slither Demon", () => {
            const collection = loadFirstMission()
            const slitherDemonInstances =
                InBattleSquaddieCollectionService.getSquaddiesByOutOfBattleSquaddieId(
                    {
                        collection,
                        outOfBattleSquaddieId:
                            MissionEngineTestHarnessIds.slitherDemon
                                .outOfBattleSquaddieId,
                    }
                )
            expect(slitherDemonInstances).toHaveLength(1)
        })
    })
})
