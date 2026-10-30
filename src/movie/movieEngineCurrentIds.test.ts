import { describe, expect, it } from "vitest"
import type { Movie } from "./movie.js"
import { MovieEngine, MovieEngineCommand } from "./movieEngine.js"
import { MovieSceneType } from "./movieScene.js"
import { MovieSceneConversationService } from "./movieSceneConversation.js"

const makeMovie = (): Movie => ({
    id: "the-briefing",
    firstSceneId: "intro",
    scenes: [
        {
            type: MovieSceneType.CONVERSATION,
            data: MovieSceneConversationService.new({
                id: "intro",
                lines: [
                    {
                        type: "DIALOG",
                        id: "greeting",
                        text: { "en-US": { text: "Hello" } },
                    },
                    {
                        type: "DECISION",
                        id: "choose-a-path",
                        prompt: { "en-US": { text: "Which way?" } },
                        options: [
                            {
                                decisionId: "go-left",
                                text: { "en-US": { text: "Left" } },
                            },
                        ],
                    },
                ],
            }),
        },
    ],
})

const currentConversationScene = (engine: MovieEngine) => {
    const { currentScene } = engine.status()
    if (currentScene?.type !== MovieSceneType.CONVERSATION)
        throw new Error("expected a conversation scene")
    return currentScene
}

describe("MovieEngine current ids", () => {
    describe("while a movie plays", () => {
        it("reports the movie's id", () => {
            const engine = new MovieEngine(makeMovie(), [])

            expect(engine.status().movieId).toBe("the-briefing")
        })
    })

    describe("when the current line is a DIALOG line", () => {
        it("reports that line's id", () => {
            const engine = new MovieEngine(makeMovie(), [])

            expect(currentConversationScene(engine).lineId).toBe("greeting")
        })
    })

    describe("when the movie advances to a DECISION line", () => {
        it("reports that line's id", () => {
            const engine = new MovieEngine(makeMovie(), [])

            engine.processCommand(MovieEngineCommand.CONFIRM)

            expect(currentConversationScene(engine).lineId).toBe(
                "choose-a-path"
            )
        })
    })

    describe("when the player picks a decision", () => {
        it("records it by its line's id, not its position", () => {
            const engine = new MovieEngine(makeMovie(), [])

            engine.processCommand(MovieEngineCommand.CONFIRM)
            engine.selectDecision("go-left")

            expect(engine.result()?.decisions).toEqual([
                {
                    sceneId: "intro",
                    lineId: "choose-a-path",
                    decisionId: "go-left",
                },
            ])
        })
    })
})
