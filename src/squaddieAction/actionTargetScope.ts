import type { EnumLike } from "../enum.js"

export const ActionTargetScope = {
    SELF: "SELF",
    SINGLE: "SINGLE",
    AREA: "AREA",
} as const satisfies Record<string, string>
export type TActionTargetScope = EnumLike<typeof ActionTargetScope>
