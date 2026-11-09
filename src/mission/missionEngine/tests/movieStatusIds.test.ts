import { describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine.js"
import { MissionManager } from "../../missionManager.js"
import { MissionStateService } from "../../missionState.js"
import type { Movie } from "../../../movie/movie.js"
import { MovieSceneType } from "../../../movie/movieScene.js"
import { MovieSceneConversationService } from "../../../movie/movieSceneConversation.js"

const buildEngine = (): MissionEngine =>
    new MissionEngine(
        new MissionManager({
            missionState: MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
            }),
        })
    )

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
                ],
            }),
        },
    ],
})

describe("MissionEngine.getMovieStatus ids", () => {
    describe("when a conversation is playing", () => {
        it("gives the host the current movie, scene and line ids", () => {
            const engine = buildEngine()
            engine.playMovie(makeMovie())

            const status = engine.getMovieStatus()

            expect(status?.movieId).toBe("the-briefing")
            expect(status?.currentScene).toMatchObject({
                sceneId: "intro",
                lineId: "greeting",
            })
        })
    })
})
