import { describe, expect, it } from "vitest"
import { MovieService } from "./movie.js"
import { MovieSceneConversationService } from "./movieSceneConversation.js"
import { MovieSceneType } from "./movieScene.js"

describe("MovieService.validate — text substitution", () => {
    describe("when a DIALOG line has a malformed expression", () => {
        it("returns an error naming the scene, line index, and language code", () => {
            const movie = {
                id: "movie-1",
                firstSceneId: "scene-a",
                scenes: [
                    {
                        type: MovieSceneType.CONVERSATION,
                        data: MovieSceneConversationService.new({
                            id: "scene-a",
                            lines: [
                                {
                                    type: "DIALOG" as const,
                                    text: {
                                        "en-us": { text: "Turn {TOKEN+}" },
                                    },
                                },
                            ],
                        }),
                    },
                ],
            }

            const result = MovieService.validate(movie)

            expect(result.isValid).toBe(false)
            expect(result.errors).toContainEqual(
                expect.stringContaining("scene 'scene-a' line 0 (en-us):")
            )
            expect(result.errors).toContainEqual(
                expect.stringContaining("[TextSubstitutionService.substitute]")
            )
        })
    })

    describe("when a DIALOG line has a well-formed expression", () => {
        it("returns no errors", () => {
            const movie = {
                id: "movie-1",
                firstSceneId: "scene-a",
                scenes: [
                    {
                        type: MovieSceneType.CONVERSATION,
                        data: MovieSceneConversationService.new({
                            id: "scene-a",
                            lines: [
                                {
                                    type: "DIALOG" as const,
                                    text: {
                                        "en-us": {
                                            text: "Turn {TURN_COUNT + 1}",
                                        },
                                    },
                                },
                            ],
                        }),
                    },
                ],
            }

            const result = MovieService.validate(movie)

            expect(result.isValid).toBe(true)
            expect(result.errors).toHaveLength(0)
        })
    })

    describe("when a DECISION prompt has a malformed expression", () => {
        it("returns an error naming the scene and line index", () => {
            const movie = {
                id: "movie-1",
                firstSceneId: "scene-a",
                scenes: [
                    {
                        type: MovieSceneType.CONVERSATION,
                        data: MovieSceneConversationService.new({
                            id: "scene-a",
                            lines: [
                                {
                                    type: "DECISION" as const,
                                    prompt: {
                                        "en-us": {
                                            text: "Choose ({TOKEN+})",
                                        },
                                    },
                                    options: [
                                        {
                                            decisionId: "attack",
                                            text: {
                                                "en-us": { text: "Attack" },
                                            },
                                        },
                                    ],
                                },
                            ],
                        }),
                    },
                ],
            }

            const result = MovieService.validate(movie)

            expect(result.isValid).toBe(false)
            expect(result.errors).toContainEqual(
                expect.stringContaining("scene 'scene-a' line 0 (en-us):")
            )
        })
    })

    describe("when a DECISION option's text has a malformed expression", () => {
        it("returns an error naming the scene and line index", () => {
            const movie = {
                id: "movie-1",
                firstSceneId: "scene-a",
                scenes: [
                    {
                        type: MovieSceneType.CONVERSATION,
                        data: MovieSceneConversationService.new({
                            id: "scene-a",
                            lines: [
                                {
                                    type: "DECISION" as const,
                                    prompt: {
                                        "en-us": { text: "What do you do?" },
                                    },
                                    options: [
                                        {
                                            decisionId: "attack",
                                            text: {
                                                "en-us": {
                                                    text: "Attack {TOKEN+}",
                                                },
                                            },
                                        },
                                    ],
                                },
                            ],
                        }),
                    },
                ],
            }

            const result = MovieService.validate(movie)

            expect(result.isValid).toBe(false)
            expect(result.errors).toContainEqual(
                expect.stringContaining("scene 'scene-a' line 0 (en-us):")
            )
        })
    })

    describe("when a DIALOG line references an unresolved bare token", () => {
        it("returns no error, since token existence depends on mission context", () => {
            const movie = {
                id: "movie-1",
                firstSceneId: "scene-a",
                scenes: [
                    {
                        type: MovieSceneType.CONVERSATION,
                        data: MovieSceneConversationService.new({
                            id: "scene-a",
                            lines: [
                                {
                                    type: "DIALOG" as const,
                                    text: {
                                        "en-us": { text: "{MYSTERY}" },
                                    },
                                },
                            ],
                        }),
                    },
                ],
            }

            const result = MovieService.validate(movie)

            expect(result.isValid).toBe(true)
            expect(result.errors).toHaveLength(0)
        })
    })
})
