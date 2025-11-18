import type { SquaddieAction } from "./squaddieAction.ts"

export interface SquaddieActionCollection {
    actionById: {
        [id: string]: SquaddieAction
    }
}

export const SquaddieActionCollectionService = {
    new: (): SquaddieActionCollection => constructNewCollection(),
    addOrUpdateAction: ({
        collection,
        squaddieAction,
    }: {
        collection: SquaddieActionCollection
        squaddieAction: SquaddieAction
    }): SquaddieActionCollection => {
        const newCollection = clone(collection)
        newCollection.actionById[squaddieAction.id] = squaddieAction
        return newCollection
    },
    getAction: ({
        collection,
        id,
    }: {
        collection: SquaddieActionCollection
        id: string
    }) => {
        return collection.actionById[id] ?? undefined
    },
    removeAction: ({
        collection,
        actionId,
    }: {
        collection: SquaddieActionCollection
        actionId: string
    }) => {
        const newCollection = clone(collection)
        delete newCollection.actionById[actionId]
        return newCollection
    },
}

const constructNewCollection = (): SquaddieActionCollection => ({
    actionById: {},
})

const clone = (
    original: SquaddieActionCollection
): SquaddieActionCollection => {
    return {
        actionById: { ...original.actionById },
    }
}
