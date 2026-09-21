import { describe, expect, it } from "vitest"
import { LocalizedTextService, localizedTextSchema } from "./localizedText.js"

const VALID_LANGUAGE_CODES = ["en-US", "fr-FR", "de-DE"]
const INVALID_LANGUAGE_CODES = [
    "en-us",
    "en-Us",
    "EN-US",
    "en",
    "english",
    "en_US",
    "",
    "en-US ",
]

describe("LocalizedTextService.resolve", () => {
    describe("when the requested language code is present", () => {
        it("returns that language's text", () => {
            const map = {
                "en-US": { text: "Hello" },
                "fr-FR": { text: "Bonjour" },
            }
            expect(LocalizedTextService.resolve(map, "fr-FR")).toBe("Bonjour")
        })
    })

    describe("when the requested language code is absent but en-US is present", () => {
        it("returns the en-US text prefixed with a MISSING warning", () => {
            const map = { "en-US": { text: "Hello" } }
            expect(LocalizedTextService.resolve(map, "de-DE")).toBe(
                "de-DE MISSING: Hello"
            )
        })
    })

    describe("when both the requested language code and en-US are absent", () => {
        it("returns a MISSING warning with no text", () => {
            expect(LocalizedTextService.resolve({}, "de-DE")).toBe(
                "de-DE MISSING:"
            )
        })
    })

    describe("when a custom fallback language code is given and present", () => {
        it("returns the custom fallback's text", () => {
            const map = { "fr-FR": { text: "Bonjour" } }
            expect(LocalizedTextService.resolve(map, "de-DE", "fr-FR")).toBe(
                "Bonjour"
            )
        })
    })

    describe("when the custom fallback language code is also absent", () => {
        it("does not fall through to en-US, and returns a MISSING warning with no text", () => {
            const map = { "en-US": { text: "Hello" } }
            expect(LocalizedTextService.resolve(map, "de-DE", "fr-FR")).toBe(
                "de-DE MISSING:"
            )
        })
    })
})

describe("localizedTextSchema", () => {
    describe("when the language code is language-REGION", () => {
        it.each(VALID_LANGUAGE_CODES)("accepts '%s'", (languageCode) => {
            const result = localizedTextSchema.safeParse({
                [languageCode]: { text: "Hello" },
            })
            expect(result.success).toBe(true)
        })
    })

    describe("when the language code has the wrong casing, separator, or no region", () => {
        it.each(INVALID_LANGUAGE_CODES)("rejects '%s'", (languageCode) => {
            const result = localizedTextSchema.safeParse({
                [languageCode]: { text: "Hello" },
            })
            expect(result.success).toBe(false)
        })
    })

    describe("when the language code is rejected", () => {
        it("tells the author the expected format", () => {
            const result = localizedTextSchema.safeParse({
                "en-us": { text: "Hello" },
            })
            expect(result.error?.message).toContain("language-REGION")
        })
    })
})

describe("LocalizedTextService.isValidLanguageCode", () => {
    describe("when the language code is language-REGION", () => {
        it.each(VALID_LANGUAGE_CODES)(
            "returns true for '%s'",
            (languageCode) => {
                expect(
                    LocalizedTextService.isValidLanguageCode(languageCode)
                ).toBe(true)
            }
        )
    })

    describe("when the language code has the wrong casing, separator, or no region", () => {
        it.each(INVALID_LANGUAGE_CODES)(
            "returns false for '%s'",
            (languageCode) => {
                expect(
                    LocalizedTextService.isValidLanguageCode(languageCode)
                ).toBe(false)
            }
        )
    })
})

describe("LocalizedTextService.isValidLanguageCode and localizedTextSchema", () => {
    describe("when validating the same language code", () => {
        it.each([...VALID_LANGUAGE_CODES, ...INVALID_LANGUAGE_CODES])(
            "agree on whether '%s' is valid",
            (languageCode) => {
                const asStandaloneCode =
                    LocalizedTextService.isValidLanguageCode(languageCode)
                const asLocalizedTextKey = localizedTextSchema.safeParse({
                    [languageCode]: { text: "Hello" },
                }).success
                expect(asStandaloneCode).toBe(asLocalizedTextKey)
            }
        )
    })
})
