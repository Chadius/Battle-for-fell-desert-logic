import { beforeEach, describe, expect, it } from "vitest"
import {
    type CoordinateMapCollection,
    CoordinateMapCollectionService,
} from "./coordinateMapCollection.ts"
import { CoordinateMapCollectionManager } from "./coordinateMapManager.ts"

describe("Coordinate Map Manager", () => {
    let coordinateMapCollection: CoordinateMapCollection
    let manager: CoordinateMapCollectionManager

    describe("Creating a Coordinate Map", () => {
        beforeEach(() => {
            coordinateMapCollection = CoordinateMapCollectionService.new()
            coordinateMapCollection =
                CoordinateMapCollectionService.createNewMap({
                    collection: coordinateMapCollection,
                    id: "testMap",
                    name: "testMap",
                    movementProperties: ["1 1 1 1 ", " 1 2 1 x ", "1 - x x "],
                })
            manager = new CoordinateMapCollectionManager(
                coordinateMapCollection
            )
        })

        it("can list all known maps", () => {
            expect(manager.getAllMapIds()).toEqual(["testMap"])
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
                    q: 0,
                    r: 0,
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
                    q: 1,
                    r: 1,
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
                    q: 2,
                    r: 1,
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
                    q: 2,
                    r: 3,
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
                manager.isCoordinateOnMap({ id: "testMap", q: 0, r: 0 })
            ).toBeTruthy()
            expect(
                manager.isCoordinateOnMap({ id: "testMap", q: -1, r: 0 })
            ).toBeFalsy()
            expect(
                manager.isCoordinateOnMap({ id: "testMap", q: 0, r: -1 })
            ).toBeFalsy()
            expect(
                manager.isCoordinateOnMap({ id: "testMap", q: 0, r: 4 })
            ).toBeFalsy()
            expect(
                manager.isCoordinateOnMap({ id: "testMap", q: 3, r: 0 })
            ).toBeFalsy()
        })

        it("should say the movement properties are none if the location is off map", () => {
            expect(
                manager.getMovementPropertiesAtCoordinate({
                    id: "testMap",
                    q: -9001,
                    r: 9002,
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
                CoordinateMapCollectionService.createNewMap({
                    collection: coordinateMapCollection,
                    id: "testMap",
                    name: "testMap",
                    movementProperties: ["1 1 1 1 ", " 1 1 1 1 ", "1 1 1 1 "],
                })
            manager = new CoordinateMapCollectionManager(
                coordinateMapCollection
            )
        })

        it("can add a squaddie at a given coordinate", () => {
            manager.addSquaddie({
                mapId: "testMap",
                squaddieId: {
                    outOfBattle: "soldier",
                    inBattle: 0,
                },
                coordinate: { q: 0, r: 2 },
            })

            expect(
                manager.getSquaddieCoordinate({
                    mapId: "testMap",
                    squaddieId: {
                        outOfBattle: "soldier",
                        inBattle: 0,
                    },
                })
            ).toEqual({ q: 0, r: 2 })

            expect(
                manager.getSquaddieAtCoordinate({
                    mapId: "testMap",
                    coordinate: {
                        q: 0,
                        r: 2,
                    },
                })
            ).toEqual({
                outOfBattle: "soldier",
                inBattle: 0,
            })
        })

        it("can move a squaddie to a different coordinate", () => {
            manager.addSquaddie({
                mapId: "testMap",
                squaddieId: {
                    outOfBattle: "soldier",
                    inBattle: 0,
                },
                coordinate: { q: 0, r: 2 },
            })

            manager.moveSquaddie({
                mapId: "testMap",
                squaddieId: {
                    outOfBattle: "soldier",
                    inBattle: 0,
                },
                coordinate: { q: 1, r: 1 },
            })

            expect(
                manager.getSquaddieCoordinate({
                    mapId: "testMap",
                    squaddieId: {
                        outOfBattle: "soldier",
                        inBattle: 0,
                    },
                })
            ).toEqual({ q: 1, r: 1 })

            expect(
                manager.getSquaddieAtCoordinate({
                    mapId: "testMap",
                    coordinate: {
                        q: 0,
                        r: 2,
                    },
                })
            ).toBeUndefined()
        })

        it("can move squaddies off the map", () => {
            manager.addSquaddie({
                mapId: "testMap",
                squaddieId: {
                    outOfBattle: "soldier",
                    inBattle: 0,
                },
                coordinate: { q: 0, r: 2 },
            })

            manager.moveSquaddie({
                mapId: "testMap",
                squaddieId: {
                    outOfBattle: "soldier",
                    inBattle: 0,
                },
                coordinate: undefined,
            })

            expect(
                manager.getSquaddieAtCoordinate({
                    mapId: "testMap",
                    coordinate: {
                        q: 0,
                        r: 2,
                    },
                })
            ).toBeUndefined()

            expect(
                manager.getSquaddieCoordinate({
                    mapId: "testMap",
                    squaddieId: {
                        outOfBattle: "soldier",
                        inBattle: 0,
                    },
                })
            ).toEqual({ q: undefined, r: undefined })
        })

        it("can remove squaddies from the map", () => {
            manager.addSquaddie({
                mapId: "testMap",
                squaddieId: {
                    outOfBattle: "soldier",
                    inBattle: 0,
                },
                coordinate: { q: 0, r: 2 },
            })

            manager.removeSquaddie({
                mapId: "testMap",
                squaddieId: {
                    outOfBattle: "soldier",
                    inBattle: 0,
                },
            })

            expect(
                manager.getSquaddieCoordinate({
                    mapId: "testMap",
                    squaddieId: {
                        outOfBattle: "soldier",
                        inBattle: 0,
                    },
                })
            ).toBeUndefined()
        })

        it("can report all squaddies and their locations", () => {
            manager.addSquaddie({
                mapId: "testMap",
                squaddieId: {
                    outOfBattle: "soldier",
                    inBattle: 0,
                },
                coordinate: { q: 0, r: 2 },
            })
            manager.addSquaddie({
                mapId: "testMap",
                squaddieId: {
                    outOfBattle: "soldier",
                    inBattle: 1,
                },
                coordinate: { q: 1, r: 3 },
            })
            manager.addSquaddie({
                mapId: "testMap",
                squaddieId: {
                    outOfBattle: "offscreen",
                    inBattle: 0,
                },
                coordinate: undefined,
            })

            expect(manager.getAllSquaddieCoordinatesOnMap("testMap")).toEqual(
                expect.arrayContaining([
                    {
                        squaddieId: {
                            outOfBattle: "soldier",
                            inBattle: 0,
                        },
                        coordinate: { q: 0, r: 2 },
                    },
                    {
                        squaddieId: {
                            outOfBattle: "soldier",
                            inBattle: 1,
                        },
                        coordinate: { q: 1, r: 3 },
                    },
                    {
                        squaddieId: {
                            outOfBattle: "offscreen",
                            inBattle: 0,
                        },
                        coordinate: { q: undefined, r: undefined },
                    },
                ])
            )
        })

        it("will throw an error if squaddies move onto the same location", () => {
            manager.addSquaddie({
                mapId: "testMap",
                squaddieId: {
                    outOfBattle: "soldier",
                    inBattle: 0,
                },
                coordinate: { q: 0, r: 2 },
            })

            expect(() => {
                manager.addSquaddie({
                    mapId: "testMap",
                    squaddieId: {
                        outOfBattle: "soldier",
                        inBattle: 0,
                    },
                    coordinate: { q: 0, r: 2 },
                })
            }).not.toThrow()

            expect(() => {
                manager.addSquaddie({
                    mapId: "testMap",
                    squaddieId: {
                        outOfBattle: "soldier",
                        inBattle: 1,
                    },
                    coordinate: { q: 0, r: 2 },
                })
            }).toThrow("another squaddie is at (0, 2)")

            expect(
                manager.getSquaddieCoordinate({
                    mapId: "testMap",
                    squaddieId: {
                        outOfBattle: "soldier",
                        inBattle: 0,
                    },
                })
            ).toEqual({ q: 0, r: 2 })
        })
    })
})
