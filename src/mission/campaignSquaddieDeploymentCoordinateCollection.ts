import {
    type CampaignSquaddieDeploymentCoordinate,
    CampaignSquaddieDeploymentCoordinateService,
    type SerializedCampaignSquaddieDeploymentCoordinate,
} from "./campaignSquaddieDeploymentCoordinate.js"

export interface CampaignSquaddieDeploymentCoordinateCollection {
    coordinateById: Map<string, CampaignSquaddieDeploymentCoordinate>
}

export const CampaignSquaddieDeploymentCoordinateCollectionService = {
    new: (): CampaignSquaddieDeploymentCoordinateCollection => constructNew(),
    serialize: (
        collection: CampaignSquaddieDeploymentCoordinateCollection
    ): SerializedCampaignSquaddieDeploymentCoordinate[] => {
        throwIfCollectionIsUndefined(collection, "serialize")
        return Array.from(collection.coordinateById.values()).map(
            CampaignSquaddieDeploymentCoordinateService.serialize
        )
    },
    deserializeAll: (
        data: unknown[]
    ): {
        collection: CampaignSquaddieDeploymentCoordinateCollection
        errors: string[]
    } => {
        const collection = constructNew()
        const errors: string[] = []
        for (const item of data) {
            try {
                const campaignSquaddieDeploymentCoordinate =
                    CampaignSquaddieDeploymentCoordinateService.deserialize(
                        item
                    )
                collection.coordinateById.set(
                    campaignSquaddieDeploymentCoordinate.id,
                    campaignSquaddieDeploymentCoordinate
                )
            } catch (e) {
                errors.push(e instanceof Error ? e.message : String(e))
            }
        }
        return { collection, errors }
    },
    addOrUpdate: ({
        collection,
        campaignSquaddieDeploymentCoordinate,
    }: {
        collection: CampaignSquaddieDeploymentCoordinateCollection
        campaignSquaddieDeploymentCoordinate: CampaignSquaddieDeploymentCoordinate
    }): CampaignSquaddieDeploymentCoordinateCollection => {
        throwIfCollectionIsUndefined(collection, "addOrUpdate")
        const newCollection = clone(collection)
        newCollection.coordinateById.set(
            campaignSquaddieDeploymentCoordinate.id,
            campaignSquaddieDeploymentCoordinate
        )
        return newCollection
    },
    getById: ({
        collection,
        id,
    }: {
        collection: CampaignSquaddieDeploymentCoordinateCollection
        id: string
    }): CampaignSquaddieDeploymentCoordinate | undefined => {
        throwIfCollectionIsUndefined(collection, "getById")
        return collection.coordinateById.get(id)
    },
    getAll: (
        collection: CampaignSquaddieDeploymentCoordinateCollection
    ): CampaignSquaddieDeploymentCoordinate[] => {
        throwIfCollectionIsUndefined(collection, "getAll")
        return Array.from(collection.coordinateById.values())
    },
    remove: ({
        collection,
        id,
    }: {
        collection: CampaignSquaddieDeploymentCoordinateCollection
        id: string
    }): CampaignSquaddieDeploymentCoordinateCollection => {
        throwIfCollectionIsUndefined(collection, "remove")
        const newCollection = clone(collection)
        newCollection.coordinateById.delete(id)
        return newCollection
    },
    has: ({
        collection,
        id,
    }: {
        collection: CampaignSquaddieDeploymentCoordinateCollection
        id: string
    }): boolean => {
        throwIfCollectionIsUndefined(collection, "has")
        return collection.coordinateById.has(id)
    },
}

const constructNew = (): CampaignSquaddieDeploymentCoordinateCollection => {
    return {
        coordinateById: new Map(),
    }
}

const clone = (
    original: CampaignSquaddieDeploymentCoordinateCollection
): CampaignSquaddieDeploymentCoordinateCollection => {
    const collectionClone = constructNew()
    original.coordinateById.forEach(
        (campaignSquaddieDeploymentCoordinate, id) => {
            collectionClone.coordinateById.set(
                id,
                CampaignSquaddieDeploymentCoordinateService.clone(
                    campaignSquaddieDeploymentCoordinate
                )
            )
        }
    )
    return collectionClone
}

const throwIfCollectionIsUndefined = (
    collection: CampaignSquaddieDeploymentCoordinateCollection,
    callName: string
) => {
    if (collection == undefined)
        throw new Error(
            `[CampaignSquaddieDeploymentCoordinateCollectionService.${callName}]: collection must be defined`
        )
}
