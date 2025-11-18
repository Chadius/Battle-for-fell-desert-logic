import type { EnumLike } from "../enum.ts"

export const ActionRange = {
    SELF: "SELF",
    MELEE: "MELEE",
    REACH: "REACH",
    SHORT: "SHORT",
    MEDIUM: "MEDIUM",
    LONG: "LONG",
} as const satisfies Record<string, string>
export type TActionRange = EnumLike<typeof ActionRange>

const minAndMaxByRange = {
    [ActionRange.SELF]: { minimum: 0, maximum: 0 },
    [ActionRange.MELEE]: { minimum: 0, maximum: 1 },
    [ActionRange.REACH]: { minimum: 0, maximum: 2 },
    [ActionRange.SHORT]: { minimum: 0, maximum: 3 },
    [ActionRange.MEDIUM]: { minimum: 0, maximum: 4 },
    [ActionRange.LONG]: { minimum: 0, maximum: 6 },
}

const humanReadableDescriptionByRange = {
    [ActionRange.SELF]: "Self Only",
    [ActionRange.MELEE]: "Melee",
    [ActionRange.REACH]: "Reach (0-2)",
    [ActionRange.SHORT]: "Short (0-3)",
    [ActionRange.MEDIUM]: "Medium (0-4)",
    [ActionRange.LONG]: "Long (0-6)",
}

export const ActionRangeService = {
    minAndMaxByRange,
    humanReadableDescriptionByRange,
}
