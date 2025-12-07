import { type SquaddieItem, SquaddieItemService } from "./squaddieItem.ts"
import {
    type SquaddieItemCollection,
    SquaddieItemCollectionService,
} from "./squaddieItemCollection.ts"
import { beforeEach, describe, expect, it } from "vitest"
import { ProficiencyType } from "../proficiency/proficiencyLevel.ts"
import { SquaddieItemManager } from "./squaddieItemManager.ts"

describe("Squaddie Item Manager", () => {
    let manager: SquaddieItemManager
    let collection: SquaddieItemCollection
    let plateMail: SquaddieItem

    beforeEach(() => {
        plateMail = SquaddieItemService.new({
            id: "plateMail",
            name: "Plate Mail",
            numberOfUses: undefined,
            passiveProficiencyBonuses: {
                [ProficiencyType.ARMOR]: 2,
            },
            actionIds: [],
        })
        collection = SquaddieItemCollectionService.new()
        manager = new SquaddieItemManager(collection)
    })

    it("Can add an action and retrieve it", () => {
        manager.addOrUpdate(plateMail)
        expect(manager.has(plateMail.id)).toBeTruthy()
        expect(manager.get(plateMail.id)).toEqual(plateMail)
        expect(() => manager.get("does not exist")).toThrow("no item")
    })

    it("Can remove an action", () => {
        manager.addOrUpdate(plateMail)
        manager.remove(plateMail.id)
        expect(manager.has(plateMail.id)).toBeFalsy()
        expect(() => manager.get(plateMail.id)).toThrow("no item")
    })
})
