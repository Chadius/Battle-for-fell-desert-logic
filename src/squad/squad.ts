import type { TSquaddieRole } from "./roles.js"
import type { TSquaddieAffiliation } from "../affiliation/affiliation.js"

export interface Squad {
    id: string
    name: string
    affiliation: TSquaddieAffiliation
    squaddies: Map<string, Map<number, TSquaddieRole>>
}

export const SquadService = {
    new: ({
        id,
        name,
        affiliation,
        squaddies,
    }: Partial<Squad> & Omit<Squad, "squaddies">): Squad => {
        return {
            id,
            name,
            affiliation,
            squaddies: squaddies ?? new Map(),
        }
    },

    addOrUpdateSquaddie: ({
        squad,
        outOfBattleSquaddieId,
        inBattleSquaddieId,
        role,
    }: {
        squad: Squad
        outOfBattleSquaddieId: string
        inBattleSquaddieId: number
        role: TSquaddieRole
    }): Squad => {
        throwIfSquadIsUndefined(squad, "addOrUpdateSquaddie")
        const newSquad = clone(squad)
        if (!squad.squaddies.has(outOfBattleSquaddieId)) {
            squad.squaddies.set(outOfBattleSquaddieId, new Map())
        }
        squad.squaddies
            .get(outOfBattleSquaddieId)
            ?.set(inBattleSquaddieId, role)
        return newSquad
    },

    removeSquaddie: ({
        squad,
        outOfBattleSquaddieId,
        inBattleSquaddieId,
    }: {
        squad: Squad
        outOfBattleSquaddieId: string
        inBattleSquaddieId: number
    }): Squad => {
        throwIfSquadIsUndefined(squad, "removeSquaddie")
        const newSquad = clone(squad)

        if (newSquad.squaddies.has(outOfBattleSquaddieId)) {
            newSquad.squaddies
                .get(outOfBattleSquaddieId)
                ?.delete(inBattleSquaddieId)

            if (newSquad.squaddies.get(outOfBattleSquaddieId)?.size == 0) {
                newSquad.squaddies.delete(outOfBattleSquaddieId)
            }
        }

        return newSquad
    },

    getSquaddieRole: ({
        squad,
        outOfBattleSquaddieId,
        inBattleSquaddieId,
    }: {
        squad: Squad
        outOfBattleSquaddieId: string
        inBattleSquaddieId: number
    }): TSquaddieRole => {
        throwIfSquadIsUndefined(squad, "getSquaddieRole")
        const callName = "getSquaddieRole"
        if (
            !squad.squaddies.has(outOfBattleSquaddieId) ||
            !squad.squaddies.get(outOfBattleSquaddieId)?.has(inBattleSquaddieId)
        ) {
            throw new Error(
                `[SquaddieService.${callName}]: no squaddie ${outOfBattleSquaddieId} ${inBattleSquaddieId} found in this squad]`
            )
        }

        return squad.squaddies
            .get(outOfBattleSquaddieId)!
            .get(inBattleSquaddieId)!
    },
    clone: (original: Squad): Squad => clone(original),
}

const cloneSquaddiesById = (squaddies: Squad["squaddies"]) => {
    const newSquaddies: Map<string, Map<number, TSquaddieRole>> = new Map()
    for (const [outOfBattleId, inBattleMap] of squaddies.entries()) {
        newSquaddies.set(outOfBattleId, new Map())
        for (const [inBattleId, role] of inBattleMap.entries()) {
            newSquaddies.get(outOfBattleId)?.set(inBattleId, role)
        }
    }
    return newSquaddies
}

const clone = (original: Squad): Squad => {
    return {
        id: original.id,
        name: original.name,
        affiliation: original.affiliation,
        squaddies: cloneSquaddiesById(original.squaddies),
    }
}

const throwIfSquadIsUndefined = (squad: Squad, callName: string) => {
    if (squad == undefined)
        throw new Error(`[SquaddieService.${callName}]: squad must be defined`)
}
