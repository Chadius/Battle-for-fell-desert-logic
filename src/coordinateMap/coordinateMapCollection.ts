import { type CoordinateMap } from "./coordinateMap.ts"

export interface CoordinateMapCollection {
    mapById: Map<string, CoordinateMap>
}

export const CoordinateMapCollectionService = {
    new: (): CoordinateMapCollection => ({
        mapById: new Map(),
    }),
    addOrUpdate: ({
        collection,
        map,
    }: {
        collection: CoordinateMapCollection
        map: CoordinateMap
    }): CoordinateMapCollection => {
        throwIfCollectionIsUndefined(collection, "addOrUpdate")
        const newCollection = clone(collection)
        newCollection.mapById.set(map.id, map)
        return newCollection
    },
    get: ({
        collection,
        id,
    }: {
        collection: CoordinateMapCollection
        id: string
    }): CoordinateMap | undefined => {
        throwIfCollectionIsUndefined(collection, "get")
        return collection.mapById.get(id)
    },
    has: ({
        collection,
        id,
    }: {
        collection: CoordinateMapCollection
        id: string
    }): boolean => {
        throwIfCollectionIsUndefined(collection, "has")
        return collection.mapById.has(id)
    },
    remove: ({
        collection,
        id,
    }: {
        collection: CoordinateMapCollection
        id: string
    }): CoordinateMapCollection => {
        throwIfCollectionIsUndefined(collection, "remove")
        const newCollection = clone(collection)
        newCollection.mapById.delete(id)
        return newCollection
    },
}

const clone = (original: CoordinateMapCollection): CoordinateMapCollection => {
    return {
        mapById: new Map(original.mapById),
    }
}

const throwIfCollectionIsUndefined = (
    collection: CoordinateMapCollection,
    callName: string
) => {
    if (collection == undefined)
        throw new Error(
            `[CoordinateMapCollection.${callName}]: collection must be defined`
        )
}
