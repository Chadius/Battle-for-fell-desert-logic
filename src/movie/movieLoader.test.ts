import { describe, expect, it } from "vitest"
import { MovieLoader } from "./movieLoader"
import { MovieSceneType } from "./movieScene"

describe("MovieLoader.loadFromJSON", () => {
    describe("when given valid JSON with an IMAGE scene", () => {
        it("returns a Movie with that scene", () => {
            const json = {
                id: "movie-1",
                firstSceneId: "scene-1",
                scenes: [
                    {
                        type: "IMAGE",
                        id: "scene-1",
                        resourceManifestEntryId: "bgImage",
                        nextSceneId: null,
                        caption: null,
                        introTransition: null,
                        exitTransition: null,
                        manualScrollEnabled: false,
                        autoScroll: null,
                    },
                ],
            }

            const movie = MovieLoader.loadFromJSON(json)

            expect(movie.id).toBe("movie-1")
            expect(movie.firstSceneId).toBe("scene-1")
            expect(movie.scenes).toHaveLength(1)
            expect(movie.scenes[0].data.id).toBe("scene-1")
            expect(movie.scenes[0].type).toBe(MovieSceneType.IMAGE)
            if (movie.scenes[0].type !== MovieSceneType.IMAGE)
                throw new Error("expected IMAGE scene")
            expect(movie.scenes[0].data.resourceManifestEntryId).toBe("bgImage")
        })
    })

    describe("when given valid JSON with a CONVERSATION scene", () => {
        it("returns a Movie with DIALOG line text preserved as LocalizedText", () => {
            const json = {
                id: "movie-2",
                firstSceneId: "convo-1",
                scenes: [
                    {
                        type: "CONVERSATION",
                        id: "convo-1",
                        nextSceneId: null,
                        lines: [
                            {
                                type: "DIALOG",
                                speakerId: "lini",
                                text: { "en-us": { text: "Hello!" } },
                            },
                        ],
                    },
                ],
            }

            const movie = MovieLoader.loadFromJSON(json)

            expect(movie.scenes[0].type).toBe(MovieSceneType.CONVERSATION)
            if (movie.scenes[0].type !== MovieSceneType.CONVERSATION)
                throw new Error("expected CONVERSATION scene")
            const conversationLine = movie.scenes[0].data.lines[0]
            expect(conversationLine.type).toBe("DIALOG")
            if (conversationLine.type !== "DIALOG")
                throw new Error("expected DIALOG line")
            expect(conversationLine.text).toEqual({
                "en-us": { text: "Hello!" },
            })
        })
    })

    describe("when a CONVERSATION scene has a DECISION line with prompt as a LocalizedText object", () => {
        it("returns a Movie with DECISION line prompt preserved as LocalizedText", () => {
            const json = {
                id: "movie-3",
                firstSceneId: "convo-1",
                scenes: [
                    {
                        type: "CONVERSATION",
                        id: "convo-1",
                        nextSceneId: null,
                        lines: [
                            {
                                type: "DECISION",
                                prompt: {
                                    "en-us": { text: "What do you do?" },
                                },
                                options: [
                                    {
                                        decisionId: "fight",
                                        text: { "en-us": { text: "Fight" } },
                                    },
                                ],
                            },
                        ],
                    },
                ],
            }

            const movie = MovieLoader.loadFromJSON(json)

            expect(movie.scenes[0].type).toBe(MovieSceneType.CONVERSATION)
            if (movie.scenes[0].type !== MovieSceneType.CONVERSATION)
                throw new Error("expected CONVERSATION scene")
            const conversationLine = movie.scenes[0].data.lines[0]
            expect(conversationLine.type).toBe("DECISION")
            if (conversationLine.type !== "DECISION")
                throw new Error("expected DECISION line")
            expect(conversationLine.prompt).toEqual({
                "en-us": { text: "What do you do?" },
            })
            const fightOption = conversationLine.options.find(
                (o) => o.decisionId === "fight"
            )
            expect(fightOption?.text).toEqual({
                "en-us": { text: "Fight" },
            })
        })
    })

    describe("when a CONVERSATION scene has a DIALOG line with text as a plain string", () => {
        it("throws a validation error naming the invalid field", () => {
            const json = {
                id: "movie-2",
                firstSceneId: "convo-1",
                scenes: [
                    {
                        type: "CONVERSATION",
                        id: "convo-1",
                        nextSceneId: null,
                        lines: [
                            {
                                type: "DIALOG",
                                speakerId: "lini",
                                text: "Hello!",
                            },
                        ],
                    },
                ],
            }

            expect(() => MovieLoader.loadFromJSON(json)).toThrow("lines.0.text")
        })
    })

    describe("when two scenes share the same id", () => {
        it("throws an error naming the duplicate id", () => {
            const json = {
                id: "movie-4",
                firstSceneId: "scene-1",
                scenes: [
                    {
                        type: "IMAGE",
                        id: "scene-1",
                        resourceManifestEntryId: "bg",
                        nextSceneId: null,
                        caption: null,
                        introTransition: null,
                        exitTransition: null,
                        manualScrollEnabled: false,
                        autoScroll: null,
                    },
                    {
                        type: "IMAGE",
                        id: "scene-1",
                        resourceManifestEntryId: "bg2",
                        nextSceneId: null,
                        caption: null,
                        introTransition: null,
                        exitTransition: null,
                        manualScrollEnabled: false,
                        autoScroll: null,
                    },
                ],
            }

            expect(() => MovieLoader.loadFromJSON(json)).toThrow("scene-1")
        })
    })

    describe("when a scene references a nextSceneId that does not exist", () => {
        it("throws an error reporting the validation failure", () => {
            const json = {
                id: "movie-5",
                firstSceneId: "scene-1",
                scenes: [
                    {
                        type: "IMAGE",
                        id: "scene-1",
                        resourceManifestEntryId: "bg",
                        nextSceneId: "missing-scene",
                        caption: null,
                        introTransition: null,
                        exitTransition: null,
                        manualScrollEnabled: false,
                        autoScroll: null,
                    },
                ],
            }

            expect(() => MovieLoader.loadFromJSON(json)).toThrow(
                "missing-scene"
            )
        })
    })

    describe("when an IMAGE scene has no resourceManifestEntryId but has a caption", () => {
        it("returns a Movie with resourceManifestEntryId as undefined", () => {
            const json = {
                id: "movie-1",
                firstSceneId: "scene-1",
                scenes: [
                    {
                        type: "IMAGE",
                        id: "scene-1",
                        resourceManifestEntryId: null,
                        nextSceneId: null,
                        caption: "Art coming soon",
                        introTransition: null,
                        exitTransition: null,
                        manualScrollEnabled: false,
                        autoScroll: null,
                    },
                ],
            }

            const movie = MovieLoader.loadFromJSON(json)

            if (movie.scenes[0].type !== MovieSceneType.IMAGE)
                throw new Error("expected IMAGE scene")
            expect(movie.scenes[0].data.resourceManifestEntryId).toBeUndefined()
        })
    })

    describe("when an IMAGE scene has autoScroll with durationMs of 0", () => {
        it("throws a validation error naming the invalid field", () => {
            const json = {
                id: "movie-1",
                firstSceneId: "scene-1",
                scenes: [
                    {
                        type: "IMAGE",
                        id: "scene-1",
                        resourceManifestEntryId: "bg",
                        nextSceneId: null,
                        caption: null,
                        introTransition: null,
                        exitTransition: null,
                        manualScrollEnabled: false,
                        autoScroll: { direction: "HORIZONTAL", durationMs: 0 },
                    },
                ],
            }

            expect(() => MovieLoader.loadFromJSON(json)).toThrow("autoScroll")
        })
    })

    describe("when an IMAGE scene has exitTransition with durationMs of 0", () => {
        it("throws a validation error naming the invalid field", () => {
            const json = {
                id: "movie-1",
                firstSceneId: "scene-1",
                scenes: [
                    {
                        type: "IMAGE",
                        id: "scene-1",
                        resourceManifestEntryId: "bg",
                        nextSceneId: null,
                        caption: null,
                        introTransition: null,
                        exitTransition: { durationMs: 0 },
                        manualScrollEnabled: false,
                        autoScroll: null,
                    },
                ],
            }

            expect(() => MovieLoader.loadFromJSON(json)).toThrow(
                "exitTransition"
            )
        })
    })

    describe("when an IMAGE scene has introTransition with a negative durationMs", () => {
        it("throws a validation error naming the invalid field", () => {
            const json = {
                id: "movie-1",
                firstSceneId: "scene-1",
                scenes: [
                    {
                        type: "IMAGE",
                        id: "scene-1",
                        resourceManifestEntryId: "bg",
                        nextSceneId: null,
                        caption: null,
                        introTransition: { durationMs: -500 },
                        exitTransition: null,
                        manualScrollEnabled: false,
                        autoScroll: null,
                    },
                ],
            }

            expect(() => MovieLoader.loadFromJSON(json)).toThrow(
                "introTransition"
            )
        })
    })

    describe("when an IMAGE scene has introTransition with durationMs of 0", () => {
        it("throws a validation error naming the invalid field", () => {
            const json = {
                id: "movie-1",
                firstSceneId: "scene-1",
                scenes: [
                    {
                        type: "IMAGE",
                        id: "scene-1",
                        resourceManifestEntryId: "bg",
                        nextSceneId: null,
                        caption: null,
                        introTransition: { durationMs: 0 },
                        exitTransition: null,
                        manualScrollEnabled: false,
                        autoScroll: null,
                    },
                ],
            }

            expect(() => MovieLoader.loadFromJSON(json)).toThrow(
                "introTransition"
            )
        })
    })

    describe("when a scene has an unknown type", () => {
        it("throws an error", () => {
            const json = {
                id: "movie-3",
                firstSceneId: "scene-1",
                scenes: [
                    {
                        type: "BOGUS",
                        id: "scene-1",
                    },
                ],
            }

            expect(() => MovieLoader.loadFromJSON(json)).toThrow()
        })
    })
})
