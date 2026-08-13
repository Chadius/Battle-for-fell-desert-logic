import { CoordinateCalculator } from "./coordinateCalculator.js"
import type { CoordinateMapCollectionManager } from "./coordinateMapManager.js"
import {
    type OffsetCoordinate,
    OffsetCoordinateService,
} from "./offsetCoordinate.js"

export type TLineOfSightStatus = "REACHABLE" | "UNREACHABLE"

interface CoordinateMovementProperties {
    movementCost: number | undefined
    canStop: boolean
}

const terrainBlocksPassage = ({
    movementProperties,
    skipOverPits,
    moveThroughWalls,
}: {
    movementProperties: CoordinateMovementProperties
    skipOverPits: boolean
    moveThroughWalls: boolean
}): boolean => {
    const isWall =
        movementProperties.movementCost == undefined &&
        !movementProperties.canStop
    const isPit =
        movementProperties.movementCost != undefined &&
        !movementProperties.canStop

    return (isWall && !moveThroughWalls) || (isPit && !skipOverPits)
}

export const LineOfSightService = {
    hasLineOfSight({
        from,
        to,
        mapId,
        coordinateMapCollectionManager,
        skipOverPits,
        moveThroughWalls,
    }: {
        from: OffsetCoordinate
        to: OffsetCoordinate
        mapId: string
        coordinateMapCollectionManager: CoordinateMapCollectionManager
        skipOverPits: boolean
        moveThroughWalls: boolean
    }): boolean {
        const line = CoordinateCalculator.calculateEveryCoordinateInLine(
            from,
            to
        )

        for (let i = 1; i < line.length; i++) {
            const { row, col } = line[i]
            const movementProperties =
                coordinateMapCollectionManager.getMovementPropertiesAtCoordinate(
                    { id: mapId, row, col }
                )

            if (
                terrainBlocksPassage({
                    movementProperties,
                    skipOverPits,
                    moveThroughWalls,
                })
            ) {
                return false
            }
        }

        return true
    },
    resolveLineOfSightStatus({
        origin,
        target,
        mapId,
        coordinateMapCollectionManager,
        skipOverPits,
        moveThroughWalls,
        mutableVisibilityCache,
    }: {
        origin: OffsetCoordinate
        target: OffsetCoordinate
        mapId: string
        coordinateMapCollectionManager: CoordinateMapCollectionManager
        skipOverPits: boolean
        moveThroughWalls: boolean
        mutableVisibilityCache: Map<string, TLineOfSightStatus>
    }): TLineOfSightStatus {
        const targetKey = OffsetCoordinateService.coordinateToKey(target)
        const cachedTargetStatus = mutableVisibilityCache.get(targetKey)
        if (cachedTargetStatus != undefined) {
            return cachedTargetStatus
        }

        const lineFromOriginToTarget =
            CoordinateCalculator.calculateEveryCoordinateInLine(origin, target)

        let lineOfSightIsBlocked = false
        for (const hex of lineFromOriginToTarget) {
            const key = OffsetCoordinateService.coordinateToKey(hex)
            const cachedStatus = mutableVisibilityCache.get(key)

            if (cachedStatus === "UNREACHABLE") {
                lineOfSightIsBlocked = true
                continue
            }
            if (cachedStatus === "REACHABLE") {
                continue
            }

            if (lineOfSightIsBlocked) {
                mutableVisibilityCache.set(key, "UNREACHABLE")
                continue
            }

            const movementProperties =
                coordinateMapCollectionManager.getMovementPropertiesAtCoordinate(
                    { id: mapId, row: hex.row, col: hex.col }
                )

            if (
                terrainBlocksPassage({
                    movementProperties,
                    skipOverPits,
                    moveThroughWalls,
                })
            ) {
                lineOfSightIsBlocked = true
                mutableVisibilityCache.set(key, "UNREACHABLE")
            } else {
                mutableVisibilityCache.set(key, "REACHABLE")
            }
        }

        return mutableVisibilityCache.get(targetKey)!
    },

    terrainBlocksPassage,
}
