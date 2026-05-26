import {
    type SerializedSquaddieItem,
    type SquaddieItem,
    SquaddieItemService,
} from "./squaddieItem"

export interface SquaddieItemCollection {
    itemById: Map<string, SquaddieItem>
}

export const SquaddieItemCollectionService = {
    new: (): SquaddieItemCollection => constructNew(),
    serialize: (
        collection: SquaddieItemCollection
    ): SerializedSquaddieItem[] => {
        throwIfCollectionIsUndefined(collection, "serialize")
        return Array.from(collection.itemById.values()).map(
            SquaddieItemService.serialize
        )
    },
    deserializeAll: (
        data: unknown[]
    ): { collection: SquaddieItemCollection; errors: string[] } => {
        const collection = constructNew()
        const errors: string[] = []
        for (const item of data) {
            try {
                const squaddieItem = SquaddieItemService.deserialize(item)
                collection.itemById.set(squaddieItem.id, squaddieItem)
            } catch (e) {
                errors.push(e instanceof Error ? e.message : String(e))
            }
        }
        return { collection, errors }
    },
    addOrUpdate: ({
        collection,
        squaddieItem,
    }: {
        collection: SquaddieItemCollection
        squaddieItem: SquaddieItem
    }): SquaddieItemCollection => {
        const newCollection = clone(collection)
        newCollection.itemById.set(squaddieItem.id, squaddieItem)
        return newCollection
    },
    get: ({
        collection,
        id,
    }: {
        collection: SquaddieItemCollection
        id: string
    }): SquaddieItem | undefined => {
        throwIfCollectionIsUndefined(collection, "get")
        return collection.itemById.get(id)
    },
    remove: ({
        collection,
        id,
    }: {
        collection: SquaddieItemCollection
        id: string
    }): SquaddieItemCollection => {
        throwIfCollectionIsUndefined(collection, "remove")
        const newCollection = clone(collection)
        newCollection.itemById.delete(id)
        return newCollection
    },
    has: ({
        collection,
        id,
    }: {
        collection: SquaddieItemCollection
        id: string
    }): boolean => {
        throwIfCollectionIsUndefined(collection, "has")
        return collection.itemById.has(id)
    },
}

const constructNew = (): SquaddieItemCollection => {
    return {
        itemById: new Map(),
    }
}

const clone = (original: SquaddieItemCollection): SquaddieItemCollection => {
    const clone = constructNew()
    clone.itemById = new Map(original.itemById)
    return clone
}

const throwIfCollectionIsUndefined = (
    squaddieItemCollection: SquaddieItemCollection,
    callName: string
) => {
    if (squaddieItemCollection == undefined)
        throw new Error(
            `[SquaddieItemCollection.${callName}]: collection must be defined`
        )
}
