import { CoordinateCalculator } from "./coordinateCalculator"
import { type CoordinateMap, CoordinateMapService } from "./coordinateMap"
import type { AStarGraph } from "../aStarSearch/aStarGraph"
import {
    type CoordinateMovePath,
    CoordinateMovePathMoveType,
    CoordinateMovePathService,
} from "./path/path"
import {
    type CoordinatePathMap,
    CoordinatePathMapService,
} from "./mapTransposition/coordinatePathMap"
import type { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import { SquaddieConditionType } from "../proficiency/squaddieCondition"
import {
    SquaddieAffiliationService,
    type TSquaddieAffiliation,
} from "../squaddie/outOfBattle/affiliation"
import {
    type OffsetCoordinate,
    OffsetCoordinateService,
} from "./offsetCoordinate"

export interface CoordinateMapSearchLimits {
    maximumMoveCost?: number
    skipOverPits?: boolean
    moveThroughWalls?: boolean
    stopOnSquaddies?: boolean
    reduceMoveCosts?: boolean
    squaddieId?: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        affiliation: TSquaddieAffiliation
    }
}

export class CoordinateMapAStarAdapter
    implements AStarGraph<OffsetCoordinate, CoordinateMovePath>
{
    map: CoordinateMap
    coordinatePathMap: CoordinatePathMap
    searchLimits?: CoordinateMapSearchLimits
    inBattleSquaddieManager?: InBattleSquaddieManager

    constructor({
        map,
        searchLimits,
        inBattleSquaddieManager,
    }: {
        map: CoordinateMap
        searchLimits?: CoordinateMapSearchLimits
        inBattleSquaddieManager?: InBattleSquaddieManager
    }) {
        this.searchLimits = { ...searchLimits }
        this.map = map
        this.coordinatePathMap = CoordinatePathMapService.new({
            id: "search",
            name: "search",
            map: this.map,
        })
        this.inBattleSquaddieManager = inBattleSquaddieManager
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

        const hustleConditionAmount =
            manager.calculateConditionAmountForSquaddie({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
                conditionType: SquaddieConditionType.HUSTLE,
            })

        const affiliation = manager.getSquaddieAffiliation({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
        })

        return {
            maximumMoveCost: moveLimits.maximumMovementCost,
            moveThroughWalls: moveLimits.moveThroughWalls,
            skipOverPits: moveLimits.skipOverPits,
            stopOnSquaddies: moveLimits.stopOnSquaddies,
            reduceMoveCosts: hustleConditionAmount > 0,
            squaddieId: {
                inBattleSquaddieId: inBattleSquaddieId,
                outOfBattleSquaddieId: outOfBattleSquaddieId,
                affiliation,
            },
        }
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
        to,
    }: {
        from: OffsetCoordinate
        to: OffsetCoordinate
        cost: number
        totalCost: number
    }): boolean {
        if (
            CoordinateMapService.isAPit({
                map: this.map,
                coordinate: to,
            }) &&
            !this.searchLimits?.skipOverPits
        ) {
            return false
        }
        if (
            CoordinateMapService.isAWall({
                map: this.map,
                coordinate: to,
            }) &&
            !this.searchLimits?.moveThroughWalls
        ) {
            return false
        }

        if (
            this.canMoveToSquaddieLocation({ coordinate: to }).blockedBySquaddie
        ) {
            return false
        }

        return !(
            this.searchLimits?.maximumMoveCost != undefined &&
            totalCost > this.searchLimits?.maximumMoveCost
        )
    }

    getMovementCost(coordinate: OffsetCoordinate) {
        if (
            CoordinateMapService.isAWall({
                map: this.map,
                coordinate,
            }) &&
            this.searchLimits?.moveThroughWalls
        ) {
            return 1
        }

        const defaultMoveCost =
            this.map.coordinates[coordinate.row]?.[coordinate.col]?.movementCost
        if (
            defaultMoveCost != undefined &&
            this.searchLimits?.reduceMoveCosts
        ) {
            return 1
        }
        return defaultMoveCost
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

    isPathValidToStop({
        currentNode,
    }: {
        currentNode: OffsetCoordinate
        path: CoordinateMovePath
    }): boolean {
        return !this.map.coordinatesSquaddiesCannotStopOn.has(
            OffsetCoordinateService.coordinateToKey(currentNode)
        )
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

    postProcess({ path: _ }: { path: CoordinateMovePath | undefined }): void {
        for (const key of this.map.coordinatesSquaddiesCannotStopOn.values()) {
            const { row, col } = OffsetCoordinateService.keyToCoordinate(key)
            CoordinatePathMapService.deletePath({
                coordinatePathMap: this.coordinatePathMap,
                row,
                col,
            })
        }

        const locationsWithSquaddiesCannotStopOn =
            this.getLocationsWithSquaddiesCannotStopOn()

        for (const info of locationsWithSquaddiesCannotStopOn) {
            CoordinatePathMapService.deletePath({
                coordinatePathMap: this.coordinatePathMap,
                row: info.coordinate.row!,
                col: info.coordinate.col!,
            })
        }
    }

    private getLocationsWithSquaddiesCannotStopOn() {
        if (this.searchLimits?.stopOnSquaddies) return []
        const allSquaddieInfoOnMap =
            CoordinateMapService.getAllSquaddieCoordinatesOnMap(
                this.map
            ).filter(
                (info) =>
                    info.coordinate.row != undefined &&
                    info.coordinate.col != undefined
            )

        if (this.searchLimits?.squaddieId == undefined)
            return allSquaddieInfoOnMap

        return CoordinateMapService.getAllSquaddieCoordinatesOnMap(
            this.map
        ).filter(
            (info) =>
                this.searchLimits?.squaddieId == undefined ||
                !(
                    info.squaddieId.inBattleSquaddieId ==
                        this.searchLimits?.squaddieId?.inBattleSquaddieId &&
                    info.squaddieId.outOfBattleSquaddieId ==
                        this.searchLimits?.squaddieId?.outOfBattleSquaddieId
                )
        )
    }

    private canMoveToSquaddieLocation({
        coordinate,
    }: {
        coordinate: OffsetCoordinate
    }): { blockedBySquaddie: boolean } {
        const defaultValue = { blockedBySquaddie: false }

        if (!this.inBattleSquaddieManager) return defaultValue
        if (this.searchLimits?.squaddieId == undefined) return defaultValue

        const squaddieIdInfo = CoordinateMapService.getSquaddieAtCoordinate({
            map: this.map,
            coordinate,
        })
        if (!squaddieIdInfo) return defaultValue

        const elusiveCondition =
            this.inBattleSquaddieManager.calculateConditionAmountForSquaddie({
                inBattleSquaddieId:
                    this.searchLimits.squaddieId.inBattleSquaddieId,
                outOfBattleSquaddieId:
                    this.searchLimits.squaddieId.outOfBattleSquaddieId,
                conditionType: SquaddieConditionType.ELUSIVE,
            })
        if (elusiveCondition > 0) return defaultValue

        if (
            squaddieIdInfo.inBattleSquaddieId ==
                this.searchLimits.squaddieId.inBattleSquaddieId &&
            squaddieIdInfo.outOfBattleSquaddieId ==
                this.searchLimits.squaddieId.outOfBattleSquaddieId
        )
            return defaultValue

        const squaddieInfo = this.inBattleSquaddieManager?.getSquaddie({
            ...squaddieIdInfo,
        })

        if (!squaddieInfo) return defaultValue

        const otherAffiliation =
            this.inBattleSquaddieManager.getSquaddieAffiliation({
                ...squaddieIdInfo,
            })
        const otherSquaddieIsFriendly = SquaddieAffiliationService.areFriends({
            actor: this.searchLimits.squaddieId.affiliation,
            target: otherAffiliation,
        })

        return {
            blockedBySquaddie: !otherSquaddieIsFriendly,
        }
    }
}
