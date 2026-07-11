import { describe, expect, it } from "vitest"
import { resolveResourceManifestEntry } from "./resourceManifestResolver.js"
import {
    ResourceManifestCollectionService,
    type ResourceManifestCollection,
} from "./resourceManifestCollection.js"
import { ResourceManifestEntryService } from "./resourceManifest.js"

describe("resolveResourceManifestEntry", () => {
    const makeCollection = (
        entries: Record<string, string>
    ): ResourceManifestCollection => {
        let collection = ResourceManifestCollectionService.new()
        for (const [key, id] of Object.entries(entries)) {
            collection = ResourceManifestCollectionService.add(
                collection,
                key,
                ResourceManifestEntryService.new({
                    id,
                    label: `Label ${id}`,
                    description: { "en-us": { text: `Desc ${id}` } },
                    filepath: `./${id}.png`,
                    format: "PNG",
                    type: "IMAGE",
                })
            )
        }
        return collection
    }

    it("returns the entry from the first collection that contains the key", () => {
        const mission = makeCollection({ riverImage: "mission-river" })
        const campaign = makeCollection({ riverImage: "campaign-river" })
        const core = makeCollection({ riverImage: "core-river" })

        const entry = resolveResourceManifestEntry(
            [mission, campaign, core],
            "riverImage"
        )
        expect(entry?.id).toBe("mission-river")
    })

    it("falls back to a later collection when earlier ones lack the key", () => {
        const mission = makeCollection({})
        const campaign = makeCollection({})
        const core = makeCollection({ riverImage: "core-river" })

        const entry = resolveResourceManifestEntry(
            [mission, campaign, core],
            "riverImage"
        )
        expect(entry?.id).toBe("core-river")
    })

    it("returns undefined when no collection contains the key", () => {
        const mission = makeCollection({ forestLevel: "mission-forest" })
        const core = makeCollection({ desertLevel: "core-desert" })

        expect(
            resolveResourceManifestEntry([mission, core], "riverImage")
        ).toBeUndefined()
    })

    it("returns undefined for an empty collections array", () => {
        expect(resolveResourceManifestEntry([], "riverImage")).toBeUndefined()
    })

    it("works with a single collection", () => {
        const core = makeCollection({ riverImage: "core-river" })
        const entry = resolveResourceManifestEntry([core], "riverImage")
        expect(entry?.id).toBe("core-river")
    })
})
