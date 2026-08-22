import { describe, expect, it } from "vitest"
import {
    ResourceManifestMediaCollectionService,
    type ResourceManifestMediaCollection,
} from "./resourceManifestMediaCollection.js"
import {
    ResourceManifestMediaEntryService,
    type ResourceManifestMediaEntry,
} from "./resourceManifestMedia.js"

describe("ResourceManifestMediaCollection", () => {
    const makeEntry = (id: string): ResourceManifestMediaEntry =>
        ResourceManifestMediaEntryService.new({
            id,
            filepath: `./${id}.png`,
            format: "PNG",
        })

    const buildCollectionWithOneEntry = (): ResourceManifestMediaCollection =>
        ResourceManifestMediaCollectionService.add(
            ResourceManifestMediaCollectionService.new(),
            "riverImage",
            makeEntry("abcd-1234")
        )

    it("starts empty", () => {
        const empty = ResourceManifestMediaCollectionService.new()
        expect(ResourceManifestMediaCollectionService.keys(empty)).toHaveLength(
            0
        )
    })

    describe("add", () => {
        it("returns a new collection with the entry present", () => {
            const collection = buildCollectionWithOneEntry()
            expect(
                ResourceManifestMediaCollectionService.has(
                    collection,
                    "riverImage"
                )
            ).toBeTruthy()
        })

        it("does not mutate the original collection", () => {
            const original = ResourceManifestMediaCollectionService.new()
            ResourceManifestMediaCollectionService.add(
                original,
                "riverImage",
                makeEntry("abcd-1234")
            )
            expect(
                ResourceManifestMediaCollectionService.has(
                    original,
                    "riverImage"
                )
            ).toBeFalsy()
        })

        it("replaces an existing entry at the same key", () => {
            const collection = buildCollectionWithOneEntry()
            const updated = ResourceManifestMediaCollectionService.add(
                collection,
                "riverImage",
                makeEntry("new-id")
            )
            expect(
                ResourceManifestMediaCollectionService.get(
                    updated,
                    "riverImage"
                )?.id
            ).toBe("new-id")
        })
    })

    describe("get", () => {
        it("retrieves an entry by camelCase key", () => {
            const collection = buildCollectionWithOneEntry()
            const entry = ResourceManifestMediaCollectionService.get(
                collection,
                "riverImage"
            )
            expect(entry?.id).toBe("abcd-1234")
        })

        it("returns undefined for an unknown key", () => {
            const collection = buildCollectionWithOneEntry()
            expect(
                ResourceManifestMediaCollectionService.get(
                    collection,
                    "unknownKey"
                )
            ).toBeUndefined()
        })
    })

    describe("keys", () => {
        it("lists all keys in the collection", () => {
            const withTwo = ResourceManifestMediaCollectionService.add(
                ResourceManifestMediaCollectionService.add(
                    ResourceManifestMediaCollectionService.new(),
                    "riverImage",
                    makeEntry("id-1")
                ),
                "forestLevel",
                makeEntry("id-2")
            )
            expect(
                ResourceManifestMediaCollectionService.keys(withTwo).sort()
            ).toEqual(["forestLevel", "riverImage"])
        })
    })
})
