import { describe, expect, it } from "vitest"
import {
    ProficiencyType,
    type TProficiencyType,
} from "../proficiency/proficiencyLevel"
import { SquaddieItemService } from "./squaddieItem"

describe("Squaddie Item", () => {
    it("Can create a passive item and get bonuses", () => {
        const plateMailArmor = SquaddieItemService.new({
            id: "plateMail",
            name: "Plate Mail",
            numberOfUses: undefined,
            passiveProficiencyBonuses: {
                [ProficiencyType.ARMOR]: 2,
            },
            actionIds: [],
        })

        const passiveBonuses: Map<TProficiencyType, number> =
            SquaddieItemService.getPassiveProficiencyBonuses(plateMailArmor)
        expect(passiveBonuses.has(ProficiencyType.ARMOR)).toBeTruthy()
        expect(passiveBonuses.get(ProficiencyType.ARMOR)).toBe(2)
        expect(passiveBonuses.size).toBe(1)
    })

    describe("serialization", () => {
        const createHealingPotion = () =>
            SquaddieItemService.new({
                id: "healingPotion",
                name: "Healing Potion",
                numberOfUses: 1,
                passiveProficiencyBonuses: {
                    [ProficiencyType.ARMOR]: 1,
                },
                actionIds: ["heal"],
            })

        it("serializes to a plain object", () => {
            const potion = createHealingPotion()
            const serialized = SquaddieItemService.serialize(potion)

            expect(serialized).toEqual({
                id: "healingPotion",
                name: "Healing Potion",
                numberOfUses: 1,
                passiveProficiencyBonuses: { ARMOR: 1 },
                actionIds: ["heal"],
            })
        })

        it("deserializes from a plain object and restores Maps and Sets", () => {
            const potion = createHealingPotion()
            const serialized = SquaddieItemService.serialize(potion)
            const restored = SquaddieItemService.deserialize(serialized)

            expect(restored.id).toBe("healingPotion")
            expect(restored.name).toBe("Healing Potion")
            expect(restored.numberOfUses).toBe(1)
            expect(
                restored.passiveProficiencyBonuses.get(ProficiencyType.ARMOR)
            ).toBe(1)
            expect(restored.actionIds.has("heal")).toBeTruthy()
        })

        it("round-trips an item with no uses and no bonuses", () => {
            const banner = SquaddieItemService.new({
                id: "banner",
                name: "Battle Banner",
                passiveProficiencyBonuses: {},
                actionIds: [],
            })
            const restored = SquaddieItemService.deserialize(
                SquaddieItemService.serialize(banner)
            )

            expect(restored.id).toBe("banner")
            expect(restored.numberOfUses).toBeUndefined()
            expect(restored.passiveProficiencyBonuses.size).toBe(0)
            expect(restored.actionIds.size).toBe(0)
        })

        it("throws on invalid data", () => {
            expect(() =>
                SquaddieItemService.deserialize({ id: "", name: "Bad" })
            ).toThrow("[SquaddieItemService.deserialize]")
        })
    })
})
