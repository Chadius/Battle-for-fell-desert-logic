import { CoordinateCalculator } from "./coordinateCalculator.ts"
import {
    type CoordinateMap,
    CoordinateMapService,
    type OffsetCoordinate,
} from "./coordinateMap.ts"
import type { AStarGraph } from "../aStarSearch/aStarGraph.ts"
import {
    type CoordinateMovePath,
    CoordinateMovePathMoveType,
    CoordinateMovePathService,
} from "./path/path.ts"
import {
    type CoordinatePathMap,
    CoordinatePathMapService,
} from "./mapTransposition/coordinatePathMap.ts"
import type { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager.ts"

export interface CoordinateMapSearchLimits {
    maximumMoveCost?: number
    skipOverPits?: boolean
    moveThroughWalls?: boolean
    stopOnSquaddies?: boolean
}

export class CoordinateMapAStarAdapter
    implements AStarGraph<OffsetCoordinate, CoordinateMovePath>
{
    map: CoordinateMap
    coordinatePathMap: CoordinatePathMap
    searchLimits?: CoordinateMapSearchLimits

    constructor(map: CoordinateMap, searchLimits?: CoordinateMapSearchLimits) {
        this.searchLimits = { ...searchLimits }
        this.map = map
        this.coordinatePathMap = CoordinatePathMapService.new({
            id: "search",
            name: "search",
            map: this.map,
        })
    }

    getNeighbors(node: OffsetCoordinate) {
        return CoordinateCalculator.getAllNeighbors(node).filter(
            (coordinate: OffsetCoordinate) =>
                CoordinateMapService.isCoordinateOnMap({
                    map: this.map,
                    coordinate,
                })
        )
    }

    canMoveTo({
        totalCost,
    }: {
        from: OffsetCoordinate
        to: OffsetCoordinate
        cost: number
        totalCost: number
    }): boolean {
        return !(
            this.searchLimits?.maximumMoveCost != undefined &&
            totalCost > this.searchLimits?.maximumMoveCost
        )
    }

    getMovementCost(coordinate: OffsetCoordinate) {
        return this.map.coordinates[coordinate.row]?.[coordinate.col]
            ?.movementCost
    }

    generateNodeKey(node: OffsetCoordinate) {
        return `${node.row},${node.col}`
    }

    compareNodes(
        a: { node: OffsetCoordinate; cost: number },
        b: { node: OffsetCoordinate; cost: number }
    ) {
        return a.cost - b.cost
    }

    isPathValid({}: {
        currentNode: OffsetCoordinate
        path: CoordinateMovePath
    }): boolean {
        return true
    }

    createPath(node: OffsetCoordinate): CoordinateMovePath {
        CoordinatePathMapService.add({
            coordinatePathMap: this.coordinatePathMap,
            currentCoordinate: node,
            previousCoordinate: undefined,
        })

        CoordinatePathMapService.extendPath({
            coordinatePathMap: this.coordinatePathMap,
            ...node,
            map: this.map,
            moveType: CoordinateMovePathMoveType.START,
        })

        return CoordinatePathMapService.getPath({
            coordinatePathMap: this.coordinatePathMap,
            ...node,
        })!
    }

    extendPath({
        path,
        neighbor,
    }: {
        path: CoordinateMovePath
        neighbor: OffsetCoordinate
        moveCost: number
    }): CoordinateMovePath {
        CoordinatePathMapService.add({
            coordinatePathMap: this.coordinatePathMap,
            currentCoordinate: neighbor,
            previousCoordinate:
                CoordinateMovePathService.getEndCoordinate(path),
        })

        CoordinatePathMapService.extendPath({
            coordinatePathMap: this.coordinatePathMap,
            ...neighbor,
            map: this.map,
            moveType: CoordinateMovePathMoveType.WALK,
        })

        return CoordinatePathMapService.getPath({
            coordinatePathMap: this.coordinatePathMap,
            ...neighbor,
        })!
    }

    static getCoordinateMapSearchLimitsFromSquaddie({
        manager,
        inBattleSquaddieId,
        outOfBattleSquaddieId,
    }: {
        manager: InBattleSquaddieManager
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }): CoordinateMapSearchLimits {
        const moveLimits = manager.getSquaddieMovementInfo({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
        })

        return {
            maximumMoveCost: moveLimits.maximumMovementCost,
            moveThroughWalls: moveLimits.moveThroughWalls,
            skipOverPits: moveLimits.skipOverPits,
            stopOnSquaddies: moveLimits.stopOnSquaddies,
        }
    }
}
