import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    type MockInstance,
    vi,
} from "vitest"
import { OutOfBattleSquaddieCollectionService } from "../outOfBattle/outOfBattleSquaddieCollection.ts"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../outOfBattle/outOfBattleSquaddieAttributeSheetCollection.ts"
import {
    type OutOfBattleSquaddieAttributeSheet,
    OutOfBattleSquaddieAttributeSheetService,
} from "../outOfBattle/outOfBattleSquaddieAttributeSheet.ts"
import {
    type OutOfBattleSquaddie,
    OutOfBattleSquaddieService,
} from "../outOfBattle/outOfBattleSquaddie.ts"
import { OutOfBattleSquaddieManager } from "../outOfBattle/outOfBattleSquaddieManager.ts"
import { ProficiencyType } from "../../proficiency/levels.ts"
import {
    type InBattleSquaddieCollection,
    InBattleSquaddieCollectionService,
} from "./inBattleSquaddieCollection.ts"
import { InBattleSquaddieManager } from "./inBattleSquaddieManager.ts"

describe("In Battle Squaddie Manager", () => {
    let attributeSheet: OutOfBattleSquaddieAttributeSheet
    let outOfBattleSquaddie0: OutOfBattleSquaddie
    let outOfBattleSquaddie1: OutOfBattleSquaddie
    let outOfBattleSquaddieManagerSpy: MockInstance

    let inBattleSquaddieCollection: InBattleSquaddieCollection
    let manager: InBattleSquaddieManager

    beforeEach(() => {
        let outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
            OutOfBattleSquaddieCollectionService.new(),
            OutOfBattleSquaddieAttributeSheetCollectionService.new()
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
        outOfBattleSquaddie0 = OutOfBattleSquaddieService.new({
            id: "squaddie0",
            name: "Squaddie0",
            actionIds: [0, 2, 3],
            attributeSheetId: "test sheet",
        })

        outOfBattleSquaddie1 = OutOfBattleSquaddieService.new({
            id: "squaddie1",
            name: "Squaddie1",
            actionIds: [0, 4, 5],
            attributeSheetId: "test sheet",
        })

        outOfBattleSquaddieManagerSpy = vi
            .spyOn(outOfBattleSquaddieManager, "getSquaddie")
            .mockImplementation((squaddieId: string) => {
                switch (squaddieId) {
                    case outOfBattleSquaddie0.id:
                        return {
                            squaddie: outOfBattleSquaddie0,
                            attributeSheet,
                        }
                    case outOfBattleSquaddie1.id:
                        return {
                            squaddie: outOfBattleSquaddie1,
                            attributeSheet,
                        }
                    default:
                        return undefined
                }
            })

        inBattleSquaddieCollection = InBattleSquaddieCollectionService.new()
        manager = new InBattleSquaddieManager(
            inBattleSquaddieCollection,
            outOfBattleSquaddieManager
        )
    })

    afterEach(() => {
        if (outOfBattleSquaddieManagerSpy)
            outOfBattleSquaddieManagerSpy.mockRestore()
    })

    describe("Adding squaddies", () => {
        it("can create and store a new InBattleSquaddie based on an existing Out of Battle Squaddie", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })
            expect(inBattleSquaddie00Id).toEqual(
                expect.objectContaining({
                    inBattle: 0,
                    outOfBattle: outOfBattleSquaddie0.id,
                })
            )
            expect(manager.getSquaddie(inBattleSquaddie00Id!)).toEqual(
                expect.objectContaining({
                    inBattleSquaddie:
                        InBattleSquaddieCollectionService.getSquaddie({
                            collection: manager.inBattleSquaddieCollection,
                            id: inBattleSquaddie00Id!.inBattle,
                            outOfBattleSquaddieId:
                                inBattleSquaddie00Id!.outOfBattle,
                        }),
                    outOfBattleSquaddie: outOfBattleSquaddie0,
                    attributeSheet,
                })
            )
            expect(outOfBattleSquaddieManagerSpy).toBeCalled()
        })

        it("can store multiple squaddies with the same out of battle id", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })
            const inBattleSquaddie01Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })
            expect(inBattleSquaddie00Id?.outOfBattle).toEqual(
                inBattleSquaddie01Id?.outOfBattle
            )
            expect(inBattleSquaddie00Id?.inBattle).not.toEqual(
                inBattleSquaddie01Id?.inBattle
            )
        })
    })
})
