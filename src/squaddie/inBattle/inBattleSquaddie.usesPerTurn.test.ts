import { describe, expect, it } from "vitest"
import { InBattleSquaddieService } from "./inBattleSquaddie.js"
import { OutOfBattleSquaddieService } from "../outOfBattle/outOfBattleSquaddie.js"
import { SquaddieAffiliation } from "../../affiliation/affiliation.js"
import { OutOfBattleSquaddieTestSetup } from "../../testUtils/outOfBattleSquaddieTestSetup.js"

const createSquaddie = () => {
    const sheet = OutOfBattleSquaddieTestSetup.createTestAttributeSheet()
    const outOfBattle = OutOfBattleSquaddieService.new({
        id: "hero",
        name: "Hero",
        actionIds: ["thunder-strike"],
        attributeSheetId: "test-sheet",
        affiliation: SquaddieAffiliation.PLAYER,
    })
    return InBattleSquaddieService.new({
        id: 0,
        name: "Hero",
        outOfBattleSquaddie: outOfBattle,
        attributeSheet: sheet,
    })
}

describe("InBattleSquaddie action uses tracking", () => {
    it("starts with no action uses recorded", () => {
        const squaddie = createSquaddie()
        expect(
            InBattleSquaddieService.getActionUsesThisTurn({
                squaddie,
                actionId: "thunder-strike",
            })
        ).toBe(0)
    })

    describe("when the same action is recorded twice", () => {
        it("shows a use count of 2", () => {
            let squaddie = createSquaddie()
            squaddie = InBattleSquaddieService.recordActionUse({
                squaddie,
                actionId: "thunder-strike",
            })
            squaddie = InBattleSquaddieService.recordActionUse({
                squaddie,
                actionId: "thunder-strike",
            })
            expect(
                InBattleSquaddieService.getActionUsesThisTurn({
                    squaddie,
                    actionId: "thunder-strike",
                })
            ).toBe(2)
        })
    })

    it("tracks different actions independently", () => {
        let squaddie = createSquaddie()
        squaddie = InBattleSquaddieService.recordActionUse({
            squaddie,
            actionId: "thunder-strike",
        })
        squaddie = InBattleSquaddieService.recordActionUse({
            squaddie,
            actionId: "heal",
        })
        squaddie = InBattleSquaddieService.recordActionUse({
            squaddie,
            actionId: "heal",
        })
        expect(
            InBattleSquaddieService.getActionUsesThisTurn({
                squaddie,
                actionId: "thunder-strike",
            })
        ).toBe(1)
        expect(
            InBattleSquaddieService.getActionUsesThisTurn({
                squaddie,
                actionId: "heal",
            })
        ).toBe(2)
    })

    it("resets all action uses to zero", () => {
        let squaddie = createSquaddie()
        squaddie = InBattleSquaddieService.recordActionUse({
            squaddie,
            actionId: "thunder-strike",
        })
        squaddie = InBattleSquaddieService.resetActionUsesThisTurn({ squaddie })
        expect(
            InBattleSquaddieService.getActionUsesThisTurn({
                squaddie,
                actionId: "thunder-strike",
            })
        ).toBe(0)
    })

    describe("serialization", () => {
        it("round-trips action uses through serialize/deserialize", () => {
            let squaddie = createSquaddie()
            squaddie = InBattleSquaddieService.recordActionUse({
                squaddie,
                actionId: "thunder-strike",
            })
            squaddie = InBattleSquaddieService.recordActionUse({
                squaddie,
                actionId: "thunder-strike",
            })

            const serialized = InBattleSquaddieService.serialize(squaddie)
            const restored = InBattleSquaddieService.deserialize(serialized)

            expect(
                InBattleSquaddieService.getActionUsesThisTurn({
                    squaddie: restored,
                    actionId: "thunder-strike",
                })
            ).toBe(2)
        })

        it("deserializes with zero uses when field is missing (backward compat)", () => {
            let squaddie = createSquaddie()
            const serialized = InBattleSquaddieService.serialize(squaddie)
            const withoutField = {
                ...serialized,
                actionUsesThisTurn: undefined,
            }
            const restored = InBattleSquaddieService.deserialize(withoutField)
            expect(
                InBattleSquaddieService.getActionUsesThisTurn({
                    squaddie: restored,
                    actionId: "thunder-strike",
                })
            ).toBe(0)
        })

        it("rejects negative use counts during deserialization", () => {
            let squaddie = createSquaddie()
            const serialized = InBattleSquaddieService.serialize(squaddie)
            const corrupt = {
                ...serialized,
                actionUsesThisTurn: { "thunder-strike": -1 },
            }
            expect(() => InBattleSquaddieService.deserialize(corrupt)).toThrow(
                "[InBattleSquaddieService.deserialize]"
            )
        })
    })
})
