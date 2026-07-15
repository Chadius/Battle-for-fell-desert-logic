import { describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine.js"
import { MissionManager } from "../../missionManager.js"
import { MissionStateService } from "../../missionState.js"
import { MissionStatisticsService } from "../../missionStatistics.js"
import { MovieSceneType } from "../../../movie/movieScene.js"
import { MovieSceneConversationService } from "../../../movie/movieSceneConversation.js"
import { MovieSceneImageService } from "../../../movie/movieSceneImage.js"
import type { Movie } from "../../../movie/movie.js"

const makeConversationMovie = (): Movie => ({
    id: "movie-1",
    firstSceneId: "scene-1",
    scenes: [
        {
            type: MovieSceneType.CONVERSATION,
            data: MovieSceneConversationService.new({
                id: "scene-1",
                lines: [
                    {
                        type: "DECISION",
                        prompt: {
                            "en-us": {
                                text: "Turn {TURN_COUNT}: dealt {DAMAGE_DEALT_BY_PLAYER_TEAM}",
                            },
                        },
                        options: [
                            {
                                decisionId: "choice-a",
                                text: {
                                    "en-us": {
                                        text: "Healed {HEALING_RECEIVED_BY_PLAYER_TEAM}, unknown {MYSTERY}",
                                    },
                                },
                            },
                        ],
                    },
                ],
            }),
        },
    ],
})

const makeConversationMovieWithExtraToken = (): Movie => ({
    id: "movie-2",
    firstSceneId: "scene-2",
    scenes: [
        {
            type: MovieSceneType.CONVERSATION,
            data: MovieSceneConversationService.new({
                id: "scene-2",
                lines: [
                    {
                        type: "DECISION",
                        prompt: {
                            "en-us": {
                                text: "Elapsed: {timeFormat(TIME_ELAPSED, mm:ss)}",
                            },
                        },
                        options: [
                            {
                                decisionId: "choice-a",
                                text: { "en-us": { text: "OK" } },
                            },
                        ],
                    },
                ],
            }),
        },
    ],
})

const buildEngineWithMovie = (movie: Movie): MissionEngine => {
    const missionManager = new MissionManager({
        missionState: MissionStateService.new({
            id: "mission-1",
            mapId: "map-1",
            turn: { turnCount: 3, missionAffiliationTurn: "TURN_START" },
            missionStatistics: MissionStatisticsService.new({
                damageDealtByPlayerTeam: 5,
                healingReceivedByPlayerTeam: 2,
            }),
        }),
    })
    const engine = new MissionEngine(missionManager)
    engine.playMovie(movie, [])
    return engine
}

describe("MissionEngine.getMovieStatus", () => {
    describe("when a conversation scene is playing", () => {
        it("resolves mission tokens in the prompt text", () => {
            const engine = buildEngineWithMovie(makeConversationMovie())

            const status = engine.getMovieStatus()

            expect(status!.currentScene).toMatchObject({
                text: "Turn 3: dealt 5",
            })
        })

        it("resolves mission tokens in decision option text and leaves unknown tokens untouched", () => {
            const engine = buildEngineWithMovie(makeConversationMovie())

            const status = engine.getMovieStatus()
            const currentScene = status?.currentScene
            if (currentScene?.type !== "CONVERSATION") {
                throw new Error("expected a conversation scene")
            }

            expect(currentScene.decisions[0].text).toBe(
                "Healed 2, unknown {MYSTERY}"
            )
        })
    })

    describe("when the caller supplies extra tokens", () => {
        it("resolves them alongside the built-in mission tokens", () => {
            const engine = buildEngineWithMovie(
                makeConversationMovieWithExtraToken()
            )

            const status = engine.getMovieStatus({
                TIME_ELAPSED: "83000",
            })

            expect(status!.currentScene).toMatchObject({
                text: "Elapsed: 01:23",
            })
        })
    })

    describe("when an image scene is playing", () => {
        it("returns the scene unchanged", () => {
            const engine = new MissionEngine()
            engine.playMovie(
                {
                    id: "image-movie",
                    firstSceneId: "img-scene",
                    scenes: [
                        {
                            type: MovieSceneType.IMAGE,
                            data: MovieSceneImageService.new({
                                id: "img-scene",
                                resourceManifestEntryId: "img",
                            }),
                        },
                    ],
                },
                []
            )

            const status = engine.getMovieStatus()

            expect(status!.currentScene).toMatchObject({
                type: "IMAGE",
                resourceManifestEntryId: "img",
            })
        })
    })

    describe("when no movie is active", () => {
        it("returns undefined", () => {
            const engine = new MissionEngine()

            expect(engine.getMovieStatus()).toBeUndefined()
        })
    })
})
