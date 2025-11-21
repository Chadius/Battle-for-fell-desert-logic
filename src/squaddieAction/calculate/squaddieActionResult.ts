import type { AttributeScoreType } from "../../proficiency/attributeScore.ts"

export type DamageResult = {
    net: number
    raw: number
    absorbed: number
    willKo: boolean
    type: AttributeScoreType | undefined
}

export interface SquaddieActionResult {
    inBattleSquaddieId: number
    outOfBattleSquaddieId: string
    actionPoints?: {
        spent: number
    }
    damage?: DamageResult
}
