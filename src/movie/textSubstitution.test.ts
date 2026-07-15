import { describe, expect, it } from "vitest"
import { TextSubstitutionService } from "./textSubstitution.js"

describe("TextSubstitutionService.substitute", () => {
    describe("when the text contains a single known token", () => {
        it("replaces it with the token's value", () => {
            expect(
                TextSubstitutionService.substitute("Turn {TURN_COUNT} begins", {
                    TURN_COUNT: "3",
                })
            ).toBe("Turn 3 begins")
        })
    })

    describe("when the text contains multiple distinct tokens", () => {
        it("replaces each one in a single pass", () => {
            expect(
                TextSubstitutionService.substitute(
                    "Dealt {DAMAGE_DEALT}, took {DAMAGE_TAKEN}",
                    { DAMAGE_DEALT: "5", DAMAGE_TAKEN: "2" }
                )
            ).toBe("Dealt 5, took 2")
        })
    })

    describe("when a token appears more than once in the text", () => {
        it("replaces every occurrence", () => {
            expect(
                TextSubstitutionService.substitute("{X} and {X} again", {
                    X: "7",
                })
            ).toBe("7 and 7 again")
        })
    })

    describe("when the text contains a token with no matching value", () => {
        it("leaves the token untouched", () => {
            expect(
                TextSubstitutionService.substitute("Unknown: {MYSTERY}", {
                    TURN_COUNT: "3",
                })
            ).toBe("Unknown: {MYSTERY}")
        })
    })

    describe("when no tokens are provided", () => {
        it("returns the original text unchanged", () => {
            expect(
                TextSubstitutionService.substitute("No tokens here", {})
            ).toBe("No tokens here")
        })
    })

    describe("when the text has an unmatched opening brace", () => {
        it("leaves the remainder of the text untouched", () => {
            expect(
                TextSubstitutionService.substitute("Broken {TOKEN", {
                    TOKEN: "5",
                })
            ).toBe("Broken {TOKEN")
        })
    })

    describe("when an expression contains arithmetic", () => {
        it("evaluates it and substitutes the numeric result", () => {
            expect(
                TextSubstitutionService.substitute("Next: {TURN_COUNT + 1}", {
                    TURN_COUNT: "3",
                })
            ).toBe("Next: 4")
        })
    })

    describe("when arithmetic produces a non-integer result", () => {
        it("rounds the displayed value to 2 decimal places by default", () => {
            expect(
                TextSubstitutionService.substitute("{TOKEN / 3}", {
                    TOKEN: "20",
                })
            ).toBe("6.67")
        })

        it("does not pad whole numbers with trailing zeros", () => {
            expect(
                TextSubstitutionService.substitute("{TOKEN / 2}", {
                    TOKEN: "10",
                })
            ).toBe("5")
        })
    })

    describe("when an expression contains a ternary comparison", () => {
        it("substitutes the branch matching the comparison", () => {
            expect(
                TextSubstitutionService.substitute(
                    "{TURN_COUNT > 2 ? Many : A few}",
                    { TURN_COUNT: "3" }
                )
            ).toBe("Many")
        })
    })

    describe("when an expression is malformed", () => {
        it("throws an error naming the substitute function", () => {
            expect(() =>
                TextSubstitutionService.substitute("{TURN_COUNT +}", {
                    TURN_COUNT: "3",
                })
            ).toThrow("[TextSubstitutionService.substitute]")
        })
    })
})

describe("TextSubstitutionService.validate", () => {
    describe("when the text has no expressions", () => {
        it("returns no errors", () => {
            expect(TextSubstitutionService.validate("Plain text")).toEqual([])
        })
    })

    describe("when the text has a bare, unresolved token", () => {
        it("returns no errors, matching substitute's pass-through behavior", () => {
            expect(TextSubstitutionService.validate("{MYSTERY}")).toEqual([])
        })
    })

    describe("when the text has a well-formed expression", () => {
        it("returns no errors even without real token values", () => {
            expect(
                TextSubstitutionService.validate(
                    "{TURN_COUNT + 1} and {TURN_COUNT > 2 ? Many : A few}"
                )
            ).toEqual([])
        })
    })

    describe("when an expression has a dangling operator", () => {
        it("reports the malformed expression instead of throwing", () => {
            const errors = TextSubstitutionService.validate("Turn {TOKEN+}")
            expect(errors).toHaveLength(1)
            expect(errors[0]).toContain("[TextSubstitutionService.substitute]")
        })
    })

    describe("when the text has multiple malformed expressions", () => {
        it("reports one error per malformed expression", () => {
            const errors = TextSubstitutionService.validate(
                "{TOKEN+} and {(TOKEN}"
            )
            expect(errors).toHaveLength(2)
        })
    })

    describe("when a ternary condition is not a comparison", () => {
        it("reports an error", () => {
            const errors = TextSubstitutionService.validate(
                "{TOKEN ? Many : A few}"
            )
            expect(errors).toHaveLength(1)
        })
    })
})
