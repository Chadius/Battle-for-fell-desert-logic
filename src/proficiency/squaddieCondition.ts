import { z } from "zod"
import type { EnumLike } from "../enum.js"

export const SquaddieConditionSource = {
    UNKNOWN: "UNKNOWN",
    ITEM: "ITEM",
    PHYSICAL: "PHYSICAL",
    ELEMENTAL: "ELEMENTAL",
    SPIRITUAL: "SPIRITUAL",
} as const satisfies Record<string, string>
export type TSquaddieConditionSource = EnumLike<typeof SquaddieConditionSource>

export const SquaddieConditionType = {
    UNKNOWN: "UNKNOWN",
    ABSORB: "ABSORB",
    ARMOR: "ARMOR",
    ELUSIVE: "ELUSIVE",
    FRIGHTENED: "FRIGHTENED",
    OFF_GUARD: "OFF_GUARD",
    SLOWED: "SLOWED",
    HUSTLE: "HUSTLE",
} as const satisfies Record<string, string>
export type TSquaddieConditionType = EnumLike<typeof SquaddieConditionType>

export const SquaddieConditionDecaysAt = {
    TURN_START: "TURN_START",
    TURN_END: "TURN_END",
} as const satisfies Record<string, string>
export type TSquaddieConditionDecaysAt = EnumLike<
    typeof SquaddieConditionDecaysAt
>

const binaryTypes = new Set<TSquaddieConditionType>([
    SquaddieConditionType.ELUSIVE,
    SquaddieConditionType.HUSTLE,
    SquaddieConditionType.OFF_GUARD,
])

const BINARY_CONDITION_ACTIVE_AMOUNT = 1

const helpfulTypes = new Set<TSquaddieConditionType>([
    SquaddieConditionType.ARMOR,
    SquaddieConditionType.ABSORB,
    SquaddieConditionType.ELUSIVE,
    SquaddieConditionType.HUSTLE,
])

const hinderingTypes = new Set<TSquaddieConditionType>([
    SquaddieConditionType.FRIGHTENED,
    SquaddieConditionType.OFF_GUARD,
    SquaddieConditionType.SLOWED,
])

export interface SquaddieCondition {
    type: TSquaddieConditionType
    source: TSquaddieConditionSource
    amount?: {
        current: number
        base?: number | undefined
        decaysAt?: TSquaddieConditionDecaysAt
    }
    limit: {
        duration?: {
            duration: number
            decaysAt: TSquaddieConditionDecaysAt
        }
    }
}

interface DominantAmounts {
    strongestBonus: number
    strongestPenalty: number
}

export const squaddieConditionSchema = z.object({
    type: z.enum(SquaddieConditionType),
    source: z.enum(SquaddieConditionSource),
    amount: z
        .object({
            current: z.number(),
            base: z.number().optional(),
            decaysAt: z.enum(SquaddieConditionDecaysAt).optional(),
        })
        .optional(),
    limit: z.object({
        duration: z
            .object({
                duration: z.number(),
                decaysAt: z.enum(SquaddieConditionDecaysAt),
            })
            .optional(),
    }),
})

export type SerializedSquaddieCondition = z.infer<
    typeof squaddieConditionSchema
>

export const SquaddieConditionService = {
    new: (params: {
        type: TSquaddieConditionType
        duration:
            | { duration: number; decaysAt: TSquaddieConditionDecaysAt }
            | undefined
        amount:
            | { amount: number; decaysAt?: TSquaddieConditionDecaysAt }
            | undefined
        source: TSquaddieConditionSource
    }): SquaddieCondition => newSquaddieCondition(params),
    isBinary: (squaddieCondition: SquaddieCondition): boolean =>
        isBinary(squaddieCondition),
    isHelpful: (squaddieCondition: SquaddieCondition): boolean =>
        helpfulTypes.has(squaddieCondition.type) &&
        (isBinary(squaddieCondition) || squaddieCondition.amount!.current > 0),
    isHindering: (squaddieCondition: SquaddieCondition): boolean =>
        isHinderingTotal({
            type: squaddieCondition.type,
            totalAmount: getActiveAmount(squaddieCondition),
        }),
    isBinaryType: (type: TSquaddieConditionType): boolean =>
        binaryTypes.has(type),
    isHinderingTotal: ({
        type,
        totalAmount,
    }: {
        type: TSquaddieConditionType
        totalAmount: number
    }): boolean => isHinderingTotal({ type, totalAmount }),
    calculateEffectiveAmount: (
        conditions: SquaddieCondition[] | undefined
    ): number => calculateEffectiveAmount(conditions),
    isContributingToEffectiveAmount: ({
        condition,
        conditionsOfSameType,
    }: {
        condition: SquaddieCondition
        conditionsOfSameType: SquaddieCondition[]
    }): boolean =>
        isContributingToEffectiveAmount({ condition, conditionsOfSameType }),
    clone: (original: SquaddieCondition): SquaddieCondition => ({
        type: original.type,
        source: original.source,
        amount:
            original.amount == undefined ? undefined : { ...original.amount },
        limit: {
            duration:
                original.limit.duration == undefined
                    ? undefined
                    : { ...original.limit.duration },
        },
    }),
    serialize: (condition: SquaddieCondition): SerializedSquaddieCondition => ({
        type: condition.type,
        source: condition.source,
        amount:
            condition.amount == undefined ? undefined : { ...condition.amount },
        limit: {
            duration:
                condition.limit.duration == undefined
                    ? undefined
                    : { ...condition.limit.duration },
        },
    }),
    deserialize: (data: unknown): SquaddieCondition => {
        const result = squaddieConditionSchema.safeParse(data)
        if (!result.success) {
            const details = result.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ")
            throw new Error(
                `[SquaddieConditionService.deserialize]: ${details}`
            )
        }
        return result.data as SquaddieCondition
    },
}

const isBinary = (squaddieCondition: SquaddieCondition): boolean =>
    binaryTypes.has(squaddieCondition.type)

const isHinderingTotal = ({
    type,
    totalAmount,
}: {
    type: TSquaddieConditionType
    totalAmount: number
}): boolean =>
    (hinderingTypes.has(type) && totalAmount > 0) ||
    (helpfulTypes.has(type) && totalAmount < 0)

const getActiveAmount = (condition: SquaddieCondition): number =>
    isBinary(condition)
        ? BINARY_CONDITION_ACTIVE_AMOUNT
        : (condition.amount?.current ?? 0)

const calculateDominantAmountsBySource = (
    conditions: SquaddieCondition[]
): Map<TSquaddieConditionSource, DominantAmounts> => {
    const dominantAmountsBySource = new Map<
        TSquaddieConditionSource,
        DominantAmounts
    >()
    for (const condition of conditions) {
        const amount = getActiveAmount(condition)
        const existing = dominantAmountsBySource.get(condition.source) ?? {
            strongestBonus: 0,
            strongestPenalty: 0,
        }
        dominantAmountsBySource.set(condition.source, {
            strongestBonus: Math.max(existing.strongestBonus, amount, 0),
            strongestPenalty: Math.min(existing.strongestPenalty, amount, 0),
        })
    }
    return dominantAmountsBySource
}

const calculateEffectiveAmount = (
    conditions: SquaddieCondition[] | undefined
): number => {
    if (conditions == undefined || conditions.length === 0) return 0

    let total = 0
    for (const {
        strongestBonus,
        strongestPenalty,
    } of calculateDominantAmountsBySource(conditions).values()) {
        total += strongestBonus + strongestPenalty
    }
    return total
}

const isContributingToEffectiveAmount = ({
    condition,
    conditionsOfSameType,
}: {
    condition: SquaddieCondition
    conditionsOfSameType: SquaddieCondition[]
}): boolean => {
    const amount = getActiveAmount(condition)
    if (amount === 0) return false
    const dominantAmounts = calculateDominantAmountsBySource([
        condition,
        ...conditionsOfSameType,
    ]).get(condition.source)!
    return (
        amount === dominantAmounts.strongestBonus ||
        amount === dominantAmounts.strongestPenalty
    )
}

const newSquaddieCondition = ({
    type,
    amount,
    duration,
    source,
}: {
    type: TSquaddieConditionType
    duration:
        | { duration: number; decaysAt: TSquaddieConditionDecaysAt }
        | undefined
    amount:
        | { amount: number; decaysAt?: TSquaddieConditionDecaysAt }
        | undefined
    source: TSquaddieConditionSource
}): SquaddieCondition => {
    const amountObj =
        amount == undefined
            ? undefined
            : {
                  current: amount.amount,
                  base: duration == undefined ? undefined : amount.amount,
                  decaysAt: amount.decaysAt,
              }
    return {
        type,
        source,
        amount: amountObj,
        limit: {
            duration,
        },
    }
}
