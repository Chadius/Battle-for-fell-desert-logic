import { type CoordinateMap, CoordinateMapService } from "../coordinateMap"
import {
    type CoordinateMovePath,
    CoordinateMovePathMoveType,
    CoordinateMovePathService,
    type CoordinateMovePathStep,
    type TCoordinateMovePathMoveType,
} from "../path/path"
import {
    type OffsetCoordinate,
    OffsetCoordinateService,
} from "../offsetCoordinate"
import { CoordinateCalculator } from "../coordinateCalculator"

interface VisitedCoordinate {
    row: number
    col: number
    previousCoordinate:
        | {
              row: number
              col: number
          }
        | undefined
    cachedMovePath?: CoordinateMovePath
    moveCost?: number
}

export interface CoordinatePathMap {
    id: string
    name: string
    visitedCoordinates: Map<string, VisitedCoordinate>
    numberOfRows: number
    numberOfColumns: number
}

export const CoordinatePathMapService = {
    new: ({
        id,
        name,
        map,
    }: {
        id: string
        name: string
        map: CoordinateMap
    }): CoordinatePathMap => {
        return {
            id,
            name,
            visitedCoordinates: new Map(),
            numberOfRows: CoordinateMapService.getNumberOfRows({ map }),
            numberOfColumns: CoordinateMapService.getNumberOfColumns({ map }),
        }
    },
    getNumberOfRows: ({
        coordinatePathMap,
    }: {
        coordinatePathMap: CoordinatePathMap
    }): number => getNumberOfRows({ coordinatePathMap }),
    getNumberOfColumns: ({
        coordinatePathMap,
    }: {
        coordinatePathMap: CoordinatePathMap
    }): number => getNumberOfColumns({ coordinatePathMap }),
    extendPath: ({
        coordinatePathMap,
        row,
        col,
        map,
        moveType,
    }: {
        coordinatePathMap: CoordinatePathMap
        row: number
        col: number
        map: CoordinateMap
        moveType: TCoordinateMovePathMoveType
    }): void => {
        throwIfCoordinatePathMapIsUndefined(coordinatePathMap, "extendPath")
        throwIfCoordinateIsOffMap(coordinatePathMap, row, col, "extendPath")
        let destinationCoordinate = coordinatePathMap.visitedCoordinates.get(
            OffsetCoordinateService.coordinateToKey({ row, col })
        )
        if (destinationCoordinate == undefined) return

        if (destinationCoordinate.cachedMovePath != undefined) return

        const steps: CoordinateMovePathStep[] = []

        let currentCoordinate: VisitedCoordinate | undefined =
            destinationCoordinate
        while (currentCoordinate != undefined) {
            let previousCoordinate:
                | {
                      row: number
                      col: number
                  }
                | undefined = currentCoordinate.previousCoordinate

            const moveCost =
                currentCoordinate.moveCost ??
                CoordinateMapService.getMoveCost({
                    map,
                    row: currentCoordinate.row,
                    col: currentCoordinate.col,
                })

            steps.unshift({
                row: currentCoordinate.row,
                col: currentCoordinate.col,
                moveType,
                moveCost: moveCost ?? 0,
            })

            if (previousCoordinate == undefined) break
            currentCoordinate = coordinatePathMap.visitedCoordinates.get(
                OffsetCoordinateService.coordinateToKey(previousCoordinate)
            )
        }

        steps[0].moveType = CoordinateMovePathMoveType.START

        destinationCoordinate.cachedMovePath = CoordinateMovePathService.new({
            steps,
        })
    },
    getPath: ({
        coordinatePathMap,
        row,
        col,
    }: {
        coordinatePathMap: CoordinatePathMap
        row: number
        col: number
    }): CoordinateMovePath | undefined => {
        throwIfCoordinatePathMapIsUndefined(coordinatePathMap, "getPath")
        throwIfCoordinateIsOffMap(coordinatePathMap, row, col, "getPath")
        let destinationCoordinate = coordinatePathMap.visitedCoordinates.get(
            OffsetCoordinateService.coordinateToKey({ row, col })
        )
        if (destinationCoordinate == undefined) return undefined

        return destinationCoordinate.cachedMovePath
    },
    deletePath: ({
        coordinatePathMap,
        col,
        row,
    }: {
        coordinatePathMap: CoordinatePathMap
        row: number
        col: number
    }): void => {
        throwIfCoordinateIsOffMap(coordinatePathMap, row, col, "deletePath")
        coordinatePathMap.visitedCoordinates.delete(
            OffsetCoordinateService.coordinateToKey({ row, col })
        )
    },
    add: ({
        coordinatePathMap,
        currentCoordinate,
        previousCoordinate,
        moveCost,
    }: {
        coordinatePathMap: CoordinatePathMap
        currentCoordinate: OffsetCoordinate
        previousCoordinate: OffsetCoordinate | undefined
        moveCost?: number
    }) => {
        throwIfCoordinatePathMapIsUndefined(coordinatePathMap, "add")
        throwIfCoordinateIsOffMap(
            coordinatePathMap,
            currentCoordinate.row,
            currentCoordinate.col,
            "add"
        )
        if (previousCoordinate != undefined) {
            throwIfCoordinateIsOffMap(
                coordinatePathMap,
                previousCoordinate.row,
                previousCoordinate.col,
                "add"
            )
        }

        const key = OffsetCoordinateService.coordinateToKey(currentCoordinate)
        const existing = coordinatePathMap.visitedCoordinates.get(key)
        if (existing?.cachedMovePath != undefined) return

        coordinatePathMap.visitedCoordinates.set(key, {
            row: currentCoordinate.row,
            col: currentCoordinate.col,
            previousCoordinate,
            moveCost,
        })
    },
    getClosestPath: ({
        coordinatePathMap,
        targetCoordinate,
        maxDistanceOverride = 3,
    }: {
        coordinatePathMap: CoordinatePathMap
        targetCoordinate: OffsetCoordinate
        maxDistanceOverride?: number
    }): CoordinateMovePath | undefined => {
        throwIfCoordinatePathMapIsUndefined(coordinatePathMap, "getClosestPath")

        const directPath = CoordinatePathMapService.getPath({
            coordinatePathMap,
            row: targetCoordinate.row,
            col: targetCoordinate.col,
        })
        if (directPath != undefined) return directPath

        let lowestCostMovePath: CoordinateMovePath | undefined = undefined
        let lowestCost = 0

        for (
            let currentRadius = 1;
            currentRadius <= maxDistanceOverride;
            currentRadius++
        ) {
            const coordinates = CoordinateCalculator.getCoordinatesInRing(
                targetCoordinate,
                currentRadius
            ).filter(
                (coordinate) =>
                    coordinate.row > 0 &&
                    coordinate.row < getNumberOfRows({ coordinatePathMap }) &&
                    coordinate.col > 0 &&
                    coordinate.col < getNumberOfColumns({ coordinatePathMap })
            )
            if (coordinates.length == 0) break

            lowestCostMovePath = updateClosestLowestCostMovePath(
                coordinates,
                coordinatePathMap,
                lowestCostMovePath,
                lowestCost
            )
            if (lowestCostMovePath != undefined) return lowestCostMovePath
        }
        return lowestCostMovePath
    },
}

const throwIfCoordinatePathMapIsUndefined = (
    pathMap: CoordinatePathMap,
    callName: string
) => {
    if (pathMap == undefined)
        throw new Error(
            `[CoordinatePathMapService.${callName}]: CoordinatePathMap must be defined`
        )
}

const getNumberOfRows = ({
    coordinatePathMap,
}: {
    coordinatePathMap: CoordinatePathMap
}): number => {
    throwIfCoordinatePathMapIsUndefined(coordinatePathMap, "getNumberOfRows")
    return coordinatePathMap.numberOfRows
}

const getNumberOfColumns = ({
    coordinatePathMap,
}: {
    coordinatePathMap: CoordinatePathMap
}): number => {
    throwIfCoordinatePathMapIsUndefined(coordinatePathMap, "getNumberOfRows")
    return coordinatePathMap.numberOfColumns
}

const updateClosestLowestCostMovePath = (
    coordinates: OffsetCoordinate[],
    coordinatePathMap: CoordinatePathMap,
    lowestCostMovePath: undefined | CoordinateMovePath,
    lowestCost: number
) => {
    for (const coordinate of coordinates) {
        let coordinateKey = OffsetCoordinateService.coordinateToKey(coordinate)
        if (!coordinatePathMap.visitedCoordinates.has(coordinateKey)) continue

        let visitedCoordinate =
            coordinatePathMap.visitedCoordinates.get(coordinateKey)
        if (!visitedCoordinate?.cachedMovePath) continue

        if (
            lowestCostMovePath == undefined ||
            CoordinateMovePathService.getTotalMoveCost(
                visitedCoordinate.cachedMovePath
            ) < lowestCost
        ) {
            lowestCostMovePath = visitedCoordinate.cachedMovePath
            lowestCost = CoordinateMovePathService.getTotalMoveCost(
                visitedCoordinate.cachedMovePath
            )
        }
    }
    return lowestCostMovePath
}

const throwIfCoordinateIsOffMap = (
    pathMap: CoordinatePathMap,
    row: number,
    col: number,
    callName: string
) => {
    if (
        row < 0 ||
        row >= getNumberOfRows({ coordinatePathMap: pathMap }) ||
        col < 0 ||
        col >= getNumberOfColumns({ coordinatePathMap: pathMap })
    ) {
        throw new Error(
            `[CoordinatePathMapService.${callName}]: Coordinate (${row}, ${col}) is off map`
        )
    }
}
