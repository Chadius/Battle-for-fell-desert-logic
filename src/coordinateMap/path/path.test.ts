import { beforeEach, describe, expect, it } from "vitest"
import {
    type CoordinateMovePath,
    CoordinateMovePathMoveType,
    CoordinateMovePathService,
} from "./path.js"

describe("Creating Paths", () => {
    let path: CoordinateMovePath

    beforeEach(() => {
        path = CoordinateMovePathService.new({
            steps: [
                {
                    row: 2,
                    col: 1,
                    moveType: CoordinateMovePathMoveType.START,
                    moveCost: 0,
                },
                {
                    row: 2,
                    col: 3,
                    moveType: CoordinateMovePathMoveType.WALK,
                    moveCost: 5,
                },
            ],
        })
    })

    it("can get the Number of Coordinates", () => {
        expect(CoordinateMovePathService.getNumberOfCoordinates(path)).toEqual(
            2
        )
    })

    it("can get the Total Movement Spent", () => {
        expect(CoordinateMovePathService.getTotalMoveCost(path)).toEqual(5)
    })

    it("Throws an error if an empty path is created", () => {
        expect(() =>
            CoordinateMovePathService.new({
                steps: [],
            })
        ).toThrow("1 coordinate")
    })

    it("can get the Start Coordinate", () => {
        expect(CoordinateMovePathService.getStartCoordinate(path)).toEqual(
            expect.objectContaining({
                row: 2,
                col: 1,
            })
        )
    })
    it("can get the End Coordinate", () => {
        expect(CoordinateMovePathService.getEndCoordinate(path)).toEqual(
            expect.objectContaining({
                row: 2,
                col: 3,
            })
        )
    })

    it("can get details on how to move along the path", () => {
        expect(CoordinateMovePathService.getMovementInstructions(path)).toEqual(
            [
                {
                    start: expect.objectContaining({ row: 2, col: 1 }),
                    end: expect.objectContaining({ row: 2, col: 1 }),
                    moveType: CoordinateMovePathMoveType.START,
                },
                {
                    start: expect.objectContaining({ row: 2, col: 1 }),
                    end: expect.objectContaining({ row: 2, col: 3 }),
                    moveType: CoordinateMovePathMoveType.WALK,
                },
                {
                    start: expect.objectContaining({ row: 2, col: 3 }),
                    end: expect.objectContaining({ row: 2, col: 3 }),
                    moveType: CoordinateMovePathMoveType.END,
                },
            ]
        )
    })
})
