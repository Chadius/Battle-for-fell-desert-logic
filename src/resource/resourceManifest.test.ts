import { describe, expect, it } from "vitest"
import {
    type ResourceManifestEntry,
    ResourceManifestEntryService,
} from "./resourceManifest.js"

describe("ResourceManifestEntry", () => {
    const makeEntry = (
        overrides: Partial<ResourceManifestEntry> = {}
    ): ResourceManifestEntry =>
        ResourceManifestEntryService.new({
            id: "abcd-1234",
            label: "Blue River at Dawn",
            description: {
                "en-us": { text: "A river flows through a forest glade" },
                "fr-fr": { text: "Une rivière traverse une clairière" },
            },
            type: "IMAGE",
            ...overrides,
        })

    it("creates an entry with all fields", () => {
        const entry = makeEntry()
        expect(entry.id).toBe("abcd-1234")
        expect(entry.label).toBe("Blue River at Dawn")
        expect(entry.type).toBe("IMAGE")
    })

    describe("getDescription", () => {
        it("returns description for the requested language code", () => {
            const entry = makeEntry()
            expect(
                ResourceManifestEntryService.getDescription(entry, "fr-fr")
            ).toBe("Une rivière traverse une clairière")
        })

        it("falls back to en-us with a warning when the requested language code is absent", () => {
            const entry = makeEntry()
            expect(
                ResourceManifestEntryService.getDescription(entry, "de-de")
            ).toBe("de-de MISSING: A river flows through a forest glade")
        })

        it("returns warning when both requested code and en-us fallback are absent", () => {
            const entry = makeEntry({ description: {} })
            expect(
                ResourceManifestEntryService.getDescription(entry, "de-de")
            ).toBe("de-de MISSING:")
        })

        it("accepts a custom fallback language code", () => {
            const entry = makeEntry({
                description: { "fr-fr": { text: "Une rivière" } },
            })
            expect(
                ResourceManifestEntryService.getDescription(
                    entry,
                    "de-de",
                    "fr-fr"
                )
            ).toBe("Une rivière")
        })
    })
})
