import type { EnumLike } from "../enum"

export const SquaddieRole = {
    NONE: "NONE",
} as const satisfies Record<string, string>
export type TSquaddieRole = EnumLike<typeof SquaddieRole>
