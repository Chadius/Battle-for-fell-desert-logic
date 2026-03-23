import { describe, expect, it } from "vitest"
import {
    createDefaultCampaignManager,
    DefaultCampaignIds,
} from "./defaultCampaign"
import { MissionEngineTestHarnessIds } from "./missionEngineTestHarness"
import { InBattleSquaddieCollectionService } from "../../squaddie/inBattle/inBattleSquaddieCollection"

describe("DefaultCampaign", () => {
    it("createDefaultCampaignManager returns a manager with 2 missions", () => {
        const campaignManager = createDefaultCampaignManager()

        const serialized = campaignManager.getSerializedMissions()
        expect(serialized).toHaveLength(2)
    })

    it("getSerializedMissions returns the expected mission ids", () => {
        const campaignManager = createDefaultCampaignManager()

        const serialized = campaignManager.getSerializedMissions()
        const ids = serialized.map((m) => m.id)

        expect(ids).toContain(DefaultCampaignIds.mission1Id)
        expect(ids).toContain(DefaultCampaignIds.mission2Id)
    })

    it("loadMissionById returns a MissionManager for the first mission", () => {
        const campaignManager = createDefaultCampaignManager()

        campaignManager.loadMissionById(DefaultCampaignIds.mission1Id)

        expect(campaignManager.getCurrentMission()).toBeDefined()
    })

    describe("the loaded MissionManager has Lini and Slither Demon", () => {
        const loadFirstMission = () => {
            const campaignManager = createDefaultCampaignManager()
            campaignManager.loadMissionById(DefaultCampaignIds.mission1Id)
            const missionManager = campaignManager.getCurrentMission()!
            const collection =
                missionManager.inBattleSquaddieManager!
                    .inBattleSquaddieCollection!
            return collection
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
