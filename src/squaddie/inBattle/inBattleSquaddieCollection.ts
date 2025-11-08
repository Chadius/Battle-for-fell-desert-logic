import {
    type InBattleSquaddie,
    InBattleSquaddieService,
} from "./inBattleSquaddie.ts"
import type { OutOfBattleSquaddie } from "../outOfBattle/outOfBattleSquaddie.ts"
import type { OutOfBattleSquaddieAttributeSheet } from "../outOfBattle/outOfBattleSquaddieAttributeSheet.ts"
import { ThrowErrorIfUndefined } from "../../throwErrorIfUndefined.ts"

export interface InBattleSquaddieCollection {
    byOutOfBattleSquaddieId: {
        [outOfBattleId: string]: InBattleSquaddie[]
    }
}

export const InBattleSquaddieCollectionService = {
    new: (): InBattleSquaddieCollection => ({
        byOutOfBattleSquaddieId: {},
    }),
    getSquaddie: ({
        collection,
        id,
        outOfBattleSquaddieId,
    }: {
        collection: InBattleSquaddieCollection
        id: number
        outOfBattleSquaddieId: string
    }): InBattleSquaddie | undefined => {
        ThrowErrorIfUndefined({
            className: "InBattleSquaddieCollectionService",
            fieldName: "collection",
            functionName: "getSquaddie",
            value: collection,
        })
        return collection.byOutOfBattleSquaddieId[outOfBattleSquaddieId]?.at(id)
    },
    createNewSquaddie({
        collection,
        outOfBattleSquaddie,
        attributeSheet,
    }: {
        collection: InBattleSquaddieCollection
        attributeSheet: OutOfBattleSquaddieAttributeSheet
        outOfBattleSquaddie: OutOfBattleSquaddie
    }): {
        collection: InBattleSquaddieCollection
        inBattleId: number
    } {
        ThrowErrorIfUndefined({
            className: "InBattleSquaddieCollectionService",
            fieldName: "collection",
            functionName: "createNewSquaddie",
            value: collection,
        })
        const nextInBattleId =
            collection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id]
                ?.length || 0

        const newInBattleSquaddie = InBattleSquaddieService.new({
            id: nextInBattleId,
            name: outOfBattleSquaddie.name,
            outOfBattleSquaddie,
            attributeSheet,
        })

        const newCollection = addOrUpdateSquaddie({
            collection,
            inBattleSquaddie: newInBattleSquaddie,
            outOfBattleSquaddie,
        })

        return { collection: newCollection, inBattleId: nextInBattleId }
    },
}

const addOrUpdateSquaddie = ({
    collection,
    inBattleSquaddie,
    outOfBattleSquaddie,
}: {
    collection: InBattleSquaddieCollection
    inBattleSquaddie: InBattleSquaddie
    outOfBattleSquaddie: OutOfBattleSquaddie
}): InBattleSquaddieCollection => {
    const newCollection = clone(collection)
    newCollection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id] ||= []
    newCollection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id].push(
        inBattleSquaddie
    )
    return newCollection
}

const clone = (
    original: InBattleSquaddieCollection
): InBattleSquaddieCollection => {
    return {
        byOutOfBattleSquaddieId: { ...original.byOutOfBattleSquaddieId },
    }
}
