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
            it("throws", () => {
                const { engine } = buildEngineWithCampaignDeployment()

                expect(() => engine.getCampaignDeploymentStatus()).toThrow()
            })
        })

        describe("after finalizeLoadingMission has run its default assignment pass", () => {
            it("reports Lini already assigned to her requested coordinate, the other coordinate still open, and Rem still unplaced", () => {
                const { engine } = buildEngineWithCampaignDeployment()
                engine.finalizeLoadingMission()

                const status = engine.getCampaignDeploymentStatus()

                expect(status.assignments[REQUESTED_COORDINATE_ID]).toBe(
                    LINI_ID
                )
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
            expect(status.assignments[OPEN_COORDINATE_ID]).toBe(REM_ID)
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
            expect(status.assignments[REQUESTED_COORDINATE_ID]).toBe(REM_ID)
            expect(status.assignments[OPEN_COORDINATE_ID]).toBe(LINI_ID)
        })
    })

    describe("finalizeCampaignSquaddieDeploymentAndStartMission", () => {
        it("places an InBattleSquaddie on the map for every current assignment", () => {
            const { engine } = buildEngineWithCampaignDeployment()
            engine.finalizeLoadingMission()
            engine.deployCampaignSquaddie({
                coordinateId: OPEN_COORDINATE_ID,
                campaignSquaddieId: REM_ID,
            })

            engine.finalizeCampaignSquaddieDeploymentAndStartMission()

            expect(engine.getAllSquaddiePositions()).toHaveLength(2)
        })
    })
})
