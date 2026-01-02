import { describe, expect, it } from "vitest"
import { SquaddieActionResultCalculator } from "./squaddieActionResultCalculator"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess"

describe("SquaddieActionResultCalculator", () => {
    describe("calculateDegreeOfSuccessForTargets", () => {
        describe("base calculations without max/min rolls", () => {
            it("returns SUCCESS when roll total + modifier is non-negative", () => {
                const actorRoll: [number, number] = [3, 4]
                const targetModifiers = new Map([["target1", -2]])

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                        }
                    )

                expect(result.get("target1")).toBe(DegreeOfSuccess.SUCCESS)
            })

            it("returns CRITICAL when roll total + modifier >= 6", () => {
                const actorRoll: [number, number] = [5, 4]
                const targetModifiers = new Map([["target1", -2]])

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                        }
                    )

                expect(result.get("target1")).toBe(DegreeOfSuccess.CRITICAL)
            })

            it("returns FAILURE when roll total + modifier is negative", () => {
                const actorRoll: [number, number] = [2, 2]
                const targetModifiers = new Map([["target1", -6]])

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                        }
                    )

                expect(result.get("target1")).toBe(DegreeOfSuccess.FAILURE)
            })

            it("returns BOTCH when roll total + modifier <= -6", () => {
                const actorRoll: [number, number] = [1, 2]
                const targetModifiers = new Map([["target1", -10]])

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                        }
                    )

                expect(result.get("target1")).toBe(DegreeOfSuccess.BOTCH)
            })
        })

        describe("max roll adjustments", () => {
            it("increases degree by 1 when actor rolls max (6, 6)", () => {
                const actorRoll: [number, number] = [6, 6]
                const targetModifiers = new Map([["target1", -10]])

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                        }
                    )

                expect(result.get("target1")).toBe(DegreeOfSuccess.CRITICAL)
            })
        })

        describe("min roll adjustments", () => {
            it("decreases degree by 1 when actor rolls min (1, 1)", () => {
                const actorRoll: [number, number] = [1, 1]
                const targetModifiers = new Map([["target1", 5]])

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                        }
                    )

                expect(result.get("target1")).toBe(DegreeOfSuccess.SUCCESS)
            })
        })

        describe("degree redistribution", () => {
            it("converts BOTCH to FAILURE when BOTCH not supported", () => {
                const actorRoll: [number, number] = [1, 2]
                const targetModifiers = new Map([["target1", -10]])
                const supportedDegrees = [
                    DegreeOfSuccess.CRITICAL,
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.FAILURE,
                ]

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                            supportedDegreesOfSuccess: supportedDegrees,
                        }
                    )

                expect(result.get("target1")).toBe(DegreeOfSuccess.FAILURE)
            })

            it("converts FAILURE to SUCCESS when FAILURE not supported", () => {
                const actorRoll: [number, number] = [2, 2]
                const targetModifiers = new Map([["target1", -6]])
                const supportedDegrees = [
                    DegreeOfSuccess.CRITICAL,
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.BOTCH,
                ]

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                            supportedDegreesOfSuccess: supportedDegrees,
                        }
                    )

                expect(result.get("target1")).toBe(DegreeOfSuccess.SUCCESS)
            })

            it("keeps BOTCH when BOTCH supported even if FAILURE not supported", () => {
                const actorRoll: [number, number] = [1, 2]
                const targetModifiers = new Map([["target1", -10]])
                const supportedDegrees = [
                    DegreeOfSuccess.CRITICAL,
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.BOTCH,
                ]

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                            supportedDegreesOfSuccess: supportedDegrees,
                        }
                    )

                expect(result.get("target1")).toBe(DegreeOfSuccess.BOTCH)
            })

            it("converts BOTCH to SUCCESS when both BOTCH and FAILURE not supported", () => {
                const actorRoll: [number, number] = [1, 2]
                const targetModifiers = new Map([["target1", -10]])
                const supportedDegrees = [
                    DegreeOfSuccess.CRITICAL,
                    DegreeOfSuccess.SUCCESS,
                ]

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                            supportedDegreesOfSuccess: supportedDegrees,
                        }
                    )

                expect(result.get("target1")).toBe(DegreeOfSuccess.SUCCESS)
            })

            it("converts CRITICAL to SUCCESS when CRITICAL not supported", () => {
                const actorRoll: [number, number] = [5, 4]
                const targetModifiers = new Map([["target1", -2]])
                const supportedDegrees = [
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.FAILURE,
                    DegreeOfSuccess.BOTCH,
                ]

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                            supportedDegreesOfSuccess: supportedDegrees,
                        }
                    )

                expect(result.get("target1")).toBe(DegreeOfSuccess.SUCCESS)
            })
        })

        describe("multiple targets", () => {
            it("calculates degree for each target independently", () => {
                const actorRoll: [number, number] = [4, 3]
                const targetModifiers = new Map([
                    ["weakTarget", 2],
                    ["normalTarget", -2],
                    ["strongTarget", -8],
                ])

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                        }
                    )

                expect(result.get("weakTarget")).toBe(DegreeOfSuccess.CRITICAL)
                expect(result.get("normalTarget")).toBe(DegreeOfSuccess.SUCCESS)
                expect(result.get("strongTarget")).toBe(DegreeOfSuccess.FAILURE)
            })
        })
    })
})
