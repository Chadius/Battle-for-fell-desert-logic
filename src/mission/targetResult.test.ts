import { describe, expect, it } from "vitest"
import type { SquaddieActionResult } from "../squaddieAction/calculate/result/squaddieActionResult"
import {
    type SerializedTargetResult,
    type TargetResult,
    TargetResultService,
} from "./targetResult"
import { DegreeOfSuccess } from "../degreesOfSuccess/degreeOfSuccess"

describe("TargetResultService", () => {
    describe("serialize", () => {
        it("serializes a TargetResult with squaddieActionResults", () => {
            const squaddieActionResult: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "target-1",
                damage: {
                    net: 5,
                    raw: 7,
                    absorbed: 2,
                    willKo: false,
                    type: undefined,
                },
            }

            const targetResult: TargetResult = {
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                squaddieActionResults: [squaddieActionResult],
            }

            const serialized = TargetResultService.serialize(targetResult)

            expect(serialized.degreeOfSuccess).toBe(DegreeOfSuccess.SUCCESS)
            expect(serialized.squaddieActionResults).toHaveLength(1)
            expect(serialized.squaddieActionResults[0].inBattleSquaddieId).toBe(
                1
            )
            expect(
                serialized.squaddieActionResults[0].outOfBattleSquaddieId
            ).toBe("target-1")
            expect(serialized.squaddieActionResults[0].damage?.net).toBe(5)
        })

        it("serializes a TargetResult with multiple squaddieActionResults", () => {
            const targetResult: TargetResult = {
                degreeOfSuccess: DegreeOfSuccess.CRITICAL,
                squaddieActionResults: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "target-1",
                        damage: {
                            net: 10,
                            raw: 10,
                            absorbed: 0,
                            willKo: true,
                            type: undefined,
                        },
                    },
                    {
                        inBattleSquaddieId: 2,
                        outOfBattleSquaddieId: "target-2",
                        healing: { net: 5, raw: 5 },
                    },
                ],
            }

            const serialized = TargetResultService.serialize(targetResult)

            expect(serialized.squaddieActionResults).toHaveLength(2)
            expect(serialized.squaddieActionResults[0].damage?.willKo).toBe(
                true
            )
            expect(serialized.squaddieActionResults[1].healing?.net).toBe(5)
        })
    })

    describe("deserialize", () => {
        it("deserializes a SerializedTargetResult", () => {
            const serializable: SerializedTargetResult = {
                degreeOfSuccess: DegreeOfSuccess.FAILURE,
                squaddieActionResults: [
                    {
                        inBattleSquaddieId: 3,
                        outOfBattleSquaddieId: "target-3",
                        damage: {
                            net: 0,
                            raw: 2,
                            absorbed: 2,
                            willKo: false,
                            type: undefined,
                        },
                    },
                ],
            }

            const deserialized = TargetResultService.deserialize(serializable)

            expect(deserialized.degreeOfSuccess).toBe(DegreeOfSuccess.FAILURE)
            expect(deserialized.squaddieActionResults).toHaveLength(1)
            expect(
                deserialized.squaddieActionResults[0].inBattleSquaddieId
            ).toBe(3)
            expect(deserialized.squaddieActionResults[0].damage?.net).toBe(0)
        })
    })

    describe("round-trip", () => {
        it("preserves data through serialize and deserialize", () => {
            const original: TargetResult = {
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                squaddieActionResults: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "actor",
                        actionPoints: {
                            spent: 1,
                            restore: { net: 0, raw: 0 },
                        },
                    },
                    {
                        inBattleSquaddieId: 2,
                        outOfBattleSquaddieId: "target",
                        damage: {
                            net: 3,
                            raw: 5,
                            absorbed: 2,
                            willKo: false,
                            type: undefined,
                        },
                    },
                ],
            }

            const serialized = TargetResultService.serialize(original)
            const deserialized = TargetResultService.deserialize(serialized)

            expect(deserialized.degreeOfSuccess).toBe(original.degreeOfSuccess)
            expect(deserialized.squaddieActionResults).toHaveLength(2)
            expect(
                deserialized.squaddieActionResults[0].actionPoints?.spent
            ).toBe(1)
            expect(deserialized.squaddieActionResults[1].damage?.net).toBe(3)
        })
    })
})
