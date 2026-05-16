import type { EnumLike } from "../enum"

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
])

const helpfulTypes = new Set<TSquaddieConditionType>([
    SquaddieConditionType.ARMOR,
    SquaddieConditionType.ABSORB,
    SquaddieConditionType.ELUSIVE,
    SquaddieConditionType.HUSTLE,
])

const hinderingTypes = new Set<TSquaddieConditionType>([
    SquaddieConditionType.OFF_GUARD,
    SquaddieConditionType.SLOWED,
])

export interface SquaddieCondition {
    type: TSquaddieConditionType
    source: TSquaddieConditionSource
    amount:
        | {
              current: number
              base: number | undefined
              decaysAt?: TSquaddieConditionDecaysAt
          }
        | undefined
    limit: {
        duration:
            | {
                  duration: number
                  decaysAt: TSquaddieConditionDecaysAt
              }
            | undefined
    }
}

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
    isBinary: (t: SquaddieCondition): boolean => isBinary(t),
    isHelpful: (t: SquaddieCondition): boolean =>
        helpfulTypes.has(t.type) && (isBinary(t) || t.amount!.current > 0),
    isHindering: (t: SquaddieCondition): boolean =>
        (hinderingTypes.has(t.type) &&
            (isBinary(t) || t.amount!.current > 0)) ||
        (helpfulTypes.has(t.type) && !isBinary(t) && t.amount!.current < 0),
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
}

const isBinary = (t: SquaddieCondition): boolean => binaryTypes.has(t.type)

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
