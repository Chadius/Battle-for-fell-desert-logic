import type { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager.ts"

import type { SquaddieActionResult } from "../calculate/squaddieActionResult.ts"

export const ApplyResultService = {
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
    applyDamageResultToSquaddie({ inBattleSquaddieManager, result })
    applyHealingResultToSquaddie({ inBattleSquaddieManager, result })
    applyConditionsAddResultToSquaddie({ inBattleSquaddieManager, result })
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

const applyDamageResultToSquaddie = ({
    inBattleSquaddieManager,
    result,
}: {
    inBattleSquaddieManager: InBattleSquaddieManager
    result: SquaddieActionResult
}) => {
    if (result.damage == undefined) return

    inBattleSquaddieManager.dealDamageToSquaddie({
        inBattleSquaddieId: result.inBattleSquaddieId,
        outOfBattleSquaddieId: result.outOfBattleSquaddieId,
        damage: {
            amount: result.damage.raw,
            type: result.damage.type,
        },
    })
}

const applyHealingResultToSquaddie = ({
    inBattleSquaddieManager,
    result,
}: {
    inBattleSquaddieManager: InBattleSquaddieManager
    result: SquaddieActionResult
}) => {
    if (result.healing == undefined) return

    inBattleSquaddieManager.giveHealingToSquaddie({
        inBattleSquaddieId: result.inBattleSquaddieId,
        outOfBattleSquaddieId: result.outOfBattleSquaddieId,
        healing: result.healing,
    })
}

const applyConditionsAddResultToSquaddie = ({
    inBattleSquaddieManager,
    result,
}: {
    inBattleSquaddieManager: InBattleSquaddieManager
    result: SquaddieActionResult
}) => {
    if (result.conditionsAdded == undefined) return

    inBattleSquaddieManager.addConditionsToSquaddie({
        inBattleSquaddieId: result.inBattleSquaddieId,
        outOfBattleSquaddieId: result.outOfBattleSquaddieId,
        conditions: result.conditionsAdded,
    })
}
