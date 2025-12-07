import {
    type CoordinateMap,
    CoordinateMapService,
    type OffsetCoordinate,
} from "../coordinateMap.ts"
import {
    type CoordinateMovePath,
    CoordinateMovePathMoveType,
    CoordinateMovePathService,
    type CoordinateMovePathStep,
    type TCoordinateMovePathMoveType,
} from "../path/path.ts"

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
    visitedCoordinates: (VisitedCoordinate | undefined)[][]
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
        const visitedCoordinates: (VisitedCoordinate | undefined)[][] = []

        for (
            let row = 0;
            row < CoordinateMapService.getNumberOfRows({ map });
            row++
        ) {
            visitedCoordinates.push([])
            for (
                let col = 0;
                col < CoordinateMapService.getNumberOfColumns({ map });
                col++
            ) {
                visitedCoordinates[row].push(undefined)
            }
        }

        return {
            id,
            name,
            visitedCoordinates,
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
    getPath: ({
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
    }): CoordinateMovePath | undefined => {
        throwIfCoordinatePathMapIsUndefined(coordinatePathMap, "getPath")
        throwIfCoordinateIsOffMap(coordinatePathMap, row, col, "getPath")
        let destinationCoordinate =
            coordinatePathMap.visitedCoordinates[row][col]
        if (destinationCoordinate == undefined) return undefined

        if (destinationCoordinate.cachedMovePath != undefined)
            return destinationCoordinate.cachedMovePath

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
            currentCoordinate =
                coordinatePathMap.visitedCoordinates[previousCoordinate.row][
                    previousCoordinate.col
                ]
        }

        steps[0].moveType = CoordinateMovePathMoveType.START

        destinationCoordinate.cachedMovePath = CoordinateMovePathService.new({
            steps,
        })

        return destinationCoordinate.cachedMovePath
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

        coordinatePathMap.visitedCoordinates[currentCoordinate.row][
            currentCoordinate.col
        ] = {
            row: currentCoordinate.row,
            col: currentCoordinate.col,
            previousCoordinate,
        }
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
    return coordinatePathMap.visitedCoordinates.length
}

const getNumberOfColumns = ({
    coordinatePathMap,
}: {
    coordinatePathMap: CoordinatePathMap
}): number => {
    throwIfCoordinatePathMapIsUndefined(coordinatePathMap, "getNumberOfRows")
    return coordinatePathMap.visitedCoordinates[0].length
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
