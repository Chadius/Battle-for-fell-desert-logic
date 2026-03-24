import { CampaignManager } from "../../campaign/campaignManager"
import { CampaignCollectionService } from "../../campaign/campaignCollection"
import { CampaignMissionService } from "../../campaign/campaignMission"
import { MissionEngineTestHarness } from "./missionEngineTestHarness"
import { createTargetPracticeMission } from "./targetPracticeMission"

export const DefaultCampaignIds = {
    mission1Id: "test-harness-mission-1",
    mission1Name: "Test Harness Mission",
    mission2Id: "vale-gloria-mission-1",
    mission2Name: "Vale and Gloria Mission",
} as const

export function createDefaultCampaignManager(): CampaignManager {
    const manager = new CampaignManager(CampaignCollectionService.new())

    manager.addMission(
        CampaignMissionService.new({
            id: DefaultCampaignIds.mission1Id,
            name: DefaultCampaignIds.mission1Name,
        })
    )
    manager.addMissionManager({
        id: DefaultCampaignIds.mission1Id,
        missionManager: new MissionEngineTestHarness().missionManager!,
    })

    manager.addMission(
        CampaignMissionService.new({
            id: DefaultCampaignIds.mission2Id,
            name: DefaultCampaignIds.mission2Name,
        })
    )
    manager.addMissionManager({
        id: DefaultCampaignIds.mission2Id,
        missionManager: createTargetPracticeMission(),
    })

    return manager
}
