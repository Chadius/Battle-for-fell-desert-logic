import { describe, expect, it } from "vitest"
import { MovieSceneImageService } from "./movieSceneImage.js"
import { MovieSceneConversationService } from "./movieSceneConversation.js"
import type { Movie } from "./movie.js"
import { MovieEngine, MovieEngineCommand } from "./movieEngine.js"
import { MovieSceneType } from "./movieScene.js"

const makeScene = (id: string) =>
    MovieSceneImageService.new({ id, resourceManifestEntryId: "someImage" })

const makeMovie = (...sceneIds: string[]): Movie => ({
    id: "movie-1",
    firstSceneId: sceneIds[0],
    scenes: sceneIds.map((id) => ({
        type: MovieSceneType.IMAGE,
        data: makeScene(id),
    })),
})

describe("MovieEngine", () => {
    describe("getStatus", () => {
        describe("when a movie is playing", () => {
            it("returns state PLAYING", () => {
                const engine = new MovieEngine(makeMovie("scene-1"), [])

                expect(engine.status().state).toBe("PLAYING")
            })
        })

        describe("when a movie has just started", () => {
            it("isFastForward is false", () => {
                const engine = new MovieEngine(makeMovie("scene-1"), [])

                expect(engine.status().isFastForward).toBe(false)
            })
        })

        describe("when an image-only movie is playing", () => {
            it("canSkip is true", () => {
                const engine = new MovieEngine(makeMovie("scene-1"), [])

                expect(engine.status().canSkip).toBe(true)
            })
        })

        describe("when a scene is in DISPLAY phase", () => {
            it("returns the full ImageSceneStatus snapshot", () => {
                const scene = MovieSceneImageService.new({
                    id: "scene-1",
                    resourceManifestEntryId: "someImage",
                    caption: "A caption",
                })
                const movie: Movie = {
                    id: "movie-1",
                    firstSceneId: "scene-1",
                    scenes: [{ type: MovieSceneType.IMAGE, data: scene }],
                }
                const engine = new MovieEngine(movie, [])

                const status = engine.status()

                expect(status.currentScene).toEqual({
                    type: MovieSceneType.IMAGE,
                    sceneId: "scene-1",
                    phase: "DISPLAY",
                    resourceManifestEntryId: "someImage",
                    description: undefined,
                    caption: "A caption",
                    transitionProgress: 0,
                    autoScrollProgress: { x: 0, y: 0 },
                    manualScrollOffset: { x: 0, y: 0 },
                })
            })
        })
    })

    describe("getResult", () => {
        describe("while the movie is playing", () => {
            it("returns undefined", () => {
                const engine = new MovieEngine(makeMovie("scene-1"), [])

                expect(engine.result()).toBeUndefined()
            })
        })

        describe("after a conversation scene with a DECISION completes", () => {
            it("returns all recorded DecisionRecords in decisions", () => {
                const scene = MovieSceneConversationService.new({
                    id: "conv-1",
                    lines: [
                        {
                            type: "DECISION",
                            prompt: { "en-us": { text: "What do you do?" } },
                            options: [
                                {
                                    decisionId: "attack",
                                    text: { "en-us": { text: "Attack" } },
                                },
                            ],
                        },
                    ],
                })
                const movie: Movie = {
                    id: "movie-1",
                    firstSceneId: "conv-1",
                    scenes: [
                        { type: MovieSceneType.CONVERSATION, data: scene },
                    ],
                }
                const engine = new MovieEngine(movie, [])

                engine.selectDecision("attack")
                engine.tick(1)

                expect(engine.result()).toEqual({
                    state: "DONE",
                    decisions: [
                        {
                            sceneId: "conv-1",
                            lineIndex: 0,
                            decisionId: "attack",
                        },
                    ],
                })
            })
        })

        describe("after STOP is sent", () => {
            it("returns a MovieResult with state STOPPED and empty decisions", () => {
                const engine = new MovieEngine(makeMovie("scene-1"), [])

                engine.processCommand(MovieEngineCommand.STOP)

                expect(engine.result()).toEqual({
                    state: "STOPPED",
                    decisions: [],
                })
            })
        })
    })

    describe("tick", () => {
        describe("when the first scene of a two-scene movie completes", () => {
            it("advances to the second scene", () => {
                const engine = new MovieEngine(
                    makeMovie("scene-1", "scene-2"),
                    []
                )

                engine.processCommand(MovieEngineCommand.CONFIRM)
                engine.tick(1)

                expect(engine.status().currentScene?.sceneId).toBe("scene-2")
            })
        })

        describe("when all scenes in the movie complete", () => {
            it("sets state to DONE", () => {
                const engine = new MovieEngine(makeMovie("scene-1"), [])

                engine.processCommand(MovieEngineCommand.CONFIRM)
                engine.tick(1)

                expect(engine.status().state).toBe("DONE")
            })
        })
    })

    describe("canSkip", () => {
        describe("when a conversation scene has an unresolved DECISION line", () => {
            it("is false", () => {
                const scene = MovieSceneConversationService.new({
                    id: "conv-1",
                    lines: [
                        {
                            type: "DECISION",
                            prompt: { "en-us": { text: "What do you do?" } },
                            options: [
                                {
                                    decisionId: "attack",
                                    text: { "en-us": { text: "Attack" } },
                                },
                            ],
                        },
                    ],
                })
                const movie: Movie = {
                    id: "movie-1",
                    firstSceneId: "conv-1",
                    scenes: [
                        { type: MovieSceneType.CONVERSATION, data: scene },
                    ],
                }
                const engine = new MovieEngine(movie, [])

                expect(engine.status().canSkip).toBe(false)
            })
        })
    })

    describe("selectDecision", () => {
        describe("when a valid decisionId is submitted while a conversation scene is at a DECISION line", () => {
            it("advances to the next line and returns isValid true", () => {
                const scene = MovieSceneConversationService.new({
                    id: "conv-1",
                    lines: [
                        {
                            type: "DECISION",
                            prompt: { "en-us": { text: "What do you do?" } },
                            options: [
                                {
                                    decisionId: "attack",
                                    text: { "en-us": { text: "Attack" } },
                                },
                            ],
                        },
                        {
                            type: "DIALOG",
                            text: { "en-us": { text: "You attacked!" } },
                        },
                    ],
                })
                const movie: Movie = {
                    id: "movie-1",
                    firstSceneId: "conv-1",
                    scenes: [
                        { type: MovieSceneType.CONVERSATION, data: scene },
                    ],
                }
                const engine = new MovieEngine(movie, [])

                const result = engine.selectDecision("attack")

                expect(result.isValid).toBe(true)
                expect(engine.status().currentScene).toMatchObject({
                    type: MovieSceneType.CONVERSATION,
                    text: "You attacked!",
                })
            })
        })
    })

    describe("when the current scene is a conversation scene", () => {
        it("returns a ConversationSceneStatus", () => {
            const scene = MovieSceneConversationService.new({
                id: "conv-1",
                lines: [
                    {
                        type: "DIALOG",
                        speakerId: "lini",
                        text: { "en-us": { text: "Hello" } },
                    },
                ],
            })
            const movie: Movie = {
                id: "movie-1",
                firstSceneId: "conv-1",
                scenes: [{ type: MovieSceneType.CONVERSATION, data: scene }],
            }
            const engine = new MovieEngine(movie, [])

            const status = engine.status()

            expect(status.currentScene).toEqual({
                type: MovieSceneType.CONVERSATION,
                sceneId: "conv-1",
                speakerId: "lini",
                text: "Hello",
                portrait: undefined,
                dialogPosition: "LEFT",
                isWaitingForDecision: false,
                decisions: [],
            })
        })
    })

    describe("branching", () => {
        describe("when a decision with a nextSceneId is selected and the scene completes", () => {
            it("advances to the scene named by the decision, not the sequential next", () => {
                const convScene = MovieSceneConversationService.new({
                    id: "intro",
                    lines: [
                        {
                            type: "DECISION" as const,
                            prompt: { "en-us": { text: "Which path?" } },
                            options: [
                                {
                                    decisionId: "go-right",
                                    text: { "en-us": { text: "Right" } },
                                    nextSceneId: "scene-right",
                                },
                            ],
                        },
                    ],
                })
                const movie: Movie = {
                    id: "movie-1",
                    firstSceneId: "intro",
                    scenes: [
                        { type: MovieSceneType.CONVERSATION, data: convScene },
                        {
                            type: MovieSceneType.IMAGE,
                            data: MovieSceneImageService.new({
                                id: "scene-left",
                                resourceManifestEntryId: "img-left",
                            }),
                        },
                        {
                            type: MovieSceneType.IMAGE,
                            data: MovieSceneImageService.new({
                                id: "scene-right",
                                resourceManifestEntryId: "img-right",
                            }),
                        },
                    ],
                }
                const engine = new MovieEngine(movie, [])

                engine.selectDecision("go-right")
                engine.tick(1)

                expect(engine.status().currentScene?.sceneId).toBe(
                    "scene-right"
                )
            })
        })

        describe("when a branch scene completes without its own nextSceneId", () => {
            const decisionScene = MovieSceneConversationService.new({
                id: "scene-decision",
                lines: [
                    {
                        type: "DECISION" as const,
                        prompt: { "en-us": { text: "Where to?" } },
                        options: [
                            {
                                decisionId: "go-to-gloria",
                                text: { "en-us": { text: "Meet Gloria" } },
                                nextSceneId: "scene-gloria",
                            },
                            {
                                decisionId: "go-to-monastery",
                                text: { "en-us": { text: "Go to monastery" } },
                                nextSceneId: "scene-monastery",
                            },
                        ],
                    },
                ],
            })
            const gloriaScene = MovieSceneConversationService.new({
                id: "scene-gloria",
                lines: [
                    {
                        type: "DIALOG" as const,
                        text: { "en-us": { text: "Gloria: Hello!" } },
                    },
                ],
            })
            const monasteryScene = MovieSceneConversationService.new({
                id: "scene-monastery",
                lines: [
                    {
                        type: "DIALOG" as const,
                        text: { "en-us": { text: "Vale: Welcome!" } },
                    },
                ],
            })
            const epilogueScene = MovieSceneConversationService.new({
                id: "scene-epilogue",
                lines: [
                    {
                        type: "DIALOG" as const,
                        text: {
                            "en-us": { text: "The adventure continues..." },
                        },
                    },
                ],
            })
            const movie: Movie = {
                id: "movie-branch-test",
                firstSceneId: "scene-decision",
                scenes: [
                    { type: MovieSceneType.CONVERSATION, data: decisionScene },
                    { type: MovieSceneType.CONVERSATION, data: gloriaScene },
                    { type: MovieSceneType.CONVERSATION, data: monasteryScene },
                    { type: MovieSceneType.CONVERSATION, data: epilogueScene },
                ],
            }
            describe("when the first branch is chosen", () => {
                it("advances to the scene after all branch scenes", () => {
                    const engine = new MovieEngine(movie, [])

                    engine.selectDecision("go-to-gloria")
                    engine.processCommand(MovieEngineCommand.CONFIRM)

                    expect(engine.status().currentScene?.sceneId).toBe(
                        "scene-epilogue"
                    )
                })
            })

            describe("when the second branch is chosen", () => {
                it("advances to the scene after all branch scenes", () => {
                    const engine = new MovieEngine(movie, [])

                    engine.selectDecision("go-to-monastery")
                    engine.processCommand(MovieEngineCommand.CONFIRM)

                    expect(engine.status().currentScene?.sceneId).toBe(
                        "scene-epilogue"
                    )
                })
            })
        })
    })

    describe("when a scene has a scene-level nextSceneId", () => {
        it("advances to the named scene instead of the sequential next", () => {
            const movie: Movie = {
                id: "movie-1",
                firstSceneId: "scene-a",
                scenes: [
                    {
                        type: MovieSceneType.IMAGE,
                        data: MovieSceneImageService.new({
                            id: "scene-a",
                            resourceManifestEntryId: "img-1",
                            nextSceneId: "scene-c",
                        }),
                    },
                    {
                        type: MovieSceneType.IMAGE,
                        data: MovieSceneImageService.new({
                            id: "scene-b",
                            resourceManifestEntryId: "img-2",
                        }),
                    },
                    {
                        type: MovieSceneType.IMAGE,
                        data: MovieSceneImageService.new({
                            id: "scene-c",
                            resourceManifestEntryId: "img-3",
                        }),
                    },
                ],
            }
            const engine = new MovieEngine(movie, [])

            engine.processCommand(MovieEngineCommand.CONFIRM)
            engine.tick(1)

            expect(engine.status().currentScene?.sceneId).toBe("scene-c")
        })
    })

    describe("fastForward", () => {
        describe("when FAST_FORWARD is sent during INTRO_TRANSITION", () => {
            it("sets isFastForward to true but does not skip the intro", () => {
                const sceneWithIntro = MovieSceneImageService.new({
                    id: "scene-1",
                    resourceManifestEntryId: "img",
                    introTransition: { durationMs: 1000 },
                })
                const movie: Movie = {
                    id: "movie-1",
                    firstSceneId: "scene-1",
                    scenes: [
                        { type: MovieSceneType.IMAGE, data: sceneWithIntro },
                    ],
                }
                const engine = new MovieEngine(movie, [])

                engine.processCommand(MovieEngineCommand.FAST_FORWARD)

                const status = engine.status()
                expect(status.isFastForward).toBe(true)
                expect(status.currentScene?.sceneId).toBe("scene-1")
                if (status.currentScene?.type !== MovieSceneType.IMAGE)
                    throw new Error("expected IMAGE scene to check phase")
                expect(status.currentScene.phase).toBe("INTRO_TRANSITION")
            })
        })

        describe("when FAST_FORWARD is sent during DISPLAY", () => {
            it("completes the scene immediately", () => {
                const engine = new MovieEngine(
                    makeMovie("scene-1", "scene-2"),
                    []
                )

                engine.processCommand(MovieEngineCommand.FAST_FORWARD)

                expect(engine.status().currentScene?.sceneId).toBe("scene-2")
            })
        })

        describe("when FAST_FORWARD is active and a new scene starts", () => {
            it("isFastForward remains true on the next scene", () => {
                const engine = new MovieEngine(
                    makeMovie("scene-1", "scene-2"),
                    []
                )

                engine.processCommand(MovieEngineCommand.FAST_FORWARD)

                expect(engine.status().isFastForward).toBe(true)
            })
        })
    })

    describe("skip", () => {
        describe("when all scenes are image scenes", () => {
            it("stops the movie immediately with state STOPPED", () => {
                const engine = new MovieEngine(
                    makeMovie("scene-1", "scene-2"),
                    []
                )

                engine.processCommand(MovieEngineCommand.SKIP)

                expect(engine.status().state).toBe("STOPPED")
            })
        })

        describe("when a conversation scene has only DIALOG lines", () => {
            it("stops the movie immediately with state STOPPED", () => {
                const scene = MovieSceneConversationService.new({
                    id: "conv-1",
                    lines: [
                        {
                            type: "DIALOG",
                            text: { "en-us": { text: "Hello" } },
                        },
                    ],
                })
                const movie: Movie = {
                    id: "movie-1",
                    firstSceneId: "conv-1",
                    scenes: [
                        { type: MovieSceneType.CONVERSATION, data: scene },
                    ],
                }
                const engine = new MovieEngine(movie, [])

                engine.processCommand(MovieEngineCommand.SKIP)

                expect(engine.status().state).toBe("STOPPED")
            })
        })

        describe("when a conversation scene has a DECISION line", () => {
            it("fast-forwards through DIALOG lines and pauses at the DECISION", () => {
                const scene = MovieSceneConversationService.new({
                    id: "conv-1",
                    lines: [
                        {
                            type: "DIALOG",
                            text: { "en-us": { text: "Preamble" } },
                        },
                        {
                            type: "DECISION",
                            prompt: { "en-us": { text: "Choose" } },
                            options: [
                                {
                                    decisionId: "yes",
                                    text: { "en-us": { text: "Yes" } },
                                },
                            ],
                        },
                    ],
                })
                const movie: Movie = {
                    id: "movie-1",
                    firstSceneId: "conv-1",
                    scenes: [
                        { type: MovieSceneType.CONVERSATION, data: scene },
                    ],
                }
                const engine = new MovieEngine(movie, [])

                engine.processCommand(MovieEngineCommand.SKIP)
                engine.tick(1)

                const status = engine.status()
                expect(status.state).toBe("PLAYING")
                expect(status.isFastForward).toBe(false)
                if (status.currentScene?.type !== MovieSceneType.CONVERSATION)
                    throw new Error("expected CONVERSATION scene")
                expect(status.currentScene.isWaitingForDecision).toBe(true)
            })
        })

        describe("when skip pauses at a DECISION and the player resolves it", () => {
            it("stops the movie after the decision is made", () => {
                const scene = MovieSceneConversationService.new({
                    id: "conv-1",
                    lines: [
                        {
                            type: "DIALOG",
                            text: { "en-us": { text: "Preamble" } },
                        },
                        {
                            type: "DECISION",
                            prompt: { "en-us": { text: "Choose" } },
                            options: [
                                {
                                    decisionId: "yes",
                                    text: { "en-us": { text: "Yes" } },
                                },
                            ],
                        },
                    ],
                })
                const movie: Movie = {
                    id: "movie-1",
                    firstSceneId: "conv-1",
                    scenes: [
                        { type: MovieSceneType.CONVERSATION, data: scene },
                    ],
                }
                const engine = new MovieEngine(movie, [])

                engine.processCommand(MovieEngineCommand.SKIP)
                engine.tick(1)
                engine.selectDecision("yes")

                expect(engine.status().state).toBe("STOPPED")
            })
        })

        describe("when the blocking DECISION is the first line of the scene", () => {
            it("immediately pauses at the DECISION without enabling fast-forward", () => {
                const scene = MovieSceneConversationService.new({
                    id: "conv-1",
                    lines: [
                        {
                            type: "DECISION",
                            prompt: { "en-us": { text: "Choose" } },
                            options: [
                                {
                                    decisionId: "yes",
                                    text: { "en-us": { text: "Yes" } },
                                },
                            ],
                        },
                    ],
                })
                const movie: Movie = {
                    id: "movie-1",
                    firstSceneId: "conv-1",
                    scenes: [
                        { type: MovieSceneType.CONVERSATION, data: scene },
                    ],
                }
                const engine = new MovieEngine(movie, [])

                engine.processCommand(MovieEngineCommand.SKIP)

                const status = engine.status()
                expect(status.isFastForward).toBe(false)
                if (status.currentScene?.type !== MovieSceneType.CONVERSATION)
                    throw new Error("expected CONVERSATION scene")
                expect(status.currentScene.isWaitingForDecision).toBe(true)
            })
        })
    })

    describe("processCommand", () => {
        describe("when STOP is sent", () => {
            it("sets state to STOPPED immediately", () => {
                const engine = new MovieEngine(makeMovie("scene-1"), [])

                engine.processCommand(MovieEngineCommand.STOP)

                expect(engine.status().state).toBe("STOPPED")
            })
        })

        describe("when COMPLETE_SCENE is sent during DISPLAY", () => {
            it("advances the engine to the next scene immediately", () => {
                const engine = new MovieEngine(
                    makeMovie("scene-1", "scene-2"),
                    []
                )

                engine.processCommand(MovieEngineCommand.COMPLETE_SCENE)

                expect(engine.status().currentScene?.sceneId).toBe("scene-2")
            })
        })

        describe("when COMPLETE_SCENE is sent during INTRO_TRANSITION", () => {
            it("does not advance to the next scene", () => {
                const sceneWithIntro = MovieSceneImageService.new({
                    id: "scene-1",
                    resourceManifestEntryId: "someImage",
                    introTransition: { durationMs: 1000 },
                })
                const movie: Movie = {
                    id: "movie-1",
                    firstSceneId: "scene-1",
                    scenes: [
                        { type: MovieSceneType.IMAGE, data: sceneWithIntro },
                        {
                            type: MovieSceneType.IMAGE,
                            data: makeScene("scene-2"),
                        },
                    ],
                }
                const engine = new MovieEngine(movie, [])

                engine.processCommand(MovieEngineCommand.COMPLETE_SCENE)

                expect(engine.status().currentScene?.sceneId).toBe("scene-1")
            })
        })
    })
})
