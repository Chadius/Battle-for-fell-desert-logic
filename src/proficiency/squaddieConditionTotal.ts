import {
    type SquaddieCondition,
    SquaddieConditionService,
    type TSquaddieConditionSource,
    type TSquaddieConditionType,
} from "./squaddieCondition.js"

export interface StackedSquaddieCondition {
    source: TSquaddieConditionSource
    amount: number | undefined
    turnsRemaining: number | undefined
    contributesToTotal: boolean
}

export interface SquaddieConditionTotal {
    type: TSquaddieConditionType
    totalAmount: number | undefined
    isHindering: boolean
    stackedConditions: StackedSquaddieCondition[]
}

export const SquaddieConditionTotalService = {
    calculateTotals: (
        conditionsByType: Map<TSquaddieConditionType, SquaddieCondition[]>
    ): SquaddieConditionTotal[] => calculateTotals(conditionsByType),
}

const calculateTotals = (
    conditionsByType: Map<TSquaddieConditionType, SquaddieCondition[]>
): SquaddieConditionTotal[] => {
    const totals: SquaddieConditionTotal[] = []
    for (const [type, conditions] of conditionsByType.entries()) {
        const total = calculateTotalForType({ type, conditions })
        if (total != undefined) totals.push(total)
    }
    return sortHinderingFirst(totals)
}

const calculateTotalForType = ({
    type,
    conditions,
}: {
    type: TSquaddieConditionType
    conditions: SquaddieCondition[]
}): SquaddieConditionTotal | undefined => {
    const effectiveAmount =
        SquaddieConditionService.calculateEffectiveAmount(conditions)
    if (effectiveAmount === 0) return undefined

    const isBinary = SquaddieConditionService.isBinaryType(type)
    return {
        type,
        totalAmount: isBinary ? undefined : effectiveAmount,
        isHindering: SquaddieConditionService.isHinderingTotal({
            type,
            totalAmount: effectiveAmount,
        }),
        stackedConditions: conditions.map((condition) =>
            toStackedCondition({ condition, conditions, isBinary })
        ),
    }
}

const toStackedCondition = ({
    condition,
    conditions,
    isBinary,
}: {
    condition: SquaddieCondition
    conditions: SquaddieCondition[]
    isBinary: boolean
}): StackedSquaddieCondition => ({
    source: condition.source,
    amount: isBinary ? undefined : condition.amount?.current,
    turnsRemaining: condition.limit.duration?.duration,
    contributesToTotal:
        SquaddieConditionService.isContributingToEffectiveAmount({
            condition,
            conditionsOfSameType: conditions,
        }),
})

const sortHinderingFirst = (
    totals: SquaddieConditionTotal[]
): SquaddieConditionTotal[] => [
    ...totals.filter((total) => total.isHindering),
    ...totals.filter((total) => !total.isHindering),
]
