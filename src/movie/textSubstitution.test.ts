import { describe, expect, it } from "vitest"
import { TextSubstitutionService } from "./textSubstitution.js"

describe("TextSubstitutionService.substitute", () => {
    describe("when the text contains a single known token", () => {
        it("replaces it with the token's value", () => {
            expect(
                TextSubstitutionService.substitute("Turn {TURN_COUNT} begins", {
                    "{TURN_COUNT}": "3",
                })
            ).toBe("Turn 3 begins")
        })
    })

    describe("when the text contains multiple distinct tokens", () => {
        it("replaces each one in a single pass", () => {
            expect(
                TextSubstitutionService.substitute(
                    "Dealt {DAMAGE_DEALT}, took {DAMAGE_TAKEN}",
                    { "{DAMAGE_DEALT}": "5", "{DAMAGE_TAKEN}": "2" }
                )
            ).toBe("Dealt 5, took 2")
        })
    })

    describe("when a token appears more than once in the text", () => {
        it("replaces every occurrence", () => {
            expect(
                TextSubstitutionService.substitute("{X} and {X} again", {
                    "{X}": "7",
                })
            ).toBe("7 and 7 again")
        })
    })

    describe("when the text contains a token with no matching value", () => {
        it("leaves the token untouched", () => {
            expect(
                TextSubstitutionService.substitute("Unknown: {MYSTERY}", {
                    "{TURN_COUNT}": "3",
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
})
