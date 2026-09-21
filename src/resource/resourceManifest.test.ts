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
                "en-US": { text: "A river flows through a forest glade" },
                "fr-FR": { text: "Une rivière traverse une clairière" },
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
                ResourceManifestEntryService.getDescription(entry, "fr-FR")
            ).toBe("Une rivière traverse une clairière")
        })

        it("falls back to en-US with a warning when the requested language code is absent", () => {
            const entry = makeEntry()
            expect(
                ResourceManifestEntryService.getDescription(entry, "de-DE")
            ).toBe("de-DE MISSING: A river flows through a forest glade")
        })

        it("returns warning when both requested code and en-US fallback are absent", () => {
            const entry = makeEntry({ description: {} })
            expect(
                ResourceManifestEntryService.getDescription(entry, "de-DE")
            ).toBe("de-DE MISSING:")
        })

        it("accepts a custom fallback language code", () => {
            const entry = makeEntry({
                description: { "fr-FR": { text: "Une rivière" } },
            })
            expect(
                ResourceManifestEntryService.getDescription(
                    entry,
                    "de-DE",
                    "fr-FR"
                )
            ).toBe("Une rivière")
        })
    })
})
