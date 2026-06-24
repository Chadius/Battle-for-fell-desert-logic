import { describe, expect, it } from "vitest"
import { MovieService } from "./movie"
import { MovieSceneImageService } from "./movieSceneImage"
import { MovieSceneConversationService } from "./movieSceneConversation"
import { MovieSceneType } from "./movieScene"

describe("MovieService.validate", () => {
    describe("when an IMAGE scene has an empty resourceManifestEntryId and no caption", () => {
        it("returns an error naming the scene", () => {
            const movie = {
                id: "movie-1",
                firstSceneId: "scene-1",
                scenes: [
                    {
                        type: MovieSceneType.IMAGE,
                        data: MovieSceneImageService.new({
                            id: "scene-1",
                            resourceManifestEntryId: "",
                        }),
                    },
                ],
            }

            const result = MovieService.validate(movie)

            expect(result.errors).toContainEqual(
                expect.stringContaining("scene-1")
            )
        })
    })

    describe("when an IMAGE scene has an empty resourceManifestEntryId but a non-empty caption", () => {
        it("returns no errors — the scene is a valid placeholder", () => {
            const movie = {
                id: "movie-1",
                firstSceneId: "scene-1",
                scenes: [
                    {
                        type: MovieSceneType.IMAGE,
                        data: MovieSceneImageService.new({
                            id: "scene-1",
                            resourceManifestEntryId: "",
                            caption: "Art coming soon",
                        }),
                    },
                ],
            }

            const result = MovieService.validate(movie)

            expect(result.errors).toHaveLength(0)
        })
    })

    describe("when a movie has no nextSceneId fields", () => {
        it("returns isValid true with no errors", () => {
            const movie = {
                id: "movie-1",
                firstSceneId: "scene-a",
                scenes: [
                    {
                        type: MovieSceneType.IMAGE,
                        data: MovieSceneImageService.new({
                            id: "scene-a",
                            resourceManifestEntryId: "img-1",
                        }),
                    },
                    {
                        type: MovieSceneType.IMAGE,
                        data: MovieSceneImageService.new({
                            id: "scene-b",
                            resourceManifestEntryId: "img-2",
                        }),
                    },
                ],
            }

            const result = MovieService.validate(movie)

            expect(result.isValid).toBe(true)
            expect(result.errors).toHaveLength(0)
        })
    })

    describe("when firstSceneId references a non-existent scene", () => {
        it("returns an existence error naming the movie and the unknown firstSceneId", () => {
            const movie = {
                id: "movie-1",
                firstSceneId: "scene-does-not-exist",
                scenes: [
                    {
                        type: MovieSceneType.IMAGE,
                        data: MovieSceneImageService.new({
                            id: "scene-a",
                            resourceManifestEntryId: "img-1",
                        }),
                    },
                ],
            }

            const result = MovieService.validate(movie)

            expect(result.isValid).toBe(false)
            expect(result.errors).toContain(
                "movie 'movie-1' has firstSceneId 'scene-does-not-exist' that does not reference any scene"
            )
        })
    })

    describe("when a scene's nextSceneId references a non-existent scene", () => {
        it("returns an existence error naming the scene and the unknown target", () => {
            const movie = {
                id: "movie-1",
                firstSceneId: "scene-a",
                scenes: [
                    {
                        type: MovieSceneType.IMAGE,
                        data: MovieSceneImageService.new({
                            id: "scene-a",
                            resourceManifestEntryId: "img-1",
                            nextSceneId: "scene-does-not-exist",
                        }),
                    },
                ],
            }

            const result = MovieService.validate(movie)

            expect(result.isValid).toBe(false)
            expect(result.errors).toContain(
                "scene 'scene-a' references unknown nextSceneId 'scene-does-not-exist'"
            )
        })
    })

    describe("when a DecisionOption's nextSceneId references a non-existent scene", () => {
        it("returns an existence error naming the scene and the unknown target", () => {
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
                                                "en-us": { text: "Attack" },
                                            },
                                            nextSceneId: "scene-does-not-exist",
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
            expect(result.errors).toContain(
                "scene 'scene-a' references unknown nextSceneId 'scene-does-not-exist'"
            )
        })
    })

    describe("when a conversation scene has both a nextSceneId and DECISION lines", () => {
        it("returns a conflict error naming the scene", () => {
            const movie = {
                id: "movie-1",
                firstSceneId: "scene-a",
                scenes: [
                    {
                        type: MovieSceneType.CONVERSATION,
                        data: MovieSceneConversationService.new({
                            id: "scene-a",
                            nextSceneId: "scene-b",
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
                                                "en-us": { text: "Attack" },
                                            },
                                        },
                                    ],
                                },
                            ],
                        }),
                    },
                    {
                        type: MovieSceneType.IMAGE,
                        data: MovieSceneImageService.new({
                            id: "scene-b",
                            resourceManifestEntryId: "img-1",
                        }),
                    },
                ],
            }

            const result = MovieService.validate(movie)

            expect(result.isValid).toBe(false)
            expect(result.errors).toContain(
                "scene 'scene-a' has nextSceneId but also contains DECISION lines"
            )
        })
    })

    describe("when scenes form a cycle", () => {
        it("returns a cycle error naming the involved scenes", () => {
            const movie = {
                id: "movie-1",
                firstSceneId: "scene-a",
                scenes: [
                    {
                        type: MovieSceneType.IMAGE,
                        data: MovieSceneImageService.new({
                            id: "scene-a",
                            resourceManifestEntryId: "img-1",
                            nextSceneId: "scene-b",
                        }),
                    },
                    {
                        type: MovieSceneType.IMAGE,
                        data: MovieSceneImageService.new({
                            id: "scene-b",
                            resourceManifestEntryId: "img-2",
                            nextSceneId: "scene-a",
                        }),
                    },
                ],
            }

            const result = MovieService.validate(movie)

            expect(result.isValid).toBe(false)
            expect(result.errors).toContainEqual(
                expect.stringMatching(/cycle detected involving scenes:/)
            )
            expect(result.errors[0]).toContain("scene-a")
            expect(result.errors[0]).toContain("scene-b")
        })
    })

    describe("when a conversation scene has a decision cycle with one escape option", () => {
        it("returns isValid true with no errors", () => {
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
                                            decisionId: "loop",
                                            text: { "en-us": { text: "Stay" } },
                                            nextSceneId: "scene-a",
                                        },
                                        {
                                            decisionId: "exit",
                                            text: {
                                                "en-us": { text: "Leave" },
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

            expect(result.isValid).toBe(true)
            expect(result.errors).toHaveLength(0)
        })
    })

    describe("when a conversation scene has a decision cycle where all options loop back", () => {
        it("returns a cycle error", () => {
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
                                            decisionId: "option-b",
                                            text: {
                                                "en-us": { text: "Go back" },
                                            },
                                            nextSceneId: "scene-a",
                                        },
                                        {
                                            decisionId: "option-c",
                                            text: {
                                                "en-us": {
                                                    text: "Also go back",
                                                },
                                            },
                                            nextSceneId: "scene-a",
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
                expect.stringMatching(/cycle detected involving scenes:/)
            )
        })
    })

    describe("when a conversation scene has only one decision option and it loops back", () => {
        it("returns a cycle error", () => {
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
                                            decisionId: "option-b",
                                            text: {
                                                "en-us": { text: "Go back" },
                                            },
                                            nextSceneId: "scene-a",
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
                expect.stringMatching(/cycle detected involving scenes:/)
            )
        })
    })

    describe("when an inescapable cycle runs through a mix of conversation and image scenes", () => {
        it("returns a cycle error for the trapped scenes and ignores an escapable decision cycle", () => {
            // A: decision → B or C
            // B: nextSceneId → D (no decision lines, cannot escape)
            // D: image, nextSceneId → B (creates inescapable B↔D cycle)
            // C: nextSceneId → A (A↔C cycle is escapable because A can decide to go to B)
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
                                        "en-us": { text: "Choose your path" },
                                    },
                                    options: [
                                        {
                                            decisionId: "go-b",
                                            text: {
                                                "en-us": { text: "Go to B" },
                                            },
                                            nextSceneId: "scene-b",
                                        },
                                        {
                                            decisionId: "go-c",
                                            text: {
                                                "en-us": { text: "Go to C" },
                                            },
                                            nextSceneId: "scene-c",
                                        },
                                    ],
                                },
                            ],
                        }),
                    },
                    {
                        type: MovieSceneType.CONVERSATION,
                        data: MovieSceneConversationService.new({
                            id: "scene-b",
                            nextSceneId: "scene-d",
                            lines: [
                                {
                                    type: "DIALOG" as const,
                                    text: { "en-us": { text: "You are in B" } },
                                },
                            ],
                        }),
                    },
                    {
                        type: MovieSceneType.IMAGE,
                        data: MovieSceneImageService.new({
                            id: "scene-d",
                            resourceManifestEntryId: "img-d",
                            nextSceneId: "scene-b",
                        }),
                    },
                    {
                        type: MovieSceneType.CONVERSATION,
                        data: MovieSceneConversationService.new({
                            id: "scene-c",
                            nextSceneId: "scene-a",
                            lines: [
                                {
                                    type: "DIALOG" as const,
                                    text: { "en-us": { text: "You are in C" } },
                                },
                            ],
                        }),
                    },
                ],
            }

            const result = MovieService.validate(movie)

            expect(result.isValid).toBe(false)
            const cycleError = result.errors.find(
                (error) =>
                    error.includes("scene-b") && error.includes("scene-d")
            )
            expect(cycleError).toBeDefined()
            expect(cycleError).toMatch(/cycle detected involving scenes:/)
            expect(
                result.errors.every(
                    (error) =>
                        !error.includes("scene-a") || !error.includes("scene-c")
                )
            ).toBe(true)
        })
    })

    describe("when a DIALOG line has a speakerId with more than 5 words and no text", () => {
        it("returns a warning naming the scene and line index", () => {
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
                                    speakerId:
                                        "This is definitely more than five words",
                                    text: {},
                                },
                            ],
                        }),
                    },
                ],
            }

            const result = MovieService.validate(movie)

            expect(result.warnings).toHaveLength(1)
            expect(result.warnings[0]).toContain("scene-a")
            expect(result.warnings[0]).toContain("line 0")
        })
    })

    describe("when a DIALOG line has a speakerId with more than 5 words but also has text", () => {
        it("returns no warning", () => {
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
                                    speakerId:
                                        "This is definitely more than five words",
                                    text: { "en-us": { text: "Hello" } },
                                },
                            ],
                        }),
                    },
                ],
            }

            const result = MovieService.validate(movie)

            expect(result.warnings).toHaveLength(0)
        })
    })

    describe("when a DIALOG line has a short speakerId and no text", () => {
        it("returns no warning", () => {
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
                                    speakerId: "Lini",
                                    text: {},
                                },
                            ],
                        }),
                    },
                ],
            }

            const result = MovieService.validate(movie)

            expect(result.warnings).toHaveLength(0)
        })
    })

    describe("when a movie has both an unknown nextSceneId and a cycle", () => {
        it("returns both existence and cycle errors in the same call", () => {
            const movie = {
                id: "movie-1",
                firstSceneId: "scene-a",
                scenes: [
                    {
                        type: MovieSceneType.IMAGE,
                        data: MovieSceneImageService.new({
                            id: "scene-a",
                            resourceManifestEntryId: "img-1",
                            nextSceneId: "scene-b",
                        }),
                    },
                    {
                        type: MovieSceneType.IMAGE,
                        data: MovieSceneImageService.new({
                            id: "scene-b",
                            resourceManifestEntryId: "img-2",
                            nextSceneId: "scene-a",
                        }),
                    },
                    {
                        type: MovieSceneType.IMAGE,
                        data: MovieSceneImageService.new({
                            id: "scene-c",
                            resourceManifestEntryId: "img-3",
                            nextSceneId: "scene-ghost",
                        }),
                    },
                ],
            }

            const result = MovieService.validate(movie)

            expect(result.isValid).toBe(false)
            expect(result.errors).toContainEqual(
                expect.stringMatching(/cycle detected involving scenes:/)
            )
            expect(result.errors).toContain(
                "scene 'scene-c' references unknown nextSceneId 'scene-ghost'"
            )
        })
    })
})
