import type { SquaddieAction } from "./squaddieAction"

export interface SquaddieActionCollection {
    actionById: Map<string, SquaddieAction>
}

export const SquaddieActionCollectionService = {
    new: (): SquaddieActionCollection => constructNewCollection(),
    addOrUpdate: ({
        collection,
        squaddieAction,
    }: {
        collection: SquaddieActionCollection
        squaddieAction: SquaddieAction
    }): SquaddieActionCollection => {
        throwIfCollectionIsUndefined(collection, "addOrUpdate")
        const newCollection = clone(collection)
        newCollection.actionById.set(squaddieAction.id, squaddieAction)
        return newCollection
    },
    get: ({
        collection,
        id,
    }: {
        collection: SquaddieActionCollection
        id: string
    }): SquaddieAction | undefined => {
        throwIfCollectionIsUndefined(collection, "get")
        return collection.actionById.get(id)
    },
    remove: ({
        collection,
        actionId,
    }: {
        collection: SquaddieActionCollection
        actionId: string
    }) => {
        throwIfCollectionIsUndefined(collection, "remove")
        const newCollection = clone(collection)
        newCollection.actionById.delete(actionId)
        return newCollection
    },
    has: ({
        collection,
        id,
    }: {
        collection: SquaddieActionCollection
        id: string
    }): boolean => {
        throwIfCollectionIsUndefined(collection, "has")
        return collection.actionById.has(id)
    },
}

const constructNewCollection = (): SquaddieActionCollection => ({
    actionById: new Map(),
})

const clone = (
    original: SquaddieActionCollection
): SquaddieActionCollection => {
    return {
        actionById: new Map(original.actionById),
    }
}

const throwIfCollectionIsUndefined = (
    collection: SquaddieActionCollection,
    callName: string
) => {
    if (collection == undefined)
        throw new Error(
            `[SquaddieActionCollection.${callName}]: collection must be defined`
        )
}
