import { beforeEach, describe, expect, it } from "vitest"
import { type CoordinateMap, CoordinateMapService } from "../coordinateMap.ts"
import {
    type CoordinatePathMap,
    CoordinatePathMapService,
} from "./coordinatePathMap.ts"
import {
    CoordinateMovePathMoveType,
    CoordinateMovePathService,
} from "../path/path.ts"

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
                map: coordinateMap,
                moveType: CoordinateMovePathMoveType.WALK,
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
                    map: coordinateMap,
                    moveType: CoordinateMovePathMoveType.WALK,
                })
            ).toBeUndefined()

            const actualPath = CoordinatePathMapService.getPath({
                coordinatePathMap: transpositionMap,
                row: 0,
                col: 2,
                map: coordinateMap,
                moveType: CoordinateMovePathMoveType.WALK,
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
            const actualPath = CoordinatePathMapService.getPath({
                coordinatePathMap: transpositionMap,
                row: 0,
                col: 3,
                map: coordinateMap,
                moveType: CoordinateMovePathMoveType.WALK,
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
})
