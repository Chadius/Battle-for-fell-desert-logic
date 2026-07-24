import { describe, expect, it } from "vitest"
import { CampaignSquaddieDeploymentManager } from "./campaignSquaddieDeploymentManager.js"
import { ArmyManager } from "../campaign/army/armyManager.js"
import { ArmyService } from "../campaign/army/army.js"
import {
    type CampaignSquaddie,
    CampaignSquaddieService,
} from "../campaign/army/campaignSquaddie.js"
import {
    type CampaignSquaddieDeploymentCoordinateCollection,
    CampaignSquaddieDeploymentCoordinateCollectionService,
} from "./campaignSquaddieDeploymentCoordinateCollection.js"
import { CampaignSquaddieDeploymentCoordinateService } from "./campaignSquaddieDeploymentCoordinate.js"
import type { OffsetCoordinate } from "../coordinateMap/offsetCoordinate.js"

const campaignSquaddie = (
    id: string,
    overrides: Partial<
        Omit<Parameters<typeof CampaignSquaddieService.new>[0], "id">
    > = {}
): CampaignSquaddie =>
    CampaignSquaddieService.new({
        id,
        outOfBattleAttributeSheetId: `sheet-${id}`,
        name: id,
        ...overrides,
    })

const armyManagerWithSquaddies = (
    ...campaignSquaddies: CampaignSquaddie[]
): ArmyManager => {
    const armyManager = new ArmyManager(ArmyService.new())
    campaignSquaddies.forEach((squaddie) => armyManager.addOrUpdate(squaddie))
    return armyManager
}

const addCoordinate = (
    collection: CampaignSquaddieDeploymentCoordinateCollection,
    options: Omit<
        Parameters<typeof CampaignSquaddieDeploymentCoordinateService.new>[0],
        "coordinate"
    > & { coordinate?: OffsetCoordinate }
): CampaignSquaddieDeploymentCoordinateCollection =>
    CampaignSquaddieDeploymentCoordinateCollectionService.addOrUpdate({
        collection,
        campaignSquaddieDeploymentCoordinate:
            CampaignSquaddieDeploymentCoordinateService.new({
                coordinate: {
                    row: 0,
                    col: CampaignSquaddieDeploymentCoordinateCollectionService.getAll(
                        collection
                    ).length,
                },
                ...options,
            }),
    })

describe("CampaignSquaddieDeploymentManager", () => {
    describe("constructor", () => {
        describe("when the coordinate collection requests more than one LEADER-type coordinate", () => {
            it("throws", () => {
                const armyManager = armyManagerWithSquaddies()
                let coordinateCollection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-leader-1",
                    request: { type: "LEADER" },
                })
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-leader-2",
                    coordinate: { row: 0, col: 1 },
                    request: { type: "LEADER" },
                })

                expect(
                    () =>
                        new CampaignSquaddieDeploymentManager({
                            armyManager,
                            coordinateCollection,
                        })
                ).toThrow(/at most one LEADER-type coordinate/)
            })
        })

        describe("when one coordinate requests the LEADER role and another requests the army's leader by name", () => {
            it("throws", () => {
                const armyManager = armyManagerWithSquaddies(
                    campaignSquaddie("captain", { isLeader: true })
                )
                let coordinateCollection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-leader-role",
                    request: { type: "LEADER" },
                })
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-leader-by-name",
                    request: {
                        type: "SPECIFIC_SQUADDIE",
                        campaignSquaddieId: "captain",
                    },
                })

                expect(
                    () =>
                        new CampaignSquaddieDeploymentManager({
                            armyManager,
                            coordinateCollection,
                        })
                ).toThrow(/ambiguous assignment/)
            })
        })
    })

    describe("defaultAssign", () => {
        describe("when a coordinate requests a specific eligible campaign squaddie", () => {
            it("assigns that squaddie to the coordinate", () => {
                const armyManager = armyManagerWithSquaddies(
                    campaignSquaddie("lini")
                )
                let coordinateCollection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-1",
                    request: {
                        type: "SPECIFIC_SQUADDIE",
                        campaignSquaddieId: "lini",
                    },
                })
                const manager = new CampaignSquaddieDeploymentManager({
                    armyManager,
                    coordinateCollection,
                })

                manager.defaultAssign()

                expect(manager.getAssignedCampaignSquaddieId("slot-1")).toBe(
                    "lini"
                )
            })
        })

        describe("when a coordinate requests a specific campaign squaddie who is injured", () => {
            it("leaves the coordinate open", () => {
                const armyManager = armyManagerWithSquaddies(
                    campaignSquaddie("lini", {
                        injury: { duration: 2, permanent: false },
                    })
                )
                let coordinateCollection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-1",
                    request: {
                        type: "SPECIFIC_SQUADDIE",
                        campaignSquaddieId: "lini",
                    },
                    locked: true,
                })
                const manager = new CampaignSquaddieDeploymentManager({
                    armyManager,
                    coordinateCollection,
                })

                manager.defaultAssign()

                expect(
                    manager.getAssignedCampaignSquaddieId("slot-1")
                ).toBeUndefined()
            })
        })

        describe("when a coordinate requests the army's leader", () => {
            it("assigns the leader to the coordinate", () => {
                const armyManager = armyManagerWithSquaddies(
                    campaignSquaddie("captain", { isLeader: true })
                )
                let coordinateCollection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-leader",
                    request: { type: "LEADER" },
                })
                const manager = new CampaignSquaddieDeploymentManager({
                    armyManager,
                    coordinateCollection,
                })

                manager.defaultAssign()

                expect(
                    manager.getAssignedCampaignSquaddieId("slot-leader")
                ).toBe("captain")
            })
        })

        describe("when no leader exists in the army", () => {
            it("leaves the locked LEADER coordinate open as a fallback", () => {
                const armyManager = armyManagerWithSquaddies(
                    campaignSquaddie("lini")
                )
                let coordinateCollection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-leader",
                    request: { type: "LEADER" },
                    locked: true,
                })
                const manager = new CampaignSquaddieDeploymentManager({
                    armyManager,
                    coordinateCollection,
                })

                manager.defaultAssign()

                expect(
                    manager.getAssignedCampaignSquaddieId("slot-leader")
                ).toBeUndefined()
            })
        })
    })

    describe("getOpenCoordinates", () => {
        describe("after defaultAssign leaves some coordinates unfilled", () => {
            it("returns only the unfilled coordinates", () => {
                const armyManager = armyManagerWithSquaddies(
                    campaignSquaddie("lini")
                )
                let coordinateCollection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-filled",
                    request: {
                        type: "SPECIFIC_SQUADDIE",
                        campaignSquaddieId: "lini",
                    },
                })
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-open",
                    request: { type: "NONE" },
                })
                const manager = new CampaignSquaddieDeploymentManager({
                    armyManager,
                    coordinateCollection,
                })

                manager.defaultAssign()

                expect(
                    manager
                        .getOpenCoordinates()
                        .map((coordinate) => coordinate.id)
                ).toEqual(["slot-open"])
            })
        })
    })

    describe("getUnplacedEligibleCampaignSquaddies", () => {
        describe("when a campaign squaddie is injured", () => {
            it("excludes the injured squaddie from the unplaced eligible list", () => {
                const armyManager = armyManagerWithSquaddies(
                    campaignSquaddie("injured-squaddie", {
                        injury: { duration: 1, permanent: false },
                    }),
                    campaignSquaddie("bench-squaddie")
                )
                const manager = new CampaignSquaddieDeploymentManager({
                    armyManager,
                    coordinateCollection:
                        CampaignSquaddieDeploymentCoordinateCollectionService.new(),
                })

                expect(
                    manager
                        .getUnplacedEligibleCampaignSquaddies()
                        .map((squaddie) => squaddie.id)
                ).toEqual(["bench-squaddie"])
            })
        })

        describe("when a campaign squaddie is already assigned to a coordinate", () => {
            it("excludes the placed squaddie from the unplaced eligible list", () => {
                const armyManager = armyManagerWithSquaddies(
                    campaignSquaddie("lini"),
                    campaignSquaddie("bench-squaddie")
                )
                let coordinateCollection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-1",
                    request: {
                        type: "SPECIFIC_SQUADDIE",
                        campaignSquaddieId: "lini",
                    },
                })
                const manager = new CampaignSquaddieDeploymentManager({
                    armyManager,
                    coordinateCollection,
                })

                manager.defaultAssign()

                expect(
                    manager
                        .getUnplacedEligibleCampaignSquaddies()
                        .map((squaddie) => squaddie.id)
                ).toEqual(["bench-squaddie"])
            })
        })
    })
})
