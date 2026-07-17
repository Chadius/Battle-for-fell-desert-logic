import { describe, expect, it } from "vitest"
import { ExpressionParserService } from "./expressionParser.js"

describe("ExpressionParserService.evaluate", () => {
    describe("arithmetic", () => {
        it("adds a token and a literal", () => {
            expect(
                ExpressionParserService.evaluate("TOKEN + 1", { TOKEN: "3" })
            ).toBe(4)
        })

        it("subtracts", () => {
            expect(
                ExpressionParserService.evaluate("TOKEN - 1", { TOKEN: "3" })
            ).toBe(2)
        })

        it("multiplies and divides with correct precedence", () => {
            expect(
                ExpressionParserService.evaluate("TOKEN + 2 * 3", {
                    TOKEN: "1",
                })
            ).toBe(7)
        })

        it("applies modulo", () => {
            expect(
                ExpressionParserService.evaluate("TOKEN % 3", { TOKEN: "7" })
            ).toBe(1)
        })

        it("respects parentheses to override precedence", () => {
            expect(
                ExpressionParserService.evaluate("(TOKEN * 2) + 1", {
                    TOKEN: "3",
                })
            ).toBe(7)
        })

        it("supports unary minus", () => {
            expect(
                ExpressionParserService.evaluate("-TOKEN + 5", { TOKEN: "2" })
            ).toBe(3)
        })
    })

    describe("comparison", () => {
        it.each([
            ["TOKEN > 2", "3", true],
            ["TOKEN > 2", "2", false],
            ["TOKEN < 2", "1", true],
            ["TOKEN >= 2", "2", true],
            ["TOKEN <= 1", "2", false],
            ["TOKEN == 2", "2", true],
            ["TOKEN != 2", "3", true],
        ] as const)(
            "%s with TOKEN=%s evaluates to %s",
            (expression, tokenValue, expected) => {
                expect(
                    ExpressionParserService.evaluate(expression, {
                        TOKEN: tokenValue,
                    })
                ).toBe(expected)
            }
        )
    })

    describe("ternary", () => {
        it("selects the true branch when the condition holds", () => {
            expect(
                ExpressionParserService.evaluate("TOKEN > 2 ? Many : A few", {
                    TOKEN: "3",
                })
            ).toBe("Many")
        })

        it("selects the false branch when the condition fails", () => {
            expect(
                ExpressionParserService.evaluate("TOKEN > 2 ? Many : A few", {
                    TOKEN: "1",
                })
            ).toBe("A few")
        })

        it("throws when a non-boolean condition is used", () => {
            expect(() =>
                ExpressionParserService.evaluate("TOKEN ? Many : A few", {
                    TOKEN: "1",
                })
            ).toThrow("[TextSubstitutionService.substitute]")
        })
    })

    describe("errors", () => {
        it("throws when the token is unknown inside an expression", () => {
            expect(() =>
                ExpressionParserService.evaluate("MYSTERY + 1", {})
            ).toThrow("[TextSubstitutionService.substitute]")
        })

        it("throws when the token value is not numeric", () => {
            expect(() =>
                ExpressionParserService.evaluate("TOKEN + 1", {
                    TOKEN: "not-a-number",
                })
            ).toThrow("[TextSubstitutionService.substitute]")
        })

        it("throws on trailing garbage after a valid expression", () => {
            expect(() =>
                ExpressionParserService.evaluate("TOKEN + 1 )", {
                    TOKEN: "1",
                })
            ).toThrow("[TextSubstitutionService.substitute]")
        })
    })
})
