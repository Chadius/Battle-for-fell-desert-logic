import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine"
import { MissionManager } from "../../missionManager"
import { MissionStateService } from "../../missionState"
import {
    MissionEngineTestHarness,
    MissionEngineTestHarnessIds,
} from "../../../testUtils/mission/missionEngineTestHarness"

describe("MissionEngine map and position methods", () => {
    describe("getMapDimensions", () => {
        it("throws error if MissionManager is undefined", () => {
            const missionEngine = new MissionEngine()

            expect(() => missionEngine.getMapDimensions()).toThrow(
                "missionManager is undefined"
            )
        })

        it("throws error if coordinateMapCollectionManager is undefined", () => {
            const missionManager = new MissionManager({
                missionState: MissionStateService.new({
                    id: "mission-1",
                    mapId: "map-1",
                }),
            })
            const missionEngine = new MissionEngine(missionManager)

            expect(() => missionEngine.getMapDimensions()).toThrow(
                "coordinateMapCollectionManager is undefined"
            )
        })

        it("returns map dimensions from the test harness", () => {
            const harness = new MissionEngineTestHarness()
            const missionEngine = new MissionEngine(harness.missionManager)

            const dimensions = missionEngine.getMapDimensions()

            expect(dimensions.width).toBe(5)
            expect(dimensions.height).toBe(4)
        })
    })

    describe("getTerrainAtCoordinate", () => {
        let harness: MissionEngineTestHarness
        let missionEngine: MissionEngine

        beforeEach(() => {
            harness = new MissionEngineTestHarness()
            missionEngine = new MissionEngine(harness.missionManager)
        })

        it("throws error if MissionManager is undefined", () => {
            const engine = new MissionEngine()

            expect(() =>
                engine.getTerrainAtCoordinate({ row: 0, col: 0 })
            ).toThrow("missionManager is undefined")
        })

        it("throws error if coordinateMapCollectionManager is undefined", () => {
            const missionManager = new MissionManager({
                missionState: MissionStateService.new({
                    id: "mission-1",
                    mapId: "map-1",
                }),
            })
            const engine = new MissionEngine(missionManager)

            expect(() =>
                engine.getTerrainAtCoordinate({ row: 0, col: 0 })
            ).toThrow("coordinateMapCollectionManager is undefined")
        })

        it("returns terrain properties for a normal tile", () => {
            const terrain = missionEngine.getTerrainAtCoordinate({
                row: 0,
                col: 0,
            })

            expect(terrain.movementCost).toBe(1)
            expect(terrain.canStop).toBe(true)
        })

        it("returns terrain properties for a difficult terrain tile", () => {
            const terrain = missionEngine.getTerrainAtCoordinate({
                row: 0,
                col: 2,
            })

            expect(terrain.movementCost).toBe(2)
            expect(terrain.canStop).toBe(true)
        })

        it("returns movementCost 1 and canStop false for a pit tile", () => {
            const terrain = missionEngine.getTerrainAtCoordinate({
                row: 1,
                col: 1,
            })

            expect(terrain.movementCost).toBe(1)
            expect(terrain.canStop).toBe(false)
        })

        it("returns undefined movementCost for a wall tile", () => {
            const terrain = missionEngine.getTerrainAtCoordinate({
                row: 1,
                col: 3,
            })

            expect(terrain.movementCost).toBe(undefined)
            expect(terrain.canStop).toBe(false)
        })

        it("returns undefined movementCost for out of bounds coordinate", () => {
            const terrain = missionEngine.getTerrainAtCoordinate({
                row: 100,
                col: 100,
            })

            expect(terrain.movementCost).toBe(undefined)
            expect(terrain.canStop).toBe(false)
        })
    })

    describe("getAllSquaddiePositions", () => {
        it("throws error if MissionManager is undefined", () => {
            const missionEngine = new MissionEngine()

            expect(() => missionEngine.getAllSquaddiePositions()).toThrow(
                "missionManager is undefined"
            )
        })

        it("throws error if coordinateMapCollectionManager is undefined", () => {
            const missionManager = new MissionManager({
                missionState: MissionStateService.new({
                    id: "mission-1",
                    mapId: "map-1",
                }),
            })
            const missionEngine = new MissionEngine(missionManager)

            expect(() => missionEngine.getAllSquaddiePositions()).toThrow(
                "coordinateMapCollectionManager is undefined"
            )
        })

        it("returns all squaddie positions from the test harness", () => {
            const harness = new MissionEngineTestHarness()
            const missionEngine = new MissionEngine(harness.missionManager)

            const positions = missionEngine.getAllSquaddiePositions()

            expect(positions).toHaveLength(2)

            const liniPosition = positions.find(
                (p) =>
                    p.squaddieId.outOfBattleSquaddieId ===
                    MissionEngineTestHarnessIds.lini.outOfBattleSquaddieId
            )
            expect(liniPosition).toBeDefined()
            expect(liniPosition!.coordinate.row).toBe(0)
            expect(liniPosition!.coordinate.col).toBe(0)

            const slitherPosition = positions.find(
                (p) =>
                    p.squaddieId.outOfBattleSquaddieId ===
                    MissionEngineTestHarnessIds.slitherDemon
                        .outOfBattleSquaddieId
            )
            expect(slitherPosition).toBeDefined()
            expect(slitherPosition!.coordinate.row).toBe(3)
            expect(slitherPosition!.coordinate.col).toBe(4)
        })
    })

    describe("getSquaddiePosition", () => {
        let harness: MissionEngineTestHarness
        let missionEngine: MissionEngine

        beforeEach(() => {
            harness = new MissionEngineTestHarness()
            missionEngine = new MissionEngine(harness.missionManager)
        })

        it("throws error if MissionManager is undefined", () => {
            const engine = new MissionEngine()

            expect(() =>
                engine.getSquaddiePosition(harness.getLiniSquaddieId())
            ).toThrow("missionManager is undefined")
        })

        it("throws error if coordinateMapCollectionManager is undefined", () => {
            const missionManager = new MissionManager({
                missionState: MissionStateService.new({
                    id: "mission-1",
                    mapId: "map-1",
                }),
            })
            const engine = new MissionEngine(missionManager)

            expect(() =>
                engine.getSquaddiePosition(harness.getLiniSquaddieId())
            ).toThrow("coordinateMapCollectionManager is undefined")
        })

        it("returns position for Lini", () => {
            const position = missionEngine.getSquaddiePosition(
                harness.getLiniSquaddieId()
            )

            expect(position).toBeDefined()
            expect(position!.row).toBe(0)
            expect(position!.col).toBe(0)
        })

        it("returns position for Slither Demon", () => {
            const position = missionEngine.getSquaddiePosition(
                harness.getSlitherDemonSquaddieId()
            )

            expect(position).toBeDefined()
            expect(position!.row).toBe(3)
            expect(position!.col).toBe(4)
        })

        it("returns undefined for unknown squaddie", () => {
            const position = missionEngine.getSquaddiePosition({
                outOfBattleSquaddieId: "unknown",
                inBattleSquaddieId: 999,
            })

            expect(position).toBeUndefined()
        })
    })

    describe("getSquaddieAtCoordinate", () => {
        let harness: MissionEngineTestHarness
        let missionEngine: MissionEngine

        beforeEach(() => {
            harness = new MissionEngineTestHarness()
            missionEngine = new MissionEngine(harness.missionManager)
        })

        it("throws error if MissionManager is undefined", () => {
            const engine = new MissionEngine()

            expect(() =>
                engine.getSquaddieAtCoordinate({ row: 0, col: 0 })
            ).toThrow("missionManager is undefined")
        })

        it("throws error if coordinateMapCollectionManager is undefined", () => {
            const missionManager = new MissionManager({
                missionState: MissionStateService.new({
                    id: "mission-1",
                    mapId: "map-1",
                }),
            })
            const engine = new MissionEngine(missionManager)

            expect(() =>
                engine.getSquaddieAtCoordinate({ row: 0, col: 0 })
            ).toThrow("coordinateMapCollectionManager is undefined")
        })

        it("returns Lini at (0,0)", () => {
            const squaddieId = missionEngine.getSquaddieAtCoordinate({
                row: 0,
                col: 0,
            })

            expect(squaddieId).toBeDefined()
            expect(squaddieId!.outOfBattleSquaddieId).toBe(
                MissionEngineTestHarnessIds.lini.outOfBattleSquaddieId
            )
        })

        it("returns Slither Demon at (3,4)", () => {
            const squaddieId = missionEngine.getSquaddieAtCoordinate({
                row: 3,
                col: 4,
            })

            expect(squaddieId).toBeDefined()
            expect(squaddieId!.outOfBattleSquaddieId).toBe(
                MissionEngineTestHarnessIds.slitherDemon.outOfBattleSquaddieId
            )
        })

        it("returns undefined for empty coordinate", () => {
            const squaddieId = missionEngine.getSquaddieAtCoordinate({
                row: 1,
                col: 1,
            })

            expect(squaddieId).toBeUndefined()
        })
    })

    describe("getActionById", () => {
        let harness: MissionEngineTestHarness
        let missionEngine: MissionEngine

        beforeEach(() => {
            harness = new MissionEngineTestHarness()
            missionEngine = new MissionEngine(harness.missionManager)
        })

        it("throws error if MissionManager is undefined", () => {
            const engine = new MissionEngine()

            expect(() => engine.getActionById("some-action")).toThrow(
                "missionManager is undefined"
            )
        })

        it("throws error if squaddieActionManager is undefined", () => {
            const missionManager = new MissionManager({
                missionState: MissionStateService.new({
                    id: "mission-1",
                    mapId: "map-1",
                }),
            })
            const engine = new MissionEngine(missionManager)

            expect(() => engine.getActionById("some-action")).toThrow(
                "squaddieActionManager is undefined"
            )
        })

        it("returns Lini scimitar action", () => {
            const action = missionEngine.getActionById(
                MissionEngineTestHarnessIds.lini.scimitarActionId
            )

            expect(action).toBeDefined()
            expect(action.id).toBe(
                MissionEngineTestHarnessIds.lini.scimitarActionId
            )
            expect(action.name).toBe("Scimitar")
        })

        it("returns Lini blessing action", () => {
            const action = missionEngine.getActionById(
                MissionEngineTestHarnessIds.lini.blessingActionId
            )

            expect(action).toBeDefined()
            expect(action.id).toBe(
                MissionEngineTestHarnessIds.lini.blessingActionId
            )
            expect(action.name).toBe("Blessing")
        })

        it("returns Lini heal action", () => {
            const action = missionEngine.getActionById(
                MissionEngineTestHarnessIds.lini.healActionId
            )

            expect(action).toBeDefined()
            expect(action.id).toBe(
                MissionEngineTestHarnessIds.lini.healActionId
            )
            expect(action.name).toBe("Heal")
        })

        it("returns Slither Demon claw action", () => {
            const action = missionEngine.getActionById(
                MissionEngineTestHarnessIds.slitherDemon.clawActionId
            )

            expect(action).toBeDefined()
            expect(action.id).toBe(
                MissionEngineTestHarnessIds.slitherDemon.clawActionId
            )
            expect(action.name).toBe("Claw")
        })

        it("throws error for unknown action", () => {
            expect(() => missionEngine.getActionById("unknown-action")).toThrow(
                "No action unknown-action was found"
            )
        })
    })
})
