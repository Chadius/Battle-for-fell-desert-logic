import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine"
import { MovieSceneImageService } from "../../../movie/movieSceneImage"
import { MovieSceneType } from "../../../movie/movieScene"
import type { Movie } from "../../../movie/movie"
import { MovieEngineCommand } from "../../../movie/movieEngine"
import { MissionEngineTestHarness } from "../../../testUtils/mission/missionEngineTestHarness"
import { MissionObjectiveService } from "../../missionObjective"
import { MissionObjectiveRewardService } from "../../missionObjectiveReward"
import { MissionObjectiveCriteriaService } from "../../missionObjectiveCriteria"
import { SquaddieAffiliation } from "../../../affiliation/affiliation"
import { MovieSceneConversationService } from "../../../movie/movieSceneConversation"

const makeMovie = (...sceneIds: string[]): Movie => ({
    id: "movie-1",
    firstSceneId: sceneIds[0],
    scenes: sceneIds.map((id) => ({
        type: MovieSceneType.IMAGE,
        data: MovieSceneImageService.new({
            id,
            resourceManifestEntryId: "img",
        }),
    })),
})

const makeFiniteMovie = (id: string, durationMs: number): Movie => ({
    id: "movie-1",
    firstSceneId: id,
    scenes: [
        {
            type: MovieSceneType.IMAGE,
            data: MovieSceneImageService.new({
                id,
                resourceManifestEntryId: "img",
                introTransition: { durationMs },
            }),
        },
    ],
})

describe("MissionEngine movie integration", () => {
    describe("readyAction", () => {
        describe("when a movie is playing", () => {
            it("blocks the action", () => {
                const engine = new MissionEngine()
                engine.playMovie(makeMovie("scene-1"), [])

                const result = engine.readyAction({
                    actor: {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "lini",
                    },
                    targets: [],
                    action: { id: "scimitar" },
                })

                expect(result.isValid).toBe(false)
                expect(result.message).toContain("movie")
            })
        })
    })

    describe("PLAY_MOVIE reward", () => {
        describe("when an action completes an objective with PLAY_MOVIE reward and the movie exists", () => {
            let harness: MissionEngineTestHarness
            const movie = makeMovie("victory-scene")

            beforeEach(() => {
                harness = new MissionEngineTestHarness()
                harness.registerMovie(movie)
                harness.addObjective(
                    MissionObjectiveService.new({
                        id: "play-victory-movie",
                        rewards: [
                            MissionObjectiveRewardService.newPlayMovieReward(
                                "movie-1"
                            ),
                        ],
                        criteria: [
                            MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                                {
                                    affiliations: [SquaddieAffiliation.ENEMY],
                                }
                            ),
                        ],
                    })
                )
                harness.defeatSlitherDemon()
                harness.advanceToPlayerTurn()
            })

            it("starts playing the referenced movie", () => {
                harness.endSquaddieTurn(harness.getLiniSquaddieId())

                expect(harness.isMoviePlaying()).toBe(true)
            })
        })
    })

    describe("getRecentMovieEvents", () => {
        describe("when a movie starts", () => {
            it("records a MOVIE_STARTED event", () => {
                const engine = new MissionEngine()

                engine.playMovie(makeMovie("scene-1"), [])

                expect(engine.getRecentMovieEvents()).toContain("MOVIE_STARTED")
            })
        })

        describe("when the active movie completes", () => {
            it("records a MOVIE_COMPLETE event", () => {
                const engine = new MissionEngine()
                engine.playMovie(makeFiniteMovie("scene-1", 100), [])
                engine.processMovieCommand(MovieEngineCommand.FAST_FORWARD)
                engine.tickMovie(200)

                expect(engine.getRecentMovieEvents()).toContain(
                    "MOVIE_COMPLETE"
                )
            })
        })
    })

    describe("getMovieStatus", () => {
        describe("when a movie is playing", () => {
            it("reports state as PLAYING", () => {
                const engine = new MissionEngine()
                engine.playMovie(makeMovie("scene-1"), [])

                const status = engine.getMovieStatus()

                expect(status!.state).toBe("PLAYING")
            })
        })

        describe("when no movie is active", () => {
            it("provides no status", () => {
                const engine = new MissionEngine()

                expect(engine.getMovieStatus()).toBeUndefined()
            })
        })
    })

    describe("tickMovie", () => {
        describe("when the active movie completes via tick", () => {
            it("the movie stops playing", () => {
                const engine = new MissionEngine()
                engine.playMovie(makeFiniteMovie("scene-1", 100), [])
                engine.processMovieCommand(MovieEngineCommand.FAST_FORWARD)

                engine.tickMovie(200)

                expect(engine.isMoviePlaying()).toBe(false)
            })
        })

        describe("when no movie is active", () => {
            it("is a no-op", () => {
                const engine = new MissionEngine()

                expect(() => engine.tickMovie(100)).not.toThrow()
            })
        })
    })

    describe("processMovieCommand", () => {
        describe("when a movie is playing and STOP is sent", () => {
            it("the movie stops playing", () => {
                const engine = new MissionEngine()
                engine.playMovie(makeMovie("scene-1"), [])

                engine.processMovieCommand(MovieEngineCommand.STOP)

                expect(engine.isMoviePlaying()).toBe(false)
            })
        })

        describe("when no movie is active", () => {
            it("is a no-op", () => {
                const engine = new MissionEngine()

                expect(() =>
                    engine.processMovieCommand(MovieEngineCommand.STOP)
                ).not.toThrow()
            })
        })
    })

    describe("playMovie", () => {
        describe("when a movie starts", () => {
            it("the movie is playing", () => {
                const engine = new MissionEngine()

                engine.playMovie(makeMovie("scene-1"), [])

                expect(engine.isMoviePlaying()).toBe(true)
            })
        })
    })

    describe("selectMovieDecision", () => {
        describe("when no movie is active", () => {
            it("rejects the call", () => {
                const engine = new MissionEngine()

                const result = engine.selectMovieDecision("choice-a")

                expect(result.isValid).toBe(false)
                expect(result.message).toContain("no movie is playing")
            })
        })

        describe("when a movie with a conversation decision scene is playing", () => {
            const makeConversationMovie = (): Movie => ({
                id: "convo-movie",
                firstSceneId: "convo-scene",
                scenes: [
                    {
                        type: MovieSceneType.CONVERSATION,
                        data: MovieSceneConversationService.new({
                            id: "convo-scene",
                            lines: [
                                {
                                    type: "DECISION",
                                    prompt: {
                                        "en-us": { text: "Choose wisely" },
                                    },
                                    options: [
                                        {
                                            decisionId: "choice-a",
                                            text: {
                                                "en-us": { text: "Option A" },
                                            },
                                        },
                                        {
                                            decisionId: "choice-b",
                                            text: {
                                                "en-us": { text: "Option B" },
                                            },
                                        },
                                    ],
                                },
                            ],
                        }),
                    },
                ],
            })

            describe("when a valid decision completes the movie", () => {
                let engine: MissionEngine
                beforeEach(() => {
                    engine = new MissionEngine()
                    engine.playMovie(makeConversationMovie(), [])
                    engine.selectMovieDecision("choice-a")
                })

                it("the movie stops playing", () => {
                    expect(engine.isMoviePlaying()).toBe(false)
                })

                it("records a MOVIE_COMPLETE event", () => {
                    expect(engine.getRecentMovieEvents()).toContain(
                        "MOVIE_COMPLETE"
                    )
                })
            })

            describe("when an unrecognized decision ID is submitted", () => {
                it("rejects it with a message naming the unknown ID", () => {
                    const engine = new MissionEngine()
                    engine.playMovie(makeConversationMovie(), [])

                    const result = engine.selectMovieDecision("no-such-choice")

                    expect(result.isValid).toBe(false)
                    expect(result.message).toContain("no-such-choice")
                })
            })
        })

        describe("when a movie with only image scenes is playing", () => {
            it("rejects the decision", () => {
                const engine = new MissionEngine()
                engine.playMovie(makeMovie("scene-1"), [])

                const result = engine.selectMovieDecision("choice-a")

                expect(result.isValid).toBe(false)
                expect(result.message).toContain("not a conversation")
            })
        })
    })
})
