import { describe, expect, it } from "vitest"
import {
    CoordinateCalculator,
    CoordinateDirection,
} from "./coordinateCalculator.ts"

describe("coordinateCalculator", () => {
    describe("get neighboring coordinates", () => {
        it("can get all neighboring coordinates", () => {
            const neighbors = CoordinateCalculator.getAllNeighbors({
                row: 2,
                col: 0,
            })

            expect(neighbors).toHaveLength(6)
            expect(neighbors).toEqual(
                expect.arrayContaining([
                    { col: 1, row: 2 },
                    { col: 0, row: 1 },
                    { col: -1, row: 1 },
                    { col: -1, row: 2 },
                    { col: -1, row: 3 },
                    { col: 0, row: 3 },
                ])
            )
        })
        it("can get neighbor coordinates based on direction for an even row", () => {
            expect(
                CoordinateCalculator.getNeighbor(
                    { row: 2, col: 3 },
                    CoordinateDirection.RIGHT
                )
            ).toEqual({
                row: 2,
                col: 4,
            })

            expect(
                CoordinateCalculator.getNeighbor(
                    { row: 2, col: 3 },
                    CoordinateDirection.UP_RIGHT
                )
            ).toEqual({
                row: 1,
                col: 3,
            })

            expect(
                CoordinateCalculator.getNeighbor(
                    { row: 2, col: 3 },
                    CoordinateDirection.UP_LEFT
                )
            ).toEqual({
                row: 1,
                col: 2,
            })

            expect(
                CoordinateCalculator.getNeighbor(
                    { row: 2, col: 3 },
                    CoordinateDirection.LEFT
                )
            ).toEqual({
                row: 2,
                col: 2,
            })

            expect(
                CoordinateCalculator.getNeighbor(
                    { row: 2, col: 3 },
                    CoordinateDirection.DOWN_LEFT
                )
            ).toEqual({
                row: 3,
                col: 2,
            })

            expect(
                CoordinateCalculator.getNeighbor(
                    { row: 2, col: 3 },
                    CoordinateDirection.DOWN_RIGHT
                )
            ).toEqual({
                row: 3,
                col: 3,
            })
        })
        it("can get neighbor coordinates based on direction for an odd row", () => {
            expect(
                CoordinateCalculator.getNeighbor(
                    { row: 1, col: 3 },
                    CoordinateDirection.RIGHT
                )
            ).toEqual({
                row: 1,
                col: 4,
            })

            expect(
                CoordinateCalculator.getNeighbor(
                    { row: 1, col: 3 },
                    CoordinateDirection.UP_RIGHT
                )
            ).toEqual({
                row: 0,
                col: 4,
            })

            expect(
                CoordinateCalculator.getNeighbor(
                    { row: 1, col: 3 },
                    CoordinateDirection.UP_LEFT
                )
            ).toEqual({
                row: 0,
                col: 3,
            })

            expect(
                CoordinateCalculator.getNeighbor(
                    { row: 1, col: 3 },
                    CoordinateDirection.LEFT
                )
            ).toEqual({
                row: 1,
                col: 2,
            })

            expect(
                CoordinateCalculator.getNeighbor(
                    { row: 1, col: 3 },
                    CoordinateDirection.DOWN_LEFT
                )
            ).toEqual({
                row: 2,
                col: 3,
            })

            expect(
                CoordinateCalculator.getNeighbor(
                    { row: 1, col: 3 },
                    CoordinateDirection.DOWN_RIGHT
                )
            ).toEqual({
                row: 2,
                col: 4,
            })
        })
    })
    describe("get all points within a given radius", () => {
        it("returns the origin if range is less than 1", () => {
            expect(
                CoordinateCalculator.getAllCoordinatesWithinRadius(
                    { row: 0, col: 1 },
                    0
                )
            ).toEqual([{ row: 0, col: 1 }])
        })

        it("returns the origin and all neighbors if range is 1", () => {
            const expected = [
                ...CoordinateCalculator.getAllNeighbors({
                    row: 0,
                    col: 1,
                }),
                { row: 0, col: 1 },
            ]

            let allCoordinatesWithinRadius =
                CoordinateCalculator.getAllCoordinatesWithinRadius(
                    { row: 0, col: 1 },
                    1
                )
            expect(allCoordinatesWithinRadius).toHaveLength(expected.length)
            expect(allCoordinatesWithinRadius).toEqual(
                expect.arrayContaining(expected)
            )
        })

        it("returns the origin and all within range 2", () => {
            const expected = [
                { row: 0, col: 1 },

                { row: 0, col: 2 },
                { row: -1, col: 1 },
                { row: -1, col: 0 },
                { row: 0, col: 0 },
                { row: 1, col: 0 },
                { row: 1, col: 1 },

                { row: 0, col: 3 },
                { row: -1, col: 2 },
                { row: -2, col: 2 },
                { row: -2, col: 1 },
                { row: -2, col: 0 },
                { row: -1, col: -1 },

                { row: 0, col: -1 },
                { row: 1, col: -1 },
                { row: 2, col: 0 },
                { row: 2, col: 1 },
                { row: 2, col: 2 },
                { row: 1, col: 2 },
            ]

            let allCoordinatesWithinRadius =
                CoordinateCalculator.getAllCoordinatesWithinRadius(
                    { row: 0, col: 1 },
                    2
                )
            expect(allCoordinatesWithinRadius).toHaveLength(expected.length)
            expect(allCoordinatesWithinRadius).toEqual(
                expect.arrayContaining(expected)
            )
        })
    })
})
