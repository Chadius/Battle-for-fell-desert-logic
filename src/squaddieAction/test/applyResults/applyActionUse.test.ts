import { beforeEach, describe, expect, it } from "vitest"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup.js"
import { SquaddieAffiliation } from "../../../affiliation/affiliation.js"
import { ApplyResultService } from "../../apply/applyResultService.js"
import type { SquaddieActionResult } from "../../calculate/result/squaddieActionResult.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"

describe("ApplyResultService action use tracking", () => {
    let inBattleSquaddieManager: InBattleSquaddieManager
    let actorId: BattleSquaddieId
    const actionId = "thunder-strike"

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

    it("records an action use when the result has an actionUse field", () => {
        const result: SquaddieActionResult = {
            inBattleSquaddieId: actorId.inBattleSquaddieId,
            outOfBattleSquaddieId: actorId.outOfBattleSquaddieId,
            actionUse: { actionId },
        }

        ApplyResultService.applyResultsToSquaddies({
            inBattleSquaddieManager,
            results: [result],
        })

        expect(
            inBattleSquaddieManager.getActionUsesThisTurn({
                battleSquaddieId: actorId,
                actionId,
            })
        ).toBe(1)
    })

    it("accumulates multiple uses from repeated results", () => {
        const result: SquaddieActionResult = {
            inBattleSquaddieId: actorId.inBattleSquaddieId,
            outOfBattleSquaddieId: actorId.outOfBattleSquaddieId,
            actionUse: { actionId },
        }

        ApplyResultService.applyResultsToSquaddies({
            inBattleSquaddieManager,
            results: [result, result],
        })

        expect(
            inBattleSquaddieManager.getActionUsesThisTurn({
                battleSquaddieId: actorId,
                actionId,
            })
        ).toBe(2)
    })

    it("does not record a use when actionUse is absent", () => {
        const result: SquaddieActionResult = {
            inBattleSquaddieId: actorId.inBattleSquaddieId,
            outOfBattleSquaddieId: actorId.outOfBattleSquaddieId,
        }

        ApplyResultService.applyResultsToSquaddies({
            inBattleSquaddieManager,
            results: [result],
        })

        expect(
            inBattleSquaddieManager.getActionUsesThisTurn({
                battleSquaddieId: actorId,
                actionId,
            })
        ).toBe(0)
    })
})
