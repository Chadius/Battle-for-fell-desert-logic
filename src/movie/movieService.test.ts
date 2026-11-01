import { describe, expect, it } from "vitest"
import { MovieService } from "./movie.js"
import { MovieSceneImageService } from "./movieSceneImage.js"
import { MovieSceneConversationService } from "./movieSceneConversation.js"
import { MovieSceneType } from "./movieScene.js"

describe("MovieService.validate", () => {
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
                        }),
                    },
                    {
                        type: MovieSceneType.IMAGE,
                        data: MovieSceneImageService.new({
                            id: "scene-b",
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
                                    id: "line-1",
                                    options: [
                                        {
                                            decisionId: "attack",
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
                                    id: "line-2",
                                    options: [
                                        {
                                            decisionId: "attack",
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
                            nextSceneId: "scene-b",
                        }),
                    },
                    {
                        type: MovieSceneType.IMAGE,
                        data: MovieSceneImageService.new({
                            id: "scene-b",
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
                                    id: "line-3",
                                    options: [
                                        {
                                            decisionId: "loop",
                                            nextSceneId: "scene-a",
                                        },
                                        {
                                            decisionId: "exit",
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
                                    id: "line-4",
                                    options: [
                                        {
                                            decisionId: "option-b",
                                            nextSceneId: "scene-a",
                                        },
                                        {
                                            decisionId: "option-c",
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
                                    id: "line-5",
                                    options: [
                                        {
                                            decisionId: "option-b",
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
                                    id: "line-6",
                                    options: [
                                        {
                                            decisionId: "go-b",
                                            nextSceneId: "scene-b",
                                        },
                                        {
                                            decisionId: "go-c",
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
                                    id: "line-7",
                                },
                            ],
                        }),
                    },
                    {
                        type: MovieSceneType.IMAGE,
                        data: MovieSceneImageService.new({
                            id: "scene-d",
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
                                    id: "line-8",
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
                            nextSceneId: "scene-b",
                        }),
                    },
                    {
                        type: MovieSceneType.IMAGE,
                        data: MovieSceneImageService.new({
                            id: "scene-b",
                            nextSceneId: "scene-a",
                        }),
                    },
                    {
                        type: MovieSceneType.IMAGE,
                        data: MovieSceneImageService.new({
                            id: "scene-c",
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
