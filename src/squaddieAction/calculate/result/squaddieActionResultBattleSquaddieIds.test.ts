import { describe, expect, it } from "vitest"
import {
    type SquaddieActionResult,
    SquaddieActionResultService,
} from "./squaddieActionResult.js"

describe("SquaddieActionResultService.battleSquaddieIds", () => {
    const mover = { inBattleSquaddieId: 0, outOfBattleSquaddieId: "mover" }
    const target = { inBattleSquaddieId: 1, outOfBattleSquaddieId: "target" }

    describe("when a squaddie has several results, like a move spending AP and moving them", () => {
        const results: SquaddieActionResult[] = [
            { ...mover, actionPoints: { spent: 1 } },
            { ...mover, movement: { expectedPath: { steps: [] } } },
        ]

        it("lists that squaddie once", () => {
            expect(
                SquaddieActionResultService.battleSquaddieIds(results)
            ).toEqual([mover])
        })
    })

    describe("when the results cover different squaddies", () => {
        const results: SquaddieActionResult[] = [
            { ...mover, actionPoints: { spent: 1 } },
            { ...target, healing: { net: 2, raw: 2 } },
        ]

        it("lists each squaddie", () => {
            expect(
                SquaddieActionResultService.battleSquaddieIds(results)
            ).toEqual([mover, target])
        })
    })
})
