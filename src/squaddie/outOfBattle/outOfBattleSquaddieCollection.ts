import {
    type OutOfBattleSquaddie,
    OutOfBattleSquaddieService,
} from "./outOfBattleSquaddie.ts"

export interface OutOfBattleSquaddieCollection {
    outOfBattleSquaddieById: {
        [key: string]: OutOfBattleSquaddie
    }
}

export const OutOfBattleSquaddieCollectionService = {
    new: (): OutOfBattleSquaddieCollection => ({
        outOfBattleSquaddieById: {},
    }),
    addOrUpdateOutOfBattleSquaddie: ({
        collection,
        id,
        name,
        attributeSheetId,
        actionIds,
    }: {
        collection: OutOfBattleSquaddieCollection
        id: string
        name: string
        attributeSheetId: string
        actionIds?: number[]
    }): OutOfBattleSquaddieCollection => {
        const newCollection = clone(collection)
        newCollection.outOfBattleSquaddieById[id] =
            OutOfBattleSquaddieService.new({
                id,
                name,
                attributeSheetId,
                actionIds,
            })
        return newCollection
    },
    getSquaddie: ({
        collection,
        id,
    }: {
        collection: OutOfBattleSquaddieCollection
        id: string
    }): OutOfBattleSquaddie | undefined => {
        return collection.outOfBattleSquaddieById[id] ?? undefined
    },
    deleteSquaddie: ({
        collection,
        id,
    }: {
        collection: OutOfBattleSquaddieCollection
        id: string
    }) => {
        const newCollection = clone(collection)
        delete newCollection.outOfBattleSquaddieById[id]
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
}

const clone = (
    original: OutOfBattleSquaddieCollection
): OutOfBattleSquaddieCollection => {
    return {
        outOfBattleSquaddieById: { ...original.outOfBattleSquaddieById },
    }
}
