import { describe, expect, it } from "vitest"
import { InBattleSquaddieService } from "./inBattleSquaddie.js"
import { OutOfBattleSquaddieService } from "../outOfBattle/outOfBattleSquaddie.js"
import { SquaddieAffiliation } from "../../affiliation/affiliation.js"
import { OutOfBattleSquaddieTestSetup } from "../../testUtils/outOfBattleSquaddieTestSetup.js"

const createSquaddieWithContribution = (contribution: number) => {
    const squaddie = InBattleSquaddieService.new({
        id: 0,
        name: "Hero",
        outOfBattleSquaddie: OutOfBattleSquaddieService.new({
            id: "hero",
            name: "Hero",
            attributeSheetId: "test-sheet",
            affiliation: SquaddieAffiliation.PLAYER,
        }),
        attributeSheet: OutOfBattleSquaddieTestSetup.createTestAttributeSheet(),
    })
    return InBattleSquaddieService.incrementAttackContributionThisTurn({
        squaddie,
        amount: contribution,
    })
}

describe("InBattleSquaddieService.refundAttackContributionThisTurn", () => {
    it("takes the amount off this turn's attack contribution", () => {
        const squaddie =
            InBattleSquaddieService.refundAttackContributionThisTurn({
                squaddie: createSquaddieWithContribution(3),
                amount: 1,
            })

        expect(squaddie.attackContributionThisTurn).toBe(2)
    })

    it("never drops the contribution below zero", () => {
        const squaddie =
            InBattleSquaddieService.refundAttackContributionThisTurn({
                squaddie: createSquaddieWithContribution(1),
                amount: 2,
            })

        expect(squaddie.attackContributionThisTurn).toBe(0)
    })

    it("does not change the original squaddie", () => {
        const original = createSquaddieWithContribution(1)

        InBattleSquaddieService.refundAttackContributionThisTurn({
            squaddie: original,
            amount: 1,
        })

        expect(original.attackContributionThisTurn).toBe(1)
    })
})
