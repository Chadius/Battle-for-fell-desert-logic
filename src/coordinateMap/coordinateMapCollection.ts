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
    createNewMap: ({
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
}

const clone = (original: CoordinateMapCollection): CoordinateMapCollection => {
    return {
        mapById: { ...original.mapById },
    }
}
