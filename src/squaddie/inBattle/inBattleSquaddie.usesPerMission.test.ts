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
        actionIds: ["warcry"],
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

describe("InBattleSquaddie mission-wide action uses tracking", () => {
    it("starts with no action uses recorded", () => {
        const squaddie = createSquaddie()
        expect(
            InBattleSquaddieService.getActionUsesThisMission({
                squaddie,
                actionId: "warcry",
            })
        ).toBe(0)
    })

    it("increments both the per-turn and per-mission counters on the same use", () => {
        let squaddie = createSquaddie()
        squaddie = InBattleSquaddieService.recordActionUse({
            squaddie,
            actionId: "warcry",
        })
        expect(
            InBattleSquaddieService.getActionUsesThisTurn({
                squaddie,
                actionId: "warcry",
            })
        ).toBe(1)
        expect(
            InBattleSquaddieService.getActionUsesThisMission({
                squaddie,
                actionId: "warcry",
            })
        ).toBe(1)
    })

    it("does not reset the mission counter when the per-turn counter resets", () => {
        let squaddie = createSquaddie()
        squaddie = InBattleSquaddieService.recordActionUse({
            squaddie,
            actionId: "warcry",
        })
        squaddie = InBattleSquaddieService.recordActionUse({
            squaddie,
            actionId: "warcry",
        })
        squaddie = InBattleSquaddieService.resetActionUsesThisTurn({
            squaddie,
        })
        expect(
            InBattleSquaddieService.getActionUsesThisTurn({
                squaddie,
                actionId: "warcry",
            })
        ).toBe(0)
        expect(
            InBattleSquaddieService.getActionUsesThisMission({
                squaddie,
                actionId: "warcry",
            })
        ).toBe(2)
    })

    it("tracks different actions independently", () => {
        let squaddie = createSquaddie()
        squaddie = InBattleSquaddieService.recordActionUse({
            squaddie,
            actionId: "warcry",
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
            InBattleSquaddieService.getActionUsesThisMission({
                squaddie,
                actionId: "warcry",
            })
        ).toBe(1)
        expect(
            InBattleSquaddieService.getActionUsesThisMission({
                squaddie,
                actionId: "heal",
            })
        ).toBe(2)
    })

    describe("serialization", () => {
        it("round-trips mission action uses through serialize/deserialize", () => {
            let squaddie = createSquaddie()
            squaddie = InBattleSquaddieService.recordActionUse({
                squaddie,
                actionId: "warcry",
            })
            squaddie = InBattleSquaddieService.recordActionUse({
                squaddie,
                actionId: "warcry",
            })

            const serialized = InBattleSquaddieService.serialize(squaddie)
            const restored = InBattleSquaddieService.deserialize(serialized)

            expect(
                InBattleSquaddieService.getActionUsesThisMission({
                    squaddie: restored,
                    actionId: "warcry",
                })
            ).toBe(2)
        })

        it("deserializes with zero uses when field is missing (backward compat)", () => {
            let squaddie = createSquaddie()
            const serialized = InBattleSquaddieService.serialize(squaddie)
            const withoutField = {
                ...serialized,
                actionUsesThisMission: undefined,
            }
            const restored = InBattleSquaddieService.deserialize(withoutField)
            expect(
                InBattleSquaddieService.getActionUsesThisMission({
                    squaddie: restored,
                    actionId: "warcry",
                })
            ).toBe(0)
        })

        it("rejects negative use counts during deserialization", () => {
            let squaddie = createSquaddie()
            const serialized = InBattleSquaddieService.serialize(squaddie)
            const corrupt = {
                ...serialized,
                actionUsesThisMission: { warcry: -1 },
            }
            expect(() => InBattleSquaddieService.deserialize(corrupt)).toThrow(
                "[InBattleSquaddieService.deserialize]"
            )
        })
    })
})
