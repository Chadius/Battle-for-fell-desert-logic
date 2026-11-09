import { describe, expect, it } from "vitest"
import { MovieLoader } from "./movieLoader.js"

const movieWithPresentationFields = {
    id: "the-briefing",
    firstSceneId: "map-of-the-desert",
    scenes: [
        {
            type: "IMAGE",
            id: "map-of-the-desert",
            nextSceneId: "intro",
            resourceManifestEntryId: "desert-map",
            caption: "The desert",
            manualScrollEnabled: false,
        },
        {
            type: "CONVERSATION",
            id: "intro",
            lines: [
                {
                    type: "DIALOG",
                    id: "greeting",
                    speakerId: "Sir Camil",
                    text: { "en-US": { text: "Hello" } },
                    portrait: {
                        resourceManifestEntryId: "sir-camil",
                        position: "LEFT",
                    },
                    dialogPosition: "RIGHT",
                },
                {
                    type: "DECISION",
                    id: "which-way",
                    prompt: { "en-US": { text: "Which way?" } },
                    options: [
                        {
                            decisionId: "left",
                            text: { "en-US": { text: "Left" } },
                        },
                    ],
                },
            ],
        },
    ],
}

describe("MovieLoader.loadFromJSON presentation fields", () => {
    describe("when a movie file still carries text, portraits and layout", () => {
        it("loads the file and keeps only its structure", () => {
            const movie = MovieLoader.loadFromJSON(movieWithPresentationFields)

            expect(movie.scenes.map((scene) => scene.data)).toEqual([
                {
                    id: "map-of-the-desert",
                    nextSceneId: "intro",
                    introTransition: undefined,
                    exitTransition: undefined,
                    manualScrollEnabled: false,
                    autoScroll: undefined,
                },
                {
                    id: "intro",
                    nextSceneId: undefined,
                    lines: [
                        { type: "DIALOG", id: "greeting" },
                        {
                            type: "DECISION",
                            id: "which-way",
                            options: [
                                { decisionId: "left", nextSceneId: undefined },
                            ],
                        },
                    ],
                },
            ])
        })
    })
})
