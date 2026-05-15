import type { TProficiencyType } from "../proficiency/proficiencyLevel"
import type { AttributeScoreType } from "../proficiency/attributeScore"
import type {
    SquaddieCondition,
    TSquaddieConditionType,
} from "../proficiency/squaddieCondition"
import type {
    ActionPointCost,
    SquaddieActionMovementEffect,
} from "./squaddieAction"

export interface SquaddieActionEffect {
    actionPoints?: {
        spent: ActionPointCost
        restore?: number
        additional?: {
            movementPathActionPointCost?: boolean
        }
    }
    damage?: {
        raw: number
        targetProficiency: TProficiencyType
        attributeScoreType?: AttributeScoreType
        sneakAttackDamage?: number
    }
    healing?: {
        raw: number
        attributeScoreType?: AttributeScoreType
    }
    conditions?: {
        add?: SquaddieCondition[]
        dispel?: {
            all: boolean
            types: TSquaddieConditionType[]
            amount: number | undefined
        }
        treat?: {
            all: boolean
            types: TSquaddieConditionType[]
            amount: number | undefined
        }
    }
    movement?: SquaddieActionMovementEffect
}
