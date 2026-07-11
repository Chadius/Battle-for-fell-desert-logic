import { describe, expect, it } from "vitest"
import {
    type SquaddieActionResult,
    SquaddieActionResultService,
} from "./squaddieActionResult.js"
import {
    type SquaddieCondition,
    SquaddieConditionService,
    SquaddieConditionSource,
    SquaddieConditionType,
    type TSquaddieConditionType,
} from "../../../proficiency/squaddieCondition.js"

describe("SquaddieActionResultService", () => {
    describe("clone", () => {
        it("creates a deep copy of a basic result", () => {
            const original: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
            }

            const cloned = SquaddieActionResultService.clone(original)

            expect(cloned.inBattleSquaddieId).toBe(1)
            expect(cloned.outOfBattleSquaddieId).toBe("squaddie-1")
            expect(cloned).not.toBe(original)
        })

        it("deep clones damage field", () => {
            const original: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                damage: {
                    net: 5,
                    raw: 7,
                    absorbed: 2,
                    willKo: false,
                    type: undefined,
                },
            }

            const cloned = SquaddieActionResultService.clone(original)

            expect(cloned.damage?.net).toBe(5)
            expect(cloned.damage).not.toBe(original.damage)
        })

        it("deep clones healing field", () => {
            const original: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                healing: { net: 3, raw: 5 },
            }

            const cloned = SquaddieActionResultService.clone(original)

            expect(cloned.healing?.net).toBe(3)
            expect(cloned.healing).not.toBe(original.healing)
        })

        it("deep clones actionPoints field", () => {
            const original: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                actionPoints: {
                    spent: 2,
                    restore: { net: 1, raw: 1 },
                },
            }

            const cloned = SquaddieActionResultService.clone(original)

            expect(cloned.actionPoints?.spent).toBe(2)
            expect(cloned.actionPoints?.restore?.net).toBe(1)
            expect(cloned.actionPoints).not.toBe(original.actionPoints)
        })

        it("deep clones conditionsAdded field", () => {
            const original: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                conditionsAdded: [
                    SquaddieConditionService.new({
                        type: SquaddieConditionType.SLOWED,
                        amount: { amount: 3 },
                        duration: undefined,
                        source: SquaddieConditionSource.PHYSICAL,
                    }),
                ],
            }

            const cloned = SquaddieActionResultService.clone(original)

            expect(cloned.conditionsAdded?.length).toBe(1)
            expect(cloned.conditionsAdded?.[0].type).toBe(
                SquaddieConditionType.SLOWED
            )
            expect(cloned.conditionsAdded).not.toBe(original.conditionsAdded)
        })

        it("deep clones dispel field with Map", () => {
            const dispelledConditions: Map<
                TSquaddieConditionType,
                Omit<SquaddieCondition, "type">[]
            > = new Map([
                [
                    SquaddieConditionType.SLOWED,
                    [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.SLOWED,
                            duration: undefined,
                            amount: { amount: 2 },
                            source: SquaddieConditionSource.PHYSICAL,
                        }),
                    ],
                ],
            ])

            const original: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                dispel: {
                    dispelledConditions,
                    conditionTypes: { types: [SquaddieConditionType.SLOWED] },
                    amount: 2,
                },
            }

            const cloned = SquaddieActionResultService.clone(original)

            expect(cloned.dispel?.dispelledConditions).not.toBe(
                original.dispel?.dispelledConditions
            )
            expect(
                cloned.dispel?.dispelledConditions?.get(
                    SquaddieConditionType.SLOWED
                )
            ).toEqual([
                {
                    amount: { current: 2, base: undefined },
                    limit: { duration: undefined },
                    source: SquaddieConditionSource.PHYSICAL,
                    type: SquaddieConditionType.SLOWED,
                },
            ])
        })

        it("deep clones treat field with Map", () => {
            const treatedConditions = new Map([
                [
                    SquaddieConditionType.SLOWED,
                    [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.SLOWED,
                            amount: { amount: 1 },
                            duration: undefined,
                            source: SquaddieConditionSource.PHYSICAL,
                        }),
                    ],
                ],
            ])

            const original: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                treat: {
                    treatedConditions,
                    conditionTypes: { types: [SquaddieConditionType.SLOWED] },
                    amount: 1,
                },
            }

            const cloned = SquaddieActionResultService.clone(original)

            expect(cloned.treat?.treatedConditions).not.toBe(
                original.treat?.treatedConditions
            )
            expect(
                cloned.treat?.treatedConditions?.get(
                    SquaddieConditionType.SLOWED
                )
            ).toEqual([
                {
                    amount: { current: 1, base: undefined },
                    limit: { duration: undefined },
                    source: SquaddieConditionSource.PHYSICAL,
                    type: SquaddieConditionType.SLOWED,
                },
            ])
        })
    })

    describe("serialize", () => {
        it("converts basic result to serializable format", () => {
            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
            }

            const serialized = SquaddieActionResultService.serialize(result)

            expect(serialized.inBattleSquaddieId).toBe(1)
            expect(serialized.outOfBattleSquaddieId).toBe("squaddie-1")
        })

        it("converts dispel Map to object", () => {
            const dispelledConditions = new Map([
                [
                    SquaddieConditionType.SLOWED,
                    [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.SLOWED,
                            amount: { amount: 2 },
                            duration: undefined,
                            source: SquaddieConditionSource.PHYSICAL,
                        }),
                    ],
                ],
            ])

            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                dispel: {
                    dispelledConditions,
                    conditionTypes: { types: [SquaddieConditionType.SLOWED] },
                    amount: 2,
                },
            }

            const serialized = SquaddieActionResultService.serialize(result)

            expect(serialized.dispel?.dispelledConditions).not.toBeInstanceOf(
                Map
            )
            expect(
                serialized.dispel?.dispelledConditions?.[
                    SquaddieConditionType.SLOWED
                ]
            ).toEqual([
                SquaddieConditionService.new({
                    type: SquaddieConditionType.SLOWED,
                    amount: { amount: 2 },
                    duration: undefined,
                    source: SquaddieConditionSource.PHYSICAL,
                }),
            ])
        })

        it("converts treat Map to object", () => {
            const treatedConditions = new Map([
                [
                    SquaddieConditionType.SLOWED,
                    [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.SLOWED,
                            amount: { amount: 1 },
                            duration: undefined,
                            source: SquaddieConditionSource.PHYSICAL,
                        }),
                    ],
                ],
            ])

            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                treat: {
                    treatedConditions,
                    conditionTypes: { types: [SquaddieConditionType.SLOWED] },
                    amount: 1,
                },
            }

            const serialized = SquaddieActionResultService.serialize(result)

            expect(serialized.treat?.treatedConditions).not.toBeInstanceOf(Map)
            expect(
                serialized.treat?.treatedConditions?.[
                    SquaddieConditionType.SLOWED
                ]
            ).toEqual([
                SquaddieConditionService.new({
                    type: SquaddieConditionType.SLOWED,
                    amount: { amount: 1 },
                    duration: undefined,
                    source: SquaddieConditionSource.PHYSICAL,
                }),
            ])
        })

        it("can be JSON stringified and parsed", () => {
            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                damage: {
                    net: 5,
                    raw: 7,
                    absorbed: 2,
                    willKo: false,
                    type: undefined,
                },
            }

            const serialized = SquaddieActionResultService.serialize(result)
            const jsonString = JSON.stringify(serialized)
            const parsed = JSON.parse(jsonString)

            expect(parsed.inBattleSquaddieId).toBe(1)
            expect(parsed.damage.net).toBe(5)
        })
    })

    describe("deserialize", () => {
        it("converts basic serializable to result", () => {
            const serialized = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
            }

            const result = SquaddieActionResultService.deserialize(serialized)

            expect(result.inBattleSquaddieId).toBe(1)
            expect(result.outOfBattleSquaddieId).toBe("squaddie-1")
        })

        it("converts dispel object to Map", () => {
            const serialized = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                dispel: {
                    dispelledConditions: {
                        [SquaddieConditionType.SLOWED]: [
                            {
                                amount: { current: 2, base: undefined },
                                limit: { duration: undefined },
                                source: SquaddieConditionSource.PHYSICAL,
                            },
                        ],
                    },
                    conditionTypes: { types: [SquaddieConditionType.SLOWED] },
                    amount: 2,
                },
            }

            const result = SquaddieActionResultService.deserialize(serialized)

            expect(result.dispel?.dispelledConditions).toBeInstanceOf(Map)
            expect(
                result.dispel?.dispelledConditions?.get(
                    SquaddieConditionType.SLOWED
                )
            ).toHaveLength(1)

            let { type, ...conditionExceptType } = SquaddieConditionService.new(
                {
                    type: SquaddieConditionType.SLOWED,
                    amount: { amount: 2 },
                    duration: undefined,
                    source: SquaddieConditionSource.PHYSICAL,
                }
            )
            expect(
                result.dispel?.dispelledConditions?.get(
                    SquaddieConditionType.SLOWED
                )![0]
            ).toEqual(conditionExceptType)
        })

        it("converts treat object to Map", () => {
            const serialized = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                treat: {
                    treatedConditions: {
                        [SquaddieConditionType.SLOWED]: [
                            {
                                amount: { current: 1, base: undefined },
                                limit: { duration: undefined },
                                source: SquaddieConditionSource.PHYSICAL,
                            },
                        ],
                    },
                    conditionTypes: { types: [SquaddieConditionType.SLOWED] },
                    amount: 1,
                },
            }

            const result = SquaddieActionResultService.deserialize(serialized)

            expect(result.treat?.treatedConditions).toBeInstanceOf(Map)
            expect(
                result.treat?.treatedConditions?.get(
                    SquaddieConditionType.SLOWED
                )
            ).toHaveLength(1)

            let { type, ...conditionExceptType } = SquaddieConditionService.new(
                {
                    type: SquaddieConditionType.SLOWED,
                    amount: { amount: 1 },
                    duration: undefined,
                    source: SquaddieConditionSource.PHYSICAL,
                }
            )

            expect(
                result.treat?.treatedConditions?.get(
                    SquaddieConditionType.SLOWED
                )![0]
            ).toEqual(conditionExceptType)
        })

        it("round trips serialize and deserialize", () => {
            const dispelledConditions = new Map([
                [
                    SquaddieConditionType.SLOWED,
                    [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.SLOWED,
                            amount: { amount: 2 },
                            duration: undefined,
                            source: SquaddieConditionSource.PHYSICAL,
                        }),
                    ],
                ],
            ])

            const original: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                damage: {
                    net: 5,
                    raw: 7,
                    absorbed: 2,
                    willKo: false,
                    type: undefined,
                },
                dispel: {
                    dispelledConditions,
                    conditionTypes: { types: [SquaddieConditionType.SLOWED] },
                    amount: 2,
                },
            }

            const serialized = SquaddieActionResultService.serialize(original)
            const roundTripped =
                SquaddieActionResultService.deserialize(serialized)

            expect(roundTripped.inBattleSquaddieId).toBe(1)
            expect(roundTripped.damage?.net).toBe(5)
            expect(roundTripped.dispel?.dispelledConditions).toBeInstanceOf(Map)
            expect(
                roundTripped.dispel?.dispelledConditions?.get(
                    SquaddieConditionType.SLOWED
                )
            ).toHaveLength(1)

            expect(
                roundTripped.dispel?.dispelledConditions?.get(
                    SquaddieConditionType.SLOWED
                )![0]
            ).toEqual(
                SquaddieConditionService.new({
                    type: SquaddieConditionType.SLOWED,
                    amount: { amount: 2 },
                    duration: undefined,
                    source: SquaddieConditionSource.PHYSICAL,
                })
            )
        })
    })
})
