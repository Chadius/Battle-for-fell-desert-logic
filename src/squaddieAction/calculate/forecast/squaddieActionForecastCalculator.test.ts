import { describe, expect, it } from "vitest"
import { SquaddieActionForecastCalculator } from "./squaddieActionForecastCalculator"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess"

describe("SquaddieActionForecastCalculator", () => {
    describe("parseForecastKey", () => {
        it("parses key to extract battleSquaddieId", () => {
            const key = SquaddieActionForecastCalculator.getForecastKey({
                inBattleSquaddieId: 42,
                outOfBattleSquaddieId: "squaddie-1",
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            })

            const result =
                SquaddieActionForecastCalculator.parseForecastKey(key)

            expect(result.battleSquaddieId.inBattleSquaddieId).toBe(42)
            expect(result.battleSquaddieId.outOfBattleSquaddieId).toBe(
                "squaddie-1"
            )
        })

        it("parses key to extract degreeOfSuccess", () => {
            const key = SquaddieActionForecastCalculator.getForecastKey({
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "test",
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            })

            const result =
                SquaddieActionForecastCalculator.parseForecastKey(key)

            expect(result.degreeOfSuccess).toBe(DegreeOfSuccess.SUCCESS)
        })

        it("handles CRITICAL degree type", () => {
            const key = SquaddieActionForecastCalculator.getForecastKey({
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "test",
                degreeOfSuccess: DegreeOfSuccess.CRITICAL,
            })

            const result =
                SquaddieActionForecastCalculator.parseForecastKey(key)

            expect(result.degreeOfSuccess).toBe(DegreeOfSuccess.CRITICAL)
        })

        it("handles FAILURE degree type", () => {
            const key = SquaddieActionForecastCalculator.getForecastKey({
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "test",
                degreeOfSuccess: DegreeOfSuccess.FAILURE,
            })

            const result =
                SquaddieActionForecastCalculator.parseForecastKey(key)

            expect(result.degreeOfSuccess).toBe(DegreeOfSuccess.FAILURE)
        })

        it("handles BOTCH degree type", () => {
            const key = SquaddieActionForecastCalculator.getForecastKey({
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "test",
                degreeOfSuccess: DegreeOfSuccess.BOTCH,
            })

            const result =
                SquaddieActionForecastCalculator.parseForecastKey(key)

            expect(result.degreeOfSuccess).toBe(DegreeOfSuccess.BOTCH)
        })

        it("round trips getForecastKey and parseForecastKey", () => {
            const original = {
                inBattleSquaddieId: 123,
                outOfBattleSquaddieId: "complex-id-with-numbers-456",
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            }

            const key =
                SquaddieActionForecastCalculator.getForecastKey(original)
            const parsed =
                SquaddieActionForecastCalculator.parseForecastKey(key)

            expect(parsed.battleSquaddieId.inBattleSquaddieId).toBe(
                original.inBattleSquaddieId
            )
            expect(parsed.battleSquaddieId.outOfBattleSquaddieId).toBe(
                original.outOfBattleSquaddieId
            )
            expect(parsed.degreeOfSuccess).toBe(original.degreeOfSuccess)
        })
    })
})
