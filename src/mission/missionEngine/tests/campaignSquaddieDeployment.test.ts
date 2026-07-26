import { describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine.js"
import { MissionManager } from "../../missionManager.js"
import { MissionStateService } from "../../missionState.js"
import { ArmyManager } from "../../../campaign/army/armyManager.js"
import { ArmyService } from "../../../campaign/army/army.js"
import { CampaignSquaddieService } from "../../../campaign/army/campaignSquaddie.js"
import { CampaignSquaddieDeploymentCoordinateCollectionService } from "../../campaignSquaddieDeploymentCoordinateCollection.js"
import { CampaignSquaddieDeploymentCoordinateService } from "../../campaignSquaddieDeploymentCoordinate.js"
import { OutOfBattleSquaddieManager } from "../../../squaddie/outOfBattle/outOfBattleSquaddieManager.js"
import { OutOfBattleSquaddieCollectionService } from "../../../squaddie/outOfBattle/outOfBattleSquaddieCollection.js"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection.js"
import { OutOfBattleSquaddieAttributeSheetService } from "../../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet.js"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { SquaddieAffiliation } from "../../../affiliation/affiliation.js"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../../../coordinateMap/coordinateMapCollection.js"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap.js"
import { SquaddieActionManager } from "../../../squaddieAction/squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../../../squaddieAction/squaddieActionCollection.js"
import { AttributeScore } from "../../../proficiency/attributeScore.js"

const MAP_ID = "map-1"
const LINI_ID = "lini"
const LINI_ATTRIBUTE_SHEET_ID = "sheet-lini"
const LINI_OUT_OF_BATTLE_ID = "battle-lini"
const REM_ID = "rem"
const REM_ATTRIBUTE_SHEET_ID = "sheet-rem"
const REM_OUT_OF_BATTLE_ID = "battle-rem"
const REQUESTED_COORDINATE_ID = "slot-lini"
const OPEN_COORDINATE_ID = "slot-open"

const buildEngineWithCampaignDeployment = () => {
    const armyManager = new ArmyManager(ArmyService.new())
    armyManager.addOrUpdate(
        CampaignSquaddieService.new({
            id: LINI_ID,
            outOfBattleAttributeSheetId: LINI_ATTRIBUTE_SHEET_ID,
            outOfBattleSquaddieId: LINI_OUT_OF_BATTLE_ID,
            name: "Lini",
        })
    )
    armyManager.addOrUpdate(
        CampaignSquaddieService.new({
            id: REM_ID,
            outOfBattleAttributeSheetId: REM_ATTRIBUTE_SHEET_ID,
            outOfBattleSquaddieId: REM_OUT_OF_BATTLE_ID,
            name: "Rem",
        })
    )

    let coordinateCollection =
        CampaignSquaddieDeploymentCoordinateCollectionService.new()
    coordinateCollection =
        CampaignSquaddieDeploymentCoordinateCollectionService.addOrUpdate({
            collection: coordinateCollection,
            campaignSquaddieDeploymentCoordinate:
                CampaignSquaddieDeploymentCoordinateService.new({
                    id: REQUESTED_COORDINATE_ID,
                    coordinate: { row: 0, col: 0 },
                    request: {
                        type: "SPECIFIC_SQUADDIE",
                        campaignSquaddieId: LINI_ID,
                    },
                }),
        })
    coordinateCollection =
        CampaignSquaddieDeploymentCoordinateCollectionService.addOrUpdate({
            collection: coordinateCollection,
            campaignSquaddieDeploymentCoordinate:
                CampaignSquaddieDeploymentCoordinateService.new({
                    id: OPEN_COORDINATE_ID,
                    coordinate: { row: 0, col: 1 },
                    request: { type: "NONE" },
                }),
        })

    const outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
        OutOfBattleSquaddieCollectionService.new(),
        OutOfBattleSquaddieAttributeSheetCollectionService.new()
    )
    outOfBattleSquaddieManager.addOrUpdateAttributeSheet(
        OutOfBattleSquaddieAttributeSheetService.new({
            id: LINI_ATTRIBUTE_SHEET_ID,
            maxHitPoints: 5,
            movement: { movementPointsPerAction: 2 },
            attributeScores: {
                [AttributeScore.BODY]: 1,
                [AttributeScore.MIND]: 0,
                [AttributeScore.SOUL]: 1,
            },
        })
    )
    outOfBattleSquaddieManager.addOrUpdateAttributeSheet(
        OutOfBattleSquaddieAttributeSheetService.new({
            id: REM_ATTRIBUTE_SHEET_ID,
            maxHitPoints: 5,
            movement: { movementPointsPerAction: 2 },
            attributeScores: {
                [AttributeScore.BODY]: 0,
                [AttributeScore.MIND]: 1,
                [AttributeScore.SOUL]: 1,
            },
        })
    )
    outOfBattleSquaddieManager.addOrUpdateSquaddie(
        OutOfBattleSquaddieService.new({
            id: LINI_OUT_OF_BATTLE_ID,
            name: "Lini",
            attributeSheetId: LINI_ATTRIBUTE_SHEET_ID,
            affiliation: SquaddieAffiliation.PLAYER,
            actionIds: ["scimitar"],
        })
    )
    outOfBattleSquaddieManager.addOrUpdateSquaddie(
        OutOfBattleSquaddieService.new({
            id: REM_OUT_OF_BATTLE_ID,
            name: "Rem",
            attributeSheetId: REM_ATTRIBUTE_SHEET_ID,
            affiliation: SquaddieAffiliation.PLAYER,
            actionIds: ["heal"],
        })
    )

    const inBattleSquaddieManager = new InBattleSquaddieManager(
        InBattleSquaddieCollectionService.new(),
        outOfBattleSquaddieManager
    )

    const coordinateMapCollectionManager = new CoordinateMapCollectionManager(
        CoordinateMapCollectionService.new()
    )
    coordinateMapCollectionManager.addOrUpdate({
        map: CoordinateMapService.new({
            id: MAP_ID,
            name: "Map",
            movementProperties: ["1 1"],
        }),
    })

    const squaddieActionManager = new SquaddieActionManager(
        SquaddieActionCollectionService.new()
    )

    const missionState = MissionStateService.new({
        id: "mission-1",
        mapId: MAP_ID,
        campaignSquaddieDeploymentCoordinates: coordinateCollection,
    })

    const missionManager = new MissionManager({
        missionState,
        inBattleSquaddieManager,
        coordinateMapCollectionManager,
        squaddieActionManager,
        outOfBattleSquaddieManager,
        armyManager,
    })

    return { engine: new MissionEngine(missionManager), armyManager }
}

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
                expect(details?.squaddie.actionIds).toEqual(["heal"])
                expect(details?.attributeSheet.id).toBe(REM_ATTRIBUTE_SHEET_ID)
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
})
