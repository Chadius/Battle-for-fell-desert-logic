import type { MissionManager } from "../mission/missionManager"
import {
    type CampaignCollection,
    CampaignCollectionService,
} from "./campaignCollection"
import type { CampaignMission } from "./campaignMission"

export class CampaignManager {
    campaignCollection?: CampaignCollection
    missionManagersById: Map<string, MissionManager>
    private currentMission?: MissionManager

    constructor(campaignCollection?: CampaignCollection) {
        this.campaignCollection = campaignCollection
        this.missionManagersById = new Map()
    }

    addMission(mission: CampaignMission): void {
        this.throwIfCollectionIsUndefined(this.addMission.name)
        this.campaignCollection = CampaignCollectionService.add({
            collection: this.campaignCollection!,
            mission,
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
        return CampaignCollectionService.getAllMissions(
            this.campaignCollection!
        )
    }

    private throwIfCollectionIsUndefined(callName: string): void {
        if (this.campaignCollection == undefined) {
            throw new Error(
                `[CampaignManager.${callName}]: campaignCollection must be defined`
            )
        }
    }

    private throwIfMissionManagerNotFound(callName: string, id: string): void {
        if (!this.missionManagersById.has(id)) {
            throw new Error(
                `[CampaignManager.${callName}]: mission ${id} not found`
            )
        }
    }
}
