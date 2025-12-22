import type { EnumLike } from "../enum.ts"

export const SquaddieConditionType = {
    UNKNOWN: "UNKNOWN",
    ABSORB: "ABSORB",
    ARMOR: "ARMOR",
    ELUSIVE: "ELUSIVE",
    SLOWED: "SLOWED",
    HUSTLE: "HUSTLE",
} as const satisfies Record<string, string>
export type TSquaddieConditionType = EnumLike<typeof SquaddieConditionType>

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
    SquaddieConditionType.SLOWED,
])

export interface SquaddieCondition {
    type: TSquaddieConditionType
    amount: number | undefined
    limit: {
        duration: number | undefined
    }
}

export const SquaddieConditionService = {
    new: (params: {
        type: TSquaddieConditionType
        duration: number | undefined
        amount: number | undefined
    }): SquaddieCondition => newSquaddieCondition(params),
    isBinary: (t: SquaddieCondition): boolean => isBinary(t),
    isHelpful: (t: SquaddieCondition): boolean =>
        helpfulTypes.has(t.type) && (isBinary(t) || t.amount! > 0),
    isHindering: (t: SquaddieCondition): boolean =>
        (hinderingTypes.has(t.type) && (isBinary(t) || t.amount! > 0)) ||
        (helpfulTypes.has(t.type) && !isBinary(t) && t.amount! < 0),
    clone: (original: SquaddieCondition): SquaddieCondition =>
        newSquaddieCondition({
            type: original.type,
            duration: original.limit.duration,
            amount: original.amount,
        }),
}

const isBinary = (t: SquaddieCondition): boolean => binaryTypes.has(t.type)

const newSquaddieCondition = ({
    type,
    amount,
    duration,
}: {
    type: TSquaddieConditionType
    duration: number | undefined
    amount: number | undefined
}): SquaddieCondition => {
    return {
        type,
        amount,
        limit: {
            duration,
        },
    }
}
