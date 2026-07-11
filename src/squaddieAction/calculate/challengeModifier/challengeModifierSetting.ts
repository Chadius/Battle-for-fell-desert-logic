import { z } from "zod"
import type { EnumLike } from "../../../enum.js"

export const ChallengeModifierType = {
    TRAINING_WHEELS: "TRAINING_WHEELS",
} as const satisfies Record<string, string>
export type TChallengeModifierType = EnumLike<typeof ChallengeModifierType>

export type ChallengeModifierSetting = Partial<
    Record<TChallengeModifierType, boolean>
>

export const challengeModifierSettingSchema = z.partialRecord(
    z.enum(ChallengeModifierType),
    z.boolean()
)

export type SerializedChallengeModifierSetting = z.infer<
    typeof challengeModifierSettingSchema
>

export const ChallengeModifierSettingService = {
    new: (): ChallengeModifierSetting => ({}),

    isEnabled: (
        challengeModifierSetting: ChallengeModifierSetting | undefined,
        type: TChallengeModifierType
    ): boolean => challengeModifierSetting?.[type] === true,

    setFlag: ({
        challengeModifierSetting,
        type,
        value,
    }: {
        challengeModifierSetting: ChallengeModifierSetting
        type: TChallengeModifierType
        value: boolean
    }): ChallengeModifierSetting => ({
        ...challengeModifierSetting,
        [type]: value,
    }),

    serialize: (
        challengeModifierSetting: ChallengeModifierSetting
    ): SerializedChallengeModifierSetting => ({
        ...challengeModifierSetting,
    }),

    deserialize: (data: unknown): ChallengeModifierSetting => {
        const result = challengeModifierSettingSchema.safeParse(data)
        if (!result.success) {
            const details = result.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ")
            throw new Error(
                `[ChallengeModifierSettingService.deserialize]: ${details}`
            )
        }
        return { ...result.data }
    },
}
