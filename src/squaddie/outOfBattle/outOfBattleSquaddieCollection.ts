import {
    type OutOfBattleSquaddie,
    OutOfBattleSquaddieService,
} from "./outOfBattleSquaddie"

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
