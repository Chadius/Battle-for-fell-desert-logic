import {
    type OutOfBattleSquaddieAttributeSheet,
    OutOfBattleSquaddieAttributeSheetService,
} from "./outOfBattleSquaddieAttributeSheet"
import { type SquaddieMovementInfo } from "../squaddieMovementInfo"

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
    getItemCapacity: ({
        collection,
        id,
    }: {
        collection: OutOfBattleSquaddieAttributeSheetCollection
        id: string
    }) => {
        throwIfCollectionIsUndefined(collection, "getItemCapacity")
        throwIfAttributeSheetIsUndefined(collection, id, "getItemCapacity")
        return OutOfBattleSquaddieAttributeSheetService.getItemCapacity({
            attributeSheet: collection.sheetById.get(id)!,
        })
    },
    getItemIds: ({
        collection,
        id,
    }: {
        collection: OutOfBattleSquaddieAttributeSheetCollection
        id: string
    }) => {
        throwIfCollectionIsUndefined(collection, "getItemIds")
        throwIfAttributeSheetIsUndefined(collection, id, "getItemIds")
        return OutOfBattleSquaddieAttributeSheetService.getItemIds({
            attributeSheet: collection.sheetById.get(id)!,
        })
    },
    addItem: ({
        collection,
        attributeSheetId,
        itemId,
    }: {
        collection: OutOfBattleSquaddieAttributeSheetCollection
        attributeSheetId: string
        itemId: string
    }) => {
        throwIfCollectionIsUndefined(collection, "addItem")
        throwIfAttributeSheetIsUndefined(
            collection,
            attributeSheetId,
            "addItem"
        )
        const newCollection = clone(collection)
        const attributeSheet = newCollection.sheetById.get(attributeSheetId)!
        const newAttributeSheet =
            OutOfBattleSquaddieAttributeSheetService.addItem({
                attributeSheet,
                itemId,
            })
        newCollection.sheetById.set(newAttributeSheet.id, newAttributeSheet)
        return newCollection
    },
    reorderItemSlots: ({
        collection,
        attributeSheetId,
        itemSlotA,
        itemSlotB,
    }: {
        collection: OutOfBattleSquaddieAttributeSheetCollection
        attributeSheetId: string
        itemSlotA: number
        itemSlotB: number
    }) => {
        throwIfCollectionIsUndefined(collection, "reorderItemSlots")
        throwIfAttributeSheetIsUndefined(
            collection,
            attributeSheetId,
            "reorderItemSlots"
        )
        const newCollection = clone(collection)
        const attributeSheet = newCollection.sheetById.get(attributeSheetId)!
        const newAttributeSheet =
            OutOfBattleSquaddieAttributeSheetService.reorderItemSlots({
                attributeSheet,
                itemSlotA,
                itemSlotB,
            })
        newCollection.sheetById.set(newAttributeSheet.id, newAttributeSheet)
        return newCollection
    },
    removeItem: ({
        collection,
        attributeSheetId,
        itemId,
    }: {
        collection: OutOfBattleSquaddieAttributeSheetCollection
        attributeSheetId: string
        itemId: string
    }) => {
        throwIfCollectionIsUndefined(collection, "removeItem")
        throwIfAttributeSheetIsUndefined(
            collection,
            attributeSheetId,
            "removeItem"
        )
        const newCollection = clone(collection)
        const attributeSheet = newCollection.sheetById.get(attributeSheetId)!
        const newAttributeSheet =
            OutOfBattleSquaddieAttributeSheetService.removeItem({
                attributeSheet,
                itemId,
            })
        newCollection.sheetById.set(newAttributeSheet.id, newAttributeSheet)
        return newCollection
    },
    getSquaddieMovementInfo: ({
        attributeSheetId,
        collection,
    }: {
        collection: OutOfBattleSquaddieAttributeSheetCollection
        attributeSheetId: string
    }): SquaddieMovementInfo => {
        throwIfAttributeSheetIsUndefined(
            collection,
            attributeSheetId,
            "getSquaddieMovementInfo"
        )

        const attributeSheet = collection.sheetById.get(attributeSheetId)!

        return {
            moveThroughWalls: attributeSheet.movement.moveThroughWalls,
            movementPointsPerAction:
                attributeSheet.movement.movementPointsPerAction,
            skipOverPits: attributeSheet.movement.skipOverPits,
            stopOnSquaddies: attributeSheet.movement.stopOnSquaddies,
            reduceMoveCosts: attributeSheet.movement.reduceMoveCosts,
        }
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

const throwIfAttributeSheetIsUndefined = (
    collection: OutOfBattleSquaddieAttributeSheetCollection,
    id: string,
    callName: string
) => {
    if (!collection.sheetById.has(id))
        throw new Error(
            `[OutOfBattleSquaddieAttributeSheetCollection.${callName}]: Attribute Sheet id ${id} not found`
        )
}
