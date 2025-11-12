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
import { ProficiencyType } from "../../proficiency/proficiencyLevel.ts"
import { OutOfBattleSquaddieManager } from "./outOfBattleSquaddieManager.ts"
import {
    type OutOfBattleSquaddie,
    OutOfBattleSquaddieService,
} from "./outOfBattleSquaddie.ts"

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
            movementPerAction: 2,
            maxHitPoints: 5,
            proficiencyLevels: {
                [ProficiencyType.DEFEND_BODY]: 3,
                [ProficiencyType.SKILL_BODY]: 4,
            },
        })
        squaddie = OutOfBattleSquaddieService.new({
            id: "squaddie",
            name: "Squaddie",
            actionIds: [0, 2, 3],
            attributeSheetId: "test sheet",
        })
    })

    it("can add an attribute sheet", () => {
        manager.addOrUpdateAttributeSheet(attributeSheet)
        expect(manager.getAttributeSheet(attributeSheet.id)).toEqual(
            attributeSheet
        )
        expect(manager.getAttributeSheet("does not exist")).toBeUndefined()
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
        expect(manager.getAttributeSheet(attributeSheet.id)).toBeUndefined()
    })
})
