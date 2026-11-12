import type { TSquaddieAffiliation } from "../../affiliation/affiliation.js"
import type {
    SquaddieCondition,
    TSquaddieConditionType,
} from "../../proficiency/squaddieCondition.js"

export interface SquaddieInfo {
    affiliation: TSquaddieAffiliation
    currentHitPoints: number
    maxHitPoints: number
    absorbAmount: number
    currentActionPoints: number
    maximumActionPoints: number
    conditions: SquaddieCondition[]
    isDefeated: boolean
    canAct: boolean
    attackContributionThisTurn: number
    items: {
        itemIds: string[]
        itemIdsUsed: string[]
    }
}

export const SquaddieInfoService = {
    new: ({
        affiliation,
        currentHitPoints,
        maxHitPoints,
        absorbAmount,
        currentActionPoints,
        maximumActionPoints,
        conditions,
        isDefeated,
        canAct,
        attackContributionThisTurn,
        items,
    }: {
        affiliation: TSquaddieAffiliation
        currentHitPoints: number
        maxHitPoints: number
        absorbAmount: number
        currentActionPoints: number
        maximumActionPoints: number
        conditions: Map<TSquaddieConditionType, SquaddieCondition[]>
        isDefeated: boolean
        canAct: boolean
        attackContributionThisTurn: number
        items: {
            itemIds: string[]
            itemIdsUsed: string[]
        }
    }): SquaddieInfo => {
        return {
            affiliation,
            currentHitPoints,
            maxHitPoints,
            absorbAmount,
            currentActionPoints,
            maximumActionPoints,
            conditions: flattenConditionsMap(conditions),
            isDefeated,
            canAct,
            attackContributionThisTurn,
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
