import { describe, expect, it } from "vitest"
import {
    loadResourceManifestFromJSON,
    type ResourceManifestRawJSON,
} from "./resourceManifestLoader.js"
import { ResourceManifestCollectionService } from "./resourceManifestCollection.js"

describe("loadResourceManifestFromJSON", () => {
    const validJSON: ResourceManifestRawJSON = {
        blueRiverImage: {
            id: "abcd-1234-jklm",
            label: "Blue River at Dawn",
            description: {
                "en-us": {
                    text: "A river flows through a forest glade during the blue hour in the morning",
                },
                "fr-fr": {
                    text: "Une rivière traverse une clairière forestière",
                },
            },
            filepath: "./blue-river.png",
            format: "PNG",
            type: "IMAGE",
        },
        desertLevel: {
            id: "efgh-5678-nopq",
            label: "Fell Desert",
            description: { "en-us": { text: "An arid desert battlefield" } },
            filepath: "./fell-desert.json",
            format: "JSON",
            type: "LEVEL",
        },
    }

    it("produces a collection with all entries from the JSON", () => {
        const collection = loadResourceManifestFromJSON(validJSON)
        expect(
            ResourceManifestCollectionService.has(collection, "blueRiverImage")
        ).toBeTruthy()
        expect(
            ResourceManifestCollectionService.has(collection, "desertLevel")
        ).toBeTruthy()
    })

    it("maps entry fields correctly", () => {
        const collection = loadResourceManifestFromJSON(validJSON)
        const entry = ResourceManifestCollectionService.get(
            collection,
            "blueRiverImage"
        )
        expect(entry?.id).toBe("abcd-1234-jklm")
        expect(entry?.label).toBe("Blue River at Dawn")
        expect(entry?.filepath).toBe("./blue-river.png")
        expect(entry?.format).toBe("PNG")
        expect(entry?.type).toBe("IMAGE")
        expect(entry?.description["fr-fr"].text).toBe(
            "Une rivière traverse une clairière forestière"
        )
    })

    it("returns an empty collection for an empty JSON object", () => {
        const collection = loadResourceManifestFromJSON({})
        expect(ResourceManifestCollectionService.keys(collection)).toHaveLength(
            0
        )
    })

    it("throws when an entry has an unrecognized type", () => {
        const badJSON: ResourceManifestRawJSON = {
            weirdThing: {
                id: "xyz",
                label: "Weird",
                description: { "en-us": { text: "Unknown type" } },
                filepath: "./weird.bin",
                format: "BIN",
                type: "AUDIO",
            },
        }
        expect(() => loadResourceManifestFromJSON(badJSON)).toThrow(
            /Unknown resource type "AUDIO"/
        )
    })
})
