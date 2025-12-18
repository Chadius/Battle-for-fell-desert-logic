import { beforeEach, describe, expect, it } from "vitest"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager.ts"
import {
    type OutOfBattleSquaddieAttributeSheet,
    OutOfBattleSquaddieAttributeSheetService,
} from "../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet.ts"
import {
    type OutOfBattleSquaddie,
    OutOfBattleSquaddieService,
} from "../squaddie/outOfBattle/outOfBattleSquaddie.ts"
import {
    type InBattleSquaddieCollection,
    InBattleSquaddieCollectionService,
} from "../squaddie/inBattle/inBattleSquaddieCollection.ts"
import { OutOfBattleSquaddieManager } from "../squaddie/outOfBattle/outOfBattleSquaddieManager.ts"
import { OutOfBattleSquaddieCollectionService } from "../squaddie/outOfBattle/outOfBattleSquaddieCollection.ts"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection.ts"
import { AttributeScore } from "../proficiency/attributeScore.ts"
import { SquaddieAffiliation } from "../squaddie/outOfBattle/affiliation.ts"
import { CoordinateMapAStarAdapter } from "./coordinateMapAStarAdapter.ts"

describe("coordinateMapAStarAdapter", () => {
    describe("can make search parameters from a squaddie", () => {
        let manager: InBattleSquaddieManager
        let attributeSheet: OutOfBattleSquaddieAttributeSheet
        let outOfBattleSquaddie0: OutOfBattleSquaddie

        let inBattleSquaddieCollection: InBattleSquaddieCollection
        let inBattleSquaddie00Id: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }

        beforeEach(() => {
            let outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
                OutOfBattleSquaddieCollectionService.new(),
                OutOfBattleSquaddieAttributeSheetCollectionService.new()
            )
            attributeSheet = OutOfBattleSquaddieAttributeSheetService.new({
                id: "test sheet",
                movement: {
                    distancePerAction: 4,
                    skipOverPits: true,
                    moveThroughWalls: true,
                    stopOnSquaddies: false,
                },
                attributeScores: {
                    [AttributeScore.BODY]: 1,
                    [AttributeScore.MIND]: 2,
                    [AttributeScore.SOUL]: 3,
                },
            })
            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(attributeSheet)

            outOfBattleSquaddie0 = OutOfBattleSquaddieService.new({
                id: "squaddie0",
                name: "Squaddie0",
                actionIds: ["endTurn"],
                attributeSheetId: "test sheet",
                affiliation: SquaddieAffiliation.NONE,
            })

            outOfBattleSquaddieManager.addOrUpdateSquaddie(outOfBattleSquaddie0)

            inBattleSquaddieCollection = InBattleSquaddieCollectionService.new()
            manager = new InBattleSquaddieManager(
                inBattleSquaddieCollection,
                outOfBattleSquaddieManager
            )
        })

        it("can make search parameters from a squaddie", () => {
            inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })
            const movementInfo =
                CoordinateMapAStarAdapter.getCoordinateMapSearchLimitsFromSquaddie(
                    {
                        manager,
                        ...inBattleSquaddie00Id,
                    }
                )
            expect(movementInfo).toEqual({
                maximumMoveCost: attributeSheet.movement.distancePerAction * 3,
                skipOverPits: attributeSheet.movement.skipOverPits,
                moveThroughWalls: attributeSheet.movement.moveThroughWalls,
                stopOnSquaddies: attributeSheet.movement.stopOnSquaddies,
            })
        })
    })
})
