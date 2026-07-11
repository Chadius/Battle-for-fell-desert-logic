import { describe, expect, it } from "vitest"
import {
    MovieSceneConversationCommand,
    MovieSceneConversationService,
} from "./movieSceneConversation.js"

describe("MovieSceneConversationService", () => {
    describe("isComplete", () => {
        describe("when the conversation has one DIALOG line and no CONFIRM has been sent", () => {
            it("returns false", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
                    lines: [
                        {
                            type: "DIALOG",
                            text: { "en-us": { text: "Hello" } },
                        },
                    ],
                })
                const state = MovieSceneConversationService.initialState(scene)

                expect(MovieSceneConversationService.isComplete(state)).toBe(
                    false
                )
            })
        })

        describe("when the conversation has two DIALOG lines and one CONFIRM has been sent", () => {
            it("returns false", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
                    lines: [
                        {
                            type: "DIALOG",
                            text: { "en-us": { text: "Hello" } },
                        },
                        {
                            type: "DIALOG",
                            text: { "en-us": { text: "Goodbye" } },
                        },
                    ],
                })
                const state = MovieSceneConversationService.initialState(scene)

                const next = MovieSceneConversationService.stateAfterCommand(
                    scene,
                    state,
                    MovieSceneConversationCommand.CONFIRM
                )

                expect(MovieSceneConversationService.isComplete(next)).toBe(
                    false
                )
            })
        })

        describe("when the conversation has one DIALOG line and CONFIRM has been sent", () => {
            it("returns true", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
                    lines: [
                        {
                            type: "DIALOG",
                            text: { "en-us": { text: "Hello" } },
                        },
                    ],
                })
                const state = MovieSceneConversationService.initialState(scene)

                const next = MovieSceneConversationService.stateAfterCommand(
                    scene,
                    state,
                    MovieSceneConversationCommand.CONFIRM
                )

                expect(MovieSceneConversationService.isComplete(next)).toBe(
                    true
                )
            })
        })
    })

    describe("selectDecision", () => {
        describe("when a valid decisionId is submitted on a DECISION line", () => {
            it("records a DecisionRecord and advances to the next line", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
                    lines: [
                        {
                            type: "DECISION",
                            prompt: { "en-us": { text: "What do you do?" } },
                            options: [
                                {
                                    decisionId: "attack",
                                    text: { "en-us": { text: "Attack" } },
                                },
                                {
                                    decisionId: "flee",
                                    text: { "en-us": { text: "Flee" } },
                                },
                            ],
                        },
                        {
                            type: "DIALOG",
                            text: { "en-us": { text: "You attacked!" } },
                        },
                    ],
                })
                const state = MovieSceneConversationService.initialState(scene)

                const result = MovieSceneConversationService.selectDecision(
                    scene,
                    state,
                    "attack"
                )

                expect(result.isValid).toBe(true)
                if (!result.isValid)
                    throw new Error("result must be valid to continue")

                expect(
                    MovieSceneConversationService.status(scene, result.state)
                        .text
                ).toBe("You attacked!")
                expect(result.state.recordedDecisions).toEqual([
                    { sceneId: "scene-1", lineIndex: 0, decisionId: "attack" },
                ])
            })
        })

        describe("when an unknown decisionId is submitted on a DECISION line", () => {
            it("returns isValid false and does not advance", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
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
                const state = MovieSceneConversationService.initialState(scene)

                const result = MovieSceneConversationService.selectDecision(
                    scene,
                    state,
                    "unknown-id"
                )

                expect(result.isValid).toBe(false)
            })
        })
    })

    describe("tick", () => {
        describe("when fast-forward is enabled and the current line is a DIALOG line", () => {
            it("advances to the next line", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
                    lines: [
                        {
                            type: "DIALOG",
                            text: { "en-us": { text: "Hello" } },
                        },
                        {
                            type: "DIALOG",
                            text: { "en-us": { text: "Goodbye" } },
                        },
                    ],
                })
                const state = MovieSceneConversationService.initialState(scene)
                const ffState = { ...state, isFastForward: true }

                const next = MovieSceneConversationService.tick(
                    scene,
                    ffState,
                    1
                )

                expect(
                    MovieSceneConversationService.status(scene, next).text
                ).toBe("Goodbye")
            })
        })

        describe("when fast-forward is enabled and the current line is a DECISION line", () => {
            it("does not advance", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
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
                const state = MovieSceneConversationService.initialState(scene)
                const ffState = { ...state, isFastForward: true }

                const next = MovieSceneConversationService.tick(
                    scene,
                    ffState,
                    1
                )

                expect(
                    MovieSceneConversationService.status(scene, next)
                        .isWaitingForDecision
                ).toBe(true)
            })
        })
    })

    describe("canSkip", () => {
        describe("when all remaining lines are DIALOG lines", () => {
            it("returns true", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
                    lines: [
                        {
                            type: "DIALOG",
                            text: { "en-us": { text: "Hello" } },
                        },
                        {
                            type: "DIALOG",
                            text: { "en-us": { text: "Goodbye" } },
                        },
                    ],
                })
                const state = MovieSceneConversationService.initialState(scene)

                expect(
                    MovieSceneConversationService.canSkip(scene, state)
                ).toBe(true)
            })
        })

        describe("when a DECISION line remains", () => {
            it("returns false", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
                    lines: [
                        {
                            type: "DIALOG",
                            text: { "en-us": { text: "Hello" } },
                        },
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
                const state = MovieSceneConversationService.initialState(scene)

                expect(
                    MovieSceneConversationService.canSkip(scene, state)
                ).toBe(false)
            })
        })
    })

    describe("processCommand", () => {
        describe("when COMPLETE_SCENE is sent on a multi-DIALOG scene", () => {
            it("jumps to the last line but does not complete until CONFIRM is sent", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
                    lines: [
                        {
                            type: "DIALOG",
                            text: { "en-us": { text: "Line 1" } },
                        },
                        {
                            type: "DIALOG",
                            text: { "en-us": { text: "Line 2" } },
                        },
                        {
                            type: "DIALOG",
                            text: { "en-us": { text: "Line 3" } },
                        },
                    ],
                })
                const state = MovieSceneConversationService.initialState(scene)

                const afterCompleteScene =
                    MovieSceneConversationService.stateAfterCommand(
                        scene,
                        state,
                        MovieSceneConversationCommand.COMPLETE_SCENE
                    )
                const afterConfirm =
                    MovieSceneConversationService.stateAfterCommand(
                        scene,
                        afterCompleteScene,
                        MovieSceneConversationCommand.CONFIRM
                    )

                expect(
                    MovieSceneConversationService.status(
                        scene,
                        afterCompleteScene
                    ).text
                ).toBe("Line 3")
                expect(
                    MovieSceneConversationService.isComplete(afterCompleteScene)
                ).toBe(false)
                expect(
                    MovieSceneConversationService.isComplete(afterConfirm)
                ).toBe(true)
            })
        })

        describe("when the current line is a DECISION line and CONFIRM is sent", () => {
            it("does not advance to the next line", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
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
                const state = MovieSceneConversationService.initialState(scene)

                const next = MovieSceneConversationService.stateAfterCommand(
                    scene,
                    state,
                    MovieSceneConversationCommand.CONFIRM
                )

                expect(
                    MovieSceneConversationService.status(scene, next)
                        .isWaitingForDecision
                ).toBe(true)
            })
        })
    })

    describe("getStatus", () => {
        describe("when the current line is a DIALOG line with a speakerId", () => {
            it("reports that speakerId", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
                    lines: [
                        {
                            type: "DIALOG",
                            speakerId: "lini",
                            text: { "en-us": { text: "Hello" } },
                        },
                    ],
                })
                const state = MovieSceneConversationService.initialState(scene)

                const status = MovieSceneConversationService.status(
                    scene,
                    state
                )

                expect(status.speakerId).toBe("lini")
            })
        })

        describe("when the current line is a DIALOG line with no speakerId", () => {
            it("reports speakerId as undefined", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
                    lines: [
                        {
                            type: "DIALOG",
                            text: { "en-us": { text: "Narration text" } },
                        },
                    ],
                })
                const state = MovieSceneConversationService.initialState(scene)

                const status = MovieSceneConversationService.status(
                    scene,
                    state
                )

                expect(status.speakerId).toBeUndefined()
            })
        })

        describe("when the current line is a DIALOG line with no dialogPosition", () => {
            it("reports dialogPosition as LEFT", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
                    lines: [
                        {
                            type: "DIALOG",
                            text: { "en-us": { text: "Hello" } },
                        },
                    ],
                })
                const state = MovieSceneConversationService.initialState(scene)

                const status = MovieSceneConversationService.status(
                    scene,
                    state
                )

                expect(status.dialogPosition).toBe("LEFT")
            })
        })

        describe("when the current line is a DIALOG line with a portrait", () => {
            it("reports the portrait resourceManifestEntryId and position", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
                    lines: [
                        {
                            type: "DIALOG",
                            text: { "en-us": { text: "Hello" } },
                            portrait: {
                                resourceManifestEntryId: "lini-portrait",
                                position: "LEFT",
                            },
                        },
                    ],
                })
                const state = MovieSceneConversationService.initialState(scene)

                const status = MovieSceneConversationService.status(
                    scene,
                    state
                )

                expect(status.portrait).toEqual({
                    resourceManifestEntryId: "lini-portrait",
                    position: "LEFT",
                })
            })
        })

        describe("when the current line is a DIALOG line with no portrait", () => {
            it("reports portrait as undefined", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
                    lines: [
                        {
                            type: "DIALOG",
                            text: { "en-us": { text: "Hello" } },
                        },
                    ],
                })
                const state = MovieSceneConversationService.initialState(scene)

                const status = MovieSceneConversationService.status(
                    scene,
                    state
                )

                expect(status.portrait).toBeUndefined()
            })
        })

        describe("when the current line is a DIALOG line and the requested language exists", () => {
            it("returns the text for the requested language", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
                    lines: [
                        {
                            type: "DIALOG",
                            text: {
                                "en-us": { text: "Hello" },
                                "fr-fr": { text: "Bonjour" },
                            },
                        },
                    ],
                })
                const state = MovieSceneConversationService.initialState(scene)

                const status = MovieSceneConversationService.status(
                    scene,
                    state,
                    "fr-fr"
                )

                expect(status.text).toBe("Bonjour")
            })
        })

        describe("when the current line is a DIALOG line, the requested language is absent, and en-us exists", () => {
            it("returns the en-us text prefixed with the missing language code", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
                    lines: [
                        {
                            type: "DIALOG",
                            text: { "en-us": { text: "Hello" } },
                        },
                    ],
                })
                const state = MovieSceneConversationService.initialState(scene)

                const status = MovieSceneConversationService.status(
                    scene,
                    state,
                    "fr-fr"
                )

                expect(status.text).toBe("fr-fr MISSING: Hello")
            })
        })

        describe("when the current line is a DIALOG line and neither the requested language nor en-us exists", () => {
            it("returns just the missing language code prefix", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
                    lines: [
                        {
                            type: "DIALOG",
                            text: { "de-de": { text: "Hallo" } },
                        },
                    ],
                })
                const state = MovieSceneConversationService.initialState(scene)

                const status = MovieSceneConversationService.status(
                    scene,
                    state,
                    "fr-fr"
                )

                expect(status.text).toBe("fr-fr MISSING:")
            })
        })

        describe("when the current line is a DECISION line", () => {
            it("reports isWaitingForDecision as true", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
                    lines: [
                        {
                            type: "DECISION",
                            prompt: { "en-us": { text: "What do you do?" } },
                            options: [
                                {
                                    decisionId: "attack",
                                    text: { "en-us": { text: "Attack" } },
                                },
                                {
                                    decisionId: "flee",
                                    text: { "en-us": { text: "Flee" } },
                                },
                            ],
                        },
                    ],
                })
                const state = MovieSceneConversationService.initialState(scene)

                const status = MovieSceneConversationService.status(
                    scene,
                    state
                )

                expect(status.isWaitingForDecision).toBe(true)
            })
        })
    })
})
