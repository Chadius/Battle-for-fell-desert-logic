import { describe, expect, it } from "vitest"
import { AttributeScore } from "../../../proficiency/attributeScore.js"
import { ActionRange } from "../../actionRange.js"
import { CoordinateGeneratorShape } from "../../../coordinateMap/shape.js"
import { ProficiencyType } from "../../../proficiency/proficiencyLevel.js"
import {
    SquaddieActionClassification,
    SquaddieActionClassificationService,
} from "../../squaddieActionClassification.js"
import { ClassificationTestActions } from "./classificationTestActions.js"

describe("SquaddieActionClassificationService.classify non-weapon actions", () => {
    describe("when the action attacks a foe", () => {
        it.each([
            [
                AttributeScore.MIND,
                ProficiencyType.SKILL_MIND,
                SquaddieActionClassification.MIND_ATTACK,
            ],
            [
                AttributeScore.SOUL,
                ProficiencyType.SKILL_SOUL,
                SquaddieActionClassification.SOUL_ATTACK,
            ],
            [
                AttributeScore.BODY,
                ProficiencyType.SKILL_BODY,
                SquaddieActionClassification.BODY_ATTACK,
            ],
        ])(
            "classifies a %s attack as its attribute's attack",
            (attribute, proficiency, classification) => {
                const attack = ClassificationTestActions.attack({
                    attribute,
                    proficiency,
                })

                expect(
                    SquaddieActionClassificationService.classify(attack)
                ).toBe(classification)
            }
        )
    })

    describe("when the action attacks foes across an area", () => {
        it.each([
            [
                AttributeScore.MIND,
                ProficiencyType.SKILL_MIND,
                SquaddieActionClassification.MIND_AOE_ATTACK,
            ],
            [
                AttributeScore.SOUL,
                ProficiencyType.SKILL_SOUL,
                SquaddieActionClassification.SOUL_AOE_ATTACK,
            ],
            [
                AttributeScore.BODY,
                ProficiencyType.SKILL_BODY,
                SquaddieActionClassification.BODY_AOE_ATTACK,
            ],
        ])(
            "classifies a %s area attack like Fireball as its attribute's area attack",
            (attribute, proficiency, classification) => {
                const fireball = ClassificationTestActions.attack({
                    attribute,
                    proficiency,
                    range: ActionRange.MEDIUM,
                    areaOfEffectSize: 1,
                })

                expect(
                    SquaddieActionClassificationService.classify(fireball)
                ).toBe(classification)
            }
        )

        it("treats a width-0 LINE like Lightning Bolt as an area attack", () => {
            const lightningBolt = ClassificationTestActions.attack({
                attribute: AttributeScore.MIND,
                proficiency: ProficiencyType.SKILL_MIND,
                range: ActionRange.LONG,
                shape: CoordinateGeneratorShape.LINE,
            })

            expect(
                SquaddieActionClassificationService.classify(lightningBolt)
            ).toBe(SquaddieActionClassification.MIND_AOE_ATTACK)
        })
    })

    describe("when the action helps a friend", () => {
        it.each([
            [
                AttributeScore.MIND,
                ProficiencyType.SKILL_MIND,
                SquaddieActionClassification.MIND_ASSIST,
            ],
            [
                AttributeScore.SOUL,
                ProficiencyType.SKILL_SOUL,
                SquaddieActionClassification.SOUL_ASSIST,
            ],
            [
                AttributeScore.BODY,
                ProficiencyType.SKILL_BODY,
                SquaddieActionClassification.BODY_ASSIST,
            ],
        ])(
            "classifies a %s assist as its attribute's assist",
            (attribute, proficiency, classification) => {
                const assist = ClassificationTestActions.assist({
                    attribute,
                    proficiency,
                })

                expect(
                    SquaddieActionClassificationService.classify(assist)
                ).toBe(classification)
            }
        )
    })

    describe("when an area action helps friends", () => {
        it("is still an assist", () => {
            const areaHeal = ClassificationTestActions.assist({
                attribute: AttributeScore.SOUL,
                proficiency: ProficiencyType.SKILL_SOUL,
                range: ActionRange.SHORT,
                areaOfEffectSize: 1,
            })

            expect(SquaddieActionClassificationService.classify(areaHeal)).toBe(
                SquaddieActionClassification.SOUL_ASSIST
            )
        })
    })

    describe("when the action has no proficiency", () => {
        it("is classified by its attribute", () => {
            const untrainedSoulAssist = ClassificationTestActions.assist({
                attribute: AttributeScore.SOUL,
                proficiency: ProficiencyType.UNKNOWN,
            })

            expect(
                SquaddieActionClassificationService.classify(
                    untrainedSoulAssist
                )
            ).toBe(SquaddieActionClassification.SOUL_ASSIST)
        })
    })
})
