import { type Squad, SquadService } from "./squad.js"
import type { TSquaddieRole } from "./roles.js"

export interface SquadCollection {
    squadsById: Map<string, Squad>
}

export const SquadCollectionService = {
    new: (): SquadCollection => {
        return {
            squadsById: new Map(),
        }
    },
    addOrUpdateSquad: ({
        collection,
        squad,
    }: {
        collection: SquadCollection
        squad: Squad
    }): SquadCollection => addOrUpdateSquad({ collection, squad }),
    getSquad: ({
        collection,
        id,
    }: {
        collection: SquadCollection
        id: string
    }): Squad | undefined => {
        throwIfCollectionIsUndefined(collection, "getSquad")
        return collection.squadsById.get(id)
    },

    addSquaddie: ({
        collection,
        squadId,
        outOfBattleSquaddieId,
        inBattleSquaddieId,
        role,
    }: {
        collection: SquadCollection
        squadId: string
        outOfBattleSquaddieId: string
        inBattleSquaddieId: number
        role: TSquaddieRole
    }): SquadCollection => {
        throwIfCollectionIsUndefined(collection, "addSquaddie")
        const squad = collection.squadsById.get(squadId)
        if (squad == undefined) {
            return collection
        }
        const updatedSquad = SquadService.addOrUpdateSquaddie({
            squad,
            outOfBattleSquaddieId,
            inBattleSquaddieId,
            role,
        })
        return addOrUpdateSquad({ collection, squad: updatedSquad })
    },

    getSquaddie: ({
        collection,
        squadId,
        outOfBattleSquaddieId,
        inBattleSquaddieId,
    }: {
        collection: SquadCollection
        squadId: string
        outOfBattleSquaddieId: string
        inBattleSquaddieId: number
    }):
        | {
              role: TSquaddieRole
              outOfBattleSquaddieId: string
              inBattleSquaddieId: number
          }
        | undefined => {
        const squad = collection.squadsById.get(squadId)
        if (squad == undefined) {
            return undefined
        }

        const role = SquadService.getSquaddieRole({
            squad,
            inBattleSquaddieId,
            outOfBattleSquaddieId,
        })

        return {
            outOfBattleSquaddieId,
            inBattleSquaddieId,
            role,
        }
    },

    removeSquaddie: ({
        collection,
        squadId,
        outOfBattleSquaddieId,
        inBattleSquaddieId,
    }: {
        collection: SquadCollection
        squadId: string
        outOfBattleSquaddieId: string
        inBattleSquaddieId: number
    }): SquadCollection => {
        throwIfCollectionIsUndefined(collection, "removeSquaddie")
        const newCollection = clone(collection)

        if (!newCollection.squadsById.has(squadId)) return newCollection

        return addOrUpdateSquad({
            collection: newCollection,
            squad: SquadService.removeSquaddie({
                squad: newCollection.squadsById.get(squadId)!,
                outOfBattleSquaddieId,
                inBattleSquaddieId,
            }),
        })
    },
}

const clone = (collection: SquadCollection): SquadCollection => {
    const newSquadsById: Map<string, Squad> = new Map()
    for (const [squadId, squad] of collection.squadsById.entries()) {
        newSquadsById.set(squadId, SquadService.clone(squad))
    }

    return {
        squadsById: newSquadsById,
    }
}

const addOrUpdateSquad = ({
    collection,
    squad,
}: {
    collection: SquadCollection
    squad: Squad
}): SquadCollection => {
    throwIfCollectionIsUndefined(collection, "addOrUpdateSquad")
    const newSquad = clone(collection)
    newSquad.squadsById.set(squad.id, squad)
    return newSquad
}

const throwIfCollectionIsUndefined = (
    collection: SquadCollection,
    callName: string
) => {
    if (collection == undefined)
        throw new Error(
            `[SquadCollection.${callName}]: collection must be defined`
        )
}
