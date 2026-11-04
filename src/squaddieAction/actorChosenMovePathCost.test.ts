import { describe, expect, it } from "vitest"
import {
    HowToDetermineDegreeOfSuccess,
    MovementEffectType,
    type SquaddieAction,
    SquaddieActionService,
} from "./squaddieAction.js"
import { ActionRange } from "./actionRange.js"
import { DegreeOfSuccess } from "../degreesOfSuccess/degreeOfSuccess.js"
import type { SquaddieActionEffect } from "./squaddieActionEffect.js"

const createActorChosenMoveEffect = (
    movementPathActionPointCost?: boolean
): SquaddieActionEffect => ({
    actionPoints: {
        spent: 1,
        additional:
            movementPathActionPointCost == undefined
                ? undefined
                : { movementPathActionPointCost },
    },
    movement: { movementType: MovementEffectType.ACTOR_CHOSEN },
})

const createStep = (
    effectOnActor: SquaddieAction["effectOnActor"]
): SquaddieAction =>
    SquaddieActionService.new({
        id: "step",
        howToDetermineDegreeOfSuccess:
            HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
        range: ActionRange.SELF,
        affiliationRelationship: { self: true, foe: false, friend: false },
        effectOnActor,
    })

const createActorChosenMove = ({
    movementPathActionPointCost,
}: {
    movementPathActionPointCost?: boolean
}): SquaddieAction =>
    createStep({
        [DegreeOfSuccess.SUCCESS]: createActorChosenMoveEffect(
            movementPathActionPointCost
        ),
    })

const serializedActorChosenMoveWithoutPathCost = {
    ...SquaddieActionService.serialize(SquaddieActionService.defaultMove()),
    id: "step",
    effectOnActor: {
        SUCCESS: {
            actionPoints: { spent: 1 },
            movement: { movementType: MovementEffectType.ACTOR_CHOSEN },
        },
    },
}

describe("an ACTOR_CHOSEN move must charge for its path", () => {
    describe("when the move charges for its path", () => {
        it("creates the action", () => {
            expect(() =>
                createActorChosenMove({ movementPathActionPointCost: true })
            ).not.toThrow()
        })
    })

    describe("when the move has a fixed cost", () => {
        it("refuses, naming the action and degree of success", () => {
            expect(() => createActorChosenMove({})).toThrow(/step.*SUCCESS/)
        })
    })

    describe("when the move turns its path cost off", () => {
        it("refuses, naming the action and degree of success", () => {
            expect(() =>
                createActorChosenMove({ movementPathActionPointCost: false })
            ).toThrow(/step.*SUCCESS/)
        })
    })

    describe("when only the critical effect is a fixed-cost move", () => {
        it("refuses, naming the critical degree of success", () => {
            expect(() =>
                createStep({
                    [DegreeOfSuccess.SUCCESS]:
                        createActorChosenMoveEffect(true),
                    [DegreeOfSuccess.CRITICAL]: createActorChosenMoveEffect(),
                })
            ).toThrow(/step.*CRITICAL/)
        })
    })

    describe("when loading a fixed-cost move from JSON", () => {
        it("rejects it, naming the effect", () => {
            expect(() =>
                SquaddieActionService.deserialize(
                    serializedActorChosenMoveWithoutPathCost
                )
            ).toThrow(/effectOnActor\.SUCCESS\.movement/)
        })
    })

    describe("when loading the default Move from JSON", () => {
        it("accepts it", () => {
            const serializedDefaultMove = SquaddieActionService.serialize(
                SquaddieActionService.defaultMove()
            )

            expect(() =>
                SquaddieActionService.deserialize(serializedDefaultMove)
            ).not.toThrow()
        })
    })
})
