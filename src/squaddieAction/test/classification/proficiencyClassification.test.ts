import { describe, expect, it } from "vitest"
import { AttributeScore } from "../../../proficiency/attributeScore.js"
import { ProficiencyType } from "../../../proficiency/proficiencyLevel.js"
import { SquaddieActionClassificationService } from "../../squaddieActionClassification.js"
import { ClassificationTestActions } from "./classificationTestActions.js"

describe("SquaddieActionClassificationService.classify proficiency", () => {
    describe("when the action uses a weapon proficiency", () => {
        it.each([
            ProficiencyType.WEAPON_NATURAL,
            ProficiencyType.WEAPON_SIMPLE,
            ProficiencyType.WEAPON_MARTIAL,
        ])("classifies a %s attack as a WEAPON action", (proficiency) => {
            const weaponAttack = ClassificationTestActions.attack({
                attribute: AttributeScore.BODY,
                proficiency,
            })

            expect(
                SquaddieActionClassificationService.classify(weaponAttack)
            ).toBe("WEAPON_MELEE_DAMAGE")
        })
    })

    describe("when the action uses a skill or defense proficiency", () => {
        it.each([
            [
                ProficiencyType.SKILL_BODY,
                AttributeScore.MIND,
                "BODY_MELEE_DAMAGE",
            ],
            [
                ProficiencyType.DEFEND_BODY,
                AttributeScore.MIND,
                "BODY_MELEE_DAMAGE",
            ],
            [
                ProficiencyType.SKILL_MIND,
                AttributeScore.BODY,
                "MIND_MELEE_DAMAGE",
            ],
            [
                ProficiencyType.DEFEND_MIND,
                AttributeScore.BODY,
                "MIND_MELEE_DAMAGE",
            ],
            [
                ProficiencyType.SKILL_SOUL,
                AttributeScore.BODY,
                "SOUL_MELEE_DAMAGE",
            ],
            [
                ProficiencyType.DEFEND_SOUL,
                AttributeScore.BODY,
                "SOUL_MELEE_DAMAGE",
            ],
        ])(
            "classifies a %s attack with the %s attribute by the proficiency's attribute, not the action's, as %s",
            (proficiency, attribute, classification) => {
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

    describe("when the proficiency names no attribute", () => {
        it.each([ProficiencyType.UNKNOWN, ProficiencyType.ARMOR])(
            "classifies a %s action by the action's attribute",
            (proficiency) => {
                const soulAssist = ClassificationTestActions.assist({
                    attribute: AttributeScore.SOUL,
                    proficiency,
                })

                expect(
                    SquaddieActionClassificationService.classify(soulAssist)
                ).toBe("SOUL_MELEE_ASSIST")
            }
        )
    })
})
