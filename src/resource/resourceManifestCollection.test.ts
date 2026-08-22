import { describe, expect, it } from "vitest"
import {
    ResourceManifestCollectionService,
    type ResourceManifestCollection,
} from "./resourceManifestCollection.js"
import {
    ResourceManifestEntryService,
    type ResourceManifestEntry,
} from "./resourceManifest.js"

describe("ResourceManifestCollection", () => {
    const makeEntry = (id: string): ResourceManifestEntry =>
        ResourceManifestEntryService.new({
            id,
            label: `Label ${id}`,
            description: { "en-us": { text: `Description for ${id}` } },
            type: "IMAGE",
        })

    const buildCollectionWithOneEntry = (): ResourceManifestCollection =>
        ResourceManifestCollectionService.add(
            ResourceManifestCollectionService.new(),
            "riverImage",
            makeEntry("abcd-1234")
        )

    it("starts empty", () => {
        const empty = ResourceManifestCollectionService.new()
        expect(ResourceManifestCollectionService.keys(empty)).toHaveLength(0)
    })

    describe("add", () => {
        it("returns a new collection with the entry present", () => {
            const collection = buildCollectionWithOneEntry()
            expect(
                ResourceManifestCollectionService.has(collection, "riverImage")
            ).toBeTruthy()
        })

        it("does not mutate the original collection", () => {
            const original = ResourceManifestCollectionService.new()
            ResourceManifestCollectionService.add(
                original,
                "riverImage",
                makeEntry("abcd-1234")
            )
            expect(
                ResourceManifestCollectionService.has(original, "riverImage")
            ).toBeFalsy()
        })

        it("replaces an existing entry at the same key", () => {
            const collection = buildCollectionWithOneEntry()
            const updated = ResourceManifestCollectionService.add(
                collection,
                "riverImage",
                makeEntry("new-id")
            )
            expect(
                ResourceManifestCollectionService.get(updated, "riverImage")?.id
            ).toBe("new-id")
        })
    })

    describe("get", () => {
        it("retrieves an entry by camelCase key", () => {
            const collection = buildCollectionWithOneEntry()
            const entry = ResourceManifestCollectionService.get(
                collection,
                "riverImage"
            )
            expect(entry?.id).toBe("abcd-1234")
        })

        it("returns undefined for an unknown key", () => {
            const collection = buildCollectionWithOneEntry()
            expect(
                ResourceManifestCollectionService.get(collection, "unknownKey")
            ).toBeUndefined()
        })
    })

    describe("keys", () => {
        it("lists all keys in the collection", () => {
            const withTwo = ResourceManifestCollectionService.add(
                ResourceManifestCollectionService.add(
                    ResourceManifestCollectionService.new(),
                    "riverImage",
                    makeEntry("id-1")
                ),
                "forestLevel",
                makeEntry("id-2")
            )
            expect(
                ResourceManifestCollectionService.keys(withTwo).sort()
            ).toEqual(["forestLevel", "riverImage"])
        })
    })
})
