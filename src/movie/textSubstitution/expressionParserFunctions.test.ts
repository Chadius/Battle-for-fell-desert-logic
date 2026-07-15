import { describe, expect, it } from "vitest"
import { ExpressionParserService } from "./expressionParser.js"

describe("ExpressionParserService.evaluate function calls", () => {
    describe("round / floor / ceil", () => {
        it("defaults to 0 decimal places, matching round(TOKEN, 0)", () => {
            expect(
                ExpressionParserService.evaluate("round(TOKEN)", {
                    TOKEN: "6.666",
                })
            ).toBe(
                ExpressionParserService.evaluate("round(TOKEN, 0)", {
                    TOKEN: "6.666",
                })
            )
        })

        it("rounds to a specified number of decimal places", () => {
            expect(
                ExpressionParserService.evaluate("round(TOKEN, 0)", {
                    TOKEN: "6.666",
                })
            ).toBe(7)
        })

        it("floors to a specified number of decimal places", () => {
            expect(
                ExpressionParserService.evaluate("floor(TOKEN, 1)", {
                    TOKEN: "6.666",
                })
            ).toBe(6.6)
        })

        it("ceils to a specified number of decimal places", () => {
            expect(
                ExpressionParserService.evaluate("ceil(TOKEN, 1)", {
                    TOKEN: "6.61",
                })
            ).toBe(6.7)
        })
    })

    describe("plural", () => {
        it("is true when the value is exactly 1", () => {
            expect(
                ExpressionParserService.evaluate("plural(TOKEN) ? cat : cats", {
                    TOKEN: "1",
                })
            ).toBe("cat")
        })

        it("is false when the value is not 1", () => {
            expect(
                ExpressionParserService.evaluate("plural(TOKEN) ? cat : cats", {
                    TOKEN: "3",
                })
            ).toBe("cats")
        })
    })

    describe("ordinal", () => {
        it.each([
            ["1", "1st"],
            ["2", "2nd"],
            ["3", "3rd"],
            ["4", "4th"],
            ["11", "11th"],
            ["12", "12th"],
            ["13", "13th"],
            ["21", "21st"],
            ["22", "22nd"],
            ["23", "23rd"],
            ["101", "101st"],
        ])("formats %s as %s", (tokenValue, expected) => {
            expect(
                ExpressionParserService.evaluate("ordinal(TOKEN)", {
                    TOKEN: tokenValue,
                })
            ).toBe(expected)
        })
    })

    describe("timeFormat", () => {
        it("formats milliseconds using a mm:ss pattern", () => {
            expect(
                ExpressionParserService.evaluate("timeFormat(TOKEN, mm:ss)", {
                    TOKEN: "83000",
                })
            ).toBe("01:23")
        })

        it("formats milliseconds using an hh:mm:ss.SSS pattern", () => {
            expect(
                ExpressionParserService.evaluate(
                    "timeFormat(TOKEN, hh:mm:ss.SSS)",
                    { TOKEN: "3723456" }
                )
            ).toBe("01:02:03.456")
        })
    })

    describe("errors", () => {
        it("throws when a function call is missing its closing paren", () => {
            expect(() =>
                ExpressionParserService.evaluate("round(TOKEN", {
                    TOKEN: "1",
                })
            ).toThrow("[TextSubstitutionService.substitute]")
        })

        it("throws when timeFormat is missing its pattern argument", () => {
            expect(() =>
                ExpressionParserService.evaluate("timeFormat(TOKEN)", {
                    TOKEN: "1000",
                })
            ).toThrow("[TextSubstitutionService.substitute]")
        })
    })
})
