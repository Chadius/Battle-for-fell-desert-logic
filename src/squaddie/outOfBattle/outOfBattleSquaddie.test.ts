import { describe, expect, it } from "vitest"
import { SquaddieAffiliation } from "../../affiliation/affiliation.js"
import {
    OutOfBattleSquaddieService,
    type SerializedOutOfBattleSquaddie,
} from "./outOfBattleSquaddie.js"

describe("OutOfBattleSquaddie", () => {
    const createLini = () =>
        OutOfBattleSquaddieService.new({
            id: "lini",
            attributeSheetId: "liniAttributeSheet",
            actionIds: ["scimitar", "heal"],
            affiliation: SquaddieAffiliation.PLAYER,
        })

    describe("serialization", () => {
        it("serializes to a plain object", () => {
            const lini = createLini()
            const serialized = OutOfBattleSquaddieService.serialize(lini)

            expect(serialized).toEqual({
                id: "lini",
                attributeSheetId: "liniAttributeSheet",
                actionIds: ["scimitar", "heal"],
                affiliation: SquaddieAffiliation.PLAYER,
            })
        })

        it("deserializes from a plain object", () => {
            const lini = createLini()
            const serialized = OutOfBattleSquaddieService.serialize(lini)
            const restored = OutOfBattleSquaddieService.deserialize(serialized)

            expect(restored.id).toBe("lini")
            expect(restored.attributeSheetId).toBe("liniAttributeSheet")
            expect(restored.actionIds).toEqual(["scimitar", "heal"])
            expect(restored.affiliation).toBe(SquaddieAffiliation.PLAYER)
        })

        describe("when the JSON still has a display name from before names moved to displayNames.json", () => {
            it("loads the squaddie without the name", () => {
                const lini = createLini()

                const restored = OutOfBattleSquaddieService.deserialize({
                    ...OutOfBattleSquaddieService.serialize(lini),
                    name: "Lini",
                })

                expect(restored).toEqual(lini)
            })
        })

        it("round-trips a squaddie with no action ids", () => {
            const squaddie = OutOfBattleSquaddieService.new({
                id: "empty",
                attributeSheetId: "emptySheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            const restored = OutOfBattleSquaddieService.deserialize(
                OutOfBattleSquaddieService.serialize(squaddie)
            )

            expect(restored.id).toBe("empty")
            expect(restored.actionIds).toEqual([])
            expect(restored.affiliation).toBe(SquaddieAffiliation.ENEMY)
        })

        it("throws a descriptive error when id is missing", () => {
            const bad: Partial<SerializedOutOfBattleSquaddie> = {
                attributeSheetId: "liniAttributeSheet",
                actionIds: [],
                affiliation: SquaddieAffiliation.PLAYER,
            }
            expect(() => OutOfBattleSquaddieService.deserialize(bad)).toThrow(
                "[OutOfBattleSquaddieService.deserialize]"
            )
        })

        it("throws when affiliation is not a valid value", () => {
            const bad = {
                id: "lini",
                name: "Lini",
                attributeSheetId: "liniAttributeSheet",
                actionIds: [],
                affiliation: "UNKNOWN",
            }
            expect(() => OutOfBattleSquaddieService.deserialize(bad)).toThrow(
                "[OutOfBattleSquaddieService.deserialize]"
            )
        })
    })
})
