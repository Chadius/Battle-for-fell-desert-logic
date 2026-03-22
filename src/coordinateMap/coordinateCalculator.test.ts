import { describe, expect, it } from "vitest"
import type { TCoordinateDirection } from "./coordinateCalculator"
import {
    CoordinateCalculator,
    CoordinateDirection,
} from "./coordinateCalculator"

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
    describe("get coordinates in a ring of a certain radius around a center", () => {
        it("returns only the center for radius 0", () => {
            const ring = CoordinateCalculator.getCoordinatesInRing(
                { row: 2, col: 3 },
                0
            )

            expect(ring).toHaveLength(1)
            expect(ring).toEqual([{ row: 2, col: 3 }])
        })

        it("returns the neighboring 6 coordinates for radius 1", () => {
            const center = { row: 2, col: 3 }
            const ring = CoordinateCalculator.getCoordinatesInRing(center, 1)
            const neighbors = CoordinateCalculator.getAllNeighbors(center)

            expect(ring).toHaveLength(6)
            expect(ring).toEqual(expect.arrayContaining(neighbors))
        })

        it("returns 12 coordinates for radius 2", () => {
            const center = { row: 0, col: 0 }
            const ring = CoordinateCalculator.getCoordinatesInRing(center, 2)

            expect(ring).toHaveLength(12)

            ring.forEach((coordinate) => {
                expect(
                    CoordinateCalculator.getDistanceBetween(center, coordinate)
                ).toBe(2)
            })
        })

        it("returns 18 coordinates for radius 3", () => {
            const center = { row: 5, col: 5 }
            const ring = CoordinateCalculator.getCoordinatesInRing(center, 3)

            expect(ring).toHaveLength(18)

            ring.forEach((coordinate) => {
                expect(
                    CoordinateCalculator.getDistanceBetween(center, coordinate)
                ).toBe(3)
            })
        })

        it("ring coordinates do not include center or inner rings", () => {
            const center = { row: 3, col: 4 }
            const ring2 = CoordinateCalculator.getCoordinatesInRing(center, 2)
            const ring1 = CoordinateCalculator.getCoordinatesInRing(center, 1)

            expect(ring2).not.toContainEqual(center)

            ring1.forEach((coordinate) => {
                expect(ring2).not.toContainEqual(coordinate)
            })
        })
    })
    describe("calculateEveryCoordinateInLine", () => {
        it("returns only the start coordinate when from and to are the same", () => {
            const path = CoordinateCalculator.calculateEveryCoordinateInLine(
                { row: 2, col: 3 },
                { row: 2, col: 3 }
            )
            expect(path).toHaveLength(1)
            expect(path).toEqual([{ row: 2, col: 3 }])
        })

        it("returns three hexes for a straight RIGHT line of length 2", () => {
            const path = CoordinateCalculator.calculateEveryCoordinateInLine(
                { row: 2, col: 0 },
                { row: 2, col: 2 }
            )
            expect(path).toHaveLength(3)
            expect(path[0]).toEqual({ row: 2, col: 0 })
            expect(path[1]).toEqual({ row: 2, col: 1 })
            expect(path[2]).toEqual({ row: 2, col: 2 })
        })

        it("includes all intermediate hexes on a diagonal path", () => {
            const from = { row: 0, col: 0 }
            const to = { row: -2, col: 1 }
            const path = CoordinateCalculator.calculateEveryCoordinateInLine(
                from,
                to
            )

            const dist = CoordinateCalculator.getDistanceBetween(from, to)
            expect(path).toHaveLength(dist + 1)
            expect(path[0]).toEqual(from)
            expect(path[path.length - 1]).toEqual(to)
        })

        it("handles an odd-row origin correctly", () => {
            const path = CoordinateCalculator.calculateEveryCoordinateInLine(
                { row: 1, col: 1 },
                { row: 1, col: 3 }
            )
            expect(path).toHaveLength(3)
            expect(path[0]).toEqual({ row: 1, col: 1 })
            expect(path[1]).toEqual({ row: 1, col: 2 })
            expect(path[2]).toEqual({ row: 1, col: 3 })
        })
    })
    describe("getPerpendicularDirections", () => {
        it("returns a default pair when from and to are the same coordinate", () => {
            const [dir1, dir2] =
                CoordinateCalculator.getPerpendicularDirections(
                    { row: 2, col: 3 },
                    { row: 2, col: 3 }
                )
            expect(dir1).toBe(CoordinateDirection.UP_LEFT)
            expect(dir2).toBe(CoordinateDirection.DOWN_RIGHT)
        })

        it("returns the two most perpendicular directions for a RIGHT-pointing line", () => {
            const perpDirs = CoordinateCalculator.getPerpendicularDirections(
                { row: 2, col: 0 },
                { row: 2, col: 3 }
            ) as [TCoordinateDirection, TCoordinateDirection]
            const perpSet = new Set(perpDirs)
            expect(perpSet.has(CoordinateDirection.UP_LEFT)).toBe(true)
            expect(perpSet.has(CoordinateDirection.DOWN_RIGHT)).toBe(true)
        })

        it("returns two directions that are perpendicular (dot product = 0) when possible", () => {
            const [dir1, dir2] =
                CoordinateCalculator.getPerpendicularDirections(
                    { row: 0, col: 0 },
                    { row: 0, col: 4 }
                )
            const axialDir1 = CoordinateCalculator.getAxialOffset(dir1)
            const axialDir2 = CoordinateCalculator.getAxialOffset(dir2)

            const dotProduct = (
                axialDir: { q: number; r: number },
                differenceVector: { q: number; r: number }
            ): number => {
                return (
                    axialDir.q * differenceVector.q +
                    axialDir.r * differenceVector.r
                )
            }

            expect(dotProduct(axialDir1, { q: 1, r: 0 })).toBe(0)
            expect(dotProduct(axialDir2, { q: 1, r: 0 })).toBe(0)
        })
    })
})
