import { describe, expect, it } from "vitest"
import { DegreeOfSuccess, DegreeOfSuccessService } from "./degreeOfSuccess.ts"

describe("Degree of Success", () => {
    const degreeTests = [
        {
            value: 0,
            expectedResult: DegreeOfSuccess.SUCCESS,
        },
        {
            value: 5,
            expectedResult: DegreeOfSuccess.SUCCESS,
        },
        {
            value: 6,
            expectedResult: DegreeOfSuccess.CRITICAL,
        },
        {
            value: -5,
            expectedResult: DegreeOfSuccess.FAILURE,
        },
        {
            value: -6,
            expectedResult: DegreeOfSuccess.BOTCH,
        },
    ]
    it.each(degreeTests)(
        "$value $expectedResult",
        ({ value, expectedResult }) => {
            expect(
                DegreeOfSuccessService.getDegreeBasedOnValue({ value })
            ).toBe(expectedResult)
        }
    )

    it("will not critical if that degree is not possible", () => {
        expect(
            DegreeOfSuccessService.getDegreeBasedOnValue({
                value: 12,
                criticalIsAllowed: false,
            })
        ).toBe(DegreeOfSuccess.SUCCESS)
    })

    it("will not botch if that degree is not possible", () => {
        expect(
            DegreeOfSuccessService.getDegreeBasedOnValue({
                value: -9001,
                botchIsAllowed: false,
            })
        ).toBe(DegreeOfSuccess.FAILURE)
    })

    it("will not fail if that degree is not possible", () => {
        expect(
            DegreeOfSuccessService.getDegreeBasedOnValue({
                value: -1,
                failureIsAllowed: false,
            })
        ).toBe(DegreeOfSuccess.BOTCH)
    })
})
