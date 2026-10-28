import { describe, expect, it } from "vitest"
import { SquaddieActionService } from "./squaddieAction.js"
import { ActionTargetScope } from "./actionTargetScope.js"
import { ActionRange } from "./actionRange.js"
import { CoordinateGeneratorShape } from "../coordinateMap/shape.js"
import { DegreeOfSuccess } from "../degreesOfSuccess/degreeOfSuccess.js"

const noOpEffectOnActor = {
    [DegreeOfSuccess.SUCCESS]: {},
}

describe("SquaddieActionService.getTargetScope", () => {
    describe("when the action affects one chosen squaddie", () => {
        it("is SINGLE for a melee attack against a foe", () => {
            const scimitar = SquaddieActionService.new({
                id: "scimitar",
                range: ActionRange.MELEE,
                affiliationRelationship: {
                    self: false,
                    foe: true,
                    friend: false,
                },
                effectOnActor: noOpEffectOnActor,
            })

            expect(SquaddieActionService.getTargetScope(scimitar)).toBe(
                ActionTargetScope.SINGLE
            )
        })

        it("is SINGLE for a ranged heal on a friend", () => {
            const heal = SquaddieActionService.new({
                id: "heal",
                range: ActionRange.SHORT,
                affiliationRelationship: {
                    self: true,
                    foe: false,
                    friend: true,
                },
                effectOnActor: noOpEffectOnActor,
            })

            expect(SquaddieActionService.getTargetScope(heal)).toBe(
                ActionTargetScope.SINGLE
            )
        })
    })

    describe("when the action covers several hexes", () => {
        it("is AREA for a BLOOM with a positive area of effect size", () => {
            const fireball = SquaddieActionService.new({
                id: "fireball",
                range: ActionRange.MEDIUM,
                shape: CoordinateGeneratorShape.BLOOM,
                areaOfEffectSize: 1,
                effectOnActor: noOpEffectOnActor,
            })

            expect(SquaddieActionService.getTargetScope(fireball)).toBe(
                ActionTargetScope.AREA
            )
        })

        it.each([CoordinateGeneratorShape.LINE, CoordinateGeneratorShape.CONE])(
            "is AREA for a %s even at width 0, because it still covers several hexes",
            (shape) => {
                const directionalAction = SquaddieActionService.new({
                    id: "directional",
                    range: ActionRange.SHORT,
                    shape,
                    areaOfEffectSize: 0,
                    effectOnActor: noOpEffectOnActor,
                })

                expect(
                    SquaddieActionService.getTargetScope(directionalAction)
                ).toBe(ActionTargetScope.AREA)
            }
        )

        it("is AREA when the area is centred on the actor", () => {
            const shockwave = SquaddieActionService.new({
                id: "shockwave",
                range: ActionRange.SELF,
                shape: CoordinateGeneratorShape.BLOOM,
                areaOfEffectSize: 1,
                effectOnActor: noOpEffectOnActor,
            })

            expect(SquaddieActionService.getTargetScope(shockwave)).toBe(
                ActionTargetScope.AREA
            )
        })
    })

    describe("when the action can only affect the actor", () => {
        it("is SELF for an action with SELF range, even if it lists foes", () => {
            const aura = SquaddieActionService.new({
                id: "aura",
                range: ActionRange.SELF,
                affiliationRelationship: {
                    self: false,
                    foe: true,
                    friend: false,
                },
                effectOnActor: noOpEffectOnActor,
            })

            expect(SquaddieActionService.getTargetScope(aura)).toBe(
                ActionTargetScope.SELF
            )
        })

        it("is SELF for an action that targets neither foes nor friends", () => {
            const brace = SquaddieActionService.new({
                id: "brace",
                range: ActionRange.MELEE,
                affiliationRelationship: {
                    self: true,
                    foe: false,
                    friend: false,
                },
                effectOnActor: noOpEffectOnActor,
            })

            expect(SquaddieActionService.getTargetScope(brace)).toBe(
                ActionTargetScope.SELF
            )
        })
    })
})
