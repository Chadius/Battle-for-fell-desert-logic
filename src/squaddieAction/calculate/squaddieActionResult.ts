import type { AttributeScoreType } from "../../proficiency/attributeScore.ts"
import type {
    SquaddieCondition,
    TSquaddieConditionType,
} from "../../proficiency/squaddieCondition.ts"
import type { CoordinateMovePath } from "../../coordinateMap/path/path.ts"

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
        dispelledConditions?: {
            [k in TSquaddieConditionType]?: Omit<
                SquaddieCondition,
                TSquaddieConditionType
            >[]
        }
        conditionTypes: {
            all?: boolean
            types?: TSquaddieConditionType[]
        }
        amount: number | undefined
    }
    treat?: {
        treatedConditions?: {
            [k in TSquaddieConditionType]?: Omit<
                SquaddieCondition,
                TSquaddieConditionType
            >[]
        }
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
