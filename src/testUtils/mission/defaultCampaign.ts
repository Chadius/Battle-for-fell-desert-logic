import { CampaignMissionManager } from "../../campaign/campaignMissionManager.js"
import { CampaignMissionCollectionService } from "../../campaign/campaignMissionCollection.js"
import { CampaignMissionService } from "../../campaign/campaignMission.js"
import { MissionEngineTestHarness } from "./missionEngineTestHarness.js"
import { createTargetPracticeMission } from "./targetPracticeMission.js"
import { createMovementTestMission } from "./movementTestMission.js"
import { createSneakAttackMission } from "./sneakAttackMission.js"

export const DefaultCampaignIds = {
    mission1Id: "test-harness-mission-1",
    mission1Name: "Test Harness Mission",
    mission2Id: "vale-gloria-mission-1",
    mission2Name: "Vale and Gloria Mission",
    mission3Id: "movement-test-mission-1",
    mission3Name: "Movement Test Mission",
    mission4Id: "sneak-attack-mission",
    mission4Name: "Sneak Attack Mission",
} as const

export function createDefaultCampaignMissionManager(): CampaignMissionManager {
    const campaignMissionManager = new CampaignMissionManager(
        CampaignMissionCollectionService.new()
    )

    campaignMissionManager.addMission(
        CampaignMissionService.new({
            id: DefaultCampaignIds.mission1Id,
            name: DefaultCampaignIds.mission1Name,
        })
    )
    campaignMissionManager.addMissionManager({
        id: DefaultCampaignIds.mission1Id,
        missionManager: new MissionEngineTestHarness().missionManager!,
    })

    campaignMissionManager.addMission(
        CampaignMissionService.new({
            id: DefaultCampaignIds.mission2Id,
            name: DefaultCampaignIds.mission2Name,
        })
    )
    campaignMissionManager.addMissionManager({
        id: DefaultCampaignIds.mission2Id,
        missionManager: createTargetPracticeMission(),
    })

    campaignMissionManager.addMission(
        CampaignMissionService.new({
            id: DefaultCampaignIds.mission3Id,
            name: DefaultCampaignIds.mission3Name,
        })
    )
    campaignMissionManager.addMissionManager({
        id: DefaultCampaignIds.mission3Id,
        missionManager: createMovementTestMission().missionManager,
    })

    campaignMissionManager.addMission(
        CampaignMissionService.new({
            id: DefaultCampaignIds.mission4Id,
            name: DefaultCampaignIds.mission4Name,
        })
    )
    campaignMissionManager.addMissionManager({
        id: DefaultCampaignIds.mission4Id,
        missionManager: createSneakAttackMission().missionManager,
    })

    return campaignMissionManager
}
