import { type CoordinateMap, CoordinateMapService } from "./coordinateMap.ts"

export interface CoordinateMapCollection {
    mapById: {
        [key: string]: CoordinateMap
    }
}

export const CoordinateMapCollectionService = {
    new: (): CoordinateMapCollection => ({
        mapById: {},
    }),
    addOrUpdateMap: ({
        collection,
        id,
        name,
        movementProperties,
    }: {
        collection: CoordinateMapCollection
        id: string
        name: string
        movementProperties: string[]
    }): CoordinateMapCollection => {
        const newCollection = clone(collection)
        newCollection.mapById[id] = CoordinateMapService.new({
            id,
            name,
            movementProperties,
        })
        return newCollection
    },
    getMapById: ({
        collection,
        mapId,
    }: {
        collection: CoordinateMapCollection
        mapId: string
    }) => {
        return collection.mapById[mapId]
    },
}

const clone = (original: CoordinateMapCollection): CoordinateMapCollection => {
    return {
        mapById: { ...original.mapById },
    }
}
