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
import { MovieSceneConversationService } from "../../../movie/movieSceneConversation.js"
import { MissionAffiliationTurn } from "../../missionTurn.js"
import { ResourceManifestCollectionService } from "../../../resource/resourceManifestCollection.js"
import { ResourceManifestEntryService } from "../../../resource/resourceManifest.js"

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
                engine.playMovie(makeMovie("scene-1"))

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

        describe("when resource collections are registered and the referenced movie has an image scene", () => {
            it("resolves the scene's description from the registered resource collection", () => {
                const resourceManifestCollection =
                    ResourceManifestCollectionService.add(
                        ResourceManifestCollectionService.new(),
                        "img",
                        ResourceManifestEntryService.new({
                            id: "victory-image",
                            label: "Victory",
                            description: {
                                "en-us": { text: "The squad celebrates." },
                            },
                            type: "IMAGE",
                        })
                    )

                const harness = new MissionEngineTestHarness()
                harness.registerResourceCollections([
                    resourceManifestCollection,
                ])
                harness.registerMovie(makeMovie("victory-scene"))
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

                harness.endSquaddieTurn(harness.getLiniSquaddieId())

                const currentScene = harness.getMovieStatus()?.currentScene
                if (currentScene?.type !== "IMAGE") {
                    throw new Error("expected an image scene")
                }
                expect(currentScene.description).toBe("The squad celebrates.")
            })
        })
    })

    describe("when a movie completes after the acting affiliation already exhausted its turn", () => {
        const setUpHarnessWithPlayMovieOnPlayerTurn =
            (): MissionEngineTestHarness => {
                const harness = new MissionEngineTestHarness()
                harness.registerMovie(makeMovie("scene-1"))
                harness.addObjective(
                    MissionObjectiveService.new({
                        id: "play-movie-on-player-turn",
                        rewards: [
                            MissionObjectiveRewardService.newPlayMovieReward(
                                "movie-1"
                            ),
                        ],
                        criteria: [
                            MissionObjectiveCriteriaService.newPhaseReachedCriteria(
                                {
                                    turnCount: 0,
                                    missionAffiliationTurn:
                                        MissionAffiliationTurn.PLAYER_TURN,
                                }
                            ),
                        ],
                    })
                )
                harness.advanceToPlayerTurn()
                return harness
            }

        describe("while the movie is still playing", () => {
            let harness: MissionEngineTestHarness
            beforeEach(() => {
                harness = setUpHarnessWithPlayMovieOnPlayerTurn()
                harness.endSquaddieTurn(harness.getLiniSquaddieId())
            })

            it("keeps the affiliation turn on the exhausted phase", () => {
                expect(harness.getCurrentAffiliationTurn()).toBe(
                    MissionAffiliationTurn.PLAYER_TURN
                )
            })
        })

        describe("once the movie completes", () => {
            let harness: MissionEngineTestHarness
            beforeEach(() => {
                harness = setUpHarnessWithPlayMovieOnPlayerTurn()
                harness.endSquaddieTurn(harness.getLiniSquaddieId())
                harness.processMovieCommand(MovieEngineCommand.STOP)
            })

            it("advances past the exhausted affiliation turn", () => {
                expect(harness.getCurrentAffiliationTurn()).not.toBe(
                    MissionAffiliationTurn.PLAYER_TURN
                )
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
                        resourceManifestEntryId: "img",
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
                    engine.playMovie(makeConversationMovie())
                    engine.selectMovieDecision("choice-a")
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
                it("rejects it with a message naming the unknown ID", () => {
                    const engine = new MissionEngine()
                    engine.playMovie(makeConversationMovie())

                    const result = engine.selectMovieDecision("no-such-choice")

                    expect(result.isValid).toBe(false)
                    expect(result.message).toContain("no-such-choice")
                })
            })
        })

        describe("when a movie with only image scenes is playing", () => {
            it("rejects the decision", () => {
                const engine = new MissionEngine()
                engine.playMovie(makeMovie("scene-1"))

                const result = engine.selectMovieDecision("choice-a")

                expect(result.isValid).toBe(false)
                expect(result.message).toContain("not a conversation")
            })
        })
    })
})
