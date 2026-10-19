import { describe, expect, it } from "vitest"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.js"
import { SquaddieActionService } from "../../squaddieAction.js"
import type { SquaddieActionEffect } from "../../squaddieActionEffect.js"
import { MovementEffectType } from "../../squaddieActionMovementEffect.js"
import {
    SquaddieActionClassification,
    SquaddieActionClassificationService,
} from "../../squaddieActionClassification.js"
import {
    ClassificationTestEffects,
    spendOneActionPoint,
} from "./classificationTestActions.js"

const pullOneTile = {
    movement: {
        movementType: MovementEffectType.FORCED_TOWARD_ACTOR,
        forcedDistance: 1,
    },
} satisfies SquaddieActionEffect

describe("SquaddieActionClassificationService.classify carry actions", () => {
    describe("when the action only moves a friend", () => {
        it("is CARRY", () => {
            const rescue = SquaddieActionService.new({
                id: "rescue",
                name: "Rescue",
                affiliationRelationship: {
                    self: false,
                    foe: false,
                    friend: true,
                },
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 2 } },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        movement: {
                            movementType:
                                MovementEffectType.TELEPORT_TO_ACTOR_CHOSEN,
                        },
                    },
                },
            })

            expect(SquaddieActionClassificationService.classify(rescue)).toBe(
                SquaddieActionClassification.CARRY
            )
        })
    })

    describe("when the action only pulls a foe", () => {
        it("is CARRY, not HINDER", () => {
            const grapplingHook = SquaddieActionService.new({
                id: "grappling-hook",
                name: "Grappling Hook",
                affiliationRelationship: {
                    self: false,
                    foe: true,
                    friend: false,
                },
                effectOnActor: spendOneActionPoint,
                effectOnTarget: { [DegreeOfSuccess.SUCCESS]: pullOneTile },
            })

            expect(
                SquaddieActionClassificationService.classify(grapplingHook)
            ).toBe(SquaddieActionClassification.CARRY)
        })
    })

    describe("when the action moves both the actor and the target", () => {
        it("is CARRY, not MOVE", () => {
            const swapPlaces = SquaddieActionService.new({
                id: "swap-places",
                name: "Swap Places",
                affiliationRelationship: {
                    self: false,
                    foe: false,
                    friend: true,
                },
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 1 },
                        movement: {
                            movementType: MovementEffectType.ACTOR_CHOSEN,
                        },
                    },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        movement: {
                            movementType:
                                MovementEffectType.TELEPORT_TO_ACTOR_CHOSEN,
                        },
                    },
                },
            })

            expect(
                SquaddieActionClassificationService.classify(swapPlaces)
            ).toBe(SquaddieActionClassification.CARRY)
        })
    })

    describe("when the action moves a foe and damages them", () => {
        it("is DAMAGE, not CARRY", () => {
            const shove = SquaddieActionService.new({
                id: "shove",
                name: "Shove",
                affiliationRelationship: {
                    self: false,
                    foe: true,
                    friend: false,
                },
                effectOnActor: spendOneActionPoint,
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        ...pullOneTile,
                        ...ClassificationTestEffects.damage,
                    },
                },
            })

            expect(SquaddieActionClassificationService.classify(shove)).toBe(
                "BODY_MELEE_DAMAGE"
            )
        })
    })
})
