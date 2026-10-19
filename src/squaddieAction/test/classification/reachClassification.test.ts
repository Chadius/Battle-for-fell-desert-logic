import { describe, expect, it } from "vitest"
import { ActionRange } from "../../actionRange.js"
import { CoordinateGeneratorShape } from "../../../coordinateMap/shape.js"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.js"
import { ProficiencyType } from "../../../proficiency/proficiencyLevel.js"
import { SquaddieActionService } from "../../squaddieAction.js"
import { SquaddieActionClassificationService } from "../../squaddieActionClassification.js"
import {
    ClassificationTestActions,
    ClassificationTestEffects,
    spendOneActionPoint,
} from "./classificationTestActions.js"

const proficiency = ProficiencyType.WEAPON_MARTIAL

describe("SquaddieActionClassificationService.classify reach", () => {
    describe("when the action affects one adjacent target", () => {
        it("is MELEE", () => {
            const swordStrike = ClassificationTestActions.attack({
                proficiency,
                range: ActionRange.MELEE,
            })

            expect(
                SquaddieActionClassificationService.classify(swordStrike)
            ).toBe("WEAPON_MELEE_DAMAGE")
        })
    })

    describe("when the action affects one target at reach range", () => {
        it("is MELEE, even for a ranged reach weapon like a slingshot", () => {
            const polearmStrike = ClassificationTestActions.attack({
                proficiency,
                range: ActionRange.REACH,
            })

            expect(
                SquaddieActionClassificationService.classify(polearmStrike)
            ).toBe("WEAPON_MELEE_DAMAGE")
        })
    })

    describe("when the action affects one target beyond reach range", () => {
        it.each([ActionRange.SHORT, ActionRange.MEDIUM, ActionRange.LONG])(
            "is RANGED at %s range",
            (range) => {
                const bowShot = ClassificationTestActions.attack({
                    proficiency,
                    range,
                })

                expect(
                    SquaddieActionClassificationService.classify(bowShot)
                ).toBe("WEAPON_RANGED_DAMAGE")
            }
        )
    })

    describe("when the action only affects the actor", () => {
        it("is SELF at SELF range", () => {
            const parry = ClassificationTestActions.assist({
                proficiency,
                range: ActionRange.SELF,
            })

            expect(SquaddieActionClassificationService.classify(parry)).toBe(
                "WEAPON_SELF_ASSIST"
            )
        })

        it("is SELF when it can only target the actor", () => {
            const brace = SquaddieActionService.new({
                id: "brace",
                name: "Brace",
                proficiency,
                range: ActionRange.MELEE,
                affiliationRelationship: {
                    self: true,
                    foe: false,
                    friend: false,
                },
                effectOnActor: spendOneActionPoint,
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]:
                        ClassificationTestEffects.healing,
                },
            })

            expect(SquaddieActionClassificationService.classify(brace)).toBe(
                "WEAPON_SELF_ASSIST"
            )
        })
    })

    describe("when the action covers an area", () => {
        it("is LINE for a line, even a width-0 one like a piercing spear thrust", () => {
            const piercingThrust = ClassificationTestActions.attack({
                proficiency,
                range: ActionRange.LONG,
                shape: CoordinateGeneratorShape.LINE,
            })

            expect(
                SquaddieActionClassificationService.classify(piercingThrust)
            ).toBe("WEAPON_LINE_DAMAGE")
        })

        it("is LINE for a melee sweep, not MELEE", () => {
            const sweep = ClassificationTestActions.attack({
                proficiency,
                range: ActionRange.MELEE,
                shape: CoordinateGeneratorShape.LINE,
                areaOfEffectSize: 1,
            })

            expect(SquaddieActionClassificationService.classify(sweep)).toBe(
                "WEAPON_LINE_DAMAGE"
            )
        })

        it("is CONE for a cone", () => {
            const fanOfKnives = ClassificationTestActions.attack({
                proficiency,
                range: ActionRange.SHORT,
                shape: CoordinateGeneratorShape.CONE,
                areaOfEffectSize: 1,
            })

            expect(
                SquaddieActionClassificationService.classify(fanOfKnives)
            ).toBe("WEAPON_CONE_DAMAGE")
        })

        it("is BLOOM for a bloom larger than one tile, like a volley of arrows", () => {
            const volleyOfArrows = ClassificationTestActions.attack({
                proficiency,
                range: ActionRange.MEDIUM,
                shape: CoordinateGeneratorShape.BLOOM,
                areaOfEffectSize: 1,
            })

            expect(
                SquaddieActionClassificationService.classify(volleyOfArrows)
            ).toBe("WEAPON_BLOOM_DAMAGE")
        })
    })
})
