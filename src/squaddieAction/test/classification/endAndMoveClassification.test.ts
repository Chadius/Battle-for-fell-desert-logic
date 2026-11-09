import { describe, expect, it } from "vitest"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.js"
import { SquaddieActionService } from "../../squaddieAction.js"
import { MovementEffectType } from "../../squaddieActionMovementEffect.js"
import {
    SquaddieActionClassification,
    SquaddieActionClassificationService,
} from "../../squaddieActionClassification.js"
import { ClassificationTestEffects } from "./classificationTestActions.js"

const damageFoe = {
    [DegreeOfSuccess.SUCCESS]: ClassificationTestEffects.damage,
}

describe("SquaddieActionClassificationService.classify end and move actions", () => {
    describe("when the action only spends all of the actor's action points", () => {
        it("classifies the default end-turn action as END", () => {
            expect(
                SquaddieActionClassificationService.classify(
                    SquaddieActionService.defaultEndTurn()
                )
            ).toBe(SquaddieActionClassification.END)
        })

        it("classifies any other action with the same effect as END", () => {
            const wait = SquaddieActionService.new({
                id: "wait",
                affiliationRelationship: {
                    self: true,
                    foe: false,
                    friend: false,
                },
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: "all" },
                    },
                },
            })

            expect(SquaddieActionClassificationService.classify(wait)).toBe(
                SquaddieActionClassification.END
            )
        })
    })

    describe("when the action spends all action points and does something else", () => {
        it("is a SELF ASSIST, because healing the actor is more than ending the turn", () => {
            const lastStand = SquaddieActionService.new({
                id: "last-stand",
                affiliationRelationship: {
                    self: true,
                    foe: false,
                    friend: false,
                },
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: "all" },
                        healing: { raw: 3 },
                    },
                },
            })

            expect(
                SquaddieActionClassificationService.classify(lastStand)
            ).toBe("BODY_SELF_ASSIST")
        })

        it("is a SELF ASSIST, because restoring action points is more than ending the turn", () => {
            const secondWind = SquaddieActionService.new({
                id: "second-wind",
                affiliationRelationship: {
                    self: true,
                    foe: false,
                    friend: false,
                },
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: "all", restore: 1 },
                    },
                },
            })

            expect(
                SquaddieActionClassificationService.classify(secondWind)
            ).toBe("BODY_SELF_ASSIST")
        })
    })

    describe("when the action spends all action points and damages a foe", () => {
        it("is DAMAGE, not END", () => {
            const desperateStrike = SquaddieActionService.new({
                id: "desperate-strike",
                affiliationRelationship: {
                    self: false,
                    foe: true,
                    friend: false,
                },
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: "all" },
                    },
                },
                effectOnTarget: damageFoe,
            })

            expect(
                SquaddieActionClassificationService.classify(desperateStrike)
            ).toBe("BODY_MELEE_DAMAGE")
        })
    })

    describe("when the action spends all action points and drains a foe's action points", () => {
        it("is HINDER, not END", () => {
            const exhaustingRoar = SquaddieActionService.new({
                id: "exhausting-roar",
                affiliationRelationship: {
                    self: false,
                    foe: true,
                    friend: false,
                },
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: "all" },
                    },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 1 },
                    },
                },
            })

            expect(
                SquaddieActionClassificationService.classify(exhaustingRoar)
            ).toBe("BODY_MELEE_HINDER")
        })
    })

    describe("when the action only moves the actor", () => {
        it("classifies the default move action as MOVE", () => {
            expect(
                SquaddieActionClassificationService.classify(
                    SquaddieActionService.defaultMove()
                )
            ).toBe(SquaddieActionClassification.MOVE)
        })

        it("classifies a special traversal like Leap as MOVE", () => {
            const leap = SquaddieActionService.new({
                id: "leap",
                affiliationRelationship: {
                    self: true,
                    foe: false,
                    friend: false,
                },
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 2 },
                        movement: {
                            movementType:
                                MovementEffectType.ACTOR_CHOSEN_SPECIAL_TRAVERSAL,
                            traversal: { skipOverPits: true },
                        },
                    },
                },
            })

            expect(SquaddieActionClassificationService.classify(leap)).toBe(
                SquaddieActionClassification.MOVE
            )
        })
    })

    describe("when the action moves the actor and helps them", () => {
        it("is a SELF ASSIST, because the actor can stay in place and still be helped", () => {
            const defensiveRetreat = SquaddieActionService.new({
                id: "defensive-retreat",
                affiliationRelationship: {
                    self: true,
                    foe: false,
                    friend: false,
                },
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 2 },
                        movement: {
                            movementType: MovementEffectType.ACTOR_CHOSEN,
                        },
                        ...ClassificationTestEffects.armor,
                    },
                },
            })

            expect(
                SquaddieActionClassificationService.classify(defensiveRetreat)
            ).toBe("BODY_SELF_ASSIST")
        })
    })

    describe("when the action moves the actor and damages a foe", () => {
        it("is DAMAGE, not MOVE", () => {
            const charge = SquaddieActionService.new({
                id: "charge",
                affiliationRelationship: {
                    self: false,
                    foe: true,
                    friend: false,
                },
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 2 },
                        movement: {
                            movementType: MovementEffectType.ACTOR_CHOSEN,
                        },
                    },
                },
                effectOnTarget: damageFoe,
            })

            expect(SquaddieActionClassificationService.classify(charge)).toBe(
                "BODY_MELEE_DAMAGE"
            )
        })
    })
})
