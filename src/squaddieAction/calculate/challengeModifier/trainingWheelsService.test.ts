import { describe, expect, it } from "vitest"
import { TrainingWheelsService } from "./trainingWheelsService.js"
import {
    ChallengeModifierSettingService,
    ChallengeModifierType,
} from "./challengeModifierSetting.js"
import { SquaddieActionService } from "../../squaddieAction.js"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.js"
import { ProficiencyType } from "../../../proficiency/proficiencyLevel.js"
import { SquaddieAffiliation } from "../../../affiliation/affiliation.js"

const noOpEffectOnActor = {
    [DegreeOfSuccess.SUCCESS]: {},
}

const attackAction = SquaddieActionService.new({
    id: "attack",
    name: "Attack",
    proficiency: ProficiencyType.WEAPON_MARTIAL,
    effectOnActor: noOpEffectOnActor,
    effectOnTarget: {
        [DegreeOfSuccess.SUCCESS]: {
            damage: { raw: 2, targetProficiency: ProficiencyType.ARMOR },
        },
        [DegreeOfSuccess.CRITICAL]: {
            damage: { raw: 4, targetProficiency: ProficiencyType.ARMOR },
        },
        [DegreeOfSuccess.FAILURE]: {},
        [DegreeOfSuccess.BOTCH]: {},
    },
})

const nonAttackAction = SquaddieActionService.new({
    id: "heal",
    name: "Heal",
    effectOnActor: noOpEffectOnActor,
    effectOnTarget: {
        [DegreeOfSuccess.SUCCESS]: {
            healing: { raw: 2 },
        },
    },
})

const enabledSetting = ChallengeModifierSettingService.setFlag({
    challengeModifierSetting: ChallengeModifierSettingService.new(),
    type: ChallengeModifierType.TRAINING_WHEELS,
    value: true,
})

describe("TrainingWheelsService", () => {
    describe("getForcedDegreeOfSuccess", () => {
        it("is undefined when the modifier is disabled", () => {
            expect(
                TrainingWheelsService.getForcedDegreeOfSuccess({
                    challengeModifierSetting:
                        ChallengeModifierSettingService.new(),
                    squaddieAction: attackAction,
                    actorAffiliation: SquaddieAffiliation.PLAYER,
                    targetAffiliation: SquaddieAffiliation.ENEMY,
                })
            ).toBeUndefined()
        })

        it("is undefined for actions that do not deal damage", () => {
            expect(
                TrainingWheelsService.getForcedDegreeOfSuccess({
                    challengeModifierSetting: enabledSetting,
                    squaddieAction: nonAttackAction,
                    actorAffiliation: SquaddieAffiliation.PLAYER,
                    targetAffiliation: SquaddieAffiliation.ENEMY,
                })
            ).toBeUndefined()
        })

        it("forces CRITICAL when the player attacks a non-ally", () => {
            expect(
                TrainingWheelsService.getForcedDegreeOfSuccess({
                    challengeModifierSetting: enabledSetting,
                    squaddieAction: attackAction,
                    actorAffiliation: SquaddieAffiliation.PLAYER,
                    targetAffiliation: SquaddieAffiliation.ENEMY,
                })
            ).toBe(DegreeOfSuccess.CRITICAL)
        })

        it("falls back to SUCCESS if the action has no CRITICAL outcome", () => {
            const noCriticalAction = SquaddieActionService.new({
                id: "attack-no-crit",
                name: "Attack",
                degreesOfSuccess: [
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.FAILURE,
                ],
                effectOnActor: noOpEffectOnActor,
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: 2,
                            targetProficiency: ProficiencyType.ARMOR,
                        },
                    },
                },
            })

            expect(
                TrainingWheelsService.getForcedDegreeOfSuccess({
                    challengeModifierSetting: enabledSetting,
                    squaddieAction: noCriticalAction,
                    actorAffiliation: SquaddieAffiliation.PLAYER,
                    targetAffiliation: SquaddieAffiliation.ENEMY,
                })
            ).toBe(DegreeOfSuccess.SUCCESS)
        })

        it("does not force anything when the player attacks an ally", () => {
            expect(
                TrainingWheelsService.getForcedDegreeOfSuccess({
                    challengeModifierSetting: enabledSetting,
                    squaddieAction: attackAction,
                    actorAffiliation: SquaddieAffiliation.PLAYER,
                    targetAffiliation: SquaddieAffiliation.ALLY,
                })
            ).toBeUndefined()
        })

        it("forces BOTCH when an enemy attacks a player squaddie", () => {
            expect(
                TrainingWheelsService.getForcedDegreeOfSuccess({
                    challengeModifierSetting: enabledSetting,
                    squaddieAction: attackAction,
                    actorAffiliation: SquaddieAffiliation.ENEMY,
                    targetAffiliation: SquaddieAffiliation.PLAYER,
                })
            ).toBe(DegreeOfSuccess.BOTCH)
        })

        it("falls back to FAILURE if the action has no BOTCH outcome", () => {
            const noBotchAction = SquaddieActionService.new({
                id: "attack-no-botch",
                name: "Attack",
                degreesOfSuccess: [
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.FAILURE,
                ],
                effectOnActor: noOpEffectOnActor,
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: 2,
                            targetProficiency: ProficiencyType.ARMOR,
                        },
                    },
                },
            })

            expect(
                TrainingWheelsService.getForcedDegreeOfSuccess({
                    challengeModifierSetting: enabledSetting,
                    squaddieAction: noBotchAction,
                    actorAffiliation: SquaddieAffiliation.ENEMY,
                    targetAffiliation: SquaddieAffiliation.PLAYER,
                })
            ).toBe(DegreeOfSuccess.FAILURE)
        })

        it("does not force anything between two non-player squaddies", () => {
            expect(
                TrainingWheelsService.getForcedDegreeOfSuccess({
                    challengeModifierSetting: enabledSetting,
                    squaddieAction: attackAction,
                    actorAffiliation: SquaddieAffiliation.ENEMY,
                    targetAffiliation: SquaddieAffiliation.NONE,
                })
            ).toBeUndefined()
        })
    })
})
