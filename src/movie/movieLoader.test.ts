import { describe, expect, it } from "vitest"
import { MovieLoader } from "./movieLoader.js"
import { MovieSceneType } from "./movieScene.js"

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
                        nextSceneId: null,
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
        })
    })

    describe("when given valid JSON with a CONVERSATION scene", () => {
        it("returns a Movie with the DIALOG line", () => {
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
                                id: "line-1",
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
            expect(conversationLine).toEqual({ type: "DIALOG", id: "line-1" })
        })
    })

    describe("when a CONVERSATION scene has a DECISION line", () => {
        it("returns a Movie with the DECISION line and its options", () => {
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
                                id: "line-2",
                                options: [
                                    {
                                        decisionId: "fight",
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
            expect(conversationLine).toEqual({
                type: "DECISION",
                id: "line-2",
                options: [{ decisionId: "fight" }],
            })
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
                        nextSceneId: null,
                        introTransition: null,
                        exitTransition: null,
                        manualScrollEnabled: false,
                        autoScroll: null,
                    },
                    {
                        type: "IMAGE",
                        id: "scene-1",
                        nextSceneId: null,
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
                        nextSceneId: "missing-scene",
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

    describe("when an IMAGE scene has autoScroll with durationMs of 0", () => {
        it("throws a validation error naming the invalid field", () => {
            const json = {
                id: "movie-1",
                firstSceneId: "scene-1",
                scenes: [
                    {
                        type: "IMAGE",
                        id: "scene-1",
                        nextSceneId: null,
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
                        nextSceneId: null,
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
                        nextSceneId: null,
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
                        nextSceneId: null,
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
