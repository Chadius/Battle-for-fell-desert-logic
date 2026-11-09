import { beforeEach, describe, expect, it } from "vitest"
import {
    type InBattleSquaddie,
    InBattleSquaddieService,
} from "./inBattleSquaddie.js"
import { OutOfBattleSquaddieService } from "../outOfBattle/outOfBattleSquaddie.js"
import { SquaddieAffiliation } from "../../affiliation/affiliation.js"
import { OutOfBattleSquaddieTestSetup } from "../../testUtils/outOfBattleSquaddieTestSetup.js"

const actionId = "thunder-strike"

const createSquaddie = () => {
    const sheet = OutOfBattleSquaddieTestSetup.createTestAttributeSheet()
    const outOfBattle = OutOfBattleSquaddieService.new({
        id: "hero",
        actionIds: [actionId],
        attributeSheetId: "test-sheet",
        affiliation: SquaddieAffiliation.PLAYER,
    })
    return InBattleSquaddieService.new({
        id: 0,
        outOfBattleSquaddie: outOfBattle,
        attributeSheet: sheet,
    })
}

const getUses = (squaddie: InBattleSquaddie) => ({
    thisTurn: InBattleSquaddieService.getActionUsesThisTurn({
        squaddie,
        actionId,
    }),
    thisMission: InBattleSquaddieService.getActionUsesThisMission({
        squaddie,
        actionId,
    }),
})

describe("InBattleSquaddieService.refundActionUse", () => {
    it("takes one use back from this turn and this mission", () => {
        let squaddie = createSquaddie()
        squaddie = InBattleSquaddieService.recordActionUse({
            squaddie,
            actionId,
        })
        squaddie = InBattleSquaddieService.recordActionUse({
            squaddie,
            actionId,
        })

        squaddie = InBattleSquaddieService.refundActionUse({
            squaddie,
            actionId,
        })

        expect(getUses(squaddie)).toEqual({ thisTurn: 1, thisMission: 1 })
    })

    it("never drops the use count below zero", () => {
        const squaddie = InBattleSquaddieService.refundActionUse({
            squaddie: createSquaddie(),
            actionId,
        })

        expect(getUses(squaddie)).toEqual({ thisTurn: 0, thisMission: 0 })
    })

    describe("when this turn's uses were already reset", () => {
        it("refunds only the mission count", () => {
            let squaddie = createSquaddie()
            squaddie = InBattleSquaddieService.recordActionUse({
                squaddie,
                actionId,
            })
            squaddie = InBattleSquaddieService.resetActionUsesThisTurn({
                squaddie,
            })

            squaddie = InBattleSquaddieService.refundActionUse({
                squaddie,
                actionId,
            })

            expect(getUses(squaddie)).toEqual({ thisTurn: 0, thisMission: 0 })
        })
    })

    it("does not change the original squaddie", () => {
        const original = InBattleSquaddieService.recordActionUse({
            squaddie: createSquaddie(),
            actionId,
        })

        InBattleSquaddieService.refundActionUse({
            squaddie: original,
            actionId,
        })

        expect(getUses(original)).toEqual({ thisTurn: 1, thisMission: 1 })
    })
})

describe("InBattleSquaddieService.clearCooldown", () => {
    const otherActionId = "other-action"
    const otherActionTurnsRemaining = 3
    let squaddieAfterClearing: InBattleSquaddie

    beforeEach(() => {
        const withCooldown = InBattleSquaddieService.recordCooldown({
            squaddie: createSquaddie(),
            actionId,
            turnsRemaining: 2,
        }).squaddie
        const withBothCooldowns = InBattleSquaddieService.recordCooldown({
            squaddie: withCooldown,
            actionId: otherActionId,
            turnsRemaining: otherActionTurnsRemaining,
        }).squaddie

        squaddieAfterClearing = InBattleSquaddieService.clearCooldown({
            squaddie: withBothCooldowns,
            actionId,
        }).squaddie
    })

    it("removes that action's cooldown", () => {
        expect(squaddieAfterClearing.actionCooldowns.has(actionId)).toBe(false)
    })

    it("keeps other actions' cooldowns", () => {
        expect(squaddieAfterClearing.actionCooldowns.get(otherActionId)).toBe(
            otherActionTurnsRemaining
        )
    })
})
