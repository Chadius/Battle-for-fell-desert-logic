import { type SquaddieItem, SquaddieItemService } from "./squaddieItem.js"
import {
    type SquaddieItemCollection,
    SquaddieItemCollectionService,
} from "./squaddieItemCollection.js"
import { beforeEach, describe, expect, it } from "vitest"
import { ProficiencyType } from "../proficiency/proficiencyLevel.js"
import { SquaddieItemManager } from "./squaddieItemManager.js"

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

    describe("serialize", () => {
        it("serializes all items in the collection", () => {
            manager.addOrUpdate(plateMail)
            const serialized = manager.serialize()
            expect(serialized).toHaveLength(1)
            expect(serialized[0]).toEqual({
                id: "plateMail",
                name: "Plate Mail",
                numberOfUses: undefined,
                passiveProficiencyBonuses: { [ProficiencyType.ARMOR]: 2 },
                actionIds: [],
            })
        })

        it("serializes an empty collection as an empty array", () => {
            expect(manager.serialize()).toEqual([])
        })
    })

    describe("addItemsFromJson", () => {
        it("loads a single item blob and makes it retrievable", () => {
            const blob = {
                id: "plateMail",
                name: "Plate Mail",
                passiveProficiencyBonuses: { [ProficiencyType.ARMOR]: 2 },
                actionIds: [],
            }
            const errors = manager.addItemsFromJson(blob)
            expect(errors).toHaveLength(0)
            expect(manager.has("plateMail")).toBeTruthy()
            expect(manager.get("plateMail")).toEqual(plateMail)
        })

        it("loads an array of item blobs", () => {
            const healingPotion = SquaddieItemService.new({
                id: "healingPotion",
                name: "Healing Potion",
                numberOfUses: 1,
                passiveProficiencyBonuses: {},
                actionIds: ["heal"],
            })
            const blobs = [
                SquaddieItemService.serialize(plateMail),
                SquaddieItemService.serialize(healingPotion),
            ]
            const errors = manager.addItemsFromJson(blobs)
            expect(errors).toHaveLength(0)
            expect(manager.has("plateMail")).toBeTruthy()
            expect(manager.has("healingPotion")).toBeTruthy()
        })

        it("returns errors for invalid blobs and still loads valid ones", () => {
            const blobs = [
                SquaddieItemService.serialize(plateMail),
                {
                    id: "",
                    name: "Bad Item",
                    passiveProficiencyBonuses: {},
                    actionIds: [],
                },
            ]
            const errors = manager.addItemsFromJson(blobs)
            expect(errors).toHaveLength(1)
            expect(errors[0]).toContain("SquaddieItemService.deserialize")
            expect(manager.has("plateMail")).toBeTruthy()
        })

        it("round-trips: serialize then addItemsFromJson restores items", () => {
            manager.addOrUpdate(plateMail)
            const serialized = manager.serialize()

            const freshManager = new SquaddieItemManager(
                SquaddieItemCollectionService.new()
            )
            const errors = freshManager.addItemsFromJson(serialized)
            expect(errors).toHaveLength(0)
            expect(freshManager.get("plateMail")).toEqual(plateMail)
        })
    })
})
