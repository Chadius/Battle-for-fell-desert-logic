import type { MissionManager } from "../mission/missionManager.js"
import {
    type CampaignMissionCollection,
    CampaignMissionCollectionService,
} from "./campaignMissionCollection.js"
import type { CampaignMission } from "./campaignMission.js"

export class CampaignMissionManager {
    campaignMissionCollection?: CampaignMissionCollection
    missionManagersById: Map<string, MissionManager>
    private currentMission?: MissionManager

    constructor(campaignMissionCollection?: CampaignMissionCollection) {
        this.campaignMissionCollection = campaignMissionCollection
        this.missionManagersById = new Map()
    }

    addMission(campaignMission: CampaignMission): void {
        this.throwIfCollectionIsUndefined(this.addMission.name)
        this.campaignMissionCollection = CampaignMissionCollectionService.add({
            collection: this.campaignMissionCollection!,
            campaignMission,
        })
    }

    addMissionManager({
        id,
        missionManager,
    }: {
        id: string
        missionManager: MissionManager
    }): void {
        this.missionManagersById.set(id, missionManager)
    }

    loadMissionById(id: string): void {
        this.throwIfMissionManagerNotFound(this.loadMissionById.name, id)
        this.currentMission = this.missionManagersById.get(id)
    }

    getCurrentMission(): MissionManager | undefined {
        return this.currentMission
    }

    getSerializedMissions(): CampaignMission[] {
        this.throwIfCollectionIsUndefined(this.getSerializedMissions.name)
        return CampaignMissionCollectionService.getAllMissions(
            this.campaignMissionCollection!
        )
    }

    private throwIfCollectionIsUndefined(callName: string): void {
        if (this.campaignMissionCollection == undefined) {
            throw new Error(
                `[CampaignMissionManager.${callName}]: campaignMissionCollection must be defined`
            )
        }
    }

    private throwIfMissionManagerNotFound(callName: string, id: string): void {
        if (!this.missionManagersById.has(id)) {
            throw new Error(
                `[CampaignMissionManager.${callName}]: mission ${id} not found`
            )
        }
    }
}
