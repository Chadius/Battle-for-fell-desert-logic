import { describe, expect, it } from "vitest"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.js"
import { ProficiencyType } from "../../../proficiency/proficiencyLevel.js"
import { SquaddieActionService } from "../../squaddieAction.js"
import { MovementEffectType } from "../../squaddieActionMovementEffect.js"
import {
    SquaddieActionClassification,
    SquaddieActionClassificationService,
} from "../../squaddieActionClassification.js"

const damageFoe = {
    [DegreeOfSuccess.SUCCESS]: {
        damage: { raw: 2, targetProficiency: ProficiencyType.ARMOR },
    },
}

describe("SquaddieActionClassificationService.classify turn and movement actions", () => {
    describe("when the action only spends all of the actor's action points", () => {
        it("classifies the default end-turn action as END_TURN", () => {
            expect(
                SquaddieActionClassificationService.classify(
                    SquaddieActionService.defaultEndTurn()
                )
            ).toBe(SquaddieActionClassification.END_TURN)
        })

        it("classifies any other action with the same effect as END_TURN", () => {
            const wait = SquaddieActionService.new({
                id: "wait",
                name: "Wait",
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
                SquaddieActionClassification.END_TURN
            )
        })
    })

    describe("when the action spends all action points and does something else", () => {
        it("is an assist, because healing the actor is more than ending the turn", () => {
            const lastStand = SquaddieActionService.new({
                id: "last-stand",
                name: "Last Stand",
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
            ).toBe(SquaddieActionClassification.BODY_ASSIST)
        })

        it("is an assist, because restoring action points is more than ending the turn", () => {
            const secondWind = SquaddieActionService.new({
                id: "second-wind",
                name: "Second Wind",
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
            ).toBe(SquaddieActionClassification.BODY_ASSIST)
        })
    })

    describe("when the action spends all action points and damages a foe", () => {
        it("is an attack, not END_TURN", () => {
            const desperateStrike = SquaddieActionService.new({
                id: "desperate-strike",
                name: "Desperate Strike",
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
            ).toBe(SquaddieActionClassification.BODY_ATTACK)
        })
    })

    describe("when the action spends all action points and drains a foe's action points", () => {
        it("is an attack, not END_TURN", () => {
            const exhaustingRoar = SquaddieActionService.new({
                id: "exhausting-roar",
                name: "Exhausting Roar",
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
            ).toBe(SquaddieActionClassification.BODY_ATTACK)
        })
    })

    describe("when the action only moves the actor", () => {
        it("classifies the default move action as MOVEMENT", () => {
            expect(
                SquaddieActionClassificationService.classify(
                    SquaddieActionService.defaultMove()
                )
            ).toBe(SquaddieActionClassification.MOVEMENT)
        })

        it("classifies a special traversal like Leap as MOVEMENT", () => {
            const leap = SquaddieActionService.new({
                id: "leap",
                name: "Leap",
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
                SquaddieActionClassification.MOVEMENT
            )
        })
    })

    describe("when the action moves the actor and damages a foe", () => {
        it("is an attack, not MOVEMENT", () => {
            const charge = SquaddieActionService.new({
                id: "charge",
                name: "Charge",
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
                SquaddieActionClassification.BODY_ATTACK
            )
        })
    })

    describe("when the action moves a target instead of the actor", () => {
        it("is classified as an assist by its attribute", () => {
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
                SquaddieActionClassification.BODY_ASSIST
            )
        })
    })
})
