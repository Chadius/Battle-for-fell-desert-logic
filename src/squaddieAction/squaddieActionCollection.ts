import {
    type SerializedSquaddieAction,
    type SquaddieAction,
    SquaddieActionService,
} from "./squaddieAction.js"

export interface SquaddieActionCollection {
    actionById: Map<string, SquaddieAction>
}

export const SquaddieActionCollectionService = {
    new: (): SquaddieActionCollection => constructNewCollection(),
    serialize: (
        collection: SquaddieActionCollection
    ): SerializedSquaddieAction[] => {
        throwIfCollectionIsUndefined(collection, "serialize")
        return Array.from(collection.actionById.values()).map(
            SquaddieActionService.serialize
        )
    },
    deserializeAll: (
        data: unknown[]
    ): { collection: SquaddieActionCollection; errors: string[] } => {
        const collection = constructNewCollection()
        const errors: string[] = []
        for (const item of data) {
            try {
                const action = SquaddieActionService.deserialize(item)
                collection.actionById.set(action.id, action)
            } catch (e) {
                errors.push(e instanceof Error ? e.message : String(e))
            }
        }
        return { collection, errors }
    },
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
