import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngine, MissionMovieEvent } from "../missionEngine.js"
import { MovieSceneImageService } from "../../../movie/movieSceneImage.js"
import { MovieSceneType } from "../../../movie/movieScene.js"
import type { Movie } from "../../../movie/movie.js"
import {
    MovieEngineCommand,
    MovieEngineState,
} from "../../../movie/movieEngine.js"
import { MissionEngineTestHarness } from "../../../testUtils/mission/missionEngineTestHarness.js"
import { MissionObjectiveService } from "../../missionObjective.js"
import { MissionObjectiveRewardService } from "../../missionObjectiveReward.js"
import { MissionObjectiveCriteriaService } from "../../missionObjectiveCriteria.js"
import { SquaddieAffiliation } from "../../../affiliation/affiliation.js"
import { MissionAffiliationTurn } from "../../missionTurn.js"
import { ReadyActionRejectionReason } from "../readyActionRejection.js"
import { MovieDecisionRejectionReason } from "../../../movie/movieDecisionRejection.js"
import {
    createOneDecisionMovie,
    OneDecisionMovieIds,
} from "../../../testUtils/movie/oneDecisionMovie.js"

const makeMovie = (...sceneIds: string[]): Movie => ({
    id: "movie-1",
    firstSceneId: sceneIds[0],
    scenes: sceneIds.map((id) => ({
        type: MovieSceneType.IMAGE,
        data: MovieSceneImageService.new({
            id,
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
                engine.playMovie(makeMovie("scene-1"))

                const result = engine.readyAction({
                    actor: {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "lini",
                    },
                    targets: [],
                    action: { id: "scimitar" },
                })

                expect(result).toEqual({
                    isValid: false,
                    rejection: {
                        reason: ReadyActionRejectionReason.MOVIE_PLAYING,
                    },
                })
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
                harness.advanceToPlayerTurn()
                harness.defeatSlitherDemon()
            })

            it("starts playing the referenced movie", () => {
                harness.endSquaddieTurn(harness.getLiniSquaddieId())

                expect(harness.isMoviePlaying()).toBe(true)
            })
        })
    })

    describe("when a movie completes after the acting affiliation already exhausted its turn", () => {
        const setUpHarnessWithPlayMovieWhenEnemiesAreDefeated =
            (): MissionEngineTestHarness => {
                const harness = new MissionEngineTestHarness()
                harness.registerMovie(makeMovie("scene-1"))
                harness.addObjective(
                    MissionObjectiveService.new({
                        id: "play-movie-when-enemies-defeated",
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
                harness.advanceToPlayerTurn()
                harness.defeatSlitherDemon()
                return harness
            }

        describe("while the movie is still playing", () => {
            let harness: MissionEngineTestHarness
            beforeEach(() => {
                harness = setUpHarnessWithPlayMovieWhenEnemiesAreDefeated()
                harness.endSquaddieTurn(harness.getLiniSquaddieId())
            })

            it("keeps the mission on the exhausted turn", () => {
                expect(harness.getCurrentTurnNumber()).toBe(0)
            })
        })

        describe("once the movie completes", () => {
            let harness: MissionEngineTestHarness
            beforeEach(() => {
                harness = setUpHarnessWithPlayMovieWhenEnemiesAreDefeated()
                harness.endSquaddieTurn(harness.getLiniSquaddieId())
                harness.processMovieCommand(MovieEngineCommand.STOP)
            })

            it("advances past the exhausted affiliation turn into the next round", () => {
                expect(harness.getCurrentTurnNumber()).toBe(1)
            })
        })
    })

    describe("when an objective grants multiple PLAY_MOVIE rewards for the same completed criteria", () => {
        const makeNamedMovie = (movieId: string, sceneId: string): Movie => ({
            id: movieId,
            firstSceneId: sceneId,
            scenes: [
                {
                    type: MovieSceneType.IMAGE,
                    data: MovieSceneImageService.new({
                        id: sceneId,
                    }),
                },
            ],
        })

        let harness: MissionEngineTestHarness
        beforeEach(() => {
            harness = new MissionEngineTestHarness()
            harness.registerMovie(
                makeNamedMovie("movie-introduction", "introduction-scene")
            )
            harness.registerMovie(makeNamedMovie("movie-turn1", "turn1-scene"))
            harness.addObjective(
                MissionObjectiveService.new({
                    id: "introduction",
                    rewards: [
                        MissionObjectiveRewardService.newPlayMovieReward(
                            "movie-introduction"
                        ),
                        MissionObjectiveRewardService.newPlayMovieReward(
                            "movie-turn1"
                        ),
                    ],
                    criteria: [
                        MissionObjectiveCriteriaService.newPhaseReachedCriteria(
                            {
                                turnCount: 0,
                                missionAffiliationTurn:
                                    MissionAffiliationTurn.PLAYER_TURN_START,
                            }
                        ),
                    ],
                })
            )
            harness.transitionToNextPhase()
        })

        it("plays the first movie", () => {
            expect(harness.getMovieStatus()?.currentScene?.sceneId).toBe(
                "introduction-scene"
            )
        })

        describe("once the first movie completes", () => {
            beforeEach(() => {
                harness.processMovieCommand(MovieEngineCommand.STOP)
            })

            it("plays the second movie next, instead of skipping it", () => {
                expect(harness.getMovieStatus()?.currentScene?.sceneId).toBe(
                    "turn1-scene"
                )
            })
        })
    })

    describe("getRecentMovieEvents", () => {
        describe("when a movie starts", () => {
            it("records a MOVIE_STARTED event", () => {
                const engine = new MissionEngine()

                engine.playMovie(makeMovie("scene-1"))

                expect(engine.getRecentMovieEvents()).toContain(
                    MissionMovieEvent.MOVIE_STARTED
                )
            })
        })

        describe("when the active movie completes", () => {
            it("records a MOVIE_COMPLETE event", () => {
                const engine = new MissionEngine()
                engine.playMovie(makeFiniteMovie("scene-1", 100))
                engine.processMovieCommand(MovieEngineCommand.FAST_FORWARD)
                engine.tickMovie(200)

                expect(engine.getRecentMovieEvents()).toContain(
                    MissionMovieEvent.MOVIE_COMPLETE
                )
            })
        })
    })

    describe("getMovieStatus", () => {
        describe("when a movie is playing", () => {
            it("reports state as PLAYING", () => {
                const engine = new MissionEngine()
                engine.playMovie(makeMovie("scene-1"))

                const status = engine.getMovieStatus()

                expect(status!.state).toBe(MovieEngineState.PLAYING)
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
                engine.playMovie(makeFiniteMovie("scene-1", 100))
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
                engine.playMovie(makeMovie("scene-1"))

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

                engine.playMovie(makeMovie("scene-1"))

                expect(engine.isMoviePlaying()).toBe(true)
            })
        })
    })

    describe("selectMovieDecision", () => {
        describe("when no movie is active", () => {
            it("rejects it because no movie is playing", () => {
                const engine = new MissionEngine()

                const result = engine.selectMovieDecision("any-choice")

                expect(result).toEqual({
                    isValid: false,
                    rejection: {
                        reason: MovieDecisionRejectionReason.NO_MOVIE_PLAYING,
                    },
                })
            })
        })

        describe("when a movie with a conversation decision scene is playing", () => {
            describe("when a valid decision completes the movie", () => {
                let engine: MissionEngine
                beforeEach(() => {
                    engine = new MissionEngine()
                    engine.playMovie(createOneDecisionMovie())
                    engine.selectMovieDecision(OneDecisionMovieIds.firstChoice)
                })

                it("the movie stops playing", () => {
                    expect(engine.isMoviePlaying()).toBe(false)
                })

                it("records a MOVIE_COMPLETE event", () => {
                    expect(engine.getRecentMovieEvents()).toContain(
                        MissionMovieEvent.MOVIE_COMPLETE
                    )
                })
            })

            describe("when an unrecognized decision ID is submitted", () => {
                it("rejects it as an unknown decision ID", () => {
                    const engine = new MissionEngine()
                    engine.playMovie(createOneDecisionMovie())

                    const result = engine.selectMovieDecision("no-such-choice")

                    expect(result).toEqual({
                        isValid: false,
                        rejection: {
                            reason: MovieDecisionRejectionReason.UNKNOWN_DECISION_ID,
                        },
                    })
                })

                it("keeps the movie playing on the same decision line", () => {
                    const engine = new MissionEngine()
                    engine.playMovie(createOneDecisionMovie())

                    engine.selectMovieDecision("no-such-choice")

                    expect(engine.getMovieStatus()).toMatchObject({
                        state: MovieEngineState.PLAYING,
                        currentScene: {
                            sceneId: OneDecisionMovieIds.scene,
                            lineId: OneDecisionMovieIds.line,
                        },
                    })
                })
            })
        })

        describe("when a movie with only image scenes is playing", () => {
            it("rejects it because the scene is not a conversation", () => {
                const engine = new MissionEngine()
                engine.playMovie(makeMovie("scene-1"))

                const result = engine.selectMovieDecision("any-choice")

                expect(result).toEqual({
                    isValid: false,
                    rejection: {
                        reason: MovieDecisionRejectionReason.SCENE_IS_NOT_A_CONVERSATION,
                    },
                })
            })
        })
    })
})
