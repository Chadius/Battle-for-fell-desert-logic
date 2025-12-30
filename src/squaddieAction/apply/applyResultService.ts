import type { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager"

import type { CoordinateMapCollectionManager } from "../../coordinateMap/coordinateMapManager"
import type { SquaddieActionResult } from "../calculate/result/squaddieActionResult"
import { CoordinateMovePathService } from "../../coordinateMap/path/path"

export const ApplyResultService = {
    applyResultsToSquaddies: ({
        inBattleSquaddieManager,
        results,
        map,
    }: {
        inBattleSquaddieManager: InBattleSquaddieManager
        results: SquaddieActionResult[]
        map?: {
            mapId: string
            manager: CoordinateMapCollectionManager
        }
    }) => {
        for (const result of results) {
            applyResultToSquaddie({ inBattleSquaddieManager, result, map })
        }
    },
}

const applyResultToSquaddie = ({
    inBattleSquaddieManager,
    result,
    map,
}: {
    inBattleSquaddieManager: InBattleSquaddieManager
    result: SquaddieActionResult
    map?: {
        mapId: string
        manager: CoordinateMapCollectionManager
    }
}) => {
    applyActionPointsResultToSquaddie({ inBattleSquaddieManager, result })
    applyDamageResultToSquaddie({ inBattleSquaddieManager, result })
    applyHealingResultToSquaddie({ inBattleSquaddieManager, result })
    applyConditionsAddResultToSquaddie({ inBattleSquaddieManager, result })
    dispelConditionsResultToSquaddie({ inBattleSquaddieManager, result })
    treatConditionsResultToSquaddie({ inBattleSquaddieManager, result })
    moveSquaddie({ result, map })
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

const dispelConditionsResultToSquaddie = ({
    inBattleSquaddieManager,
    result,
}: {
    inBattleSquaddieManager: InBattleSquaddieManager
    result: SquaddieActionResult
}) => {
    if (result.dispel == undefined) return

    inBattleSquaddieManager.dispelConditions({
        inBattleSquaddieId: result.inBattleSquaddieId,
        outOfBattleSquaddieId: result.outOfBattleSquaddieId,
        ...result.dispel,
    })
}

const treatConditionsResultToSquaddie = ({
    inBattleSquaddieManager,
    result,
}: {
    inBattleSquaddieManager: InBattleSquaddieManager
    result: SquaddieActionResult
}) => {
    if (result.treat == undefined) return

    inBattleSquaddieManager.treatConditions({
        inBattleSquaddieId: result.inBattleSquaddieId,
        outOfBattleSquaddieId: result.outOfBattleSquaddieId,
        ...result.treat,
    })
}

const moveSquaddie = ({
    result,
    map,
}: {
    result: SquaddieActionResult
    map?: {
        mapId: string
        manager: CoordinateMapCollectionManager
    }
}) => {
    if (map == undefined) return
    if (result.movement == undefined) return

    map.manager.moveSquaddie({
        mapId: map.mapId,
        squaddieId: {
            inBattleSquaddieId: result.inBattleSquaddieId,
            outOfBattleSquaddieId: result.outOfBattleSquaddieId,
        },
        coordinate: CoordinateMovePathService.getEndCoordinate(
            result.movement.expectedPath
        ),
    })
}
