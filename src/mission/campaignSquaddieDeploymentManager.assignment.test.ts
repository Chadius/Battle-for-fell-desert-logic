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
        outOfBattleSquaddieId: `battle-${id}`,
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

describe("CampaignSquaddieDeploymentManager assignment operations", () => {
    describe("assign", () => {
        describe("when the coordinate is open and the campaign squaddie is eligible", () => {
            it("assigns the squaddie to the coordinate", () => {
                const armyManager = armyManagerWithSquaddies(
                    campaignSquaddie("lini")
                )
                let coordinateCollection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-1",
                    request: { type: "NONE" },
                })
                const manager = new CampaignSquaddieDeploymentManager({
                    armyManager,
                    coordinateCollection,
                })

                manager.assign({
                    coordinateId: "slot-1",
                    campaignSquaddieId: "lini",
                })

                expect(manager.getAssignedCampaignSquaddieId("slot-1")).toBe(
                    "lini"
                )
            })
        })

        describe("when the campaign squaddie is injured", () => {
            it("throws", () => {
                const armyManager = armyManagerWithSquaddies(
                    campaignSquaddie("lini", {
                        injury: { duration: 2, permanent: false },
                    })
                )
                let coordinateCollection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-1",
                    request: { type: "NONE" },
                })
                const manager = new CampaignSquaddieDeploymentManager({
                    armyManager,
                    coordinateCollection,
                })

                expect(() =>
                    manager.assign({
                        coordinateId: "slot-1",
                        campaignSquaddieId: "lini",
                    })
                ).toThrow(/injured/)
            })
        })

        describe("when the campaign squaddie is already assigned to a different open coordinate", () => {
            it("moves the squaddie to the newly assigned coordinate", () => {
                const armyManager = armyManagerWithSquaddies(
                    campaignSquaddie("lini")
                )
                let coordinateCollection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-1",
                    request: { type: "NONE" },
                })
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-2",
                    request: { type: "NONE" },
                })
                const manager = new CampaignSquaddieDeploymentManager({
                    armyManager,
                    coordinateCollection,
                })
                manager.assign({
                    coordinateId: "slot-1",
                    campaignSquaddieId: "lini",
                })

                manager.assign({
                    coordinateId: "slot-2",
                    campaignSquaddieId: "lini",
                })

                expect(
                    manager.getAssignedCampaignSquaddieId("slot-1")
                ).toBeUndefined()
                expect(manager.getAssignedCampaignSquaddieId("slot-2")).toBe(
                    "lini"
                )
            })
        })

        describe("when the target coordinate's lock is already satisfied by another squaddie", () => {
            it("throws", () => {
                const armyManager = armyManagerWithSquaddies(
                    campaignSquaddie("lini"),
                    campaignSquaddie("bench-squaddie")
                )
                let coordinateCollection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-locked",
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

                expect(() =>
                    manager.assign({
                        coordinateId: "slot-locked",
                        campaignSquaddieId: "bench-squaddie",
                    })
                ).toThrow(/locked/)
            })
        })

        describe("when moving a squaddie away from a coordinate whose lock it currently satisfies", () => {
            it("throws", () => {
                const armyManager = armyManagerWithSquaddies(
                    campaignSquaddie("lini")
                )
                let coordinateCollection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-locked",
                    request: {
                        type: "SPECIFIC_SQUADDIE",
                        campaignSquaddieId: "lini",
                    },
                    locked: true,
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

                expect(() =>
                    manager.assign({
                        coordinateId: "slot-open",
                        campaignSquaddieId: "lini",
                    })
                ).toThrow(/locked/)
            })
        })
    })

    describe("unassign", () => {
        describe("when the coordinate has an assignment and is not lock-satisfied", () => {
            it("removes the assignment", () => {
                const armyManager = armyManagerWithSquaddies(
                    campaignSquaddie("lini")
                )
                let coordinateCollection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-1",
                    request: { type: "NONE" },
                })
                const manager = new CampaignSquaddieDeploymentManager({
                    armyManager,
                    coordinateCollection,
                })
                manager.assign({
                    coordinateId: "slot-1",
                    campaignSquaddieId: "lini",
                })

                manager.unassign("slot-1")

                expect(
                    manager.getAssignedCampaignSquaddieId("slot-1")
                ).toBeUndefined()
            })
        })

        describe("when the coordinate has no assignment", () => {
            it("does not throw", () => {
                const armyManager = armyManagerWithSquaddies()
                let coordinateCollection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-1",
                    request: { type: "NONE" },
                })
                const manager = new CampaignSquaddieDeploymentManager({
                    armyManager,
                    coordinateCollection,
                })

                expect(() => manager.unassign("slot-1")).not.toThrow()
            })
        })

        describe("when the coordinate's lock is currently satisfied", () => {
            it("throws", () => {
                const armyManager = armyManagerWithSquaddies(
                    campaignSquaddie("lini")
                )
                let coordinateCollection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-locked",
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

                expect(() => manager.unassign("slot-locked")).toThrow(/locked/)
            })
        })
    })

    describe("swap", () => {
        describe("when both coordinates are assigned and neither is lock-satisfied", () => {
            it("exchanges their assigned squaddies", () => {
                const armyManager = armyManagerWithSquaddies(
                    campaignSquaddie("lini"),
                    campaignSquaddie("bench-squaddie")
                )
                let coordinateCollection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-1",
                    request: { type: "NONE" },
                })
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-2",
                    request: { type: "NONE" },
                })
                const manager = new CampaignSquaddieDeploymentManager({
                    armyManager,
                    coordinateCollection,
                })
                manager.assign({
                    coordinateId: "slot-1",
                    campaignSquaddieId: "lini",
                })
                manager.assign({
                    coordinateId: "slot-2",
                    campaignSquaddieId: "bench-squaddie",
                })

                manager.swap({
                    coordinateIdA: "slot-1",
                    coordinateIdB: "slot-2",
                })

                expect(manager.getAssignedCampaignSquaddieId("slot-1")).toBe(
                    "bench-squaddie"
                )
                expect(manager.getAssignedCampaignSquaddieId("slot-2")).toBe(
                    "lini"
                )
            })
        })

        describe("when one coordinate is assigned and the other is open", () => {
            it("moves the squaddie into the open coordinate", () => {
                const armyManager = armyManagerWithSquaddies(
                    campaignSquaddie("lini")
                )
                let coordinateCollection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-1",
                    request: { type: "NONE" },
                })
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-2",
                    request: { type: "NONE" },
                })
                const manager = new CampaignSquaddieDeploymentManager({
                    armyManager,
                    coordinateCollection,
                })
                manager.assign({
                    coordinateId: "slot-1",
                    campaignSquaddieId: "lini",
                })

                manager.swap({
                    coordinateIdA: "slot-1",
                    coordinateIdB: "slot-2",
                })

                expect(
                    manager.getAssignedCampaignSquaddieId("slot-1")
                ).toBeUndefined()
                expect(manager.getAssignedCampaignSquaddieId("slot-2")).toBe(
                    "lini"
                )
            })
        })

        describe("when one of the coordinates has a satisfied lock", () => {
            it("throws", () => {
                const armyManager = armyManagerWithSquaddies(
                    campaignSquaddie("lini"),
                    campaignSquaddie("bench-squaddie")
                )
                let coordinateCollection =
                    CampaignSquaddieDeploymentCoordinateCollectionService.new()
                coordinateCollection = addCoordinate(coordinateCollection, {
                    id: "slot-locked",
                    request: {
                        type: "SPECIFIC_SQUADDIE",
                        campaignSquaddieId: "lini",
                    },
                    locked: true,
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
                manager.assign({
                    coordinateId: "slot-open",
                    campaignSquaddieId: "bench-squaddie",
                })

                expect(() =>
                    manager.swap({
                        coordinateIdA: "slot-locked",
                        coordinateIdB: "slot-open",
                    })
                ).toThrow(/locked/)
            })
        })
    })
})
