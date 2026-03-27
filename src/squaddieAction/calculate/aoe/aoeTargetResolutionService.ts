import { CoordinateGeneratorShape } from "../../../coordinateMap/shape"
import { SquaddieAffiliationService } from "../../../affiliation/affiliation"
import type {
    BattleSquaddieId,
    InBattleSquaddieManager,
} from "../../../squaddie/inBattle/inBattleSquaddieManager"
import type { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager"
import type { SquaddieAction } from "../../squaddieAction"
import type { OffsetCoordinate } from "../../../coordinateMap/offsetCoordinate"
import { ActionRangeService } from "../../actionRange"
import {
    CoordinateCalculator,
    CoordinateDirection,
} from "../../../coordinateMap/coordinateCalculator"

export const AoeTargetResolutionService = {
    resolveAoeTargets({
        action,
        actor,
        targetCoordinate,
        mapId,
        managers,
    }: {
        action: SquaddieAction
        actor: BattleSquaddieId
        targetCoordinate: OffsetCoordinate
        mapId: string
        managers: {
            coordinateMapCollectionManager: CoordinateMapCollectionManager
            inBattleSquaddieManager: InBattleSquaddieManager
        }
    }): BattleSquaddieId[] {
        const affectedCoordinates =
            action.targeting.shape === CoordinateGeneratorShape.LINE
                ? getLineAffectedCoordinates({
                      action,
                      actor,
                      targetCoordinate,
                      mapId,
                      managers,
                  })
                : getBloomAffectedCoordinates({
                      action,
                      targetCoordinate,
                      mapId,
                      managers,
                  })

        const candidates = collectSquaddiesAtCoordinates({
            affectedCoordinates,
            mapId,
            coordinateMapCollectionManager:
                managers.coordinateMapCollectionManager,
        })

        return filterByAffiliation({
            actor,
            candidates,
            affiliationRelationship: action.targeting.affiliationRelationship,
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
        })
    },
}

const classifyTerrain = (props: {
    movementCost: number | undefined
    canStop: boolean
}): { isWall: boolean; isPit: boolean } => ({
    isWall: props.movementCost == undefined && !props.canStop,
    isPit: props.movementCost != undefined && !props.canStop,
})

const collectSquaddiesAtCoordinates = ({
    affectedCoordinates,
    mapId,
    coordinateMapCollectionManager,
}: {
    affectedCoordinates: OffsetCoordinate[]
    mapId: string
    coordinateMapCollectionManager: CoordinateMapCollectionManager
}): BattleSquaddieId[] => {
    const result: BattleSquaddieId[] = []
    for (const coordinate of affectedCoordinates) {
        const squaddieId =
            coordinateMapCollectionManager.getSquaddieAtCoordinate({
                mapId,
                coordinate,
            })
        if (squaddieId != undefined) {
            result.push(squaddieId)
        }
    }
    return result
}

const getLineAffectedCoordinates = ({
    action,
    actor,
    targetCoordinate,
    mapId,
    managers,
}: {
    action: SquaddieAction
    actor: BattleSquaddieId
    targetCoordinate: OffsetCoordinate
    mapId: string
    managers: {
        coordinateMapCollectionManager: CoordinateMapCollectionManager
        inBattleSquaddieManager: InBattleSquaddieManager
    }
}): OffsetCoordinate[] => {
    const actorCoordinate =
        managers.coordinateMapCollectionManager.getSquaddieCoordinate({
            mapId,
            squaddieId: actor,
        })

    if (actorCoordinate?.row == undefined || actorCoordinate.col == undefined) {
        return []
    }

    const from = { row: actorCoordinate.row, col: actorCoordinate.col }
    const width = action.targeting.areaOfEffectSize ?? 0
    const skipOverPits = action.targeting.skipOverPits ?? true
    const moveThroughWalls = action.targeting.moveThroughWalls ?? false

    const actionRange =
        ActionRangeService.minAndMaxByRange[action.targeting.range]
    const maxRange = actionRange.maximum

    const centerlineToTarget =
        CoordinateCalculator.calculateEveryCoordinateInLine(
            from,
            targetCoordinate
        )

    let centerline = centerlineToTarget
    if (centerlineToTarget.length > 1) {
        const last = centerlineToTarget[centerlineToTarget.length - 1]
        const secondToLast = centerlineToTarget[centerlineToTarget.length - 2]
        const dr = last.row - secondToLast.row
        const dc = last.col - secondToLast.col

        const extendedTarget = {
            row: from.row + dr * maxRange,
            col: from.col + dc * maxRange,
        }
        centerline = CoordinateCalculator.calculateEveryCoordinateInLine(
            from,
            extendedTarget
        )
        if (centerline.length > maxRange + 1) {
            centerline = centerline.slice(0, maxRange + 1)
        }
    }

    const [dir1, dir2] = CoordinateCalculator.getPerpendicularDirections(
        from,
        targetCoordinate
    )

    const seen = new Set<string>()
    const results: OffsetCoordinate[] = []

    const addOnce = (hex: OffsetCoordinate) => {
        const key = `${hex.row},${hex.col}`
        if (seen.has(key)) return
        seen.add(key)
        results.push(hex)
    }

    for (const centerHex of centerline) {
        const props =
            managers.coordinateMapCollectionManager.getMovementPropertiesAtCoordinate(
                {
                    id: mapId,
                    row: centerHex.row,
                    col: centerHex.col,
                }
            )
        const { isWall, isPit } = classifyTerrain(props)

        if (isWall && !moveThroughWalls) break
        if (isPit && !skipOverPits) break

        addOnce(centerHex)

        for (let w = 1; w <= width; w++) {
            addOnce(CoordinateCalculator.getNeighbor(centerHex, dir1))
            addOnce(CoordinateCalculator.getNeighbor(centerHex, dir2))
        }
    }

    return results
}

const getBloomAffectedCoordinates = ({
    action,
    targetCoordinate,
    mapId,
    managers,
}: {
    action: SquaddieAction
    targetCoordinate: OffsetCoordinate
    mapId: string
    managers: {
        coordinateMapCollectionManager: CoordinateMapCollectionManager
        inBattleSquaddieManager: InBattleSquaddieManager
    }
}): OffsetCoordinate[] => {
    const radius = action.targeting.areaOfEffectSize ?? 0
    const skipOverPits = action.targeting.skipOverPits ?? true
    const moveThroughWalls = action.targeting.moveThroughWalls ?? false

    const seen = new Set<string>()
    const results: OffsetCoordinate[] = []

    const coordKey = (c: OffsetCoordinate) => `${c.row},${c.col}`

    const queue: { coord: OffsetCoordinate; dist: number }[] = [
        { coord: targetCoordinate, dist: 0 },
    ]
    seen.add(coordKey(targetCoordinate))
    results.push(targetCoordinate)

    while (queue.length > 0) {
        const { coord, dist } = queue.shift()!

        if (dist >= radius) continue

        for (const direction of Object.values(CoordinateDirection)) {
            const neighbor = CoordinateCalculator.getNeighbor(coord, direction)
            const nKey = coordKey(neighbor)
            if (seen.has(nKey)) continue
            seen.add(nKey)

            const props =
                managers.coordinateMapCollectionManager.getMovementPropertiesAtCoordinate(
                    {
                        id: mapId,
                        row: neighbor.row,
                        col: neighbor.col,
                    }
                )
            const { isWall, isPit } = classifyTerrain(props)

            if (isWall && !moveThroughWalls) continue
            if (isPit && !skipOverPits) continue

            results.push(neighbor)
            queue.push({ coord: neighbor, dist: dist + 1 })
        }
    }

    return results
}

const filterByAffiliation = ({
    actor,
    candidates,
    affiliationRelationship,
    inBattleSquaddieManager,
}: {
    actor: BattleSquaddieId
    candidates: BattleSquaddieId[]
    affiliationRelationship: { self: boolean; friend: boolean; foe: boolean }
    inBattleSquaddieManager: InBattleSquaddieManager
}): BattleSquaddieId[] => {
    const actorAffiliation =
        inBattleSquaddieManager.getSquaddie(actor).outOfBattleSquaddie
            .affiliation

    return candidates.filter((candidate) => {
        const isSelf =
            candidate.inBattleSquaddieId === actor.inBattleSquaddieId &&
            candidate.outOfBattleSquaddieId === actor.outOfBattleSquaddieId

        if (isSelf) return affiliationRelationship.self

        const candidateAffiliation =
            inBattleSquaddieManager.getSquaddie(candidate).outOfBattleSquaddie
                .affiliation

        const areFriends = SquaddieAffiliationService.areFriends({
            actor: actorAffiliation,
            target: candidateAffiliation,
        })

        return (
            (areFriends && affiliationRelationship.friend) ||
            (!areFriends && affiliationRelationship.foe)
        )
    })
}
