import { describe, expect, it } from "vitest"
import { LocalizedTextService } from "./localizedText.js"

describe("LocalizedTextService.resolve", () => {
    describe("when the requested language code is present", () => {
        it("returns that language's text", () => {
            const map = {
                "en-us": { text: "Hello" },
                "fr-fr": { text: "Bonjour" },
            }
            expect(LocalizedTextService.resolve(map, "fr-fr")).toBe("Bonjour")
        })
    })

    describe("when the requested language code is absent but en-us is present", () => {
        it("returns the en-us text prefixed with a MISSING warning", () => {
            const map = { "en-us": { text: "Hello" } }
            expect(LocalizedTextService.resolve(map, "de-de")).toBe(
                "de-de MISSING: Hello"
            )
        })
    })

    describe("when both the requested language code and en-us are absent", () => {
        it("returns a MISSING warning with no text", () => {
            expect(LocalizedTextService.resolve({}, "de-de")).toBe(
                "de-de MISSING:"
            )
        })
    })

    describe("when a custom fallback language code is given and present", () => {
        it("returns the custom fallback's text", () => {
            const map = { "fr-fr": { text: "Bonjour" } }
            expect(LocalizedTextService.resolve(map, "de-de", "fr-fr")).toBe(
                "Bonjour"
            )
        })
    })

    describe("when the custom fallback language code is also absent", () => {
        it("does not fall through to en-us, and returns a MISSING warning with no text", () => {
            const map = { "en-us": { text: "Hello" } }
            expect(LocalizedTextService.resolve(map, "de-de", "fr-fr")).toBe(
                "de-de MISSING:"
            )
        })
    })
})
