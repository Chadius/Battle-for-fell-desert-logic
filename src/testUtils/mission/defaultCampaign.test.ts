import { describe, expect, it } from "vitest"
import {
    createDefaultCampaignManager,
    DefaultCampaignIds,
} from "./defaultCampaign.js"
import { MissionEngineTestHarnessIds } from "./missionEngineTestHarness.js"
import { InBattleSquaddieCollectionService } from "../../squaddie/inBattle/inBattleSquaddieCollection.js"

describe("DefaultCampaign", () => {
    it("createDefaultCampaignManager returns a manager with missions", () => {
        const campaignManager = createDefaultCampaignManager()

        const serialized = campaignManager.getSerializedMissions()
        expect(serialized.length).greaterThan(0)
    })

    it("loadMissionById returns a MissionManager for the first mission", () => {
        const campaignManager = createDefaultCampaignManager()

        campaignManager.loadMissionById(DefaultCampaignIds.mission1Id)

        expect(campaignManager.getCurrentMission()).toBeDefined()
    })

    describe("the loaded first MissionManager has Lini and Slither Demon", () => {
        const loadFirstMission = () => {
            const campaignManager = createDefaultCampaignManager()
            campaignManager.loadMissionById(DefaultCampaignIds.mission1Id)
            const missionManager = campaignManager.getCurrentMission()!
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
