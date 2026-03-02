import { describe, expect, it } from "vitest"

import {
    SquaddieConditionDecaysAt,
    SquaddieConditionService,
    SquaddieConditionType,
} from "./squaddieCondition"

describe("Squaddie Condition", () => {
    describe("decaysAt", () => {
        it("stores the decay timing on limit.duration when given a TURN_START duration", () => {
            const condition = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                amount: 2,
                duration: {
                    duration: 1,
                    decaysAt: SquaddieConditionDecaysAt.TURN_START,
                },
            })
            expect(condition.limit.duration).toEqual({
                duration: 1,
                decaysAt: SquaddieConditionDecaysAt.TURN_START,
            })
        })

        it("has undefined limit.duration when duration is undefined (permanent condition)", () => {
            const condition = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                amount: 2,
                duration: undefined,
            })
            expect(condition.limit.duration).toBeUndefined()
        })

        it("clone preserves decaysAt and duration", () => {
            const original = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                amount: 3,
                duration: {
                    duration: 5,
                    decaysAt: SquaddieConditionDecaysAt.TURN_START,
                },
            })
            const cloned = SquaddieConditionService.clone(original)
            expect(cloned.limit.duration).toEqual({
                duration: 5,
                decaysAt: SquaddieConditionDecaysAt.TURN_START,
            })
        })
    })

    describe("Is helpful", () => {
        it("is when type is helpful and binary", () => {
            expect(
                SquaddieConditionService.isHelpful(
                    SquaddieConditionService.new({
                        type: SquaddieConditionType.ELUSIVE,
                        amount: undefined,
                        duration: {
                            duration: 1,
                            decaysAt: SquaddieConditionDecaysAt.TURN_END,
                        },
                    })
                )
            ).toBeTruthy()
        })
        it("is when type is helpful and amount is positive", () => {
            expect(
                SquaddieConditionService.isHelpful(
                    SquaddieConditionService.new({
                        type: SquaddieConditionType.ABSORB,
                        amount: 1,
                        duration: {
                            duration: 1,
                            decaysAt: SquaddieConditionDecaysAt.TURN_END,
                        },
                    })
                )
            ).toBeTruthy()
        })
        it("is not when type is helpful and amount is not positive", () => {
            expect(
                SquaddieConditionService.isHelpful(
                    SquaddieConditionService.new({
                        type: SquaddieConditionType.ARMOR,
                        amount: -1,
                        duration: {
                            duration: 1,
                            decaysAt: SquaddieConditionDecaysAt.TURN_END,
                        },
                    })
                )
            ).toBeFalsy()
        })
    })
    describe("Is hindering", () => {
        it("is when type is hindering and amount is positive", () => {
            expect(
                SquaddieConditionService.isHindering(
                    SquaddieConditionService.new({
                        type: SquaddieConditionType.SLOWED,
                        amount: 1,
                        duration: {
                            duration: 1,
                            decaysAt: SquaddieConditionDecaysAt.TURN_END,
                        },
                    })
                )
            ).toBeTruthy()
        })
        it("is when type is helpful and amount is not positive", () => {
            expect(
                SquaddieConditionService.isHindering(
                    SquaddieConditionService.new({
                        type: SquaddieConditionType.ARMOR,
                        amount: -1,
                        duration: {
                            duration: 1,
                            decaysAt: SquaddieConditionDecaysAt.TURN_END,
                        },
                    })
                )
            ).toBeTruthy()
        })
    })
})
