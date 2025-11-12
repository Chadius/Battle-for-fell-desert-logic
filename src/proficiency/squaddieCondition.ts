import type { EnumLike } from "../enum.ts"

export const SquaddieConditionType = {
    UNKNOWN: "UNKNOWN",
    ABSORB: "ABSORB",
    ARMOR: "ARMOR",
    ELUSIVE: "ELUSIVE",
} as const satisfies Record<string, string>
export type TSquaddieConditionType = EnumLike<typeof SquaddieConditionType>

const binaryTypes = new Set<TSquaddieConditionType>([
    SquaddieConditionType.ELUSIVE,
])

export interface SquaddieCondition {
    type: TSquaddieConditionType
    amount: number | undefined
    limit: {
        duration: number | undefined
    }
}

export const SquaddieConditionService = {
    new: ({
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
    },
    isBinary: (t: SquaddieCondition): boolean => binaryTypes.has(t.type),
}
