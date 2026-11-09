import { CampaignMissionManager } from "../../campaign/campaignMissionManager.js"
import { CampaignMissionCollectionService } from "../../campaign/campaignMissionCollection.js"
import { CampaignMissionService } from "../../campaign/campaignMission.js"
import { MissionEngineTestHarness } from "./missionEngineTestHarness.js"
import { createTargetPracticeMission } from "./targetPracticeMission.js"
import { createMovementTestMission } from "./movementTestMission.js"
import { createSneakAttackMission } from "./sneakAttackMission.js"

export const DefaultCampaignIds = {
    mission1Id: "test-harness-mission-1",
    mission2Id: "vale-gloria-mission-1",
    mission3Id: "movement-test-mission-1",
    mission4Id: "sneak-attack-mission",
} as const

export function createDefaultCampaignMissionManager(): CampaignMissionManager {
    const campaignMissionManager = new CampaignMissionManager(
        CampaignMissionCollectionService.new()
    )

    campaignMissionManager.addMission(
        CampaignMissionService.new({
            id: DefaultCampaignIds.mission1Id,
        })
    )
    campaignMissionManager.addMissionManager({
        id: DefaultCampaignIds.mission1Id,
        missionManager: new MissionEngineTestHarness().missionManager!,
    })

    campaignMissionManager.addMission(
        CampaignMissionService.new({
            id: DefaultCampaignIds.mission2Id,
        })
    )
    campaignMissionManager.addMissionManager({
        id: DefaultCampaignIds.mission2Id,
        missionManager: createTargetPracticeMission(),
    })

    campaignMissionManager.addMission(
        CampaignMissionService.new({
            id: DefaultCampaignIds.mission3Id,
        })
    )
    campaignMissionManager.addMissionManager({
        id: DefaultCampaignIds.mission3Id,
        missionManager: createMovementTestMission().missionManager,
    })

    campaignMissionManager.addMission(
        CampaignMissionService.new({
            id: DefaultCampaignIds.mission4Id,
        })
    )
    campaignMissionManager.addMissionManager({
        id: DefaultCampaignIds.mission4Id,
        missionManager: createSneakAttackMission().missionManager,
    })

    return campaignMissionManager
}
