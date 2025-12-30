import type { AttributeScoreType } from "../../../proficiency/attributeScore"
import type {
    SquaddieCondition,
    TSquaddieConditionType,
} from "../../../proficiency/squaddieCondition"
import type { CoordinateMovePath } from "../../../coordinateMap/path/path"

export type DamageResult = {
    net: number
    raw: number
    absorbed: number
    willKo: boolean
    type: AttributeScoreType | undefined
}

export type HealingResult = {
    net: number
    raw: number
}

export type ConditionAddResult = SquaddieCondition[]

export interface SquaddieActionResult {
    inBattleSquaddieId: number
    outOfBattleSquaddieId: string
    actionPoints?: {
        spent: number
    }
    damage?: DamageResult
    healing?: HealingResult
    conditionsAdded?: ConditionAddResult
    dispel?: {
        dispelledConditions?: Map<
            TSquaddieConditionType,
            Omit<SquaddieCondition, TSquaddieConditionType>[]
        >
        conditionTypes: {
            all?: boolean
            types?: TSquaddieConditionType[]
        }
        amount: number | undefined
    }
    treat?: {
        treatedConditions?: Map<
            TSquaddieConditionType,
            Omit<SquaddieCondition, TSquaddieConditionType>[]
        >
        conditionTypes: {
            all?: boolean
            types?: TSquaddieConditionType[]
        }
        amount: number | undefined
    }
    movement?: {
        expectedPath: CoordinateMovePath
    }
}
