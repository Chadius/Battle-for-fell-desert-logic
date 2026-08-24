import { describe, expect, it } from "vitest"
import { loadResourceManifestFromJSON } from "./resourceManifestLoader.js"
import { ResourceManifestCollectionService } from "./resourceManifestCollection.js"

describe("loadResourceManifestFromJSON", () => {
    const validEntries = [
        {
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
            type: "IMAGE",
        },
        {
            id: "efgh-5678-nopq",
            label: "Fell Desert",
            description: { "en-us": { text: "An arid desert battlefield" } },
            type: "LEVEL",
        },
    ]

    describe("when given the { data: [...] } envelope campaign files are written in", () => {
        it("produces a collection with all entries, keyed by their own id", () => {
            const { collection, errors } = loadResourceManifestFromJSON({
                data: validEntries,
            })

            expect(errors).toEqual([])
            expect(
                ResourceManifestCollectionService.has(
                    collection,
                    "abcd-1234-jklm"
                )
            ).toBeTruthy()
            expect(
                ResourceManifestCollectionService.has(
                    collection,
                    "efgh-5678-nopq"
                )
            ).toBeTruthy()
        })
    })

    describe("when given a bare array of entries", () => {
        it("produces a collection with all entries, keyed by their own id", () => {
            const { collection, errors } =
                loadResourceManifestFromJSON(validEntries)

            expect(errors).toEqual([])
            expect(
                ResourceManifestCollectionService.has(
                    collection,
                    "abcd-1234-jklm"
                )
            ).toBeTruthy()
        })

        it("maps entry fields correctly", () => {
            const { collection } = loadResourceManifestFromJSON(validEntries)
            const entry = ResourceManifestCollectionService.get(
                collection,
                "abcd-1234-jklm"
            )
            expect(entry?.label).toBe("Blue River at Dawn")
            expect(entry?.type).toBe("IMAGE")
            expect(entry?.description["fr-fr"].text).toBe(
                "Une rivière traverse une clairière forestière"
            )
        })
    })

    describe("when given an empty array", () => {
        it("returns an empty collection", () => {
            const { collection, errors } = loadResourceManifestFromJSON([])
            expect(errors).toEqual([])
            expect(
                ResourceManifestCollectionService.keys(collection)
            ).toHaveLength(0)
        })
    })

    describe("when an entry has an unrecognized type", () => {
        it("reports a validation error and adds nothing", () => {
            const { collection, errors } = loadResourceManifestFromJSON([
                {
                    id: "xyz",
                    label: "Weird",
                    description: { "en-us": { text: "Unknown type" } },
                    type: "SMELL",
                },
            ])

            expect(errors).toHaveLength(1)
            expect(
                ResourceManifestCollectionService.keys(collection)
            ).toHaveLength(0)
        })
    })

    describe("when the entry type is AUDIO or VIDEO", () => {
        it.each(["AUDIO", "VIDEO"] as const)(
            "accepts %s as a valid resource type",
            (type) => {
                const { collection } = loadResourceManifestFromJSON([
                    {
                        id: "theme-1",
                        label: "Battle Theme",
                        description: {
                            "en-us": { text: "The battle theme" },
                        },
                        type,
                    },
                ])
                expect(
                    ResourceManifestCollectionService.get(collection, "theme-1")
                        ?.type
                ).toBe(type)
            }
        )
    })
})
