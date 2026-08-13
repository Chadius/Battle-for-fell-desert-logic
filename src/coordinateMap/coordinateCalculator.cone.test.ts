import { describe, expect, it } from "vitest"
import {
    CoordinateCalculator,
    CoordinateDirection,
} from "./coordinateCalculator.js"

describe("CoordinateCalculator cone helpers", () => {
    describe("getNearestDirection", () => {
        it("returns RIGHT when from and to are the same coordinate", () => {
            expect(
                CoordinateCalculator.getNearestDirection(
                    { row: 2, col: 3 },
                    { row: 2, col: 3 }
                )
            ).toBe(CoordinateDirection.RIGHT)
        })

        it("returns RIGHT for a target directly to the right", () => {
            expect(
                CoordinateCalculator.getNearestDirection(
                    { row: 2, col: 0 },
                    { row: 2, col: 3 }
                )
            ).toBe(CoordinateDirection.RIGHT)
        })

        it("returns UP_LEFT for a target along the UP_LEFT axis", () => {
            const from = { row: 4, col: 2 }
            const to = CoordinateCalculator.getNeighbor(
                CoordinateCalculator.getNeighbor(
                    from,
                    CoordinateDirection.UP_LEFT
                ),
                CoordinateDirection.UP_LEFT
            )
            expect(CoordinateCalculator.getNearestDirection(from, to)).toBe(
                CoordinateDirection.UP_LEFT
            )
        })
    })

    describe("getConeSectorDirectionPairs", () => {
        it("width 0 produces no sectors, since a wedge needs at least two boundary directions", () => {
            const sectorPairs =
                CoordinateCalculator.getConeSectorDirectionPairs(
                    CoordinateDirection.RIGHT,
                    0
                )
            expect(sectorPairs).toEqual([])
        })

        it("width 1 pairs the main direction with each of its two neighbors", () => {
            const sectorPairs =
                CoordinateCalculator.getConeSectorDirectionPairs(
                    CoordinateDirection.RIGHT,
                    1
                )
            expect(sectorPairs).toEqual([
                [CoordinateDirection.DOWN_RIGHT, CoordinateDirection.RIGHT],
                [CoordinateDirection.RIGHT, CoordinateDirection.UP_RIGHT],
            ])
        })

        it("width 2 chains adjacent-direction pairs one sector further on each side", () => {
            const sectorPairs =
                CoordinateCalculator.getConeSectorDirectionPairs(
                    CoordinateDirection.RIGHT,
                    2
                )
            expect(sectorPairs).toEqual([
                [CoordinateDirection.DOWN_LEFT, CoordinateDirection.DOWN_RIGHT],
                [CoordinateDirection.DOWN_RIGHT, CoordinateDirection.RIGHT],
                [CoordinateDirection.RIGHT, CoordinateDirection.UP_RIGHT],
                [CoordinateDirection.UP_RIGHT, CoordinateDirection.UP_LEFT],
            ])
        })

        it("width large enough to wrap around closes the loop into 6 cyclically-adjacent sectors", () => {
            const sectorPairs =
                CoordinateCalculator.getConeSectorDirectionPairs(
                    CoordinateDirection.RIGHT,
                    3
                )
            expect(sectorPairs).toEqual([
                [CoordinateDirection.RIGHT, CoordinateDirection.UP_RIGHT],
                [CoordinateDirection.UP_RIGHT, CoordinateDirection.UP_LEFT],
                [CoordinateDirection.UP_LEFT, CoordinateDirection.LEFT],
                [CoordinateDirection.LEFT, CoordinateDirection.DOWN_LEFT],
                [CoordinateDirection.DOWN_LEFT, CoordinateDirection.DOWN_RIGHT],
                [CoordinateDirection.DOWN_RIGHT, CoordinateDirection.RIGHT],
            ])
        })

        it("throws when width is negative", () => {
            expect(() =>
                CoordinateCalculator.getConeSectorDirectionPairs(
                    CoordinateDirection.RIGHT,
                    -1
                )
            ).toThrow("width must be a non-negative integer")
        })
    })
})
