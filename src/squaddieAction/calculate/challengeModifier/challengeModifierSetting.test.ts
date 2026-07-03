import { describe, expect, it } from "vitest"
import {
    ChallengeModifierSettingService,
    ChallengeModifierType,
} from "./challengeModifierSetting"

describe("ChallengeModifierSettingService", () => {
    it("defaults to disabled for a new setting", () => {
        const setting = ChallengeModifierSettingService.new()
        expect(
            ChallengeModifierSettingService.isEnabled(
                setting,
                ChallengeModifierType.TRAINING_WHEELS
            )
        ).toBe(false)
    })

    it("treats an undefined setting as disabled", () => {
        expect(
            ChallengeModifierSettingService.isEnabled(
                undefined,
                ChallengeModifierType.TRAINING_WHEELS
            )
        ).toBe(false)
    })

    it("can enable a modifier without mutating the original", () => {
        const original = ChallengeModifierSettingService.new()
        const updated = ChallengeModifierSettingService.setFlag({
            challengeModifierSetting: original,
            type: ChallengeModifierType.TRAINING_WHEELS,
            value: true,
        })

        expect(
            ChallengeModifierSettingService.isEnabled(
                updated,
                ChallengeModifierType.TRAINING_WHEELS
            )
        ).toBe(true)
        expect(
            ChallengeModifierSettingService.isEnabled(
                original,
                ChallengeModifierType.TRAINING_WHEELS
            )
        ).toBe(false)
    })

    it("can disable a previously enabled modifier", () => {
        const enabled = ChallengeModifierSettingService.setFlag({
            challengeModifierSetting: ChallengeModifierSettingService.new(),
            type: ChallengeModifierType.TRAINING_WHEELS,
            value: true,
        })
        const disabled = ChallengeModifierSettingService.setFlag({
            challengeModifierSetting: enabled,
            type: ChallengeModifierType.TRAINING_WHEELS,
            value: false,
        })

        expect(
            ChallengeModifierSettingService.isEnabled(
                disabled,
                ChallengeModifierType.TRAINING_WHEELS
            )
        ).toBe(false)
    })

    describe("serialize and deserialize", () => {
        it("round-trips an empty setting", () => {
            const setting = ChallengeModifierSettingService.new()
            const serialized =
                ChallengeModifierSettingService.serialize(setting)
            const deserialized =
                ChallengeModifierSettingService.deserialize(serialized)
            expect(deserialized).toEqual(setting)
        })

        it("round-trips an enabled modifier", () => {
            const setting = ChallengeModifierSettingService.setFlag({
                challengeModifierSetting: ChallengeModifierSettingService.new(),
                type: ChallengeModifierType.TRAINING_WHEELS,
                value: true,
            })
            const serialized =
                ChallengeModifierSettingService.serialize(setting)
            const deserialized =
                ChallengeModifierSettingService.deserialize(serialized)
            expect(deserialized).toEqual(setting)
        })

        it("throws with a descriptive message on an unrecognized modifier type", () => {
            expect(() =>
                ChallengeModifierSettingService.deserialize({
                    NOT_A_REAL_MODIFIER: true,
                })
            ).toThrow("[ChallengeModifierSettingService.deserialize]:")
        })

        it("throws with a descriptive message when a value is not a boolean", () => {
            expect(() =>
                ChallengeModifierSettingService.deserialize({
                    TRAINING_WHEELS: "yes",
                })
            ).toThrow("[ChallengeModifierSettingService.deserialize]:")
        })
    })
})
