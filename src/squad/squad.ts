import { type TSquaddieAffiliation } from "../squaddie/outOfBattle/affiliation.ts"
import type { TSquaddieRole } from "./roles.ts"

export interface Squad {
    id: string
    name: string
    affiliation: TSquaddieAffiliation
    squaddies: {
        [outOfBattleSquaddieId: string]: {
            [inBattleSquaddieId: number]: {
                role: TSquaddieRole
            }
        }
    }
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
            squaddies: squaddies ?? {},
        }
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
        const newSquaddies: {
            [outOfBattleSquaddieId: string]: {
                [inBattleSquaddieId: number]: {
                    role: TSquaddieRole
                }
            }
        } = {}

        for (const outOfBattleId in squad.squaddies) {
            newSquaddies[outOfBattleId] = {}
            for (const inBattleId in squad.squaddies[outOfBattleId]) {
                newSquaddies[outOfBattleId][Number(inBattleId)] = {
                    ...squad.squaddies[outOfBattleId][Number(inBattleId)],
                }
            }
        }

        if (newSquaddies[outOfBattleSquaddieId]) {
            delete newSquaddies[outOfBattleSquaddieId][inBattleSquaddieId]

            if (Object.keys(newSquaddies[outOfBattleSquaddieId]).length === 0) {
                delete newSquaddies[outOfBattleSquaddieId]
            }
        }

        return {
            ...squad,
            squaddies: newSquaddies,
        }
    },
}
