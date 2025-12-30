import {
    type SquaddieItemCollection,
    SquaddieItemCollectionService,
} from "./squaddieItemCollection"
import { beforeEach, describe, expect, it } from "vitest"
import { type SquaddieItem, SquaddieItemService } from "./squaddieItem"
import { ProficiencyType } from "../proficiency/proficiencyLevel"

describe("Squaddie Item Collection", () => {
    let squaddieItemCollection: SquaddieItemCollection
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

        squaddieItemCollection = SquaddieItemCollectionService.new()
    })

    it("can add and retrieve items", () => {
        const newSquaddieItemCollection =
            SquaddieItemCollectionService.addOrUpdate({
                collection: squaddieItemCollection,
                squaddieItem: plateMail,
            })
        expect(
            SquaddieItemCollectionService.get({
                collection: newSquaddieItemCollection,
                id: plateMail.id,
            })
        ).toEqual(plateMail)
        expect(
            SquaddieItemCollectionService.get({
                collection: squaddieItemCollection,
                id: plateMail.id,
            })
        ).toBeUndefined()
    })

    it("can update existing items", () => {
        const newSquaddieItemCollection =
            SquaddieItemCollectionService.addOrUpdate({
                collection: squaddieItemCollection,
                squaddieItem: SquaddieItemService.new({
                    id: plateMail.id,
                    name: "Plate Mail 2",
                    numberOfUses: undefined,
                    passiveProficiencyBonuses: {
                        [ProficiencyType.ARMOR]: 2,
                    },
                    actionIds: [],
                }),
            })
        expect(
            SquaddieItemCollectionService.get({
                collection: newSquaddieItemCollection,
                id: plateMail.id,
            })?.name
        ).toEqual("Plate Mail 2")
    })
    it("can remove items", () => {
        const addedItem = SquaddieItemCollectionService.addOrUpdate({
            collection: squaddieItemCollection,
            squaddieItem: plateMail,
        })
        const removedItem = SquaddieItemCollectionService.remove({
            collection: addedItem,
            id: plateMail.id,
        })
        expect(
            SquaddieItemCollectionService.get({
                collection: removedItem,
                id: plateMail.id,
            })
        ).toBeUndefined()
        expect(
            SquaddieItemCollectionService.get({
                collection: addedItem,
                id: plateMail.id,
            })
        ).toEqual(plateMail)
    })
})
