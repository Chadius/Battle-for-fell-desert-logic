import { describe, expect, it } from "vitest"
import {
    loadResourceManifestMediaFromJSON,
    type ResourceManifestMediaRawJSON,
} from "./resourceManifestLoader.js"
import { ResourceManifestMediaCollectionService } from "./resourceManifestMediaCollection.js"

describe("loadResourceManifestMediaFromJSON", () => {
    const validJSON: ResourceManifestMediaRawJSON = {
        blueRiverImage: {
            id: "abcd-1234-jklm",
            filepath: "./blue-river.png",
            format: "PNG",
        },
    }

    it("produces a collection with all entries from the JSON", () => {
        const collection = loadResourceManifestMediaFromJSON(validJSON)
        expect(
            ResourceManifestMediaCollectionService.has(
                collection,
                "blueRiverImage"
            )
        ).toBeTruthy()
    })

    it("maps entry fields correctly", () => {
        const collection = loadResourceManifestMediaFromJSON(validJSON)
        const entry = ResourceManifestMediaCollectionService.get(
            collection,
            "blueRiverImage"
        )
        expect(entry?.id).toBe("abcd-1234-jklm")
        expect(entry?.filepath).toBe("./blue-river.png")
        expect(entry?.format).toBe("PNG")
    })

    it("returns an empty collection for an empty JSON object", () => {
        const collection = loadResourceManifestMediaFromJSON({})
        expect(
            ResourceManifestMediaCollectionService.keys(collection)
        ).toHaveLength(0)
    })

    it("is sparse: an id with no media file simply has no entry, not an empty-string placeholder", () => {
        const collection = loadResourceManifestMediaFromJSON({
            blueRiverImage: {
                id: "abcd-1234-jklm",
                filepath: "./blue-river.png",
                format: "PNG",
            },
        })
        expect(
            ResourceManifestMediaCollectionService.has(
                collection,
                "desertBackground"
            )
        ).toBeFalsy()
    })
})
