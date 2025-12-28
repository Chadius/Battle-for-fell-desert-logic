import { type CoordinateMap, CoordinateMapService } from "../coordinateMap.ts"
import {
    type CoordinateMovePath,
    CoordinateMovePathMoveType,
    CoordinateMovePathService,
    type CoordinateMovePathStep,
    type TCoordinateMovePathMoveType,
} from "../path/path.ts"
import {
    type OffsetCoordinate,
    OffsetCoordinateService,
} from "../offsetCoordinate.ts"

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

            const moveCost = CoordinateMapService.getMoveCost({
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
    }: {
        coordinatePathMap: CoordinatePathMap
        currentCoordinate: OffsetCoordinate
        previousCoordinate: OffsetCoordinate | undefined
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

        coordinatePathMap.visitedCoordinates.set(
            OffsetCoordinateService.coordinateToKey(currentCoordinate),
            {
                row: currentCoordinate.row,
                col: currentCoordinate.col,
                previousCoordinate,
            }
        )
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
