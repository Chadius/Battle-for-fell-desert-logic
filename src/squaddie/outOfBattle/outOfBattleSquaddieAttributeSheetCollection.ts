import {
    type OutOfBattleSquaddieAttributeSheet,
    OutOfBattleSquaddieAttributeSheetService,
} from "./outOfBattleSquaddieAttributeSheet"
import { type AttributeScoreType } from "../../proficiency/attributeScore.ts"

export interface OutOfBattleSquaddieAttributeSheetCollection {
    sheetById: {
        [key: string]: OutOfBattleSquaddieAttributeSheet
    }
}

export const OutOfBattleSquaddieAttributeSheetCollectionService = {
    new: (): OutOfBattleSquaddieAttributeSheetCollection =>
        constructNewCollection(),
    addOrUpdateAttributeSheet: (
        params: Partial<OutOfBattleSquaddieAttributeSheet> & {
            collection: OutOfBattleSquaddieAttributeSheetCollection
            id: string
            attributeScores: { [key in AttributeScoreType]: number }
        }
    ): OutOfBattleSquaddieAttributeSheetCollection => {
        const { collection, id } = params
        const newCollection = clone(collection)
        newCollection.sheetById[id] =
            OutOfBattleSquaddieAttributeSheetService.new(params)
        return newCollection
    },
    getAttributeSheet: ({
        collection,
        id,
    }: {
        collection: OutOfBattleSquaddieAttributeSheetCollection
        id: string
    }) => {
        return collection.sheetById[id] ?? undefined
    },
    onlyKeepTheseAttributeIds: ({
        collection,
        idsToKeep,
    }: {
        collection: OutOfBattleSquaddieAttributeSheetCollection
        idsToKeep: string[]
    }): OutOfBattleSquaddieAttributeSheetCollection => {
        const newCollection = constructNewCollection()
        for (const id in idsToKeep) {
            newCollection.sheetById[id] = collection.sheetById[id] ?? undefined
        }
        return newCollection
    },
}

const constructNewCollection =
    (): OutOfBattleSquaddieAttributeSheetCollection => ({
        sheetById: {},
    })

const clone = (
    original: OutOfBattleSquaddieAttributeSheetCollection
): OutOfBattleSquaddieAttributeSheetCollection => {
    return {
        sheetById: { ...original.sheetById },
    }
}
