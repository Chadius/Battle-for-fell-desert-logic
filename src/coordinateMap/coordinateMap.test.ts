import { describe, expect, it } from "vitest"
import {
    CoordinateMapService,
    type SerializedCoordinateMap,
} from "./coordinateMap"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import { CoordinateMovePathService } from "./path/path"

describe("Coordinate Map", () => {
    it("creates a new map instead of modifying the original", () => {
        const originalMap = CoordinateMapService.new({
            id: "original",
            name: "original",
            movementProperties: ["1 1 1 1 ", " 1 1 1 1 ", "1 1 1 1 "],
        })

        const addSquaddieMap = CoordinateMapService.addSquaddie({
            map: originalMap,
            coordinate: { row: 1, col: 1 },
            squaddieId: {
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "squaddie",
            },
        })

        expect(originalMap).not.toBe(addSquaddieMap)
        expect(
            CoordinateMapService.getSquaddieAtCoordinate({
                map: originalMap,
                coordinate: { row: 1, col: 1 },
            })
        ).toBeUndefined()
        expect(
            CoordinateMapService.getSquaddieAtCoordinate({
                map: addSquaddieMap,
                coordinate: { row: 1, col: 1 },
            })
        ).toBeDefined()

        expect(
            CoordinateMapService.getSquaddieCoordinate({
                map: originalMap,
                squaddieId: {
                    inBattleSquaddieId: 0,
                    outOfBattleSquaddieId: "squaddie",
                },
            })
        ).toBeUndefined()
        expect(
            CoordinateMapService.getSquaddieCoordinate({
                map: addSquaddieMap,
                squaddieId: {
                    inBattleSquaddieId: 0,
                    outOfBattleSquaddieId: "squaddie",
                },
            })
        ).toBeDefined()

        const moveSquaddieMap = CoordinateMapService.addSquaddie({
            map: originalMap,
            coordinate: { row: 2, col: 1 },
            squaddieId: {
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "squaddie",
            },
        })

        expect(originalMap).not.toBe(moveSquaddieMap)
        expect(addSquaddieMap).not.toBe(moveSquaddieMap)

        expect(
            CoordinateMapService.getSquaddieAtCoordinate({
                map: moveSquaddieMap,
                coordinate: { row: 2, col: 1 },
            })
        ).toBeDefined()
        expect(
            CoordinateMapService.getSquaddieAtCoordinate({
                map: addSquaddieMap,
                coordinate: { row: 1, col: 1 },
            })
        ).toBeDefined()

        expect(
            CoordinateMapService.getSquaddieCoordinate({
                map: addSquaddieMap,
                squaddieId: {
                    inBattleSquaddieId: 0,
                    outOfBattleSquaddieId: "squaddie",
                },
            })
        ).toBeDefined()
        expect(
            CoordinateMapService.getSquaddieCoordinate({
                map: moveSquaddieMap,
                squaddieId: {
                    inBattleSquaddieId: 0,
                    outOfBattleSquaddieId: "squaddie",
                },
            })
        ).toBeDefined()
    })

    describe("serialization", () => {
        it("serializes a map with no squaddies", () => {
            const map = CoordinateMapService.new({
                id: "test-map",
                name: "Test Map",
                movementProperties: ["1 1 1", "1 - 1", "1 1 x"],
            })

            const serialized = CoordinateMapService.serialize(map)

            expect(serialized.id).toBe("test-map")
            expect(serialized.name).toBe("Test Map")
            expect(serialized.coordinates).toHaveLength(3)
            expect(serialized.coordinateBySquaddie).toEqual({})
            expect(serialized.coordinatesSquaddiesCannotStopOn).toContain("1,1")
            expect(serialized.coordinatesSquaddiesCannotStopOn).toContain("2,2")
        })

        it("serializes a map with squaddies", () => {
            let map = CoordinateMapService.new({
                id: "test-map",
                name: "Test Map",
                movementProperties: ["1 1 1", "1 1 1", "1 1 1"],
            })

            map = CoordinateMapService.addSquaddie({
                map,
                squaddieId: {
                    outOfBattleSquaddieId: "player-1",
                    inBattleSquaddieId: 0,
                },
                coordinate: { row: 0, col: 0 },
            })

            map = CoordinateMapService.addSquaddie({
                map,
                squaddieId: {
                    outOfBattleSquaddieId: "enemy-1",
                    inBattleSquaddieId: 1,
                },
                coordinate: { row: 2, col: 2 },
            })

            const serialized = CoordinateMapService.serialize(map)

            expect(serialized.coordinateBySquaddie["player-1"]).toBeDefined()
            expect(serialized.coordinateBySquaddie["player-1"]["0"]).toEqual({
                row: 0,
                col: 0,
            })
            expect(serialized.coordinateBySquaddie["enemy-1"]).toBeDefined()
            expect(serialized.coordinateBySquaddie["enemy-1"]["1"]).toEqual({
                row: 2,
                col: 2,
            })
        })

        it("serializes to JSON-compatible format", () => {
            let map = CoordinateMapService.new({
                id: "test-map",
                name: "Test Map",
                movementProperties: ["1 1", "1 1"],
            })

            map = CoordinateMapService.addSquaddie({
                map,
                squaddieId: {
                    outOfBattleSquaddieId: "player-1",
                    inBattleSquaddieId: 0,
                },
                coordinate: { row: 0, col: 0 },
            })

            const serialized = CoordinateMapService.serialize(map)
            const jsonString = JSON.stringify(serialized)
            const parsed = JSON.parse(jsonString)

            expect(parsed.id).toBe("test-map")
            expect(parsed.coordinateBySquaddie["player-1"]["0"]).toEqual({
                row: 0,
                col: 0,
            })
        })

        it("deserializes a map with no squaddies", () => {
            const serialized: SerializedCoordinateMap = {
                id: "test-map",
                name: "Test Map",
                coordinates: [
                    [
                        { row: 0, col: 0, movementCost: 1, canStop: true },
                        { row: 0, col: 1, movementCost: 1, canStop: true },
                    ],
                    [
                        { row: 1, col: 0, movementCost: 1, canStop: true },
                        { row: 1, col: 1, movementCost: 1, canStop: false },
                    ],
                ],
                coordinateBySquaddie: {},
                coordinatesSquaddiesCannotStopOn: ["1,1"],
            }

            const map = CoordinateMapService.deserialize(serialized)

            expect(map.id).toBe("test-map")
            expect(map.name).toBe("Test Map")
            expect(map.coordinates).toHaveLength(2)
            expect(map.coordinateBySquaddie.size).toBe(0)
            expect(map.coordinatesSquaddiesCannotStopOn.has("1,1")).toBe(true)
        })

        it("deserializes a map with squaddies", () => {
            const serialized: SerializedCoordinateMap = {
                id: "test-map",
                name: "Test Map",
                coordinates: [
                    [
                        {
                            row: 0,
                            col: 0,
                            movementCost: 1,
                            canStop: true,
                            squaddieId: {
                                outOfBattleSquaddieId: "player-1",
                                inBattleSquaddieId: 0,
                            },
                        },
                        { row: 0, col: 1, movementCost: 1, canStop: true },
                    ],
                    [
                        { row: 1, col: 0, movementCost: 1, canStop: true },
                        { row: 1, col: 1, movementCost: 1, canStop: true },
                    ],
                ],
                coordinateBySquaddie: {
                    "player-1": {
                        "0": { row: 0, col: 0 },
                    },
                },
                coordinatesSquaddiesCannotStopOn: [],
            }

            const map = CoordinateMapService.deserialize(serialized)

            expect(map.coordinateBySquaddie.has("player-1")).toBe(true)
            expect(map.coordinateBySquaddie.get("player-1")?.has(0)).toBe(true)
            expect(map.coordinateBySquaddie.get("player-1")?.get(0)).toEqual({
                row: 0,
                col: 0,
            })

            const squaddieCoord = CoordinateMapService.getSquaddieCoordinate({
                map,
                squaddieId: {
                    outOfBattleSquaddieId: "player-1",
                    inBattleSquaddieId: 0,
                },
            })
            expect(squaddieCoord).toEqual({ row: 0, col: 0 })
        })

        it("round-trip preserves map state", () => {
            let originalMap = CoordinateMapService.new({
                id: "test-map",
                name: "Test Map",
                movementProperties: ["1 1 1", "1 - 1", "1 1 x"],
            })

            originalMap = CoordinateMapService.addSquaddie({
                map: originalMap,
                squaddieId: {
                    outOfBattleSquaddieId: "player-1",
                    inBattleSquaddieId: 0,
                },
                coordinate: { row: 0, col: 0 },
            })

            originalMap = CoordinateMapService.addSquaddie({
                map: originalMap,
                squaddieId: {
                    outOfBattleSquaddieId: "player-1",
                    inBattleSquaddieId: 1,
                },
                coordinate: { row: 0, col: 2 },
            })

            const serialized = CoordinateMapService.serialize(originalMap)
            const deserializedMap = CoordinateMapService.deserialize(serialized)

            expect(deserializedMap.id).toBe(originalMap.id)
            expect(deserializedMap.name).toBe(originalMap.name)
            expect(deserializedMap.coordinates.length).toBe(
                originalMap.coordinates.length
            )

            expect(
                CoordinateMapService.getSquaddieCoordinate({
                    map: deserializedMap,
                    squaddieId: {
                        outOfBattleSquaddieId: "player-1",
                        inBattleSquaddieId: 0,
                    },
                })
            ).toEqual({ row: 0, col: 0 })

            expect(
                CoordinateMapService.getSquaddieCoordinate({
                    map: deserializedMap,
                    squaddieId: {
                        outOfBattleSquaddieId: "player-1",
                        inBattleSquaddieId: 1,
                    },
                })
            ).toEqual({ row: 0, col: 2 })

            expect(
                deserializedMap.coordinatesSquaddiesCannotStopOn.has("1,1")
            ).toBe(true)
            expect(
                deserializedMap.coordinatesSquaddiesCannotStopOn.has("2,2")
            ).toBe(true)
        })

        it("round-trip through JSON preserves map state", () => {
            let originalMap = CoordinateMapService.new({
                id: "test-map",
                name: "Test Map",
                movementProperties: ["1 1", "1 1"],
            })

            originalMap = CoordinateMapService.addSquaddie({
                map: originalMap,
                squaddieId: {
                    outOfBattleSquaddieId: "player-1",
                    inBattleSquaddieId: 0,
                },
                coordinate: { row: 0, col: 0 },
            })

            const serialized = CoordinateMapService.serialize(originalMap)
            const jsonString = JSON.stringify(serialized)
            const parsed = JSON.parse(jsonString) as SerializedCoordinateMap
            const deserializedMap = CoordinateMapService.deserialize(parsed)

            expect(deserializedMap.id).toBe(originalMap.id)
            expect(
                CoordinateMapService.getSquaddieCoordinate({
                    map: deserializedMap,
                    squaddieId: {
                        outOfBattleSquaddieId: "player-1",
                        inBattleSquaddieId: 0,
                    },
                })
            ).toEqual({ row: 0, col: 0 })
        })
    })

    describe("calculateRoute", () => {
        it("uses the starting coordinate column, not the row", () => {
            let map = CoordinateMapService.new({
                id: "test-map",
                name: "Test Map",
                movementProperties: [
                    "1 1 2 1 1",
                    " 1 - 1 x 1",
                    "1 1 1 1 2",
                    " 2 1 - 1 1",
                ],
            })

            map = CoordinateMapService.addSquaddie({
                map,
                coordinate: { row: 0, col: 1 },
                squaddieId: {
                    inBattleSquaddieId: 0,
                    outOfBattleSquaddieId: "squaddie",
                },
            })

            const { expectedPath } = CoordinateMapService.calculateRoute({
                map,
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "squaddie",
                inBattleSquaddieManager: new InBattleSquaddieManager(),
                stopConditions: [{ desiredDestination: { row: 0, col: 2 } }],
            })

            const startStep =
                CoordinateMovePathService.getStartCoordinate(expectedPath)
            expect(startStep.row).toBe(0)
            expect(startStep.col).toBe(1)
        })

        it("uses actual terrain movement cost instead of incrementing by 1", () => {
            let map = CoordinateMapService.new({
                id: "test-map",
                name: "Test Map",
                movementProperties: ["1 1 1", " 2 2 2"],
            })

            map = CoordinateMapService.addSquaddie({
                map,
                coordinate: { row: 0, col: 0 },
                squaddieId: {
                    inBattleSquaddieId: 0,
                    outOfBattleSquaddieId: "squaddie",
                },
            })

            const { expectedPath } = CoordinateMapService.calculateRoute({
                map,
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "squaddie",
                inBattleSquaddieManager: new InBattleSquaddieManager(),
                stopConditions: [{ desiredDestination: { row: 1, col: 0 } }],
            })

            const endStep =
                CoordinateMovePathService.getEndCoordinate(expectedPath)
            expect(endStep.moveCost).toBe(2)
        })
    })
})
