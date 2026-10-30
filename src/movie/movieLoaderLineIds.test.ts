import { describe, expect, it } from "vitest"
import type { Movie } from "./movie.js"
import { MovieLoader } from "./movieLoader.js"
import { MovieSceneType } from "./movieScene.js"

const dialogLine = (id: string) => ({
    type: "DIALOG",
    id,
    text: { "en-US": { text: "Hello" } },
})

const decisionLine = (id: string) => ({
    type: "DECISION",
    id,
    prompt: { "en-US": { text: "Which way?" } },
    options: [],
})

const dialogLineWithNoId = () => ({
    type: "DIALOG",
    text: { "en-US": { text: "Hello" } },
})

const decisionLineWithNoId = () => ({
    type: "DECISION",
    prompt: { "en-US": { text: "Which way?" } },
    options: [],
})

const conversationScene = (id: string, lines: object[]) => ({
    type: "CONVERSATION",
    id,
    nextSceneId: null,
    lines,
})

const movieJson = (scenes: object[]) => ({
    id: "movie-1",
    firstSceneId: "scene-1",
    scenes,
})

const movieJsonWithOneLine = (line: object) =>
    movieJson([conversationScene("scene-1", [line])])

const lineIdsInScene = (movie: Movie, sceneId: string): string[] => {
    const scene = movie.scenes.find(
        (movieScene) => movieScene.data.id === sceneId
    )
    if (scene?.type !== MovieSceneType.CONVERSATION)
        throw new Error(`expected "${sceneId}" to be a CONVERSATION scene`)
    return scene.data.lines.map((line) => line.id)
}

describe("MovieLoader.loadFromJSON line ids", () => {
    describe("when the author wrote an id on a line", () => {
        it.each([
            ["DIALOG", dialogLine("greeting")],
            ["DECISION", decisionLine("greeting")],
        ])("keeps the id on a %s line", (_lineType, line) => {
            const movie = MovieLoader.loadFromJSON(movieJsonWithOneLine(line))

            expect(lineIdsInScene(movie, "scene-1")).toEqual(["greeting"])
        })
    })

    describe("when a line has no id", () => {
        it.each([
            ["DIALOG", dialogLineWithNoId()],
            ["DECISION", decisionLineWithNoId()],
        ])("rejects a %s line, naming the field", (_lineType, line) => {
            expect(() =>
                MovieLoader.loadFromJSON(movieJsonWithOneLine(line))
            ).toThrow(/lines\.0\.id/)
        })
    })

    describe("when a line's id is empty", () => {
        it.each([
            ["DIALOG", dialogLine("")],
            ["DECISION", decisionLine("")],
        ])("rejects a %s line, naming the field", (_lineType, line) => {
            expect(() =>
                MovieLoader.loadFromJSON(movieJsonWithOneLine(line))
            ).toThrow(/lines\.0\.id/)
        })
    })

    describe("when two lines in one scene share an id", () => {
        it("throws an error naming the line and the scene", () => {
            const json = movieJson([
                conversationScene("scene-1", [
                    dialogLine("greeting"),
                    dialogLine("greeting"),
                ]),
            ])

            expect(() => MovieLoader.loadFromJSON(json)).toThrow(
                "[MovieLoader.loadFromJSON] Duplicate line id 'greeting' in scene 'scene-1'"
            )
        })
    })

    describe("when two different scenes use the same line id", () => {
        it("loads the movie", () => {
            const json = movieJson([
                conversationScene("scene-1", [dialogLine("greeting")]),
                conversationScene("scene-2", [dialogLine("greeting")]),
            ])

            expect(() => MovieLoader.loadFromJSON(json)).not.toThrow()
        })
    })
})
