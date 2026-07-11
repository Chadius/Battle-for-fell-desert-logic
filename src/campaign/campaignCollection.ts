import type { CampaignMission } from "./campaignMission.js"

export interface CampaignCollection {
    missionsById: Map<string, CampaignMission>
}

export const CampaignCollectionService = {
    new: (): CampaignCollection => ({ missionsById: new Map() }),

    add: ({
        collection,
        mission,
    }: {
        collection: CampaignCollection
        mission: CampaignMission
    }): CampaignCollection => {
        throwIfCollectionIsUndefined(collection, "add")
        const newMissionsById = new Map(collection.missionsById)
        newMissionsById.set(mission.id, mission)
        return { missionsById: newMissionsById }
    },

    getById: ({
        collection,
        id,
    }: {
        collection: CampaignCollection
        id: string
    }): CampaignMission | undefined => {
        throwIfCollectionIsUndefined(collection, "getById")
        return collection.missionsById.get(id)
    },

    getAllMissions: (collection: CampaignCollection): CampaignMission[] => {
        throwIfCollectionIsUndefined(collection, "getAllMissions")
        return [...collection.missionsById.values()]
    },
}

const throwIfCollectionIsUndefined = (
    collection: CampaignCollection,
    callName: string
) => {
    if (collection == undefined)
        throw new Error(
            `[CampaignCollection.${callName}]: collection must be defined`
        )
}
