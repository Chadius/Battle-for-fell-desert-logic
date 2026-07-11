import { beforeEach, describe, expect, it } from "vitest"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup.js"
import { SquaddieAffiliation } from "../../../affiliation/affiliation.js"
import { ApplyResultService } from "../../apply/applyResultService.js"
import type { SquaddieActionResult } from "../../calculate/result/squaddieActionResult.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"

describe("ApplyResultService cooldown", () => {
    let inBattleSquaddieManager: InBattleSquaddieManager
    let actorId: BattleSquaddieId

    beforeEach(() => {
        const { manager: outOfBattleSquaddieManager } =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "test-sheet",
            })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: "actor",
                name: "Actor",
                actionIds: [],
                attributeSheetId: "test-sheet",
                affiliation: SquaddieAffiliation.PLAYER,
            })
        )

        inBattleSquaddieManager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            outOfBattleSquaddieManager
        )
        const { inBattleSquaddieId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor",
            })
        actorId = {
            inBattleSquaddieId,
            outOfBattleSquaddieId: "actor",
        }
    })

    describe("when the actor's result has a cooldown field", () => {
        it("records the cooldown on the actor's in-battle squaddie", () => {
            const actorResult: SquaddieActionResult = {
                inBattleSquaddieId: actorId.inBattleSquaddieId,
                outOfBattleSquaddieId: actorId.outOfBattleSquaddieId,
                cooldown: { actionId: "freeze-blast", turnsRemaining: 2 },
            }

            ApplyResultService.applyResultsToSquaddies({
                inBattleSquaddieManager,
                results: [actorResult],
            })

            expect(
                inBattleSquaddieManager.getActionCooldown({
                    battleSquaddieId: actorId,
                    actionId: "freeze-blast",
                })
            ).toBe(2)
        })
    })
})
