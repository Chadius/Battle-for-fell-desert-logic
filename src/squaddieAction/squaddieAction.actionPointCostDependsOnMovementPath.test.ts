import { describe, expect, it } from "vitest"
import { SquaddieActionService } from "./squaddieAction.js"
import { ActionRange } from "./actionRange.js"
import { DegreeOfSuccess } from "../degreesOfSuccess/degreeOfSuccess.js"
import type { SquaddieActionEffect } from "./squaddieActionEffect.js"

const selfTargetedAction = (
    actionPoints: SquaddieActionEffect["actionPoints"]
) =>
    SquaddieActionService.new({
        id: "action",
        name: "Action",
        range: ActionRange.SELF,
        affiliationRelationship: { self: true, foe: false, friend: false },
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: { actionPoints },
        },
    })

describe("SquaddieActionService.actionPointCostDependsOnMovementPath", () => {
    describe("when the action charges action points for the path the actor moves", () => {
        it("depends on the movement path", () => {
            const dash = selfTargetedAction({
                spent: 0,
                additional: { movementPathActionPointCost: true },
            })

            expect(
                SquaddieActionService.actionPointCostDependsOnMovementPath(dash)
            ).toBe(true)
        })
    })

    describe("when the action only spends a fixed number of action points", () => {
        it("does not depend on the movement path", () => {
            const jab = selfTargetedAction({ spent: 1 })

            expect(
                SquaddieActionService.actionPointCostDependsOnMovementPath(jab)
            ).toBe(false)
        })
    })

    describe("when the action does not say how it spends action points", () => {
        it("does not depend on the movement path", () => {
            const actionWithoutActionPointEffect = selfTargetedAction(undefined)

            expect(
                SquaddieActionService.actionPointCostDependsOnMovementPath(
                    actionWithoutActionPointEffect
                )
            ).toBe(false)
        })
    })
})
