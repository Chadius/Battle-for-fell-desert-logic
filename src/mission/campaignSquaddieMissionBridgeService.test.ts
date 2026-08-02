import { describe, expect, it } from "vitest"
import { CampaignSquaddieMissionBridgeService } from "./campaignSquaddieMissionBridgeService.js"
import { ArmyManager } from "../campaign/army/armyManager.js"
import { ArmyService } from "../campaign/army/army.js"
import { CampaignSquaddieDeploymentCoordinateCollectionService } from "./campaignSquaddieDeploymentCoordinateCollection.js"
import { CampaignSquaddieDeploymentCoordinateService } from "./campaignSquaddieDeploymentCoordinate.js"
import { CampaignSquaddieDeploymentManager } from "./campaignSquaddieDeploymentManager.js"
import { OutOfBattleSquaddieManager } from "../squaddie/outOfBattle/outOfBattleSquaddieManager.js"
import { OutOfBattleSquaddieCollectionService } from "../squaddie/outOfBattle/outOfBattleSquaddieCollection.js"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection.js"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../squaddie/inBattle/inBattleSquaddieCollection.js"
import { CoordinateMapCollectionManager } from "../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../coordinateMap/coordinateMapCollection.js"
import { CoordinateMapService } from "../coordinateMap/coordinateMap.js"
import type { OffsetCoordinate } from "../coordinateMap/offsetCoordinate.js"
import { SquaddieAffiliation } from "../affiliation/affiliation.js"
import {
    CampaignTestHarness,
    CampaignTestHarnessIds,
} from "../testUtils/campaign/campaignTestHarness.js"

const MAP_ID = "map-1"
const LINI_ID = CampaignTestHarnessIds.lini.campaignSquaddieId

const buildEmptyMissionManagers = () => {
    const outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
        OutOfBattleSquaddieCollectionService.new(),
        OutOfBattleSquaddieAttributeSheetCollectionService.new()
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
            movementProperties: ["1 1 1", "1 1 1"],
        }),
    })

    return {
        outOfBattleSquaddieManager,
        inBattleSquaddieManager,
        coordinateMapCollectionManager,
    }
}

const buildAssignedLiniDeployment = (
    coordinate: OffsetCoordinate = { row: 0, col: 0 }
) => {
    const armyManager = new ArmyManager(ArmyService.new())
    armyManager.addOrUpdate(CampaignTestHarness.createLiniCampaignSquaddie())

    let coordinateCollection =
        CampaignSquaddieDeploymentCoordinateCollectionService.new()
    coordinateCollection =
        CampaignSquaddieDeploymentCoordinateCollectionService.addOrUpdate({
            collection: coordinateCollection,
            campaignSquaddieDeploymentCoordinate:
                CampaignSquaddieDeploymentCoordinateService.new({
                    id: "slot-1",
                    coordinate,
                    request: {
                        type: "SPECIFIC_SQUADDIE",
                        campaignSquaddieId: LINI_ID,
                    },
                }),
        })

    const deploymentManager = new CampaignSquaddieDeploymentManager({
        armyManager,
        coordinateCollection,
    })
    deploymentManager.defaultAssign()

    const {
        outOfBattleSquaddieManager,
        inBattleSquaddieManager,
        coordinateMapCollectionManager,
    } = buildEmptyMissionManagers()
    outOfBattleSquaddieManager.addOrUpdateAttributeSheet(
        CampaignTestHarness.createLiniAttributeSheet()
    )

    return {
        armyManager,
        coordinateCollection,
        deploymentManager,
        outOfBattleSquaddieManager,
        inBattleSquaddieManager,
        coordinateMapCollectionManager,
    }
}

const buildOpenCoordinateDeployment = (coordinate: OffsetCoordinate) => {
    const armyManager = new ArmyManager(ArmyService.new())

    let coordinateCollection =
        CampaignSquaddieDeploymentCoordinateCollectionService.new()
    coordinateCollection =
        CampaignSquaddieDeploymentCoordinateCollectionService.addOrUpdate({
            collection: coordinateCollection,
            campaignSquaddieDeploymentCoordinate:
                CampaignSquaddieDeploymentCoordinateService.new({
                    id: "slot-open",
                    coordinate,
                    request: { type: "NONE" },
                }),
        })

    const deploymentManager = new CampaignSquaddieDeploymentManager({
        armyManager,
        coordinateCollection,
    })
    deploymentManager.defaultAssign()

    const {
        outOfBattleSquaddieManager,
        inBattleSquaddieManager,
        coordinateMapCollectionManager,
    } = buildEmptyMissionManagers()

    return {
        armyManager,
        coordinateCollection,
        deploymentManager,
        outOfBattleSquaddieManager,
        inBattleSquaddieManager,
        coordinateMapCollectionManager,
    }
}

describe("CampaignSquaddieMissionBridgeService", () => {
    describe("deployAssignedCampaignSquaddies", () => {
        describe("when a deployment coordinate has an assigned campaign squaddie and no matching OutOfBattleSquaddie exists yet", () => {
            it("creates the OutOfBattleSquaddie with fields from the campaign squaddie", () => {
                const {
                    armyManager,
                    coordinateCollection,
                    deploymentManager,
                    outOfBattleSquaddieManager,
                    inBattleSquaddieManager,
                    coordinateMapCollectionManager,
                } = buildAssignedLiniDeployment()

                CampaignSquaddieMissionBridgeService.deployAssignedCampaignSquaddies(
                    {
                        armyManager,
                        coordinateCollection,
                        deploymentManager,
                        outOfBattleSquaddieManager,
                        inBattleSquaddieManager,
                        coordinateMapCollectionManager,
                        mapId: MAP_ID,
                    }
                )

                expect(
                    outOfBattleSquaddieManager.getRawOutOfBattleSquaddie(
                        CampaignTestHarnessIds.lini.outOfBattleSquaddieId
                    )
                ).toMatchObject({
                    id: CampaignTestHarnessIds.lini.outOfBattleSquaddieId,
                    name: "Lini",
                    attributeSheetId:
                        CampaignTestHarnessIds.lini.attributeSheetId,
                    affiliation: SquaddieAffiliation.PLAYER,
                })
            })
        })

        describe("when a deployment coordinate has an assigned campaign squaddie whose OutOfBattleSquaddie already exists", () => {
            it("reuses the existing OutOfBattleSquaddie instead of recreating it", () => {
                const {
                    armyManager,
                    coordinateCollection,
                    deploymentManager,
                    outOfBattleSquaddieManager,
                    inBattleSquaddieManager,
                    coordinateMapCollectionManager,
                } = buildAssignedLiniDeployment()
                outOfBattleSquaddieManager.addOrUpdateSquaddie(
                    CampaignTestHarness.createLiniOutOfBattleSquaddie()
                )

                CampaignSquaddieMissionBridgeService.deployAssignedCampaignSquaddies(
                    {
                        armyManager,
                        coordinateCollection,
                        deploymentManager,
                        outOfBattleSquaddieManager,
                        inBattleSquaddieManager,
                        coordinateMapCollectionManager,
                        mapId: MAP_ID,
                    }
                )

                expect(
                    outOfBattleSquaddieManager.getRawOutOfBattleSquaddie(
                        CampaignTestHarnessIds.lini.outOfBattleSquaddieId
                    )?.actionIds
                ).toEqual([CampaignTestHarnessIds.lini.scimitarActionId])
            })
        })

        describe("when a deployment coordinate has an assigned campaign squaddie", () => {
            it("creates an InBattleSquaddie and places it at the coordinate on the map", () => {
                const {
                    armyManager,
                    coordinateCollection,
                    deploymentManager,
                    outOfBattleSquaddieManager,
                    inBattleSquaddieManager,
                    coordinateMapCollectionManager,
                } = buildAssignedLiniDeployment({ row: 1, col: 2 })

                CampaignSquaddieMissionBridgeService.deployAssignedCampaignSquaddies(
                    {
                        armyManager,
                        coordinateCollection,
                        deploymentManager,
                        outOfBattleSquaddieManager,
                        inBattleSquaddieManager,
                        coordinateMapCollectionManager,
                        mapId: MAP_ID,
                    }
                )

                expect(
                    coordinateMapCollectionManager.getSquaddieAtCoordinate({
                        mapId: MAP_ID,
                        coordinate: { row: 1, col: 2 },
                    })
                ).toEqual({
                    outOfBattleSquaddieId:
                        CampaignTestHarnessIds.lini.outOfBattleSquaddieId,
                    inBattleSquaddieId: expect.any(Number),
                })
            })
        })

        describe("when a deployment coordinate has no assignment", () => {
            it("does not create or place anything for that coordinate", () => {
                const {
                    armyManager,
                    coordinateCollection,
                    deploymentManager,
                    outOfBattleSquaddieManager,
                    inBattleSquaddieManager,
                    coordinateMapCollectionManager,
                } = buildOpenCoordinateDeployment({ row: 1, col: 2 })

                CampaignSquaddieMissionBridgeService.deployAssignedCampaignSquaddies(
                    {
                        armyManager,
                        coordinateCollection,
                        deploymentManager,
                        outOfBattleSquaddieManager,
                        inBattleSquaddieManager,
                        coordinateMapCollectionManager,
                        mapId: MAP_ID,
                    }
                )

                expect(
                    coordinateMapCollectionManager.getSquaddieAtCoordinate({
                        mapId: MAP_ID,
                        coordinate: { row: 1, col: 2 },
                    })
                ).toBeUndefined()
            })
        })
    })
})
