import { describe, expect, it } from "vitest"
import { ProbabilityLookup } from "./probabilityLookup.js"
import { DegreeOfSuccess } from "../../degreesOfSuccess/degreeOfSuccess.js"

describe("ProbabilityLookup", () => {
    describe("calculateChanceOfDegreeOfSuccessBasedOnSuccessBonus", () => {
        it("returns a Map with all four DegreeOfSuccess keys", () => {
            const result =
                ProbabilityLookup.calculateChanceOfDegreeOfSuccessBasedOnSuccessBonus(
                    0
                )

            expect(result).toBeInstanceOf(Map)
            expect(result.has(DegreeOfSuccess.CRITICAL)).toBe(true)
            expect(result.has(DegreeOfSuccess.SUCCESS)).toBe(true)
            expect(result.has(DegreeOfSuccess.FAILURE)).toBe(true)
            expect(result.has(DegreeOfSuccess.BOTCH)).toBe(true)
        })

        it("all probabilities sum to 36", () => {
            const testBonuses = [10, 4, 3, 0, -5, -13, -19, -30]

            testBonuses.forEach((bonus) => {
                const result =
                    ProbabilityLookup.calculateChanceOfDegreeOfSuccessBasedOnSuccessBonus(
                        bonus
                    )
                const total =
                    (result.get(DegreeOfSuccess.CRITICAL) ?? 0) +
                    (result.get(DegreeOfSuccess.SUCCESS) ?? 0) +
                    (result.get(DegreeOfSuccess.FAILURE) ?? 0) +
                    (result.get(DegreeOfSuccess.BOTCH) ?? 0)

                expect(total).toBe(36)
            })
        })

        it("cannot succeed when bonus is -19 or lower", () => {
            const testBonuses = [-19, -20, -100]

            testBonuses.forEach((bonus) => {
                const result =
                    ProbabilityLookup.calculateChanceOfDegreeOfSuccessBasedOnSuccessBonus(
                        bonus
                    )

                expect(result.get(DegreeOfSuccess.CRITICAL)).toBe(0)
                expect(result.get(DegreeOfSuccess.SUCCESS)).toBe(0)
                expect(result.get(DegreeOfSuccess.FAILURE)).toBeGreaterThan(0)
                expect(result.get(DegreeOfSuccess.BOTCH)).toBeGreaterThan(0)
            })
        })

        it("cannot critically succeed when bonus is -13 or lower (but above -19)", () => {
            const testBonuses = [-13, -14, -15, -16, -17, -18]

            testBonuses.forEach((bonus) => {
                const result =
                    ProbabilityLookup.calculateChanceOfDegreeOfSuccessBasedOnSuccessBonus(
                        bonus
                    )

                expect(result.get(DegreeOfSuccess.CRITICAL)).toBe(0)
                expect(result.get(DegreeOfSuccess.SUCCESS)).toBeGreaterThan(0)
            })
        })

        it("cannot fail when bonus is 4 or higher", () => {
            const testBonuses = [4, 5, 100]

            testBonuses.forEach((bonus) => {
                const result =
                    ProbabilityLookup.calculateChanceOfDegreeOfSuccessBasedOnSuccessBonus(
                        bonus
                    )

                expect(result.get(DegreeOfSuccess.FAILURE)).toBe(0)
                expect(result.get(DegreeOfSuccess.BOTCH)).toBe(0)
                expect(result.get(DegreeOfSuccess.CRITICAL)).toBeGreaterThan(0)
                expect(result.get(DegreeOfSuccess.SUCCESS)).toBeGreaterThan(0)
            })
        })

        it("cannot critically fail when bonus is -2 or higher", () => {
            const testBonuses = [-2, -1, 0, 1, 2, 3]

            testBonuses.forEach((bonus) => {
                const result =
                    ProbabilityLookup.calculateChanceOfDegreeOfSuccessBasedOnSuccessBonus(
                        bonus
                    )

                expect(result.get(DegreeOfSuccess.BOTCH)).toBe(0)
            })
        })

        it("returns correct probabilities for neutral modifier (0)", () => {
            const result =
                ProbabilityLookup.calculateChanceOfDegreeOfSuccessBasedOnSuccessBonus(
                    0
                )

            expect(result.get(DegreeOfSuccess.CRITICAL)).toBe(26)
            expect(result.get(DegreeOfSuccess.SUCCESS)).toBe(9)
            expect(result.get(DegreeOfSuccess.FAILURE)).toBe(1)
            expect(result.get(DegreeOfSuccess.BOTCH)).toBe(0)
        })
    })
})
