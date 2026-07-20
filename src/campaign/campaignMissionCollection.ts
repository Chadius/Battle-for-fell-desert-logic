import type { CampaignMission } from "./campaignMission.js"

export interface CampaignMissionCollection {
    missionsById: Map<string, CampaignMission>
}

export const CampaignMissionCollectionService = {
    new: (): CampaignMissionCollection => ({ missionsById: new Map() }),

    add: ({
        collection,
        campaignMission,
    }: {
        collection: CampaignMissionCollection
        campaignMission: CampaignMission
    }): CampaignMissionCollection => {
        throwIfCollectionIsUndefined(collection, "add")
        const newMissionsById = new Map(collection.missionsById)
        newMissionsById.set(campaignMission.id, campaignMission)
        return { missionsById: newMissionsById }
    },

    getById: ({
        collection,
        id,
    }: {
        collection: CampaignMissionCollection
        id: string
    }): CampaignMission | undefined => {
        throwIfCollectionIsUndefined(collection, "getById")
        return collection.missionsById.get(id)
    },

    getAllMissions: (
        collection: CampaignMissionCollection
    ): CampaignMission[] => {
        throwIfCollectionIsUndefined(collection, "getAllMissions")
        return [...collection.missionsById.values()]
    },
}

const throwIfCollectionIsUndefined = (
    collection: CampaignMissionCollection,
    callName: string
) => {
    if (collection == undefined)
        throw new Error(
            `[CampaignMissionCollection.${callName}]: collection must be defined`
        )
}
