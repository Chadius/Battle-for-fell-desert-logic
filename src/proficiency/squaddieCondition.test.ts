import { describe, expect, it } from "vitest"

import {
    SquaddieConditionDecaysAt,
    SquaddieConditionService,
    SquaddieConditionSource,
    SquaddieConditionType,
} from "./squaddieCondition"

describe("Squaddie Condition", () => {
    describe("decaysAt", () => {
        it("stores the decay timing on limit.duration when given a TURN_START duration", () => {
            const condition = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                amount: { amount: 2 },
                duration: {
                    duration: 1,
                    decaysAt: SquaddieConditionDecaysAt.TURN_START,
                },
                source: SquaddieConditionSource.PHYSICAL,
            })
            expect(condition.limit.duration).toEqual({
                duration: 1,
                decaysAt: SquaddieConditionDecaysAt.TURN_START,
            })
        })

        it("has undefined limit.duration when duration is undefined (permanent condition)", () => {
            const condition = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                amount: { amount: 2 },
                duration: undefined,
                source: SquaddieConditionSource.PHYSICAL,
            })
            expect(condition.limit.duration).toBeUndefined()
        })

        it("clone preserves decaysAt and duration", () => {
            const original = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                amount: { amount: 3 },
                duration: {
                    duration: 5,
                    decaysAt: SquaddieConditionDecaysAt.TURN_START,
                },
                source: SquaddieConditionSource.PHYSICAL,
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
                amount: { amount: 4 },
                duration: {
                    duration: 3,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                source: SquaddieConditionSource.PHYSICAL,
            })
            expect(condition.amount?.current).toBe(4)
            expect(condition.amount?.base).toBe(4)
        })

        it("permanent condition sets amount.current but leaves amount.base undefined", () => {
            const condition = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                amount: { amount: 4 },
                duration: undefined,
                source: SquaddieConditionSource.PHYSICAL,
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
                source: SquaddieConditionSource.PHYSICAL,
            })
            expect(condition.amount).toBeUndefined()
        })

        it("source stores PHYSICAL when given", () => {
            const condition = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                amount: { amount: 2 },
                duration: {
                    duration: 1,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                source: SquaddieConditionSource.PHYSICAL,
            })
            expect(condition.source).toBe(SquaddieConditionSource.PHYSICAL)
        })

        it("source is set when explicitly provided", () => {
            const condition = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                amount: { amount: 2 },
                duration: {
                    duration: 1,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                source: SquaddieConditionSource.ELEMENTAL,
            })
            expect(condition.source).toBe(SquaddieConditionSource.ELEMENTAL)
        })

        it("clone preserves source", () => {
            const original = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                amount: { amount: 3 },
                duration: {
                    duration: 5,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                source: SquaddieConditionSource.SPIRITUAL,
            })
            const cloned = SquaddieConditionService.clone(original)
            expect(cloned.source).toBe(SquaddieConditionSource.SPIRITUAL)
        })

        it("clone deep-copies the amount object so mutating the clone does not affect the original", () => {
            const original = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                amount: { amount: 5 },
                duration: {
                    duration: 2,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                source: SquaddieConditionSource.PHYSICAL,
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
                        source: SquaddieConditionSource.PHYSICAL,
                    })
                )
            ).toBeTruthy()
        })
        it("is when type is helpful and amount is positive", () => {
            expect(
                SquaddieConditionService.isHelpful(
                    SquaddieConditionService.new({
                        type: SquaddieConditionType.ABSORB,
                        amount: { amount: 1 },
                        duration: {
                            duration: 1,
                            decaysAt: SquaddieConditionDecaysAt.TURN_END,
                        },
                        source: SquaddieConditionSource.PHYSICAL,
                    })
                )
            ).toBeTruthy()
        })
        it("is not when type is helpful and amount is not positive", () => {
            expect(
                SquaddieConditionService.isHelpful(
                    SquaddieConditionService.new({
                        type: SquaddieConditionType.ARMOR,
                        amount: { amount: -1 },
                        duration: {
                            duration: 1,
                            decaysAt: SquaddieConditionDecaysAt.TURN_END,
                        },
                        source: SquaddieConditionSource.PHYSICAL,
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
                        amount: { amount: 1 },
                        duration: {
                            duration: 1,
                            decaysAt: SquaddieConditionDecaysAt.TURN_END,
                        },
                        source: SquaddieConditionSource.PHYSICAL,
                    })
                )
            ).toBeTruthy()
        })
        it("is when type is helpful and amount is not positive", () => {
            expect(
                SquaddieConditionService.isHindering(
                    SquaddieConditionService.new({
                        type: SquaddieConditionType.ARMOR,
                        amount: { amount: -1 },
                        duration: {
                            duration: 1,
                            decaysAt: SquaddieConditionDecaysAt.TURN_END,
                        },
                        source: SquaddieConditionSource.PHYSICAL,
                    })
                )
            ).toBeTruthy()
        })
    })
    describe("serialization", () => {
        it("round-trips a quantified timed condition", () => {
            const condition = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                amount: { amount: 3, decaysAt: SquaddieConditionDecaysAt.TURN_END },
                duration: {
                    duration: 2,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                source: SquaddieConditionSource.ITEM,
            })
            const serialized = SquaddieConditionService.serialize(condition)
            const deserialized = SquaddieConditionService.deserialize(serialized)
            expect(deserialized).toEqual(condition)
        })
        it("round-trips a permanent quantified condition", () => {
            const condition = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                amount: { amount: 5 },
                duration: undefined,
                source: SquaddieConditionSource.PHYSICAL,
            })
            const serialized = SquaddieConditionService.serialize(condition)
            const deserialized = SquaddieConditionService.deserialize(serialized)
            expect(deserialized).toEqual(condition)
        })
        it("round-trips a binary condition", () => {
            const condition = SquaddieConditionService.new({
                type: SquaddieConditionType.ELUSIVE,
                amount: undefined,
                duration: {
                    duration: 1,
                    decaysAt: SquaddieConditionDecaysAt.TURN_START,
                },
                source: SquaddieConditionSource.UNKNOWN,
            })
            const serialized = SquaddieConditionService.serialize(condition)
            const deserialized = SquaddieConditionService.deserialize(serialized)
            expect(deserialized).toEqual(condition)
        })
        it("throws with a descriptive message on invalid type", () => {
            expect(() =>
                SquaddieConditionService.deserialize({
                    type: "INVALID_TYPE",
                    source: SquaddieConditionSource.UNKNOWN,
                    limit: {},
                })
            ).toThrow("[SquaddieConditionService.deserialize]:")
        })
        it("throws when required fields are missing", () => {
            expect(() =>
                SquaddieConditionService.deserialize({ type: SquaddieConditionType.ARMOR })
            ).toThrow("[SquaddieConditionService.deserialize]:")
        })
    })
})
