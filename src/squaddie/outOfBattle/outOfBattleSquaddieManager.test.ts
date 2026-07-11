import { beforeEach, describe, expect, it } from "vitest"
import {
    type OutOfBattleSquaddieCollection,
    OutOfBattleSquaddieCollectionService,
} from "./outOfBattleSquaddieCollection.js"
import {
    type OutOfBattleSquaddieAttributeSheetCollection,
    OutOfBattleSquaddieAttributeSheetCollectionService,
} from "./outOfBattleSquaddieAttributeSheetCollection.js"
import {
    type OutOfBattleSquaddieAttributeSheet,
    OutOfBattleSquaddieAttributeSheetService,
} from "./outOfBattleSquaddieAttributeSheet.js"
import {
    ProficiencyLevel,
    ProficiencyType,
} from "../../proficiency/proficiencyLevel.js"
import { OutOfBattleSquaddieManager } from "./outOfBattleSquaddieManager.js"
import {
    type OutOfBattleSquaddie,
    OutOfBattleSquaddieService,
} from "./outOfBattleSquaddie.js"
import { AttributeScore } from "../../proficiency/attributeScore.js"
import { SquaddieAffiliation } from "../../affiliation/affiliation.js"
import { OutOfBattleSquaddieTestSetup } from "../../testUtils/outOfBattleSquaddieTestSetup.js"

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
        attributeSheet = OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
            id: "test sheet",
            distancePerAction: 2,
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

    it("can get squaddies by affiliation", () => {
        manager.addOrUpdateAttributeSheet(attributeSheet)
        manager.addOrUpdateSquaddie(squaddie)
        const squaddies = manager.getAllWithSquaddieAffiliation(
            squaddie.affiliation
        )
        expect(squaddies).toHaveLength(1)
        expect(squaddies[0]).toEqual(squaddie)
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

    describe("JSON serialization", () => {
        beforeEach(() => {
            manager.addOrUpdateAttributeSheet(attributeSheet)
            manager.addOrUpdateSquaddie(squaddie)
        })

        describe("serializeSquaddies / addSquaddiesFromJson", () => {
            it("serializes squaddies to a plain array", () => {
                const serialized = manager.serializeSquaddies()
                expect(serialized).toHaveLength(1)
                expect(serialized[0]).toEqual(
                    OutOfBattleSquaddieService.serialize(squaddie)
                )
            })

            it("serializes an empty collection as an empty array", () => {
                const emptyManager = new OutOfBattleSquaddieManager(
                    OutOfBattleSquaddieCollectionService.new(),
                    OutOfBattleSquaddieAttributeSheetCollectionService.new()
                )
                expect(emptyManager.serializeSquaddies()).toEqual([])
            })

            it("loads a single squaddie blob", () => {
                const fresh = new OutOfBattleSquaddieManager(
                    OutOfBattleSquaddieCollectionService.new(),
                    OutOfBattleSquaddieAttributeSheetCollectionService.new()
                )
                const blob = OutOfBattleSquaddieService.serialize(squaddie)
                const errors = fresh.addSquaddiesFromJson(blob)
                expect(errors).toHaveLength(0)
                expect(fresh.getRawOutOfBattleSquaddie(squaddie.id)).toEqual(
                    squaddie
                )
            })

            it("loads an array of squaddie blobs", () => {
                const second = OutOfBattleSquaddieService.new({
                    id: "secondSquaddie",
                    name: "Second",
                    actionIds: [],
                    attributeSheetId: "test sheet",
                    affiliation: SquaddieAffiliation.ENEMY,
                })
                manager.addOrUpdateSquaddie(second)
                const serialized = manager.serializeSquaddies()

                const fresh = new OutOfBattleSquaddieManager(
                    OutOfBattleSquaddieCollectionService.new(),
                    OutOfBattleSquaddieAttributeSheetCollectionService.new()
                )
                const errors = fresh.addSquaddiesFromJson(serialized)
                expect(errors).toHaveLength(0)
                expect(fresh.getRawOutOfBattleSquaddie(squaddie.id)).toEqual(
                    squaddie
                )
                expect(
                    fresh.getRawOutOfBattleSquaddie("secondSquaddie")
                ).toEqual(second)
            })

            it("returns errors for invalid blobs and still loads valid ones", () => {
                const blobs = [
                    OutOfBattleSquaddieService.serialize(squaddie),
                    {
                        id: "",
                        name: "Bad",
                        affiliation: "PLAYER",
                        actionIds: [],
                        attributeSheetId: "x",
                    },
                ]
                const fresh = new OutOfBattleSquaddieManager(
                    OutOfBattleSquaddieCollectionService.new(),
                    OutOfBattleSquaddieAttributeSheetCollectionService.new()
                )
                const errors = fresh.addSquaddiesFromJson(blobs)
                expect(errors).toHaveLength(1)
                expect(errors[0]).toContain(
                    "OutOfBattleSquaddieService.deserialize"
                )
                expect(fresh.getRawOutOfBattleSquaddie(squaddie.id)).toEqual(
                    squaddie
                )
            })

            it("round-trips squaddies", () => {
                const serialized = manager.serializeSquaddies()
                const fresh = new OutOfBattleSquaddieManager(
                    OutOfBattleSquaddieCollectionService.new(),
                    OutOfBattleSquaddieAttributeSheetCollectionService.new()
                )
                fresh.addSquaddiesFromJson(serialized)
                expect(fresh.getRawOutOfBattleSquaddie(squaddie.id)).toEqual(
                    squaddie
                )
            })
        })

        describe("serializeAttributeSheets / addAttributeSheetsFromJson", () => {
            it("serializes attribute sheets to a plain array", () => {
                const serialized = manager.serializeAttributeSheets()
                expect(serialized).toHaveLength(1)
                expect(serialized[0]).toEqual(
                    OutOfBattleSquaddieAttributeSheetService.serialize(
                        attributeSheet
                    )
                )
            })

            it("serializes an empty collection as an empty array", () => {
                const emptyManager = new OutOfBattleSquaddieManager(
                    OutOfBattleSquaddieCollectionService.new(),
                    OutOfBattleSquaddieAttributeSheetCollectionService.new()
                )
                expect(emptyManager.serializeAttributeSheets()).toEqual([])
            })

            it("loads a single attribute sheet blob", () => {
                const fresh = new OutOfBattleSquaddieManager(
                    OutOfBattleSquaddieCollectionService.new(),
                    OutOfBattleSquaddieAttributeSheetCollectionService.new()
                )
                const blob =
                    OutOfBattleSquaddieAttributeSheetService.serialize(
                        attributeSheet
                    )
                const errors = fresh.addAttributeSheetsFromJson(blob)
                expect(errors).toHaveLength(0)
                expect(fresh.getAttributeSheet(attributeSheet.id)).toEqual(
                    attributeSheet
                )
            })

            it("loads an array of attribute sheet blobs", () => {
                const serialized = manager.serializeAttributeSheets()
                const fresh = new OutOfBattleSquaddieManager(
                    OutOfBattleSquaddieCollectionService.new(),
                    OutOfBattleSquaddieAttributeSheetCollectionService.new()
                )
                const errors = fresh.addAttributeSheetsFromJson(serialized)
                expect(errors).toHaveLength(0)
                expect(fresh.getAttributeSheet(attributeSheet.id)).toEqual(
                    attributeSheet
                )
            })

            it("returns errors for invalid blobs and still loads valid ones", () => {
                const blobs = [
                    OutOfBattleSquaddieAttributeSheetService.serialize(
                        attributeSheet
                    ),
                    { id: "" },
                ]
                const fresh = new OutOfBattleSquaddieManager(
                    OutOfBattleSquaddieCollectionService.new(),
                    OutOfBattleSquaddieAttributeSheetCollectionService.new()
                )
                const errors = fresh.addAttributeSheetsFromJson(blobs)
                expect(errors).toHaveLength(1)
                expect(errors[0]).toContain(
                    "OutOfBattleSquaddieAttributeSheetService.deserialize"
                )
                expect(fresh.getAttributeSheet(attributeSheet.id)).toEqual(
                    attributeSheet
                )
            })

            it("round-trips attribute sheets", () => {
                const serialized = manager.serializeAttributeSheets()
                const fresh = new OutOfBattleSquaddieManager(
                    OutOfBattleSquaddieCollectionService.new(),
                    OutOfBattleSquaddieAttributeSheetCollectionService.new()
                )
                fresh.addAttributeSheetsFromJson(serialized)
                expect(fresh.getAttributeSheet(attributeSheet.id)).toEqual(
                    attributeSheet
                )
            })
        })
    })
})
