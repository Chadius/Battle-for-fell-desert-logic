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

        it("timed condition sets both amount.current and amount.base to the initial amount", () => {
            const condition = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                amount: 4,
                duration: {
                    duration: 3,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
            })
            expect(condition.amount?.current).toBe(4)
            expect(condition.amount?.base).toBe(4)
        })

        it("permanent condition sets amount.current but leaves amount.base undefined", () => {
            const condition = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                amount: 4,
                duration: undefined,
            })
            expect(condition.amount?.current).toBe(4)
            expect(condition.amount?.base).toBeUndefined()
        })

        it("binary condition has undefined amount", () => {
            const condition = SquaddieConditionService.new({
                type: SquaddieConditionType.ELUSIVE,
                amount: undefined,
                duration: {
                    duration: 2,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
            })
            expect(condition.amount).toBeUndefined()
        })

        it("clone deep-copies the amount object so mutating the clone does not affect the original", () => {
            const original = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                amount: 5,
                duration: {
                    duration: 2,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
            })
            const cloned = SquaddieConditionService.clone(original)
            cloned.amount!.current = 0
            expect(original.amount?.current).toBe(5)
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
