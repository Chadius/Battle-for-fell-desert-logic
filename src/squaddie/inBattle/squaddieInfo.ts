import type { TSquaddieAffiliation } from "../../affiliation/affiliation"
import type {
    SquaddieCondition,
    TSquaddieConditionType,
} from "../../proficiency/squaddieCondition"

export interface SquaddieInfo {
    name: string
    affiliation: TSquaddieAffiliation
    currentHitPoints: number
    maxHitPoints: number
    currentActionPoints: number
    maximumActionPoints: number
    conditions: SquaddieCondition[]
    isDefeated: boolean
}

export const SquaddieInfoService = {
    new: ({
        name,
        affiliation,
        currentHitPoints,
        maxHitPoints,
        currentActionPoints,
        maximumActionPoints,
        conditions,
        isDefeated,
    }: {
        name: string
        affiliation: TSquaddieAffiliation
        currentHitPoints: number
        maxHitPoints: number
        currentActionPoints: number
        maximumActionPoints: number
        conditions: Map<TSquaddieConditionType, SquaddieCondition[]>
        isDefeated: boolean
    }): SquaddieInfo => {
        return {
            name,
            affiliation,
            currentHitPoints,
            maxHitPoints,
            currentActionPoints,
            maximumActionPoints,
            conditions: flattenConditionsMap(conditions),
            isDefeated,
        }
    },
}

const flattenConditionsMap = (
    conditionsMap: Map<TSquaddieConditionType, SquaddieCondition[]>
): SquaddieCondition[] => {
    const conditions: SquaddieCondition[] = []
    for (const conditionArray of conditionsMap.values()) {
        conditions.push(...conditionArray)
    }
    return conditions
}
