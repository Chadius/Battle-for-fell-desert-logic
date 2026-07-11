import { describe, expect, it } from "vitest"
import { OffsetCoordinateService } from "./offsetCoordinate.js"

describe("OffsetCoordinateService", () => {
    describe("coordinateToKey", () => {
        it("should convert a coordinate to a string key", () => {
            expect(
                OffsetCoordinateService.coordinateToKey({ row: 1, col: 2 })
            ).toBe("1,2")
            expect(
                OffsetCoordinateService.coordinateToKey({ row: 0, col: 0 })
            ).toBe("0,0")
            expect(
                OffsetCoordinateService.coordinateToKey({ row: -1, col: -5 })
            ).toBe("-1,-5")
        })
    })

    describe("keyToCoordinate", () => {
        it("should convert a string key to a coordinate object", () => {
            expect(OffsetCoordinateService.keyToCoordinate("1,2")).toEqual({
                row: 1,
                col: 2,
            })
            expect(OffsetCoordinateService.keyToCoordinate("0,0")).toEqual({
                row: 0,
                col: 0,
            })
            expect(OffsetCoordinateService.keyToCoordinate("-1,-5")).toEqual({
                row: -1,
                col: -5,
            })
        })
    })

    describe("round-trip conversion", () => {
        it("should be consistent when converting back and forth", () => {
            const originalCoordinate = { row: 10, col: 20 }
            const key =
                OffsetCoordinateService.coordinateToKey(originalCoordinate)
            const newCoordinate = OffsetCoordinateService.keyToCoordinate(key)
            expect(newCoordinate).toEqual(originalCoordinate)
        })
    })
})
