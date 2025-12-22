import { describe, expect, it } from "vitest"
import { CoordinateMapService } from "./coordinateMap.ts"

describe("Coordinate Map", () => {
    it("creates a new map instead of modifying the original", () => {
        const originalMap = CoordinateMapService.new({
            id: "original",
            name: "original",
            movementProperties: ["1 1 1 1 ", " 1 1 1 1 ", "1 1 1 1 "],
        })

        const addSquaddieMap = CoordinateMapService.addSquaddie({
            map: originalMap,
            coordinate: { row: 1, col: 1 },
            squaddieId: {
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "squaddie",
            },
        })

        expect(originalMap).not.toBe(addSquaddieMap)
        expect(
            CoordinateMapService.getSquaddieAtCoordinate({
                map: originalMap,
                coordinate: { row: 1, col: 1 },
            })
        ).toBeUndefined()
        expect(
            CoordinateMapService.getSquaddieAtCoordinate({
                map: addSquaddieMap,
                coordinate: { row: 1, col: 1 },
            })
        ).toBeDefined()

        expect(
            CoordinateMapService.getSquaddieCoordinate({
                map: originalMap,
                squaddieId: {
                    inBattleSquaddieId: 0,
                    outOfBattleSquaddieId: "squaddie",
                },
            })
        ).toBeUndefined()
        expect(
            CoordinateMapService.getSquaddieCoordinate({
                map: addSquaddieMap,
                squaddieId: {
                    inBattleSquaddieId: 0,
                    outOfBattleSquaddieId: "squaddie",
                },
            })
        ).toBeDefined()

        const moveSquaddieMap = CoordinateMapService.addSquaddie({
            map: originalMap,
            coordinate: { row: 2, col: 1 },
            squaddieId: {
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "squaddie",
            },
        })

        expect(originalMap).not.toBe(moveSquaddieMap)
        expect(addSquaddieMap).not.toBe(moveSquaddieMap)

        expect(
            CoordinateMapService.getSquaddieAtCoordinate({
                map: moveSquaddieMap,
                coordinate: { row: 2, col: 1 },
            })
        ).toBeDefined()
        expect(
            CoordinateMapService.getSquaddieAtCoordinate({
                map: addSquaddieMap,
                coordinate: { row: 1, col: 1 },
            })
        ).toBeDefined()

        expect(
            CoordinateMapService.getSquaddieCoordinate({
                map: addSquaddieMap,
                squaddieId: {
                    inBattleSquaddieId: 0,
                    outOfBattleSquaddieId: "squaddie",
                },
            })
        ).toBeDefined()
        expect(
            CoordinateMapService.getSquaddieCoordinate({
                map: moveSquaddieMap,
                squaddieId: {
                    inBattleSquaddieId: 0,
                    outOfBattleSquaddieId: "squaddie",
                },
            })
        ).toBeDefined()
    })
})
