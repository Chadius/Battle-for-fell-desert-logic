import {
    type OutOfBattleSquaddie,
    OutOfBattleSquaddieService,
} from "./outOfBattleSquaddie"
import type { TSquaddieAffiliation } from "../../affiliation/affiliation"

export interface OutOfBattleSquaddieCollection {
    outOfBattleSquaddieById: Map<string, OutOfBattleSquaddie>
}

export const OutOfBattleSquaddieCollectionService = {
    new: (): OutOfBattleSquaddieCollection => ({
        outOfBattleSquaddieById: new Map(),
    }),
    addOrUpdateOutOfBattleSquaddie: ({
        collection,
        outOfBattleSquaddie,
    }: {
        collection: OutOfBattleSquaddieCollection
        outOfBattleSquaddie: OutOfBattleSquaddie
    }): OutOfBattleSquaddieCollection => {
        const newCollection = clone(collection)
        newCollection.outOfBattleSquaddieById.set(
            outOfBattleSquaddie.id,
            outOfBattleSquaddie
        )
        return newCollection
    },
    getSquaddie: ({
        collection,
        id,
    }: {
        collection: OutOfBattleSquaddieCollection
        id: string
    }): OutOfBattleSquaddie | undefined => {
        return collection.outOfBattleSquaddieById.get(id)
    },
    deleteSquaddie: ({
        collection,
        id,
    }: {
        collection: OutOfBattleSquaddieCollection
        id: string
    }) => {
        const newCollection = clone(collection)
        newCollection.outOfBattleSquaddieById.delete(id)
        return newCollection
    },
    getAllAttributeIds: ({
        collection,
    }: {
        collection: OutOfBattleSquaddieCollection
    }): string[] => {
        return [
            ...new Set(
                Object.values(collection.outOfBattleSquaddieById).map(
                    (squaddie) => squaddie.attributeSheetId
                )
            ),
        ]
    },
    getAllWithSquaddieAffiliation: ({
        collection,
        squaddieAffiliation,
    }: {
        collection: OutOfBattleSquaddieCollection
        squaddieAffiliation: TSquaddieAffiliation
    }): OutOfBattleSquaddie[] => {
        throwIfCollectionIsUndefined(
            collection,
            "getAllWithSquaddieAffiliation"
        )
        return [...collection.outOfBattleSquaddieById.values()].filter(
            (outOfBattleSquaddie) =>
                outOfBattleSquaddie.affiliation == squaddieAffiliation
        )
    },
}

const clone = (
    original: OutOfBattleSquaddieCollection
): OutOfBattleSquaddieCollection => {
    const outOfBattleSquaddieById: Map<string, OutOfBattleSquaddie> = new Map()
    for (const [
        id,
        outOfBattleSquaddie,
    ] of original.outOfBattleSquaddieById.entries()) {
        outOfBattleSquaddieById.set(
            id,
            OutOfBattleSquaddieService.clone(outOfBattleSquaddie)
        )
    }

    return {
        outOfBattleSquaddieById,
    }
}

const throwIfCollectionIsUndefined = (
    collection: OutOfBattleSquaddieCollection,
    callName: string
) => {
    if (collection == undefined)
        throw new Error(
            `[OutBattleSquaddieCollectionService.${callName}]: collection must be defined`
        )
}
