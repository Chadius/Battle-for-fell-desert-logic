import {
    type OutOfBattleSquaddieAttributeSheet,
    OutOfBattleSquaddieAttributeSheetService,
} from "./outOfBattleSquaddieAttributeSheet"

export interface OutOfBattleSquaddieAttributeSheetCollection {
    sheetById: Map<string, OutOfBattleSquaddieAttributeSheet>
}

export const OutOfBattleSquaddieAttributeSheetCollectionService = {
    new: (): OutOfBattleSquaddieAttributeSheetCollection =>
        constructNewCollection(),
    addOrUpdateAttributeSheet: ({
        collection,
        attributeSheet,
    }: {
        collection: OutOfBattleSquaddieAttributeSheetCollection
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    }): OutOfBattleSquaddieAttributeSheetCollection => {
        throwIfCollectionIsUndefined(
            collection,
            "OutOfBattleSquaddieAttributeSheetCollection"
        )
        const newCollection = clone(collection)
        newCollection.sheetById.set(attributeSheet.id, attributeSheet)
        return newCollection
    },
    getAttributeSheet: ({
        collection,
        id,
    }: {
        collection: OutOfBattleSquaddieAttributeSheetCollection
        id: string
    }) => {
        throwIfCollectionIsUndefined(collection, "getAttributeSheet")
        return collection.sheetById.get(id)
    },
    onlyKeepTheseAttributeIds: ({
        collection,
        idsToKeep,
    }: {
        collection: OutOfBattleSquaddieAttributeSheetCollection
        idsToKeep: string[]
    }): OutOfBattleSquaddieAttributeSheetCollection => {
        throwIfCollectionIsUndefined(collection, "onlyKeepTheseAttributeIds")
        const newCollection = constructNewCollection()
        for (const id in idsToKeep) {
            if (collection.sheetById.has(id))
                newCollection.sheetById.set(id, collection.sheetById.get(id)!)
        }
        return newCollection
    },
}

const constructNewCollection =
    (): OutOfBattleSquaddieAttributeSheetCollection => ({
        sheetById: new Map(),
    })

const clone = (
    original: OutOfBattleSquaddieAttributeSheetCollection
): OutOfBattleSquaddieAttributeSheetCollection => {
    const newSheetById: Map<string, OutOfBattleSquaddieAttributeSheet> =
        new Map()
    for (const [id, attributeSheet] of original.sheetById.entries()) {
        newSheetById.set(
            id,
            OutOfBattleSquaddieAttributeSheetService.clone(attributeSheet)
        )
    }

    return {
        sheetById: newSheetById,
    }
}

const throwIfCollectionIsUndefined = (
    collection: OutOfBattleSquaddieAttributeSheetCollection,
    callName: string
) => {
    if (collection == undefined)
        throw new Error(
            `[OutOfBattleSquaddieAttributeSheetCollection.${callName}]: collection must be defined`
        )
}
