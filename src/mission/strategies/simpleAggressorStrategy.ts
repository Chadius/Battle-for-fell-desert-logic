import type { AiStrategy, AiStrategyInput } from "../aiStrategy"
import type { ReadiedAction } from "../readiedAction"
import { CoordinateCalculator } from "../../coordinateMap/coordinateCalculator"
import { CoordinateMapAStarAdapter } from "../../coordinateMap/coordinateMapAStarAdapter"
import { AStarSearchService } from "../../aStarSearch/aStarSearch"
import {
    type CoordinateMovePath,
    CoordinateMovePathService,
} from "../../coordinateMap/path/path"
import { SquaddieAffiliationService } from "../../affiliation/affiliation"
import { SquaddieActionValidationService } from "../../squaddieAction/calculate/validity/squaddieActionValidationService"
import type { OffsetCoordinate } from "../../coordinateMap/offsetCoordinate"
import type { BattleSquaddieId } from "../../squaddie/inBattle/battleSquaddieId"
import type { AStarGraph } from "../../aStarSearch/aStarGraph"

export class SimpleAggressorStrategy implements AiStrategy {
    decideAction(input: AiStrategyInput): ReadiedAction | undefined {
        const {
            actorIds,
            inBattleSquaddieManager,
            squaddieActionManager,
            coordinateMapCollectionManager,
            mapId,
        } = input

        const actorPosition =
            coordinateMapCollectionManager.getSquaddieCoordinate({
                mapId,
                squaddieId: actorIds,
            })
        if (
            actorPosition?.row == undefined ||
            actorPosition?.col == undefined
        ) {
            return undefined
        }
        const actorCoordinate: OffsetCoordinate = {
            row: actorPosition.row,
            col: actorPosition.col,
        }

        const { inBattleSquaddie } =
            inBattleSquaddieManager.getSquaddie(actorIds)
        const actorAffiliation =
            inBattleSquaddieManager.getSquaddieAffiliation(actorIds)

        const actionPoints = inBattleSquaddieManager.getActionPoints(actorIds)
        const movementInfo =
            inBattleSquaddieManager.getSquaddieMovementInfo(actorIds)

        const allOnMap =
            coordinateMapCollectionManager.getAllSquaddieCoordinatesOnMap(mapId)
        const hostiles = collectHostilesWithDistance({
            allOnMap,
            actorCoordinate: actorCoordinate,
            actorAffiliation,
            inBattleSquaddieManager,
        })

        if (hostiles.length === 0) return undefined

        hostiles.sort((a, b) => a.distance - b.distance)
        const nearest = hostiles[0]

        const attackAction = findValidAttackAction({
            actorIds,
            naturalActionIds: inBattleSquaddie.actionIds.natural,
            nearestHostile: nearest.squaddieId,
            inBattleSquaddieManager,
            squaddieActionManager,
            coordinateMapCollectionManager,
            mapId,
        })
        if (attackAction != undefined) return attackAction

        return findMoveTowardHostile({
            actorIds,
            actorCoordinate: actorCoordinate,
            targetCoordinate: nearest.coordinate,
            remainingAP: actionPoints.current,
            movementPerAction: movementInfo.movementPointsPerAction,
            inBattleSquaddieManager,
            coordinateMapCollectionManager,
            mapId,
        })
    }
}

const collectHostilesWithDistance = ({
    allOnMap,
    actorCoordinate,
    actorAffiliation,
    inBattleSquaddieManager,
}: {
    allOnMap: {
        squaddieId: BattleSquaddieId
        coordinate: { row: number | undefined; col: number | undefined }
    }[]
    actorCoordinate: OffsetCoordinate
    actorAffiliation: ReturnType<
        typeof inBattleSquaddieManager.getSquaddieAffiliation
    >
    inBattleSquaddieManager: AiStrategyInput["inBattleSquaddieManager"]
}): {
    squaddieId: BattleSquaddieId
    coordinate: OffsetCoordinate
    distance: number
}[] => {
    const result: {
        squaddieId: BattleSquaddieId
        coordinate: OffsetCoordinate
        distance: number
    }[] = []

    for (const { squaddieId, coordinate } of allOnMap) {
        if (coordinate.row == undefined || coordinate.col == undefined) continue
        if (inBattleSquaddieManager.isSquaddieDefeated(squaddieId)) continue

        const targetAffiliation =
            inBattleSquaddieManager.getSquaddieAffiliation(squaddieId)
        if (
            SquaddieAffiliationService.areFriends({
                actor: actorAffiliation,
                target: targetAffiliation,
            })
        ) {
            continue
        }

        const targetCoordinate: OffsetCoordinate = {
            row: coordinate.row,
            col: coordinate.col,
        }
        result.push({
            squaddieId,
            coordinate: targetCoordinate,
            distance: CoordinateCalculator.getDistanceBetween(
                actorCoordinate,
                targetCoordinate
            ),
        })
    }

    return result
}

const findValidAttackAction = ({
    actorIds,
    naturalActionIds,
    nearestHostile,
    inBattleSquaddieManager,
    squaddieActionManager,
    coordinateMapCollectionManager,
    mapId,
}: {
    actorIds: BattleSquaddieId
    naturalActionIds: string[]
    nearestHostile: BattleSquaddieId
    inBattleSquaddieManager: AiStrategyInput["inBattleSquaddieManager"]
    squaddieActionManager: AiStrategyInput["squaddieActionManager"]
    coordinateMapCollectionManager: AiStrategyInput["coordinateMapCollectionManager"]
    mapId: string
}): ReadiedAction | undefined => {
    for (const actionId of naturalActionIds) {
        if (!squaddieActionManager.has(actionId)) continue

        const validationResult = SquaddieActionValidationService.isActionValid({
            actor: actorIds,
            action: { id: actionId },
            targets: [nearestHostile],
            managers: {
                inBattleSquaddieManager,
                squaddieActionManager,
                coordinateMapCollectionManager,
            },
            map: { mapId },
        })

        if (validationResult.isValid) {
            return {
                actor: actorIds,
                targets: [nearestHostile],
                action: { id: actionId },
            }
        }
    }

    return undefined
}

const findMoveTowardHostile = ({
    actorIds,
    actorCoordinate,
    targetCoordinate,
    remainingAP,
    movementPerAction,
    inBattleSquaddieManager,
    coordinateMapCollectionManager,
    mapId,
}: {
    actorIds: BattleSquaddieId
    actorCoordinate: OffsetCoordinate
    targetCoordinate: OffsetCoordinate
    remainingAP: number
    movementPerAction: number
    inBattleSquaddieManager: AiStrategyInput["inBattleSquaddieManager"]
    coordinateMapCollectionManager: AiStrategyInput["coordinateMapCollectionManager"]
    mapId: string
}): ReadiedAction | undefined => {
    const maxRange = remainingAP * movementPerAction

    const straightLineDistance = CoordinateCalculator.getDistanceBetween(
        actorCoordinate,
        targetCoordinate
    )
    if (straightLineDistance > maxRange) return undefined

    const coordinateMap = coordinateMapCollectionManager.getMapById(mapId)
    const searchLimits =
        CoordinateMapAStarAdapter.getCoordinateMapSearchLimitsFromSquaddie({
            manager: inBattleSquaddieManager,
            battleSquaddieId: actorIds,
        })
    const adapter = new CoordinateMapAStarAdapter({
        map: coordinateMap,
        searchLimits,
        inBattleSquaddieManager,
    })

    const path = AStarSearchService.search<
        OffsetCoordinate,
        CoordinateMovePath,
        AStarGraph<OffsetCoordinate, CoordinateMovePath>
    >({
        start: actorCoordinate,
        graph: adapter,
        stopCondition: (node) =>
            CoordinateCalculator.getDistanceBetween(node, targetCoordinate) <=
            1,
    })

    if (path == undefined) return undefined

    const moveCost = CoordinateMovePathService.getTotalMoveCost(path)
    const apCost = inBattleSquaddieManager.calculateActionPointsForMovement({
        ...actorIds,
        movementCost: moveCost,
    })

    if (apCost > remainingAP) return undefined

    const pathEndCoordinate = CoordinateMovePathService.getEndCoordinate(path)

    return {
        actor: actorIds,
        targets: [actorIds],
        action: {
            id: "default-move",
            decisions: { targetDestination: pathEndCoordinate },
        },
    }
}
