import type { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager.ts"
import type { SquaddieActionResult } from "./squaddieActionResolverOnSelf.ts"

export const SquaddieActionResolver = {
    applyResultsToSquaddies: ({
        inBattleSquaddieManager,
        results,
    }: {
        inBattleSquaddieManager: InBattleSquaddieManager
        results: SquaddieActionResult[]
    }) => {
        for (const result of results) {
            applyResultToSquaddie({ inBattleSquaddieManager, result })
        }
    },
}

const applyResultToSquaddie = ({
    inBattleSquaddieManager,
    result,
}: {
    inBattleSquaddieManager: InBattleSquaddieManager
    result: SquaddieActionResult
}) => {
    applyActionPointsResultToSquaddie({ inBattleSquaddieManager, result })
}

const applyActionPointsResultToSquaddie = ({
    inBattleSquaddieManager,
    result,
}: {
    inBattleSquaddieManager: InBattleSquaddieManager
    result: SquaddieActionResult
}) => {
    if (result.actionPoints == undefined) return

    inBattleSquaddieManager.spendActionPoints({
        inBattleSquaddieId: result.inBattleSquaddieId,
        outOfBattleSquaddieId: result.outOfBattleSquaddieId,
        actionPoints: result.actionPoints.spent,
    })
}
