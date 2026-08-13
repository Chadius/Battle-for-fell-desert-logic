import {
    CoordinateGeneratorShape,
    CoordinateShapeService,
} from "../../../coordinateMap/shape.js"
import {
    LineOfSightService,
    type TLineOfSightStatus,
} from "../../../coordinateMap/lineOfSightService.js"
import { SquaddieAffiliationService } from "../../../affiliation/affiliation.js"
import type { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager.js"
import type { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager.js"
import type { SquaddieAction } from "../../squaddieAction.js"
import {
    type OffsetCoordinate,
    OffsetCoordinateService,
} from "../../../coordinateMap/offsetCoordinate.js"
import { ActionRangeService } from "../../actionRange.js"
import {
    CoordinateCalculator,
    CoordinateDirection,
} from "../../../coordinateMap/coordinateCalculator.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"

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
        const affectedCoordinates = getAffectedCoordinatesForShape({
            action,
            actor,
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

const getAffectedCoordinatesForShape = ({
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
    switch (action.targeting.shape) {
        case CoordinateGeneratorShape.BLOOM:
            return getBloomAffectedCoordinates({
                action,
                targetCoordinate,
                mapId,
                managers,
            })
        case CoordinateGeneratorShape.LINE:
            return getLineAffectedCoordinates({
                action,
                actor,
                targetCoordinate,
                mapId,
                managers,
            })
        case CoordinateGeneratorShape.CONE:
            return getConeAffectedCoordinates({
                action,
                actor,
                targetCoordinate,
                mapId,
                managers,
            })
    }
}

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

const getActorOriginCoordinate = ({
    actor,
    mapId,
    coordinateMapCollectionManager,
}: {
    actor: BattleSquaddieId
    mapId: string
    coordinateMapCollectionManager: CoordinateMapCollectionManager
}): OffsetCoordinate | undefined => {
    const actorCoordinate =
        coordinateMapCollectionManager.getSquaddieCoordinate({
            mapId,
            squaddieId: actor,
        })

    if (actorCoordinate?.row == undefined || actorCoordinate.col == undefined) {
        return undefined
    }

    return { row: actorCoordinate.row, col: actorCoordinate.col }
}

const coordinatesAlongRayUntilBlocked = ({
    ray,
    mapId,
    coordinateMapCollectionManager,
    skipOverPits,
    moveThroughWalls,
}: {
    ray: OffsetCoordinate[]
    mapId: string
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    skipOverPits: boolean
    moveThroughWalls: boolean
}): OffsetCoordinate[] => {
    const result: OffsetCoordinate[] = []
    for (const hex of ray) {
        const movementProperties =
            coordinateMapCollectionManager.getMovementPropertiesAtCoordinate({
                id: mapId,
                row: hex.row,
                col: hex.col,
            })

        if (
            LineOfSightService.terrainBlocksPassage({
                movementProperties,
                skipOverPits,
                moveThroughWalls,
            })
        ) {
            break
        }

        result.push(hex)
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
    const from = getActorOriginCoordinate({
        actor,
        mapId,
        coordinateMapCollectionManager: managers.coordinateMapCollectionManager,
    })

    if (from == undefined) {
        return []
    }

    const width = action.targeting.areaOfEffectSize ?? 0
    const skipOverPits = action.targeting.skipOverPits ?? true
    const moveThroughWalls = action.targeting.moveThroughWalls ?? false

    const actionRange =
        ActionRangeService.minAndMaxByRange[action.targeting.range]
    const maxRange = actionRange.maximum

    let centerline = CoordinateCalculator.calculateEveryCoordinateInLine(
        from,
        targetCoordinate
    )

    const fromAxial = CoordinateCalculator.offsetToAxial(from)
    const toAxial = CoordinateCalculator.offsetToAxial(targetCoordinate)
    const dq = toAxial.q - fromAxial.q
    const drAxial = toAxial.r - fromAxial.r

    const dist = Math.max(
        Math.abs(dq),
        Math.abs(drAxial),
        Math.abs(-dq - drAxial)
    )

    if (dist > 0) {
        const extendedAxial = {
            q: fromAxial.q + Math.round((dq / dist) * maxRange),
            r: fromAxial.r + Math.round((drAxial / dist) * maxRange),
        }
        const extendedTarget = CoordinateCalculator.axialToOffset(extendedAxial)
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

    const unblockedCenterline = coordinatesAlongRayUntilBlocked({
        ray: centerline,
        mapId,
        coordinateMapCollectionManager: managers.coordinateMapCollectionManager,
        skipOverPits,
        moveThroughWalls,
    })

    for (const centerHex of unblockedCenterline) {
        addOnce(centerHex)

        for (let w = 1; w <= width; w++) {
            addOnce(CoordinateCalculator.getNeighbor(centerHex, dir1))
            addOnce(CoordinateCalculator.getNeighbor(centerHex, dir2))
        }
    }

    return results
}

const getConeAffectedCoordinates = ({
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
    const origin = getActorOriginCoordinate({
        actor,
        mapId,
        coordinateMapCollectionManager: managers.coordinateMapCollectionManager,
    })

    if (origin == undefined) {
        return []
    }

    const width = action.targeting.areaOfEffectSize ?? 0
    const skipOverPits = action.targeting.skipOverPits ?? true
    const moveThroughWalls = action.targeting.moveThroughWalls ?? false

    const actionRange =
        ActionRangeService.minAndMaxByRange[action.targeting.range]
    const maxRange = actionRange.maximum

    const mainDirection = CoordinateCalculator.getNearestDirection(
        origin,
        targetCoordinate
    )

    const candidateCoordinates = CoordinateShapeService.calculateCoordinates({
        shape: CoordinateGeneratorShape.CONE,
        origin,
        direction: mainDirection,
        width,
        length: maxRange,
    })

    const mutableVisibilityCache = new Map<string, TLineOfSightStatus>([
        [OffsetCoordinateService.coordinateToKey(origin), "REACHABLE"],
    ])

    return candidateCoordinates.filter(
        (candidate) =>
            LineOfSightService.resolveLineOfSightStatus({
                origin,
                target: candidate,
                mapId,
                coordinateMapCollectionManager:
                    managers.coordinateMapCollectionManager,
                skipOverPits,
                moveThroughWalls,
                mutableVisibilityCache,
            }) === "REACHABLE"
    )
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

    const queue: { coordinate: OffsetCoordinate; dist: number }[] = [
        { coordinate: targetCoordinate, dist: 0 },
    ]
    seen.add(OffsetCoordinateService.coordinateToKey(targetCoordinate))
    results.push(targetCoordinate)

    while (queue.length > 0) {
        const { coordinate, dist } = queue.shift()!

        if (dist >= radius) continue

        for (const direction of Object.values(CoordinateDirection)) {
            const neighbor = CoordinateCalculator.getNeighbor(
                coordinate,
                direction
            )
            const nKey = OffsetCoordinateService.coordinateToKey(neighbor)
            if (seen.has(nKey)) continue
            seen.add(nKey)

            const canPassThroughTerrain: boolean = canBloomPassThroughTerrain({
                coordinateMapCollectionManager:
                    managers.coordinateMapCollectionManager,
                mapId,
                neighbor,
                moveThroughWalls,
                skipOverPits,
            })
            if (!canPassThroughTerrain) {
                continue
            }

            results.push(neighbor)
            queue.push({ coordinate: neighbor, dist: dist + 1 })
        }
    }
    return results
}

const canBloomPassThroughTerrain = ({
    coordinateMapCollectionManager,
    mapId,
    neighbor,
    moveThroughWalls,
    skipOverPits,
}: {
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    mapId: string
    neighbor: OffsetCoordinate
    moveThroughWalls: boolean
    skipOverPits: boolean
}): boolean => {
    const movementProperties =
        coordinateMapCollectionManager.getMovementPropertiesAtCoordinate({
            id: mapId,
            row: neighbor.row,
            col: neighbor.col,
        })

    return !LineOfSightService.terrainBlocksPassage({
        movementProperties,
        skipOverPits,
        moveThroughWalls,
    })
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
