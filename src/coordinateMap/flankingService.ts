import type { BattleSquaddieId } from "../squaddie/inBattle/battleSquaddieId.js"
import type { CoordinateMapCollectionManager } from "./coordinateMapManager.js"
import type { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager.js"
import {
    CoordinateCalculator,
    CoordinateDirection,
} from "./coordinateCalculator.js"
import { SquaddieAffiliationService } from "../affiliation/affiliation.js"
import { CoordinateMapService } from "./coordinateMap.js"

export const FlankingService = {
    isActorFlankingTarget({
        actor,
        target,
        mapId,
        coordinateMapCollectionManager,
        inBattleSquaddieManager,
    }: {
        actor: BattleSquaddieId
        target: BattleSquaddieId
        mapId: string
        coordinateMapCollectionManager: CoordinateMapCollectionManager
        inBattleSquaddieManager: InBattleSquaddieManager
    }): boolean {
        return isActorFlankingTarget({
            actor,
            target,
            mapId,
            coordinateMapCollectionManager,
            inBattleSquaddieManager,
        })
    },
}

const isActorFlankingTarget = ({
    actor,
    target,
    mapId,
    coordinateMapCollectionManager,
    inBattleSquaddieManager,
}: {
    actor: BattleSquaddieId
    target: BattleSquaddieId
    mapId: string
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    inBattleSquaddieManager: InBattleSquaddieManager
}): boolean => {
    const actorCoordinateMaybeOffMap =
        coordinateMapCollectionManager.getSquaddieCoordinate({
            mapId,
            squaddieId: actor,
        })
    const actorCoordinate =
        CoordinateMapService.convertOffsetMaybeOffmapCoordinate(
            actorCoordinateMaybeOffMap
        )
    if (actorCoordinate == undefined) return false

    const targetCoordinateMaybeOffMap =
        coordinateMapCollectionManager.getSquaddieCoordinate({
            mapId,
            squaddieId: target,
        })
    const targetCoordinate =
        CoordinateMapService.convertOffsetMaybeOffmapCoordinate(
            targetCoordinateMaybeOffMap
        )
    if (targetCoordinate == undefined) return false

    const targetAffiliation =
        inBattleSquaddieManager.getSquaddieAffiliation(target)

    for (const direction of [
        CoordinateDirection.RIGHT,
        CoordinateDirection.UP_RIGHT,
        CoordinateDirection.UP_LEFT,
        CoordinateDirection.LEFT,
        CoordinateDirection.DOWN_LEFT,
        CoordinateDirection.DOWN_RIGHT,
    ]) {
        const neighbor = CoordinateCalculator.getNeighbor(
            { row: targetCoordinate.row, col: targetCoordinate.col },
            direction
        )
        if (
            neighbor.row !== actorCoordinate.row ||
            neighbor.col !== actorCoordinate.col
        ) {
            continue
        }

        const oppositeDirection =
            CoordinateCalculator.getOppositeDirection(direction)
        const oppositeCoordinate = CoordinateCalculator.getNeighbor(
            { row: targetCoordinate.row, col: targetCoordinate.col },
            oppositeDirection
        )
        const oppositeSquaddie =
            coordinateMapCollectionManager.getSquaddieAtCoordinate({
                mapId,
                coordinate: oppositeCoordinate,
            })
        if (oppositeSquaddie == undefined) continue

        const oppositeAffiliation =
            inBattleSquaddieManager.getSquaddieAffiliation(oppositeSquaddie)

        if (
            !SquaddieAffiliationService.areFriends({
                actor: oppositeAffiliation,
                target: targetAffiliation,
            })
        ) {
            return true
        }
    }

    return false
}
