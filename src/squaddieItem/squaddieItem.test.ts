import { describe, expect, it } from "vitest"
import {
    ProficiencyType,
    type TProficiencyType,
} from "../proficiency/proficiencyLevel.ts"
import { SquaddieItemService } from "./squaddieItem.ts"

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
})
