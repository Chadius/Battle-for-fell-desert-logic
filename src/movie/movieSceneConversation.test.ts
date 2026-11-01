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
                            id: "line-1",
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
                            id: "line-2",
                        },
                        {
                            type: "DIALOG",
                            id: "line-3",
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
                            id: "line-4",
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
                            id: "what-do-you-do",
                            options: [
                                {
                                    decisionId: "attack",
                                },
                                {
                                    decisionId: "flee",
                                },
                            ],
                        },
                        {
                            type: "DIALOG",
                            id: "line-6",
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
                        .lineId
                ).toBe("line-6")
                expect(result.state.recordedDecisions).toEqual([
                    {
                        sceneId: "scene-1",
                        lineId: "what-do-you-do",
                        decisionId: "attack",
                    },
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
                            id: "line-7",
                            options: [
                                {
                                    decisionId: "attack",
                                },
                            ],
                        },
                        {
                            type: "DIALOG",
                            id: "line-8",
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
                            id: "line-9",
                        },
                        {
                            type: "DIALOG",
                            id: "line-10",
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
                    MovieSceneConversationService.status(scene, next).lineId
                ).toBe("line-10")
            })
        })

        describe("when fast-forward is enabled and the current line is a DECISION line", () => {
            it("does not advance", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
                    lines: [
                        {
                            type: "DECISION",
                            id: "line-11",
                            options: [
                                {
                                    decisionId: "attack",
                                },
                            ],
                        },
                        {
                            type: "DIALOG",
                            id: "line-12",
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
                            id: "line-13",
                        },
                        {
                            type: "DIALOG",
                            id: "line-14",
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
                            id: "line-15",
                        },
                        {
                            type: "DECISION",
                            id: "line-16",
                            options: [
                                {
                                    decisionId: "attack",
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
                            id: "line-17",
                        },
                        {
                            type: "DIALOG",
                            id: "line-18",
                        },
                        {
                            type: "DIALOG",
                            id: "line-19",
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
                    ).lineId
                ).toBe("line-19")
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
                            id: "line-20",
                            options: [
                                {
                                    decisionId: "attack",
                                },
                            ],
                        },
                        {
                            type: "DIALOG",
                            id: "line-21",
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
        describe("when the current line is a DIALOG line", () => {
            it("reports only where the conversation is", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
                    lines: [{ type: "DIALOG", id: "greeting" }],
                })

                const status = MovieSceneConversationService.status(
                    scene,
                    MovieSceneConversationService.initialState(scene)
                )

                expect(status).toEqual({
                    type: "CONVERSATION",
                    sceneId: "scene-1",
                    lineId: "greeting",
                    isWaitingForDecision: false,
                    decisions: [],
                })
            })
        })

        describe("when the current line is a DECISION line", () => {
            it("lists the options by decisionId", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
                    lines: [
                        {
                            type: "DECISION",
                            id: "which-way",
                            options: [
                                { decisionId: "left", nextSceneId: "scene-2" },
                                { decisionId: "right" },
                            ],
                        },
                    ],
                })

                const status = MovieSceneConversationService.status(
                    scene,
                    MovieSceneConversationService.initialState(scene)
                )

                expect(status.decisions).toEqual([
                    { decisionId: "left" },
                    { decisionId: "right" },
                ])
            })

            it("reports isWaitingForDecision as true", () => {
                const scene = MovieSceneConversationService.new({
                    id: "scene-1",
                    lines: [
                        {
                            type: "DECISION",
                            id: "line-31",
                            options: [
                                {
                                    decisionId: "attack",
                                },
                                {
                                    decisionId: "flee",
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
