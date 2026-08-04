import { describe, expect, it } from "vitest"
import { MissionManager } from "./missionManager.js"
import { MissionStateService } from "./missionState.js"
import { MovieManager } from "../movie/movieManager.js"
import { ArmyManager } from "../campaign/army/armyManager.js"
import { ArmyService } from "../campaign/army/army.js"
import { CampaignSquaddieDeploymentCoordinateCollectionService } from "./campaignSquaddieDeploymentCoordinateCollection.js"
import { CampaignSquaddieDeploymentCoordinateService } from "./campaignSquaddieDeploymentCoordinate.js"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../squaddie/inBattle/inBattleSquaddieCollection.js"
import { OutOfBattleSquaddieManager } from "../squaddie/outOfBattle/outOfBattleSquaddieManager.js"
import { OutOfBattleSquaddieCollectionService } from "../squaddie/outOfBattle/outOfBattleSquaddieCollection.js"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection.js"
import { CoordinateMapCollectionManager } from "../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../coordinateMap/coordinateMapCollection.js"
import { CoordinateMapService } from "../coordinateMap/coordinateMap.js"
import { SquaddieActionManager } from "../squaddieAction/squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../squaddieAction/squaddieActionCollection.js"
import { SquaddieActionService } from "../squaddieAction/squaddieAction.js"

describe("MissionManager", () => {
    describe("constructor", () => {
        describe("when constructed with no arguments", () => {
            it("has no state or managers", () => {
                const missionManager = new MissionManager()

                expect(missionManager.missionState).toBeUndefined()
                expect(missionManager.inBattleSquaddieManager).toBeUndefined()
                expect(
                    missionManager.coordinateMapCollectionManager
                ).toBeUndefined()
                expect(missionManager.squaddieActionManager).toBeUndefined()
            })
        })

        describe("when constructed with a mission state", () => {
            it("stores the mission state", () => {
                const missionState = MissionStateService.new({
                    id: "mission-1",
                    mapId: "map-1",
                })

                const missionManager = new MissionManager({ missionState })

                expect(missionManager.missionState).toBe(missionState)
            })
        })

        describe("when constructed with a MovieManager", () => {
            it("stores the MovieManager", () => {
                const movieManager = new MovieManager()

                const missionManager = new MissionManager({ movieManager })

                expect(missionManager.movieManager).toBe(movieManager)
            })
        })

        describe("when constructed with an ArmyManager", () => {
            it("stores the ArmyManager", () => {
                const armyManager = new ArmyManager(ArmyService.new())

                const missionManager = new MissionManager({ armyManager })

                expect(missionManager.armyManager).toBe(armyManager)
            })
        })

        describe("when constructed with all dependencies", () => {
            it("stores each dependency", () => {
                const missionState = MissionStateService.new({
                    id: "mission-1",
                    mapId: "map-1",
                })
                const inBattleSquaddieManager = {} as InBattleSquaddieManager
                const coordinateMapCollectionManager =
                    {} as CoordinateMapCollectionManager
                const squaddieActionManager = {} as SquaddieActionManager

                const missionManager = new MissionManager({
                    missionState,
                    inBattleSquaddieManager,
                    coordinateMapCollectionManager,
                    squaddieActionManager,
                })

                expect(missionManager.missionState).toBe(missionState)
                expect(missionManager.inBattleSquaddieManager).toBe(
                    inBattleSquaddieManager
                )
                expect(missionManager.coordinateMapCollectionManager).toBe(
                    coordinateMapCollectionManager
                )
                expect(missionManager.squaddieActionManager).toBe(
                    squaddieActionManager
                )
            })
        })
    })

    describe("validate", () => {
        describe("when a mission with campaign squaddie deployment coordinates is loaded via loadMissionStateFromJson and an ArmyManager was provided at construction", () => {
            it("does not report the ArmyManager as missing", () => {
                const armyManager = new ArmyManager(ArmyService.new())
                const coordinateMapCollectionManager =
                    new CoordinateMapCollectionManager(
                        CoordinateMapCollectionService.new()
                    )
                coordinateMapCollectionManager.addOrUpdate({
                    map: CoordinateMapService.new({
                        id: "map-1",
                        name: "Map",
                        movementProperties: ["1 1"],
                    }),
                })
                const outOfBattleSquaddieManager =
                    new OutOfBattleSquaddieManager(
                        OutOfBattleSquaddieCollectionService.new(),
                        OutOfBattleSquaddieAttributeSheetCollectionService.new()
                    )
                const inBattleSquaddieManager = new InBattleSquaddieManager(
                    InBattleSquaddieCollectionService.new(),
                    outOfBattleSquaddieManager
                )
                const squaddieActionManager = new SquaddieActionManager(
                    SquaddieActionCollectionService.new()
                )
                SquaddieActionService.defaultActions().forEach(
                    (squaddieAction) =>
                        squaddieActionManager.addOrUpdate(squaddieAction)
                )

                let coordinateCollection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                coordinateCollection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.addOrUpdate(
                        {
                            collection: coordinateCollection,
                            campaignSquaddieDeploymentCoordinate:
                                CampaignSquaddieDeploymentCoordinateService.new(
                                    {
                                        id: "slot-1",
                                        coordinate: { row: 0, col: 0 },
                                        request: { type: "NONE" },
                                    }
                                ),
                        }
                    )
                const serializedMissionState = MissionStateService.serialize(
                    MissionStateService.new({
                        id: "mission-1",
                        mapId: "map-1",
                        campaignSquaddieDeploymentCoordinates:
                            coordinateCollection,
                    })
                )

                const missionManager = new MissionManager({
                    coordinateMapCollectionManager,
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    armyManager,
                })
                missionManager.loadMissionStateFromJson(serializedMissionState)

                const result = missionManager.validate()

                expect(result.errors).toHaveLength(0)
            })
        })
    })
})
