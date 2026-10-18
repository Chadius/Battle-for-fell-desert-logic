import { describe, expect, it } from "vitest"
import { ActionRange } from "../../actionRange.js"
import { CoordinateGeneratorShape } from "../../../coordinateMap/shape.js"
import { ProficiencyType } from "../../../proficiency/proficiencyLevel.js"
import {
    SquaddieActionClassification,
    SquaddieActionClassificationService,
} from "../../squaddieActionClassification.js"
import { ClassificationTestActions } from "./classificationTestActions.js"

describe("SquaddieActionClassificationService.classify weapon actions", () => {
    describe("when a weapon attack hits one adjacent foe", () => {
        it.each([
            [
                ProficiencyType.WEAPON_NATURAL,
                SquaddieActionClassification.WEAPON_MELEE_NATURAL,
            ],
            [
                ProficiencyType.WEAPON_SIMPLE,
                SquaddieActionClassification.WEAPON_MELEE_SIMPLE,
            ],
            [
                ProficiencyType.WEAPON_MARTIAL,
                SquaddieActionClassification.WEAPON_MELEE_MARTIAL,
            ],
        ])("classifies a %s attack as %s", (proficiency, classification) => {
            const meleeAttack = ClassificationTestActions.attack({
                proficiency,
                range: ActionRange.MELEE,
            })

            expect(
                SquaddieActionClassificationService.classify(meleeAttack)
            ).toBe(classification)
        })
    })

    describe("when a weapon attack hits one foe at reach range", () => {
        it("is a melee attack, even for a ranged reach weapon like a slingshot", () => {
            const polearmAttack = ClassificationTestActions.attack({
                proficiency: ProficiencyType.WEAPON_MARTIAL,
                range: ActionRange.REACH,
            })

            expect(
                SquaddieActionClassificationService.classify(polearmAttack)
            ).toBe(SquaddieActionClassification.WEAPON_MELEE_MARTIAL)
        })
    })

    describe("when a weapon attack hits one foe beyond melee range", () => {
        it.each([
            [
                ProficiencyType.WEAPON_NATURAL,
                SquaddieActionClassification.WEAPON_RANGED_NATURAL,
            ],
            [
                ProficiencyType.WEAPON_SIMPLE,
                SquaddieActionClassification.WEAPON_RANGED_SIMPLE,
            ],
            [
                ProficiencyType.WEAPON_MARTIAL,
                SquaddieActionClassification.WEAPON_RANGED_MARTIAL,
            ],
        ])("classifies a %s attack as %s", (proficiency, classification) => {
            const rangedAttack = ClassificationTestActions.attack({
                proficiency,
                range: ActionRange.LONG,
            })

            expect(
                SquaddieActionClassificationService.classify(rangedAttack)
            ).toBe(classification)
        })
    })

    describe("when a weapon attack covers an area", () => {
        it.each([
            [
                ProficiencyType.WEAPON_NATURAL,
                SquaddieActionClassification.WEAPON_AOE_NATURAL,
            ],
            [
                ProficiencyType.WEAPON_SIMPLE,
                SquaddieActionClassification.WEAPON_AOE_SIMPLE,
            ],
            [
                ProficiencyType.WEAPON_MARTIAL,
                SquaddieActionClassification.WEAPON_AOE_MARTIAL,
            ],
        ])("classifies a %s attack as %s", (proficiency, classification) => {
            const areaAttack = ClassificationTestActions.attack({
                proficiency,
                range: ActionRange.SHORT,
                areaOfEffectSize: 1,
            })

            expect(
                SquaddieActionClassificationService.classify(areaAttack)
            ).toBe(classification)
        })

        it("treats a melee LINE sweep as an area attack, not a melee one", () => {
            const sweep = ClassificationTestActions.attack({
                proficiency: ProficiencyType.WEAPON_MARTIAL,
                range: ActionRange.MELEE,
                shape: CoordinateGeneratorShape.LINE,
            })

            expect(SquaddieActionClassificationService.classify(sweep)).toBe(
                SquaddieActionClassification.WEAPON_AOE_MARTIAL
            )
        })
    })

    describe("when a weapon action helps a friend instead of attacking", () => {
        it("is UNKNOWN, because no weapon classification describes an assist", () => {
            const weaponAssist = ClassificationTestActions.assist({
                proficiency: ProficiencyType.WEAPON_SIMPLE,
            })

            expect(
                SquaddieActionClassificationService.classify(weaponAssist)
            ).toBe(SquaddieActionClassification.UNKNOWN)
        })
    })
})
