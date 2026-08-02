import { describe, expect, it } from "vitest"
import type { MissionObjective } from "../../missionObjective.js"
import { MissionObjectiveService } from "../../missionObjective.js"
import { MissionObjectiveRewardService } from "../../missionObjectiveReward.js"
import { MissionObjectiveCriteriaService } from "../../missionObjectiveCriteria.js"
import { MissionAffiliationTurn } from "../../missionTurn.js"
import { MovieSceneImageService } from "../../../movie/movieSceneImage.js"
import { MovieSceneType } from "../../../movie/movieScene.js"
import type { Movie } from "../../../movie/movie.js"
import {
    CampaignTestHarness,
    CampaignTestHarnessIds,
} from "../../../testUtils/campaign/campaignTestHarness.js"

const makeBriefingMovie = (sceneId: string): Movie => ({
    id: "movie-1",
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

const LINI_ID = CampaignTestHarnessIds.lini.campaignSquaddieId
const LINI_OUT_OF_BATTLE_ID = CampaignTestHarnessIds.lini.outOfBattleSquaddieId
const REM_ID = CampaignTestHarnessIds.rem.campaignSquaddieId
const REM_OUT_OF_BATTLE_ID = CampaignTestHarnessIds.rem.outOfBattleSquaddieId
const REQUESTED_COORDINATE_ID = CampaignTestHarnessIds.lini.coordinateId
const OPEN_COORDINATE_ID = CampaignTestHarnessIds.openCoordinateId

const buildEngineWithCampaignDeployment = ({
    objectives = [],
}: {
    objectives?: MissionObjective[]
} = {}) => ({
    engine: new CampaignTestHarness({ objectives }),
})

describe("MissionEngine campaign squaddie deployment", () => {
    describe("finalizeLoadingMission", () => {
        describe("when campaign squaddie deployment coordinates are pending", () => {
            it("does not place any squaddies on the map", () => {
                const { engine } = buildEngineWithCampaignDeployment()

                engine.finalizeLoadingMission()

                expect(engine.getAllSquaddiePositions()).toEqual([])
            })
        })
    })

    describe("getCampaignDeploymentStatus", () => {
        describe("when finalizeLoadingMission has not run yet", () => {
            it("throws because no campaign deployment has been started yet", () => {
                const { engine } = buildEngineWithCampaignDeployment()

                expect(() => engine.getCampaignDeploymentStatus()).toThrow()
            })
        })

        describe("after finalizeLoadingMission has run its default assignment pass", () => {
            it("reports Lini's coordinate as deployed and assigned to her full campaign squaddie details, the other coordinate still open, and Rem still unplaced", () => {
                const { engine } = buildEngineWithCampaignDeployment()
                engine.finalizeLoadingMission()

                const status = engine.getCampaignDeploymentStatus()

                expect(status.assignments[REQUESTED_COORDINATE_ID].id).toBe(
                    LINI_ID
                )
                expect(status.assignments[REQUESTED_COORDINATE_ID].name).toBe(
                    "Lini"
                )
                expect(
                    status.deployedCoordinates.map(
                        (coordinate) => coordinate.id
                    )
                ).toEqual([REQUESTED_COORDINATE_ID])
                expect(
                    status.openCoordinates.map((coordinate) => coordinate.id)
                ).toEqual([OPEN_COORDINATE_ID])
                expect(
                    status.unplacedEligibleCampaignSquaddies.map(
                        (campaignSquaddie) => campaignSquaddie.id
                    )
                ).toEqual([REM_ID])
            })
        })
    })

    describe("deployCampaignSquaddie", () => {
        it("assigns the campaign squaddie to the given coordinate", () => {
            const { engine } = buildEngineWithCampaignDeployment()
            engine.finalizeLoadingMission()

            engine.deployCampaignSquaddie({
                coordinateId: OPEN_COORDINATE_ID,
                campaignSquaddieId: REM_ID,
            })

            const status = engine.getCampaignDeploymentStatus()
            expect(status.assignments[OPEN_COORDINATE_ID].id).toBe(REM_ID)
        })
    })

    describe("undeployCampaignSquaddie", () => {
        it("clears the assignment at the given coordinate", () => {
            const { engine } = buildEngineWithCampaignDeployment()
            engine.finalizeLoadingMission()

            engine.undeployCampaignSquaddie(REQUESTED_COORDINATE_ID)

            const status = engine.getCampaignDeploymentStatus()
            expect(status.assignments[REQUESTED_COORDINATE_ID]).toBeUndefined()
        })
    })

    describe("swapCampaignSquaddieDeployment", () => {
        it("swaps the assignments of the two coordinates", () => {
            const { engine } = buildEngineWithCampaignDeployment()
            engine.finalizeLoadingMission()
            engine.deployCampaignSquaddie({
                coordinateId: OPEN_COORDINATE_ID,
                campaignSquaddieId: REM_ID,
            })

            engine.swapCampaignSquaddieDeployment({
                coordinateIdA: REQUESTED_COORDINATE_ID,
                coordinateIdB: OPEN_COORDINATE_ID,
            })

            const status = engine.getCampaignDeploymentStatus()
            expect(status.assignments[REQUESTED_COORDINATE_ID].id).toBe(REM_ID)
            expect(status.assignments[OPEN_COORDINATE_ID].id).toBe(LINI_ID)
        })
    })

    describe("finalizeCampaignSquaddieDeploymentAndStartMission", () => {
        it("places each campaign squaddie on the map at its assigned coordinate", () => {
            const { engine } = buildEngineWithCampaignDeployment()
            engine.finalizeLoadingMission()
            engine.deployCampaignSquaddie({
                coordinateId: OPEN_COORDINATE_ID,
                campaignSquaddieId: REM_ID,
            })

            engine.finalizeCampaignSquaddieDeploymentAndStartMission()

            const positions = engine.getAllSquaddiePositions()
            const liniPosition = positions.find(
                (position) =>
                    position.squaddieId.outOfBattleSquaddieId ===
                    LINI_OUT_OF_BATTLE_ID
            )
            expect(liniPosition?.coordinate).toEqual({ row: 0, col: 0 })
            const remPosition = positions.find(
                (position) =>
                    position.squaddieId.outOfBattleSquaddieId ===
                    REM_OUT_OF_BATTLE_ID
            )
            expect(remPosition?.coordinate).toEqual({ row: 0, col: 1 })
        })
    })

    describe("isCampaignSquaddieDeploymentInProgress", () => {
        describe("before finalizeLoadingMission has begun deployment", () => {
            it("reports deployment as not in progress", () => {
                const { engine } = buildEngineWithCampaignDeployment()

                expect(engine.isCampaignSquaddieDeploymentInProgress()).toBe(
                    false
                )
            })
        })

        describe("once deployment has begun", () => {
            it("reports deployment as in progress", () => {
                const { engine } = buildEngineWithCampaignDeployment()
                engine.finalizeLoadingMission()

                expect(engine.isCampaignSquaddieDeploymentInProgress()).toBe(
                    true
                )
            })
        })

        describe("once deployment is finalized and the mission starts", () => {
            it("reports deployment as no longer in progress", () => {
                const { engine } = buildEngineWithCampaignDeployment()
                engine.finalizeLoadingMission()
                engine.deployCampaignSquaddie({
                    coordinateId: OPEN_COORDINATE_ID,
                    campaignSquaddieId: REM_ID,
                })

                engine.finalizeCampaignSquaddieDeploymentAndStartMission()

                expect(engine.isCampaignSquaddieDeploymentInProgress()).toBe(
                    false
                )
            })
        })
    })

    describe("getOutOfBattleSquaddieDetails", () => {
        describe("for a campaign squaddie not yet placed on the map", () => {
            it("returns her out-of-battle squaddie and attribute sheet", () => {
                const { engine } = buildEngineWithCampaignDeployment()

                const details =
                    engine.getOutOfBattleSquaddieDetails(REM_OUT_OF_BATTLE_ID)

                expect(details?.squaddie.name).toBe("Rem")
                expect(details?.squaddie.actionIds).toEqual([
                    CampaignTestHarnessIds.rem.healActionId,
                ])
                expect(details?.attributeSheet.id).toBe(
                    CampaignTestHarnessIds.rem.attributeSheetId
                )
            })
        })

        describe("for an outOfBattleSquaddieId that has not been registered", () => {
            it("returns undefined", () => {
                const { engine } = buildEngineWithCampaignDeployment()

                const details = engine.getOutOfBattleSquaddieDetails(
                    "unregistered-squaddie"
                )

                expect(details).toBeUndefined()
            })
        })
    })

    describe("readyAction", () => {
        describe("when campaign squaddie deployment is in progress", () => {
            it("blocks the action", () => {
                const { engine } = buildEngineWithCampaignDeployment()
                engine.finalizeLoadingMission()

                const result = engine.readyAction({
                    actor: {
                        inBattleSquaddieId: 0,
                        outOfBattleSquaddieId: LINI_OUT_OF_BATTLE_ID,
                    },
                    targets: [
                        {
                            inBattleSquaddieId: 0,
                            outOfBattleSquaddieId: LINI_OUT_OF_BATTLE_ID,
                        },
                    ],
                    action: { id: "default-end-turn" },
                })

                expect(result.isValid).toBe(false)
                expect(result.message).toContain("deployment")
            })
        })
    })

    describe("checkAndTriggerObjectiveRewards", () => {
        describe("when called before finalizeLoadingMission — i.e. before the engine decides whether deployment is needed", () => {
            it("triggers the objective's movie reward immediately, before deployment begins", () => {
                const preDeploymentBriefing = MissionObjectiveService.new({
                    id: "pre-deployment-briefing",
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
                                    MissionAffiliationTurn.TURN_START,
                            }
                        ),
                    ],
                })
                const { engine } = buildEngineWithCampaignDeployment({
                    objectives: [preDeploymentBriefing],
                })
                engine.registerMovie(
                    makeBriefingMovie("pre-deployment-briefing")
                )

                engine.checkAndTriggerObjectiveRewards()

                expect(engine.isMoviePlaying()).toBe(true)
            })
        })
    })
})
