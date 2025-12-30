import { beforeEach, describe, expect, it } from "vitest"
import { type CoordinateMap, CoordinateMapService } from "../coordinateMap"
import {
    type CoordinatePathMap,
    CoordinatePathMapService,
} from "./coordinatePathMap"
import {
    CoordinateMovePathMoveType,
    CoordinateMovePathService,
} from "../path/path"

describe("Map Transposition", () => {
    let coordinateMap: CoordinateMap
    let transpositionMap: CoordinatePathMap
    beforeEach(() => {
        coordinateMap = CoordinateMapService.new({
            id: "map",
            name: "map",
            movementProperties: ["1 1 1 2 ", " 1 1 1 1 ", "1 1 1 1 "],
        })

        transpositionMap = CoordinatePathMapService.new({
            id: "transpositionMap",
            name: "transpositionMap",
            map: coordinateMap,
        })
    })
    it("knows the dimensions of the transposition", () => {
        expect(
            CoordinatePathMapService.getNumberOfRows({
                coordinatePathMap: transpositionMap,
            })
        ).toEqual(3)
        expect(
            CoordinatePathMapService.getNumberOfColumns({
                coordinatePathMap: transpositionMap,
            })
        ).toEqual(4)
    })

    it("starts with no paths defined", () => {
        expect(
            CoordinatePathMapService.getPath({
                coordinatePathMap: transpositionMap,
                row: 0,
                col: 0,
            })
        ).toBeUndefined()
    })

    describe("Generating Paths by adding points", () => {
        it("can generate a 1 point path once a coordinate is added", () => {
            CoordinatePathMapService.add({
                coordinatePathMap: transpositionMap,
                currentCoordinate: {
                    row: 0,
                    col: 2,
                },
                previousCoordinate: undefined,
            })

            expect(
                CoordinatePathMapService.getPath({
                    coordinatePathMap: transpositionMap,
                    row: 0,
                    col: 0,
                })
            ).toBeUndefined()

            CoordinatePathMapService.extendPath({
                coordinatePathMap: transpositionMap,
                row: 0,
                col: 2,
                map: coordinateMap,
                moveType: CoordinateMovePathMoveType.WALK,
            })

            const actualPath = CoordinatePathMapService.getPath({
                coordinatePathMap: transpositionMap,
                row: 0,
                col: 2,
            })

            expect(actualPath).toBeDefined()
            expect(
                CoordinateMovePathService.getNumberOfCoordinates(actualPath!)
            ).toEqual(1)
            expect(
                CoordinateMovePathService.getTotalMoveCost(actualPath!)
            ).toEqual(0)
            expect(
                CoordinateMovePathService.getStartCoordinate(actualPath!)
            ).toEqual(
                expect.objectContaining({
                    row: 0,
                    col: 2,
                })
            )
        })

        it("can generate a path once multiple points are connected together", () => {
            CoordinatePathMapService.add({
                coordinatePathMap: transpositionMap,
                currentCoordinate: {
                    row: 0,
                    col: 2,
                },
                previousCoordinate: undefined,
            })
            CoordinatePathMapService.add({
                coordinatePathMap: transpositionMap,
                currentCoordinate: {
                    row: 0,
                    col: 3,
                },
                previousCoordinate: {
                    row: 0,
                    col: 2,
                },
            })

            CoordinatePathMapService.extendPath({
                coordinatePathMap: transpositionMap,
                row: 0,
                col: 3,
                map: coordinateMap,
                moveType: CoordinateMovePathMoveType.WALK,
            })

            const actualPath = CoordinatePathMapService.getPath({
                coordinatePathMap: transpositionMap,
                row: 0,
                col: 3,
            })
            expect(actualPath).toBeDefined()
            expect(
                CoordinateMovePathService.getNumberOfCoordinates(actualPath!)
            ).toEqual(2)
            expect(
                CoordinateMovePathService.getTotalMoveCost(actualPath!)
            ).toEqual(2)
            expect(
                CoordinateMovePathService.getStartCoordinate(actualPath!)
            ).toEqual(
                expect.objectContaining({
                    row: 0,
                    col: 2,
                })
            )
            expect(
                CoordinateMovePathService.getEndCoordinate(actualPath!)
            ).toEqual(
                expect.objectContaining({
                    row: 0,
                    col: 3,
                })
            )
            expect(
                CoordinateMovePathService.getMovementInstructions(actualPath!)
            ).toEqual([
                expect.objectContaining({
                    start: expect.objectContaining({ row: 0, col: 2 }),
                    end: expect.objectContaining({ row: 0, col: 2 }),
                    moveType: CoordinateMovePathMoveType.START,
                }),
                expect.objectContaining({
                    start: expect.objectContaining({ row: 0, col: 2 }),
                    end: expect.objectContaining({ row: 0, col: 3 }),
                    moveType: CoordinateMovePathMoveType.WALK,
                }),
                expect.objectContaining({
                    start: expect.objectContaining({ row: 0, col: 3 }),
                    end: expect.objectContaining({ row: 0, col: 3 }),
                    moveType: CoordinateMovePathMoveType.END,
                }),
            ])
        })
    })

    describe("GetClosestPaths", () => {
        let coordinateMap: CoordinateMap
        let coordinatePathMap: CoordinatePathMap
        beforeEach(() => {
            coordinateMap = CoordinateMapService.new({
                id: "getClosestPath",
                name: "getClosestPath",
                movementProperties: [
                    "2 2 1 1 1 ",
                    " 1 1 1 1 1 ",
                    "1 1 1 1 1 ",
                    " 2 2 2 2 2 ",
                    "2 2 2 2 2 ",
                ],
            })
            coordinatePathMap = CoordinatePathMapService.new({
                id: "coordinatePathMap",
                name: "coordinatePathMap",
                map: coordinateMap,
            })
        })
        it("if there is a direct path return it", () => {
            CoordinatePathMapService.add({
                coordinatePathMap,
                currentCoordinate: {
                    row: 2,
                    col: 3,
                },
                previousCoordinate: undefined,
            })
            CoordinatePathMapService.extendPath({
                coordinatePathMap,
                row: 2,
                col: 3,
                map: coordinateMap,
                moveType: CoordinateMovePathMoveType.WALK,
            })
            const expectedPath = CoordinatePathMapService.getPath({
                coordinatePathMap,
                row: 2,
                col: 3,
            })

            const actualPath = CoordinatePathMapService.getClosestPath({
                coordinatePathMap,
                targetCoordinate: {
                    row: 2,
                    col: 3,
                },
            })

            expect(actualPath).toEqual(expectedPath)
        })
        it("Get the path with the closest end coordinate", () => {
            CoordinatePathMapService.add({
                coordinatePathMap,
                currentCoordinate: {
                    row: 2,
                    col: 1,
                },
                previousCoordinate: undefined,
            })
            CoordinatePathMapService.add({
                coordinatePathMap,
                currentCoordinate: {
                    row: 2,
                    col: 2,
                },
                previousCoordinate: {
                    row: 2,
                    col: 1,
                },
            })
            CoordinatePathMapService.extendPath({
                map: coordinateMap,
                moveType: CoordinateMovePathMoveType.WALK,
                coordinatePathMap,
                row: 2,
                col: 2,
            })
            const expectedPath = CoordinatePathMapService.getPath({
                coordinatePathMap,
                row: 2,
                col: 2,
            })

            const actualPath = CoordinatePathMapService.getClosestPath({
                coordinatePathMap,
                targetCoordinate: {
                    row: 2,
                    col: 3,
                },
            })

            expect(actualPath).toEqual(expectedPath)
        })
        it("If multiple paths are equally close, use the path with less move distance", () => {
            CoordinatePathMapService.add({
                coordinatePathMap,
                currentCoordinate: {
                    row: 2,
                    col: 1,
                },
                previousCoordinate: undefined,
            })
            CoordinatePathMapService.add({
                coordinatePathMap,
                currentCoordinate: {
                    row: 2,
                    col: 2,
                },
                previousCoordinate: {
                    row: 2,
                    col: 1,
                },
            })
            CoordinatePathMapService.extendPath({
                map: coordinateMap,
                moveType: CoordinateMovePathMoveType.WALK,
                coordinatePathMap,
                row: 2,
                col: 2,
            })

            CoordinatePathMapService.add({
                coordinatePathMap,
                currentCoordinate: {
                    row: 3,
                    col: 1,
                },
                previousCoordinate: undefined,
            })
            CoordinatePathMapService.add({
                coordinatePathMap,
                currentCoordinate: {
                    row: 3,
                    col: 2,
                },
                previousCoordinate: {
                    row: 3,
                    col: 1,
                },
            })
            CoordinatePathMapService.extendPath({
                map: coordinateMap,
                moveType: CoordinateMovePathMoveType.WALK,
                coordinatePathMap,
                row: 3,
                col: 2,
            })
            const expectedPath = CoordinatePathMapService.getPath({
                coordinatePathMap,
                row: 2,
                col: 2,
            })

            const actualPath = CoordinatePathMapService.getClosestPath({
                coordinatePathMap,
                targetCoordinate: {
                    row: 2,
                    col: 3,
                },
            })

            expect(actualPath).toEqual(expectedPath)
        })
        it("Can override the maximum search distance", () => {
            CoordinatePathMapService.add({
                coordinatePathMap,
                currentCoordinate: {
                    row: 0,
                    col: 4,
                },
                previousCoordinate: undefined,
            })

            const actualPathDefaultMaxDistance3 =
                CoordinatePathMapService.getClosestPath({
                    coordinatePathMap,
                    targetCoordinate: {
                        row: 3,
                        col: 4,
                    },
                })

            expect(actualPathDefaultMaxDistance3).toBeUndefined()

            const expectedPath = CoordinatePathMapService.getPath({
                coordinatePathMap,
                row: 0,
                col: 4,
            })

            const actualPathUnlimitedDistance =
                CoordinatePathMapService.getClosestPath({
                    coordinatePathMap,
                    targetCoordinate: {
                        row: 3,
                        col: 4,
                    },
                    maxDistanceOverride: 9001,
                })

            expect(actualPathUnlimitedDistance).toEqual(expectedPath)
        })
    })
})
