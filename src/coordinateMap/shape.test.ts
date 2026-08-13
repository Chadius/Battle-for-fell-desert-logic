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

    describe("Generate CONE type Shapes", () => {
        it("width 0 is just a single ray in the given direction", () => {
            const origin = { row: 2, col: 0 }
            const coordinates = CoordinateShapeService.calculateCoordinates({
                shape: CoordinateGeneratorShape.CONE,
                origin,
                direction: CoordinateDirection.RIGHT,
                width: 0,
                length: 2,
            })

            const expectedRay =
                CoordinateCalculator.calculateEveryCoordinateInLine(origin, {
                    row: 2,
                    col: 2,
                })
            expect(coordinates).toHaveLength(expectedRay.length)
            expect(coordinates).toEqual(expect.arrayContaining(expectedRay))
        })

        it("includes the actor's own coordinate in the affected area", () => {
            const origin = { row: 2, col: 0 }
            const coordinates = CoordinateShapeService.calculateCoordinates({
                shape: CoordinateGeneratorShape.CONE,
                origin,
                direction: CoordinateDirection.RIGHT,
                width: 1,
                length: 2,
            })
            expect(coordinates).toEqual(expect.arrayContaining([origin]))
        })

        it("width 1 fans out into the main direction plus its two neighbors", () => {
            const origin = { row: 2, col: 0 }
            const coordinates = CoordinateShapeService.calculateCoordinates({
                shape: CoordinateGeneratorShape.CONE,
                origin,
                direction: CoordinateDirection.RIGHT,
                width: 1,
                length: 1,
            })

            expect(coordinates).toHaveLength(4)
            expect(coordinates).toEqual(
                expect.arrayContaining([
                    origin,
                    CoordinateCalculator.getNeighbor(
                        origin,
                        CoordinateDirection.RIGHT
                    ),
                    CoordinateCalculator.getNeighbor(
                        origin,
                        CoordinateDirection.UP_RIGHT
                    ),
                    CoordinateCalculator.getNeighbor(
                        origin,
                        CoordinateDirection.DOWN_RIGHT
                    ),
                ])
            )
        })

        it("fills the wedge with every hex up to range, not just the boundary rays", () => {
            const origin = { row: 2, col: 0 }
            const coordinates = CoordinateShapeService.calculateCoordinates({
                shape: CoordinateGeneratorShape.CONE,
                origin,
                direction: CoordinateDirection.RIGHT,
                width: 1,
                length: 2,
            })

            const right = CoordinateCalculator.getNeighbor(
                origin,
                CoordinateDirection.RIGHT
            )
            const upRight = CoordinateCalculator.getNeighbor(
                origin,
                CoordinateDirection.UP_RIGHT
            )
            const downRight = CoordinateCalculator.getNeighbor(
                origin,
                CoordinateDirection.DOWN_RIGHT
            )

            const expectedCoordinates = [
                origin,
                // distance 1: the main direction plus its two flanking neighbors
                right,
                upRight,
                downRight,
                // distance 2: each boundary ray extended one more step...
                CoordinateCalculator.getNeighbor(
                    right,
                    CoordinateDirection.RIGHT
                ),
                CoordinateCalculator.getNeighbor(
                    upRight,
                    CoordinateDirection.UP_RIGHT
                ),
                CoordinateCalculator.getNeighbor(
                    downRight,
                    CoordinateDirection.DOWN_RIGHT
                ),
                // ...plus the two interior hexes between adjacent boundary rays
                CoordinateCalculator.getNeighbor(
                    right,
                    CoordinateDirection.UP_RIGHT
                ),
                CoordinateCalculator.getNeighbor(
                    right,
                    CoordinateDirection.DOWN_RIGHT
                ),
            ]

            const coordinateKeys = new Set(
                coordinates.map((c) => `${c.row},${c.col}`)
            )
            const expectedKeys = new Set(
                expectedCoordinates.map((c) => `${c.row},${c.col}`)
            )
            expect(coordinateKeys).toEqual(expectedKeys)
        })

        it("at width 3 (a full circle), matches BLOOM's radius fill exactly", () => {
            const origin = { row: 2, col: 0 }
            const coneCoordinates = CoordinateShapeService.calculateCoordinates(
                {
                    shape: CoordinateGeneratorShape.CONE,
                    origin,
                    direction: CoordinateDirection.RIGHT,
                    width: 3,
                    length: 2,
                }
            )
            const bloomCoordinates =
                CoordinateShapeService.calculateCoordinates({
                    shape: CoordinateGeneratorShape.BLOOM,
                    origin,
                    radius: 2,
                })

            const coneKeys = new Set(
                coneCoordinates.map((c) => `${c.row},${c.col}`)
            )
            const bloomKeys = new Set(
                bloomCoordinates.map((c) => `${c.row},${c.col}`)
            )
            expect(coneKeys).toEqual(bloomKeys)
        })

        it("contains no duplicate coordinates", () => {
            const coordinates = CoordinateShapeService.calculateCoordinates({
                shape: CoordinateGeneratorShape.CONE,
                origin: { row: 2, col: 0 },
                direction: CoordinateDirection.RIGHT,
                width: 3,
                length: 3,
            })
            const keys = coordinates.map((c) => `${c.row},${c.col}`)
            expect(keys).toHaveLength(new Set(keys).size)
        })

        it("throws an error if negative width is given", () => {
            expect(() => {
                CoordinateShapeService.calculateCoordinates({
                    shape: CoordinateGeneratorShape.CONE,
                    origin: { row: 0, col: 0 },
                    direction: CoordinateDirection.RIGHT,
                    width: -1,
                    length: 2,
                })
            }).toThrow("width must be a non-negative integer")
        })
    })
})
