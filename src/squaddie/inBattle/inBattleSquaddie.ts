import type { OutOfBattleSquaddie } from "../outOfBattle/outOfBattleSquaddie.ts"
import type { OutOfBattleSquaddieAttributeSheet } from "../outOfBattle/outOfBattleSquaddieAttributeSheet.ts"

export interface InBattleSquaddie {
    id: number
    outOfBattleId: string
    name: string
    hitPoints: {
        max: number
        current: number
    }
    attributeModifiers: { [key: string]: number }
    actionPoints: {
        current: number
    }
    actionIds: {
        natural: number[]
    }
}

export const InBattleSquaddieService = {
    new: ({
        id,
        name,
        outOfBattleSquaddie,
        attributeSheet,
    }: Pick<InBattleSquaddie, "id" | "name"> & {
        outOfBattleSquaddie: OutOfBattleSquaddie
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    }): InBattleSquaddie => {
        return {
            id,
            outOfBattleId: outOfBattleSquaddie.id,
            name,
            hitPoints: {
                max: attributeSheet.maxHitPoints,
                current: attributeSheet.maxHitPoints,
            },
            attributeModifiers: {},
            actionPoints: {
                current: 3,
            },
            actionIds: {
                natural: [...outOfBattleSquaddie.actionIds],
            },
        }
    },
}
