import { CoordinateCalculator } from "./coordinateCalculator"
import type { CoordinateMapCollectionManager } from "./coordinateMapManager"
import type { OffsetCoordinate } from "./offsetCoordinate"

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
            const props =
                coordinateMapCollectionManager.getMovementPropertiesAtCoordinate(
                    { id: mapId, row, col }
                )

            const isWall = props.movementCost == undefined && !props.canStop
            const isPit = props.movementCost != undefined && !props.canStop

            if (isWall && !moveThroughWalls) return false
            if (isPit && !skipOverPits) return false
        }

        return true
    },
}
