import { type Squad, SquadService } from "./squad.ts"
import type { TSquaddieRole } from "./roles.ts"

export interface SquadCollection {
    squadsById: {
        [id: string]: Squad
    }
}

export const SquadCollectionService = {
    new: (): SquadCollection => {
        return {
            squadsById: {},
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
        return collection.squadsById[id]
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
        const squad = collection.squadsById[squadId]
        if (squad == undefined) {
            return collection
        }

        const newSquaddies = { ...squad.squaddies }
        if (newSquaddies[outOfBattleSquaddieId]) {
            newSquaddies[outOfBattleSquaddieId] = {
                ...newSquaddies[outOfBattleSquaddieId],
            }
        } else {
            newSquaddies[outOfBattleSquaddieId] = {}
        }
        newSquaddies[outOfBattleSquaddieId][inBattleSquaddieId] = { role }

        const updatedSquad: Squad = {
            ...squad,
            squaddies: newSquaddies,
        }

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
        const squad = collection.squadsById[squadId]
        if (squad == undefined) {
            return undefined
        }

        const squaddieData =
            squad.squaddies[outOfBattleSquaddieId]?.[inBattleSquaddieId]

        return squaddieData != undefined
            ? {
                  outOfBattleSquaddieId,
                  inBattleSquaddieId,
                  ...squaddieData,
              }
            : undefined
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
        if (
            collection.squadsById[squadId]?.squaddies[outOfBattleSquaddieId]?.[
                inBattleSquaddieId
            ] == undefined
        ) {
            return collection
        }

        const newCollection = clone(collection)

        let newSquad = SquadService.removeSquaddie({
            squad: newCollection.squadsById[squadId],
            outOfBattleSquaddieId,
            inBattleSquaddieId,
        })

        return addOrUpdateSquad({ collection: newCollection, squad: newSquad })
    },
}

const clone = (collection: SquadCollection): SquadCollection => {
    const newSquad: {
        [id: string]: Squad
    } = {}
    for (const squadId in collection.squadsById) {
        newSquad[squadId] = collection.squadsById[squadId]
    }
    return {
        squadsById: newSquad,
    }
}

const addOrUpdateSquad = ({
    collection,
    squad,
}: {
    collection: SquadCollection
    squad: Squad
}): SquadCollection => {
    const newSquad = clone(collection)
    newSquad.squadsById[squad.id] = squad
    return newSquad
}
