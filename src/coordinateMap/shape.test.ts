import { describe, expect, it } from "vitest"
import { CoordinateGeneratorShape, CoordinateShapeService } from "./shape.js"
import {
    CoordinateCalculator,
    CoordinateDirection,
} from "./coordinateCalculator.js"
import type { OffsetCoordinate } from "./offsetCoordinate.js"

describe("Coordinate Shapes", () => {
    describe("Generate Bloom type Shapes", () => {
        it("will only generate starting point for radius 0", () => {
            const coordinates0: OffsetCoordinate[] =
                CoordinateShapeService.calculateCoordinates({
                    shape: CoordinateGeneratorShape.BLOOM,
                    radius: 0,
                    origin: { row: 0, col: 0 },
                })

            expect(coordinates0).toHaveLength(1)
            expect(coordinates0).toEqual(
                expect.arrayContaining([{ row: 0, col: 0 }])
            )
        })
        it("will throw an error if negative radius is given", () => {
            expect(() => {
                CoordinateShapeService.calculateCoordinates({
                    shape: CoordinateGeneratorShape.BLOOM,
                    radius: -1,
                    origin: { row: 0, col: 0 },
                })
            }).toThrow("must be a non-negative integer")
        })

        it("will return all coordinates distance 0 and 1 away when the row is even", () => {
            const coordinates: OffsetCoordinate[] =
                CoordinateShapeService.calculateCoordinates({
                    shape: CoordinateGeneratorShape.BLOOM,
                    radius: 1,
                    origin: { row: 0, col: 0 },
                })

            expect(coordinates).toHaveLength(7)
            expect(coordinates).toEqual(
                expect.arrayContaining([
                    { row: 0, col: 0 },

                    { row: 0, col: 1 },
                    { row: 0, col: -1 },

                    { row: -1, col: 0 },
                    { row: -1, col: -1 },

                    { row: 1, col: 0 },
                    { row: 1, col: -1 },
                ])
            )
        })

        it("will return all coordinates 2 distance away when the row is odd", () => {
            const coordinates: OffsetCoordinate[] =
                CoordinateShapeService.calculateCoordinates({
                    shape: CoordinateGeneratorShape.BLOOM,
                    radius: 2,
                    origin: { row: 1, col: 2 },
                })

            expect(coordinates).toHaveLength(19)
            let origin = { row: 1, col: 2 }
            let distance1FromOrigin = [
                { row: 1, col: 1 },
                { row: 1, col: 0 },
                { row: 0, col: 2 },
                { row: 0, col: 3 },
                { row: 2, col: 2 },
                { row: 2, col: 3 },
            ]
            let distance2FromOrigin = [
                { row: -1, col: 1 },
                { row: -1, col: 2 },
                { row: -1, col: 3 },

                { row: 0, col: 1 },
                { row: 0, col: 4 },
                { row: 2, col: 1 },
                { row: 2, col: 4 },

                { row: 3, col: 1 },
                { row: 3, col: 2 },
                { row: 3, col: 3 },
            ]

            expect(coordinates).toEqual(
                expect.arrayContaining([
                    origin,
                    ...distance1FromOrigin,
                    ...distance2FromOrigin,
                ])
            )
        })
    })
    describe("Generate LINE type Shapes", () => {
        it("returns only the start hex when from and to are the same", () => {
            const coordinates = CoordinateShapeService.calculateCoordinates({
                shape: CoordinateGeneratorShape.LINE,
                from: { row: 2, col: 3 },
                to: { row: 2, col: 3 },
                width: 0,
            })
            expect(coordinates).toHaveLength(1)
            expect(coordinates).toEqual([{ row: 2, col: 3 }])
        })

        it("returns only the centerline hexes for width 0", () => {
            const from = { row: 2, col: 0 }
            const to = { row: 2, col: 2 }
            const coordinates = CoordinateShapeService.calculateCoordinates({
                shape: CoordinateGeneratorShape.LINE,
                from,
                to,
                width: 0,
            })
            const expectedPath =
                CoordinateCalculator.calculateEveryCoordinateInLine(from, to)
            expect(coordinates).toHaveLength(expectedPath.length)
            expect(coordinates).toEqual(expect.arrayContaining(expectedPath))
        })

        it("returns centerline plus one hex on each side per step for width 1", () => {
            const from = { row: 2, col: 0 }
            const to = { row: 2, col: 2 }
            const coordinates = CoordinateShapeService.calculateCoordinates({
                shape: CoordinateGeneratorShape.LINE,
                from,
                to,
                width: 1,
            })

            const centerline =
                CoordinateCalculator.calculateEveryCoordinateInLine(from, to)
            expect(coordinates.length).toBeGreaterThan(centerline.length)

            expect(coordinates).toEqual(
                expect.arrayContaining([
                    ...centerline,
                    ...centerline.map((c) =>
                        CoordinateCalculator.getNeighbor(
                            c,
                            CoordinateDirection.UP_LEFT
                        )
                    ),
                    ...centerline.map((c) =>
                        CoordinateCalculator.getNeighbor(
                            c,
                            CoordinateDirection.DOWN_RIGHT
                        )
                    ),
                ])
            )
        })

        it("contains no duplicate coordinates", () => {
            const coordinates = CoordinateShapeService.calculateCoordinates({
                shape: CoordinateGeneratorShape.LINE,
                from: { row: 2, col: 0 },
                to: { row: 2, col: 4 },
                width: 2,
            })
            const keys = coordinates.map((c) => `${c.row},${c.col}`)
            expect(keys).toHaveLength(new Set(keys).size)
        })

        it("handles an odd-row origin correctly", () => {
            const from = { row: 1, col: 1 }
            const to = { row: 1, col: 3 }
            const coordinates = CoordinateShapeService.calculateCoordinates({
                shape: CoordinateGeneratorShape.LINE,
                from,
                to,
                width: 0,
            })
            const expectedPath =
                CoordinateCalculator.calculateEveryCoordinateInLine(from, to)
            expect(coordinates).toHaveLength(expectedPath.length)
            expect(coordinates).toEqual(expect.arrayContaining(expectedPath))
        })
    })
})
