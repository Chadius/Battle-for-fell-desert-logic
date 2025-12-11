import { beforeEach, describe, expect, it } from "vitest"
import {
    type OutOfBattleSquaddieCollection,
    OutOfBattleSquaddieCollectionService,
} from "./outOfBattleSquaddieCollection.ts"
import {
    type OutOfBattleSquaddieAttributeSheetCollection,
    OutOfBattleSquaddieAttributeSheetCollectionService,
} from "./outOfBattleSquaddieAttributeSheetCollection.ts"
import {
    type OutOfBattleSquaddieAttributeSheet,
    OutOfBattleSquaddieAttributeSheetService,
} from "./outOfBattleSquaddieAttributeSheet.ts"
import {
    ProficiencyLevel,
    ProficiencyType,
} from "../../proficiency/proficiencyLevel.ts"
import { OutOfBattleSquaddieManager } from "./outOfBattleSquaddieManager.ts"
import {
    type OutOfBattleSquaddie,
    OutOfBattleSquaddieService,
} from "./outOfBattleSquaddie.ts"
import { AttributeScore } from "../../proficiency/attributeScore.ts"
import { SquaddieAffiliation } from "./affiliation.ts"

describe("Out of Battle Squaddie Manager", () => {
    let squaddieCollection: OutOfBattleSquaddieCollection
    let attributeSheetCollection: OutOfBattleSquaddieAttributeSheetCollection
    let attributeSheet: OutOfBattleSquaddieAttributeSheet
    let squaddie: OutOfBattleSquaddie

    let manager: OutOfBattleSquaddieManager

    beforeEach(() => {
        squaddieCollection = OutOfBattleSquaddieCollectionService.new()
        attributeSheetCollection =
            OutOfBattleSquaddieAttributeSheetCollectionService.new()
        manager = new OutOfBattleSquaddieManager(
            squaddieCollection,
            attributeSheetCollection
        )
        attributeSheet = OutOfBattleSquaddieAttributeSheetService.new({
            id: "test sheet",
            movement: {
                distancePerAction: 2,
            },
            maxHitPoints: 5,
            proficiencyLevels: {
                [ProficiencyType.DEFEND_BODY]: ProficiencyLevel.NOVICE,
                [ProficiencyType.SKILL_BODY]: ProficiencyLevel.EXPERT,
            },
            attributeScores: {
                [AttributeScore.BODY]: 5,
                [AttributeScore.MIND]: 7,
                [AttributeScore.SOUL]: 3,
            },
            items: {
                maxCapacity: 3,
                itemIds: ["plateMail", "powerRune"],
            },
        })
        squaddie = OutOfBattleSquaddieService.new({
            id: "squaddie",
            name: "Squaddie",
            actionIds: ["endTurn", "longsword", "prayer"],
            attributeSheetId: "test sheet",
            affiliation: SquaddieAffiliation.NONE,
        })
    })

    it("can add an attribute sheet", () => {
        manager.addOrUpdateAttributeSheet(attributeSheet)
        expect(manager.getAttributeSheet(attributeSheet.id)).toEqual(
            attributeSheet
        )
        expect(() => manager.getAttributeSheet("does not exist")).toThrow(
            "no attributeSheet"
        )
    })

    it("can add a squaddie", () => {
        manager.addOrUpdateSquaddie(squaddie)
        expect(manager.getRawOutOfBattleSquaddie(squaddie.id)).toEqual(squaddie)
        expect(
            manager.getRawOutOfBattleSquaddie("does not exist")
        ).toBeUndefined()
    })

    it("can get the squaddie and its attribute sheet", () => {
        manager.addOrUpdateAttributeSheet(attributeSheet)
        manager.addOrUpdateSquaddie(squaddie)
        expect(manager.getSquaddie(squaddie.id)).toEqual(
            expect.objectContaining({
                attributeSheet,
                squaddie,
            })
        )
    })

    it("will not get a squaddie if raw squaddie or attribute sheet is missing", () => {
        expect(manager.getSquaddie(squaddie.id)).toBeUndefined()
        manager.addOrUpdateSquaddie(squaddie)
        expect(manager.getSquaddie(squaddie.id)).toBeUndefined()
    })

    it("can remove a squaddie", () => {
        manager.addOrUpdateSquaddie(squaddie)
        manager.deleteSquaddie(squaddie.id)
        expect(manager.getRawOutOfBattleSquaddie(squaddie.id)).toBeUndefined()
    })

    it("can remove orphaned attribute sheets", () => {
        manager.addOrUpdateAttributeSheet(attributeSheet)
        manager.addOrUpdateSquaddie(squaddie)
        expect(manager.getAttributeSheet(attributeSheet.id)).toBeDefined()

        manager.deleteSquaddie(squaddie.id)
        expect(manager.getAttributeSheet(attributeSheet.id)).toBeDefined()

        manager.deleteAllOrphanedAttributeSheets()
        expect(() => manager.getAttributeSheet(attributeSheet.id)).toThrow(
            "no attributeSheet"
        )
    })

    describe("item management", () => {
        beforeEach(() => {
            manager.addOrUpdateAttributeSheet(attributeSheet)
            manager.addOrUpdateSquaddie(squaddie)
        })
        it("can get item max capacity with the attribute sheet", () => {
            expect(
                manager.getItemCapacity({
                    attributeSheetId: attributeSheet.id,
                })
            ).toEqual(attributeSheet.items.maxCapacity)
        })
        it("can get item max capacity with the squaddie", () => {
            expect(
                manager.getItemCapacity({
                    squaddieId: squaddie.id,
                })
            ).toEqual(attributeSheet.items.maxCapacity)
        })
        it("can get items with the attribute sheet", () => {
            expect(
                manager.getItemIds({
                    attributeSheetId: attributeSheet.id,
                })
            ).toEqual(attributeSheet.items.itemIds)
        })
        it("can get items with the squaddie", () => {
            expect(
                manager.getItemIds({
                    squaddieId: squaddie.id,
                })
            ).toEqual(attributeSheet.items.itemIds)
        })
        it("can add items to the attribute sheet", () => {
            manager.addItem({
                attributeSheetId: attributeSheet.id,
                itemId: "healPotion1",
            })

            expect(
                manager.getItemIds({
                    squaddieId: squaddie.id,
                })
            ).toEqual(["plateMail", "powerRune", "healPotion1"])
        })

        it("can add items to a squaddie", () => {
            manager.addItem({
                squaddieId: squaddie.id,
                itemId: "poisonPestle1",
            })

            expect(
                manager.getItemIds({
                    squaddieId: squaddie.id,
                })
            ).toEqual(["plateMail", "powerRune", "poisonPestle1"])
        })
        it("will not add items if at max capacity", () => {
            manager.addItem({
                squaddieId: squaddie.id,
                itemId: "poisonPestle1",
            })

            manager.addItem({
                squaddieId: squaddie.id,
                itemId: "will not add since we're at max capacity",
            })

            expect(
                manager.getItemIds({
                    squaddieId: squaddie.id,
                })
            ).toEqual(["plateMail", "powerRune", "poisonPestle1"])
        })

        it("can reorder items", () => {
            manager.reorderItemSlots({
                squaddieId: squaddie.id,
                itemSlotA: 0,
                itemSlotB: 1,
            })

            expect(
                manager.getItemIds({
                    squaddieId: squaddie.id,
                })
            ).toEqual(["powerRune", "plateMail"])
        })

        it("can remove items", () => {
            manager.addItem({
                squaddieId: squaddie.id,
                itemId: "plateMail",
            })

            manager.removeItem({
                squaddieId: squaddie.id,
                itemId: "plateMail",
            })

            expect(
                manager.getItemIds({
                    squaddieId: squaddie.id,
                })
            ).toEqual(["powerRune", "plateMail"])
        })
    })
})
