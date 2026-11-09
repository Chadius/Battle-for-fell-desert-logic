import { describe, expect, it } from "vitest"
import { SquaddieActionResultCalculator } from "./squaddieActionResultCalculator.js"
import {
    type SquaddieActionResult,
    SquaddieActionResultService,
} from "./squaddieActionResult.js"

const squaddieIds = {
    inBattleSquaddieId: 1,
    outOfBattleSquaddieId: "squaddie-1",
}

describe("Reversing action limit results", () => {
    it("reverses a cooldown by clearing it", () => {
        const reversed = SquaddieActionResultCalculator.reverseResult({
            ...squaddieIds,
            cooldown: { actionId: "surge", turnsRemaining: 2 },
        })

        expect(reversed).toEqual({
            ...squaddieIds,
            cooldownCleared: { actionId: "surge" },
        })
    })

    it("reverses an action use by refunding it", () => {
        const reversed = SquaddieActionResultCalculator.reverseResult({
            ...squaddieIds,
            actionUse: { actionId: "surge" },
        })

        expect(reversed).toEqual({
            ...squaddieIds,
            actionUseRefunded: { actionId: "surge" },
        })
    })
})

describe("Reversing multiple attack penalty results", () => {
    it("reverses a contribution by refunding the same amount", () => {
        const reversed = SquaddieActionResultCalculator.reverseResult({
            ...squaddieIds,
            multipleAttackPenalty: { contribution: 2 },
        })

        expect(reversed).toEqual({
            ...squaddieIds,
            multipleAttackPenaltyRefunded: { contribution: 2 },
        })
    })
})

describe("SquaddieActionResultService keeps action tracking results", () => {
    const original: SquaddieActionResult = {
        ...squaddieIds,
        cooldown: { actionId: "surge", turnsRemaining: 2 },
        actionUse: { actionId: "surge" },
        cooldownCleared: { actionId: "blessing" },
        actionUseRefunded: { actionId: "blessing" },
        multipleAttackPenalty: { contribution: 1 },
        multipleAttackPenaltyRefunded: { contribution: 2 },
    }

    describe("when cloned", () => {
        it("keeps every action tracking field", () => {
            expect(SquaddieActionResultService.clone(original)).toEqual(
                original
            )
        })
    })

    describe("when serialized and deserialized", () => {
        it("keeps every action tracking field", () => {
            expect(
                SquaddieActionResultService.deserialize(
                    SquaddieActionResultService.serialize(original)
                )
            ).toEqual(original)
        })
    })
})
