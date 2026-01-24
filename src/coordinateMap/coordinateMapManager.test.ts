import { beforeEach, describe, expect, it } from "vitest"
import {
    type CoordinateMapCollection,
    CoordinateMapCollectionService,
} from "./coordinateMapCollection"
import { CoordinateMapCollectionManager } from "./coordinateMapManager"
import {
    type CoordinateMap,
    CoordinateMapService,
    type SerializedCoordinateMap,
} from "./coordinateMap"

describe("Coordinate Map Manager", () => {
    let coordinateMapCollection: CoordinateMapCollection
    let manager: CoordinateMapCollectionManager

    describe("Creating a Coordinate Map", () => {
        beforeEach(() => {
            coordinateMapCollection = CoordinateMapCollectionService.new()
            manager = new CoordinateMapCollectionManager(
                coordinateMapCollection
            )
            manager.addOrUpdate({
                map: CoordinateMapService.new({
                    id: "testMap",
                    name: "testMap",
                    movementProperties: ["1 1 1 1 ", " 1 2 1 x ", "1 - x x "],
                }),
            })
        })

        it("should know the dimensions of coordinate map", () => {
            expect(manager.getMapDimensions("testMap")).toEqual(
                expect.objectContaining({ width: 4, height: 3 })
            )
        })

        it("should know the movement properties at a given coordinate", () => {
            expect(
                manager.getMovementPropertiesAtCoordinate({
                    id: "testMap",
                    row: 0,
                    col: 0,
                })
            ).toEqual(
                expect.objectContaining({
                    movementCost: 1,
                    canStop: true,
                })
            )

            expect(
                manager.getMovementPropertiesAtCoordinate({
                    id: "testMap",
                    row: 1,
                    col: 1,
                })
            ).toEqual(
                expect.objectContaining({
                    movementCost: 2,
                    canStop: true,
                })
            )

            expect(
                manager.getMovementPropertiesAtCoordinate({
                    id: "testMap",
                    row: 2,
                    col: 1,
                })
            ).toEqual(
                expect.objectContaining({
                    movementCost: 1,
                    canStop: false,
                })
            )

            expect(
                manager.getMovementPropertiesAtCoordinate({
                    id: "testMap",
                    row: 2,
                    col: 3,
                })
            ).toEqual(
                expect.objectContaining({
                    movementCost: undefined,
                    canStop: false,
                })
            )
        })

        it("should say if the coordinates are on map", () => {
            expect(
                manager.isCoordinateOnMap({ id: "testMap", row: 0, col: 0 })
            ).toBeTruthy()
            expect(
                manager.isCoordinateOnMap({ id: "testMap", row: -1, col: 0 })
            ).toBeFalsy()
            expect(
                manager.isCoordinateOnMap({ id: "testMap", row: 0, col: -1 })
            ).toBeFalsy()
            expect(
                manager.isCoordinateOnMap({ id: "testMap", row: 0, col: 4 })
            ).toBeFalsy()
            expect(
                manager.isCoordinateOnMap({ id: "testMap", row: 3, col: 0 })
            ).toBeFalsy()
        })

        it("should say the movement properties are none if the location is off map", () => {
            expect(
                manager.getMovementPropertiesAtCoordinate({
                    id: "testMap",
                    row: -9001,
                    col: 9002,
                })
            ).toEqual(
                expect.objectContaining({
                    movementCost: undefined,
                    canStop: false,
                })
            )
        })
    })

    describe("Adding and moving squaddies", () => {
        beforeEach(() => {
            coordinateMapCollection = CoordinateMapCollectionService.new()
            coordinateMapCollection =
                CoordinateMapCollectionService.addOrUpdate({
                    collection: coordinateMapCollection,
                    map: CoordinateMapService.new({
                        id: "testMap",
                        name: "testMap",
                        movementProperties: [
                            "1 1 1 1 ",
                            " 1 1 1 1 ",
                            "1 1 1 1 ",
                        ],
                    }),
                })
            manager = new CoordinateMapCollectionManager(
                coordinateMapCollection
            )
        })

        it("can add a squaddie at a given coordinate", () => {
            manager.addSquaddie({
                mapId: "testMap",
                squaddieId: {
                    outOfBattleSquaddieId: "soldier",
                    inBattleSquaddieId: 0,
                },
                coordinate: { row: 0, col: 2 },
            })

            expect(
                manager.getSquaddieCoordinate({
                    mapId: "testMap",
                    squaddieId: {
                        outOfBattleSquaddieId: "soldier",
                        inBattleSquaddieId: 0,
                    },
                })
            ).toEqual({ row: 0, col: 2 })

            expect(
                manager.getSquaddieAtCoordinate({
                    mapId: "testMap",
                    coordinate: {
                        row: 0,
                        col: 2,
                    },
                })
            ).toEqual({
                outOfBattleSquaddieId: "soldier",
                inBattleSquaddieId: 0,
            })
        })

        it("can move a squaddie to a different coordinate", () => {
            manager.addSquaddie({
                mapId: "testMap",
                squaddieId: {
                    outOfBattleSquaddieId: "soldier",
                    inBattleSquaddieId: 0,
                },
                coordinate: { row: 0, col: 2 },
            })

            manager.moveSquaddie({
                mapId: "testMap",
                squaddieId: {
                    outOfBattleSquaddieId: "soldier",
                    inBattleSquaddieId: 0,
                },
                coordinate: { row: 1, col: 1 },
            })

            expect(
                manager.getSquaddieCoordinate({
                    mapId: "testMap",
                    squaddieId: {
                        outOfBattleSquaddieId: "soldier",
                        inBattleSquaddieId: 0,
                    },
                })
            ).toEqual({ row: 1, col: 1 })

            expect(
                manager.getSquaddieAtCoordinate({
                    mapId: "testMap",
                    coordinate: {
                        row: 0,
                        col: 2,
                    },
                })
            ).toBeUndefined()
        })

        it("can move squaddies off the map", () => {
            manager.addSquaddie({
                mapId: "testMap",
                squaddieId: {
                    outOfBattleSquaddieId: "soldier",
                    inBattleSquaddieId: 0,
                },
                coordinate: { row: 0, col: 2 },
            })

            manager.moveSquaddie({
                mapId: "testMap",
                squaddieId: {
                    outOfBattleSquaddieId: "soldier",
                    inBattleSquaddieId: 0,
                },
                coordinate: undefined,
            })

            expect(
                manager.getSquaddieAtCoordinate({
                    mapId: "testMap",
                    coordinate: {
                        row: 0,
                        col: 2,
                    },
                })
            ).toBeUndefined()

            expect(
                manager.getSquaddieCoordinate({
                    mapId: "testMap",
                    squaddieId: {
                        outOfBattleSquaddieId: "soldier",
                        inBattleSquaddieId: 0,
                    },
                })
            ).toEqual({ row: undefined, col: undefined })
        })

        it("can remove squaddies from the map", () => {
            manager.addSquaddie({
                mapId: "testMap",
                squaddieId: {
                    outOfBattleSquaddieId: "soldier",
                    inBattleSquaddieId: 0,
                },
                coordinate: { row: 0, col: 2 },
            })

            manager.removeSquaddie({
                mapId: "testMap",
                squaddieId: {
                    outOfBattleSquaddieId: "soldier",
                    inBattleSquaddieId: 0,
                },
            })

            expect(
                manager.getSquaddieCoordinate({
                    mapId: "testMap",
                    squaddieId: {
                        outOfBattleSquaddieId: "soldier",
                        inBattleSquaddieId: 0,
                    },
                })
            ).toBeUndefined()
        })

        it("can report all squaddies and their locations", () => {
            manager.addSquaddie({
                mapId: "testMap",
                squaddieId: {
                    outOfBattleSquaddieId: "soldier",
                    inBattleSquaddieId: 0,
                },
                coordinate: { row: 0, col: 2 },
            })
            manager.addSquaddie({
                mapId: "testMap",
                squaddieId: {
                    outOfBattleSquaddieId: "soldier",
                    inBattleSquaddieId: 1,
                },
                coordinate: { row: 1, col: 3 },
            })
            manager.addSquaddie({
                mapId: "testMap",
                squaddieId: {
                    outOfBattleSquaddieId: "offscreen",
                    inBattleSquaddieId: 0,
                },
                coordinate: undefined,
            })

            expect(manager.getAllSquaddieCoordinatesOnMap("testMap")).toEqual(
                expect.arrayContaining([
                    {
                        squaddieId: {
                            outOfBattleSquaddieId: "soldier",
                            inBattleSquaddieId: 0,
                        },
                        coordinate: { row: 0, col: 2 },
                    },
                    {
                        squaddieId: {
                            outOfBattleSquaddieId: "soldier",
                            inBattleSquaddieId: 1,
                        },
                        coordinate: { row: 1, col: 3 },
                    },
                    {
                        squaddieId: {
                            outOfBattleSquaddieId: "offscreen",
                            inBattleSquaddieId: 0,
                        },
                        coordinate: { row: undefined, col: undefined },
                    },
                ])
            )
        })

        it("will throw an error if squaddies move onto the same location", () => {
            manager.addSquaddie({
                mapId: "testMap",
                squaddieId: {
                    outOfBattleSquaddieId: "soldier",
                    inBattleSquaddieId: 0,
                },
                coordinate: { row: 0, col: 2 },
            })

            expect(() => {
                manager.addSquaddie({
                    mapId: "testMap",
                    squaddieId: {
                        outOfBattleSquaddieId: "soldier",
                        inBattleSquaddieId: 0,
                    },
                    coordinate: { row: 0, col: 2 },
                })
            }).not.toThrow()

            expect(() => {
                manager.addSquaddie({
                    mapId: "testMap",
                    squaddieId: {
                        outOfBattleSquaddieId: "soldier",
                        inBattleSquaddieId: 1,
                    },
                    coordinate: { row: 0, col: 2 },
                })
            }).toThrow("another squaddie is at (0, 2)")

            expect(
                manager.getSquaddieCoordinate({
                    mapId: "testMap",
                    squaddieId: {
                        outOfBattleSquaddieId: "soldier",
                        inBattleSquaddieId: 0,
                    },
                })
            ).toEqual({ row: 0, col: 2 })
        })
    })

    describe("Serialize a map", () => {
        it("will throw an error if there is no collection", () => {
            manager = new CoordinateMapCollectionManager()
            expect(() => {
                manager.serializeMap("testMap")
            }).toThrow("coordinateMapCollection must be defined")
        })

        it("will throw an error if there is no map", () => {
            coordinateMapCollection = CoordinateMapCollectionService.new()
            manager = new CoordinateMapCollectionManager(
                coordinateMapCollection
            )
            expect(() => {
                manager.serializeMap("testMap")
            }).toThrow("mapId testMap must be defined")
        })

        it("will perform a JSON round trip", () => {
            coordinateMapCollection = CoordinateMapCollectionService.new()
            manager = new CoordinateMapCollectionManager(
                coordinateMapCollection
            )
            manager.addOrUpdate({
                map: CoordinateMapService.new({
                    id: "testMap",
                    name: "testMap",
                    movementProperties: ["1 1 1 1 ", " 1 2 1 x ", "1 - x x "],
                }),
            })
            manager.addSquaddie({
                mapId: "testMap",
                squaddieId: {
                    inBattleSquaddieId: 0,
                    outOfBattleSquaddieId: "soldier",
                },
                coordinate: {
                    row: 0,
                    col: 2,
                },
            })

            manager.addSquaddie({
                mapId: "testMap",
                squaddieId: {
                    inBattleSquaddieId: 0,
                    outOfBattleSquaddieId: "offscreen",
                },
                coordinate: undefined,
            })
            const originalMap = manager.getMapById("testMap")
            const serialized: SerializedCoordinateMap =
                manager.serializeMap("testMap")
            const serializedString = JSON.stringify(serialized)
            const parsedMap: SerializedCoordinateMap =
                JSON.parse(serializedString)
            const deserialized: CoordinateMap =
                manager.deserializeMap(parsedMap)
            expect(deserialized.id).toEqual(originalMap.id)
            expect(deserialized.name).toEqual(originalMap.name)
            expect(
                CoordinateMapService.getNumberOfColumns({ map: deserialized })
            ).toEqual(
                CoordinateMapService.getNumberOfColumns({ map: originalMap })
            )
            expect(
                CoordinateMapService.getNumberOfRows({ map: deserialized })
            ).toEqual(
                CoordinateMapService.getNumberOfRows({ map: originalMap })
            )
            expect(
                CoordinateMapService.getAllSquaddieCoordinatesOnMap(
                    deserialized
                )
            ).toEqual(
                CoordinateMapService.getAllSquaddieCoordinatesOnMap(originalMap)
            )
            expect(
                CoordinateMapService.getMoveCost({
                    map: deserialized,
                    row: 1,
                    col: 3,
                })
            ).toEqual(
                CoordinateMapService.getMoveCost({
                    map: originalMap,
                    row: 1,
                    col: 3,
                })
            )
        })
    })
})
