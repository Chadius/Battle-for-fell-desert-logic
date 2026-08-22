import { describe, expect, it } from "vitest"
import {
    resolveResourceManifestEntry,
    resolveResourceManifestMedia,
} from "./resourceManifestResolver.js"
import { ResourceManifestCollectionService } from "./resourceManifestCollection.js"
import { ResourceManifestEntryService } from "./resourceManifest.js"
import {
    ResourceManifestMediaCollectionService,
    type ResourceManifestMediaCollection,
} from "./resourceManifestMediaCollection.js"
import { ResourceManifestMediaEntryService } from "./resourceManifestMedia.js"

describe("resolveResourceManifestMedia", () => {
    const makeMediaCollection = (
        entries: Record<string, string>
    ): ResourceManifestMediaCollection => {
        let collection = ResourceManifestMediaCollectionService.new()
        for (const [key, id] of Object.entries(entries)) {
            collection = ResourceManifestMediaCollectionService.add(
                collection,
                key,
                ResourceManifestMediaEntryService.new({
                    id,
                    filepath: `./${id}.png`,
                    format: "PNG",
                })
            )
        }
        return collection
    }

    it("returns the entry from the first collection that contains the key", () => {
        const mission = makeMediaCollection({ riverImage: "mission-river" })
        const campaign = makeMediaCollection({ riverImage: "campaign-river" })
        const core = makeMediaCollection({ riverImage: "core-river" })

        const entry = resolveResourceManifestMedia(
            [mission, campaign, core],
            "riverImage"
        )
        expect(entry?.id).toBe("mission-river")
    })

    it("falls back to a later collection when earlier ones lack the key", () => {
        const mission = makeMediaCollection({})
        const core = makeMediaCollection({ riverImage: "core-river" })

        const entry = resolveResourceManifestMedia(
            [mission, core],
            "riverImage"
        )
        expect(entry?.id).toBe("core-river")
    })

    it("returns undefined when no collection contains the key", () => {
        expect(
            resolveResourceManifestMedia(
                [makeMediaCollection({})],
                "riverImage"
            )
        ).toBeUndefined()
    })

    it("returns undefined for an empty collections array", () => {
        expect(resolveResourceManifestMedia([], "riverImage")).toBeUndefined()
    })
})

describe("when a content entry exists but its media has not been produced yet", () => {
    it("resolves the content entry and returns undefined for the media entry, without throwing", () => {
        const contentCollection = ResourceManifestCollectionService.add(
            ResourceManifestCollectionService.new(),
            "desertBackground",
            ResourceManifestEntryService.new({
                id: "desert-background",
                label: "Desert Background",
                description: {
                    "en-us": { text: "A vast desert opens ahead of you." },
                },
                type: "IMAGE",
            })
        )
        const emptyMediaCollection =
            ResourceManifestMediaCollectionService.new()

        const contentEntry = resolveResourceManifestEntry(
            [contentCollection],
            "desertBackground"
        )
        const mediaEntry = resolveResourceManifestMedia(
            [emptyMediaCollection],
            "desertBackground"
        )

        expect(contentEntry?.id).toBe("desert-background")
        expect(mediaEntry).toBeUndefined()
    })
})
