import type { EnumLike } from "../enum.ts"

export const AttributeScore = {
    BODY: "BODY",
    MIND: "MIND",
    SOUL: "SOUL",
} as const satisfies Record<string, string>
export type AttributeScoreType = EnumLike<typeof AttributeScore>
