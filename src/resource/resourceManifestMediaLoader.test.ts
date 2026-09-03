import { describe, expect, it } from "vitest"
import { loadResourceManifestMediaFromJSON } from "./resourceManifestLoader.js"
import { ResourceManifestMediaCollectionService } from "./resourceManifestMediaCollection.js"

describe("loadResourceManifestMediaFromJSON", () => {
    const validEntries = [
        {
            id: "blue-river-image",
            filepath: "./blue-river.png",
            format: "PNG",
        },
        {
            id: "battle-theme",
            filepath: "./battle-theme.ogg",
            format: "OGG",
        },
    ]

    describe("when given the { data: [...] } envelope campaign files are written in", () => {
        it("produces a collection with all entries, keyed by their own id", () => {
            const { collection, errors } = loadResourceManifestMediaFromJSON({
                createdAt: "2026-08-22T19:41:15.999Z",
                updatedAt: "2026-08-22T19:56:29.872Z",
                data: validEntries,
            })

            expect(errors).toEqual([])
            expect(
                ResourceManifestMediaCollectionService.keys(collection).sort()
            ).toEqual(["battle-theme", "blue-river-image"])
        })
    })

    describe("when given a bare array of entries", () => {
        it("produces a collection with all entries, keyed by their own id", () => {
            const { collection, errors } =
                loadResourceManifestMediaFromJSON(validEntries)

            expect(errors).toEqual([])
            expect(
                ResourceManifestMediaCollectionService.has(
                    collection,
                    "blue-river-image"
                )
            ).toBeTruthy()
        })

        it("preserves each entry's id, filepath, and format", () => {
            const { collection } =
                loadResourceManifestMediaFromJSON(validEntries)
            const entry = ResourceManifestMediaCollectionService.get(
                collection,
                "blue-river-image"
            )
            expect(entry?.id).toBe("blue-river-image")
            expect(entry?.filepath).toBe("./blue-river.png")
            expect(entry?.format).toBe("PNG")
        })
    })

    describe("when given an envelope with no entries", () => {
        it("returns an empty collection", () => {
            const { collection, errors } = loadResourceManifestMediaFromJSON({
                createdAt: "2026-08-21T00:00:00.000Z",
                updatedAt: "2026-08-21T00:00:00.000Z",
                data: [],
            })
            expect(errors).toEqual([])
            expect(
                ResourceManifestMediaCollectionService.keys(collection)
            ).toHaveLength(0)
        })
    })

    describe("when an entry has a produced filepath but no format yet", () => {
        it("accepts an empty format string", () => {
            const { collection, errors } = loadResourceManifestMediaFromJSON([
                {
                    id: "young-nahla-cutscene-portrait",
                    filepath: "resources/dialogPortraits/young-nahla.png",
                    format: "",
                },
            ])

            expect(errors).toEqual([])
            expect(
                ResourceManifestMediaCollectionService.get(
                    collection,
                    "young-nahla-cutscene-portrait"
                )?.format
            ).toBe("")
        })
    })

    describe("when an entry is missing a required field", () => {
        it("reports a validation error and adds nothing", () => {
            const { collection, errors } = loadResourceManifestMediaFromJSON([
                { id: "no-filepath", format: "PNG" },
            ])

            expect(errors).toHaveLength(1)
            expect(
                ResourceManifestMediaCollectionService.keys(collection)
            ).toHaveLength(0)
        })
    })

    describe("when an entry has an empty filepath", () => {
        it("reports a validation error and adds nothing", () => {
            const { collection, errors } = loadResourceManifestMediaFromJSON([
                {
                    id: "blue-river-image",
                    filepath: "",
                    format: "PNG",
                },
            ])

            expect(errors).toHaveLength(1)
            expect(
                ResourceManifestMediaCollectionService.keys(collection)
            ).toHaveLength(0)
        })
    })
})
