import type { TSquaddieAffiliation } from "../../affiliation/affiliation.js"
import type {
    SquaddieCondition,
    TSquaddieConditionType,
} from "../../proficiency/squaddieCondition.js"

export interface SquaddieInfo {
    name: string
    affiliation: TSquaddieAffiliation
    currentHitPoints: number
    maxHitPoints: number
    currentActionPoints: number
    maximumActionPoints: number
    conditions: SquaddieCondition[]
    isDefeated: boolean
    canAct: boolean
    items: {
        itemIds: string[]
        itemIdsUsed: string[]
    }
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
        canAct,
        items,
    }: {
        name: string
        affiliation: TSquaddieAffiliation
        currentHitPoints: number
        maxHitPoints: number
        currentActionPoints: number
        maximumActionPoints: number
        conditions: Map<TSquaddieConditionType, SquaddieCondition[]>
        isDefeated: boolean
        canAct: boolean
        items: {
            itemIds: string[]
            itemIdsUsed: string[]
        }
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
            canAct,
            items: {
                itemIds: [...items.itemIds],
                itemIdsUsed: [...items.itemIdsUsed],
            },
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
