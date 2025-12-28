import type { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager.ts"
import {
    type CoordinateMovePath,
    CoordinateMovePathMoveType,
    CoordinateMovePathService,
    type CoordinateMovePathStep,
} from "./path/path.ts"
import {
    type OffsetCoordinate,
    OffsetCoordinateService,
} from "./offsetCoordinate.ts"

export type OffsetMaybeOffmapCoordinate = {
    row: number | undefined
    col: number | undefined
}

interface Coordinate {
    row: number
    col: number
    movementCost: number | undefined
    canStop: boolean
    squaddieId?: { outOfBattleSquaddieId: string; inBattleSquaddieId: number }
}

export interface CoordinateMap {
    id: string
    name: string
    coordinates: Coordinate[][]
    coordinateBySquaddie: Map<string, Map<number, OffsetMaybeOffmapCoordinate>>
    coordinatesSquaddiesCannotStopOn: Set<string>
}

export const CoordinateMapService = {
    new: ({
        id,
        name,
        movementProperties,
    }: {
        id: string
        name: string
        movementProperties: string[]
    }): CoordinateMap => {
        const coordinates =
            convertMovementPropertiesIntoCoordinates(movementProperties)
        const coordinatesSquaddiesCannotStopOn: Set<string> =
            calculateCoordinateProperties(coordinates)
        return {
            id,
            name,
            coordinates,
            coordinatesSquaddiesCannotStopOn,
            coordinateBySquaddie: new Map(),
        }
    },
    addSquaddie: ({
        map,
        squaddieId,
        coordinate,
    }: {
        map: CoordinateMap
        squaddieId: {
            outOfBattleSquaddieId: string
            inBattleSquaddieId: number
        }
        coordinate: OffsetMaybeOffmapCoordinate
    }): CoordinateMap => {
        const copyMap = cloneCoordinateMap(map)
        const willMoveSquaddieOffMap =
            coordinate.row == undefined && coordinate.col == undefined
        const squaddieAtDestination =
            !willMoveSquaddieOffMap &&
            copyMap.coordinates[coordinate.row!][coordinate.col!].squaddieId
        if (
            !willMoveSquaddieOffMap &&
            squaddieAtDestination &&
            (squaddieAtDestination.outOfBattleSquaddieId !=
                squaddieId.outOfBattleSquaddieId ||
                squaddieAtDestination.inBattleSquaddieId !=
                    squaddieId.inBattleSquaddieId)
        ) {
            throw new Error(
                `[CoordinateMap.addSquaddie]: another squaddie is at (${coordinate.row}, ${coordinate.col})`
            )
        }

        if (
            copyMap.coordinateBySquaddie.has(
                squaddieId.outOfBattleSquaddieId
            ) &&
            copyMap.coordinateBySquaddie
                .get(squaddieId.outOfBattleSquaddieId)!
                .has(squaddieId.inBattleSquaddieId)
        ) {
            const row = copyMap.coordinateBySquaddie
                .get(squaddieId.outOfBattleSquaddieId)!
                .get(squaddieId.inBattleSquaddieId)!.row
            const col = copyMap.coordinateBySquaddie
                .get(squaddieId.outOfBattleSquaddieId)!
                .get(squaddieId.inBattleSquaddieId)!.col

            if (row != undefined && col != undefined) {
                copyMap.coordinates[row][col].squaddieId = undefined
            }

            copyMap.coordinateBySquaddie
                .get(squaddieId.outOfBattleSquaddieId)!
                .delete(squaddieId.inBattleSquaddieId)
            copyMap.coordinateBySquaddie.delete(
                squaddieId.outOfBattleSquaddieId
            )
        }

        if (!copyMap.coordinateBySquaddie.has(squaddieId.outOfBattleSquaddieId))
            copyMap.coordinateBySquaddie.set(
                squaddieId.outOfBattleSquaddieId,
                new Map()
            )

        copyMap.coordinateBySquaddie
            .get(squaddieId.outOfBattleSquaddieId)!
            .set(squaddieId.inBattleSquaddieId, { ...coordinate })

        if (coordinate.row != undefined && coordinate.col != undefined)
            copyMap.coordinates[coordinate.row][coordinate.col].squaddieId = {
                ...squaddieId,
            }
        return copyMap
    },
    getSquaddieCoordinate({
        map,
        squaddieId,
    }: {
        map: CoordinateMap
        squaddieId: {
            outOfBattleSquaddieId: string
            inBattleSquaddieId: number
        }
    }): OffsetMaybeOffmapCoordinate | undefined {
        return map.coordinateBySquaddie
            .get(squaddieId.outOfBattleSquaddieId)
            ?.get(squaddieId.inBattleSquaddieId)
    },
    getSquaddieAtCoordinate: ({
        map,
        coordinate,
    }: {
        map: CoordinateMap
        coordinate: OffsetCoordinate
    }):
        | {
              outOfBattleSquaddieId: string
              inBattleSquaddieId: number
          }
        | undefined => {
        const coordinateDescription =
            map.coordinates[coordinate.row]?.[coordinate.col]
        if (coordinateDescription == undefined) return undefined
        return coordinateDescription.squaddieId
    },
    removeSquaddie: ({
        map,
        squaddieId,
    }: {
        map: CoordinateMap
        squaddieId: {
            outOfBattleSquaddieId: string
            inBattleSquaddieId: number
        }
    }): CoordinateMap => {
        const squaddieCoordinateInfo = map.coordinateBySquaddie
            .get(squaddieId.outOfBattleSquaddieId)
            ?.get(squaddieId.inBattleSquaddieId)
        if (squaddieCoordinateInfo == undefined) return map

        const copyMap = cloneCoordinateMap(map)

        if (
            squaddieCoordinateInfo.row != undefined &&
            squaddieCoordinateInfo.col != undefined
        )
            copyMap.coordinates[squaddieCoordinateInfo.row][
                squaddieCoordinateInfo.col
            ].squaddieId = undefined
        copyMap.coordinateBySquaddie
            .get(squaddieId.outOfBattleSquaddieId)
            ?.delete(squaddieId.inBattleSquaddieId)

        if (
            copyMap.coordinateBySquaddie.get(squaddieId.outOfBattleSquaddieId)
                ?.size == 0
        )
            copyMap.coordinateBySquaddie.delete(
                squaddieId.outOfBattleSquaddieId
            )
        return copyMap
    },
    getAllSquaddieCoordinatesOnMap: (
        map: CoordinateMap
    ): {
        squaddieId: {
            outOfBattleSquaddieId: string
            inBattleSquaddieId: number
        }
        coordinate: OffsetMaybeOffmapCoordinate
    }[] => {
        let squaddieCoordinateInfo = []
        for (const outOfBattleSquaddieId of map.coordinateBySquaddie.keys()) {
            for (const inBattleSquaddieId of map.coordinateBySquaddie
                .get(outOfBattleSquaddieId)
                ?.keys() || []) {
                squaddieCoordinateInfo.push({
                    squaddieId: {
                        outOfBattleSquaddieId: outOfBattleSquaddieId,
                        inBattleSquaddieId: inBattleSquaddieId,
                    },
                    coordinate: {
                        ...map.coordinateBySquaddie
                            .get(outOfBattleSquaddieId)
                            ?.get(inBattleSquaddieId)!,
                    },
                })
            }
        }
        return squaddieCoordinateInfo
    },
    calculateRoute: ({
        map,
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        stopConditions,
    }: {
        map: CoordinateMap
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        inBattleSquaddieManager: InBattleSquaddieManager
        stopConditions: {
            desiredDestination: { row: number; col: number } | undefined
        }[]
    }): {
        expectedPath: CoordinateMovePath
    } => {
        const startCoordinate = CoordinateMapService.getSquaddieCoordinate({
            map,
            squaddieId: {
                inBattleSquaddieId: inBattleSquaddieId,
                outOfBattleSquaddieId: outOfBattleSquaddieId,
            },
        })

        if (
            startCoordinate?.row == undefined ||
            startCoordinate?.col == undefined
        ) {
            return {
                expectedPath: CoordinateMovePathService.new({
                    steps: [
                        {
                            row: stopConditions[0].desiredDestination?.row || 0,
                            col: stopConditions[0].desiredDestination?.col || 0,
                            moveType: CoordinateMovePathMoveType.START,
                            moveCost: 0,
                        },
                    ],
                }),
            }
        }

        const steps: CoordinateMovePathStep[] = [
            {
                row: startCoordinate.row,
                col: startCoordinate.row,
                moveCost: 0,
                moveType: CoordinateMovePathMoveType.START,
            },
        ]

        let currentRow = startCoordinate.row
        let currentCol = startCoordinate.col
        let moveCost = 0

        let destinationRow = stopConditions[0].desiredDestination?.row ?? 0
        let destinationCol = stopConditions[0].desiredDestination?.col ?? 0

        while (Math.abs(currentRow - destinationRow) >= 1) {
            if (currentRow < destinationRow) {
                currentRow += 1
            }
            if (currentRow > destinationRow) {
                currentRow -= 1
            }
            moveCost += 1
            steps.push({
                row: currentRow,
                col: currentCol,
                moveCost,
                moveType: CoordinateMovePathMoveType.WALK,
            })
        }

        while (Math.abs(currentCol - destinationCol) >= 1) {
            if (currentCol < destinationCol) {
                currentCol += 1
            }
            if (currentCol > destinationCol) {
                currentCol -= 1
            }
            moveCost += 1
            steps.push({
                row: currentRow,
                col: currentCol,
                moveCost,
                moveType: CoordinateMovePathMoveType.WALK,
            })
        }

        return {
            expectedPath: CoordinateMovePathService.new({
                steps,
            }),
        }
    },
    getNumberOfRows: ({ map }: { map: CoordinateMap }): number =>
        getNumberOfRows({ map }),
    getNumberOfColumns: ({ map }: { map: CoordinateMap }): number =>
        getNumberOfColumns({ map }),
    getMoveCost: ({
        map,
        row,
        col,
    }: {
        map: CoordinateMap
        row: number
        col: number
    }): number | undefined => {
        throwIfMapIsUndefined(map, "getNumberOfColumns")
        throwIfCoordinateIsOffMap(map, row, col, "getNumberOfColumns")
        return map.coordinates[row][col].movementCost
    },
    isCoordinateOnMap: ({
        coordinate,
        map,
    }: {
        coordinate: OffsetCoordinate
        map: CoordinateMap
    }): boolean => {
        return (
            coordinate.row >= 0 &&
            coordinate.row < getNumberOfRows({ map }) &&
            coordinate.col >= 0 &&
            coordinate.col < getNumberOfColumns({ map })
        )
    },
    isAPit: ({
        map,
        coordinate,
    }: {
        map: CoordinateMap
        coordinate: OffsetCoordinate
    }): boolean => {
        throwIfMapIsUndefined(map, "isAPit")
        throwIfCoordinateIsOffMap(map, coordinate.row, coordinate.col, "isAPit")
        return (
            !map.coordinates[coordinate.row][coordinate.col].canStop &&
            map.coordinates[coordinate.row][coordinate.col].movementCost !=
                undefined
        )
    },
    isAWall: ({
        map,
        coordinate,
    }: {
        map: CoordinateMap
        coordinate: OffsetCoordinate
    }): boolean => {
        throwIfMapIsUndefined(map, "isAWall")
        throwIfCoordinateIsOffMap(
            map,
            coordinate.row,
            coordinate.col,
            "isAWall"
        )
        return (
            !map.coordinates[coordinate.row][coordinate.col].canStop &&
            map.coordinates[coordinate.row][coordinate.col].movementCost ==
                undefined
        )
    },
}

const convertMovementPropertiesIntoCoordinates = (
    movementProperties: string[]
): Coordinate[][] => {
    const coordinates: Coordinate[][] = []

    for (const [row, rowString] of movementProperties.entries()) {
        const coordinateRow: Coordinate[] = []
        const coordinateChars = rowString
            .split(" ")
            .map((s) => s.trim())
            .filter(Boolean)
        for (const [col, char] of coordinateChars.entries()) {
            switch (char) {
                case "1":
                    coordinateRow.push({
                        row,
                        col,
                        movementCost: 1,
                        canStop: true,
                    })
                    break
                case "2":
                    coordinateRow.push({
                        row,
                        col,
                        movementCost: 2,
                        canStop: true,
                    })
                    break
                case "-":
                    coordinateRow.push({
                        row,
                        col,
                        movementCost: 1,
                        canStop: false,
                    })
                    break
                default:
                    coordinateRow.push({
                        row,
                        col,
                        movementCost: undefined,
                        canStop: false,
                    })
            }
        }
        coordinates.push(coordinateRow)
    }

    let lengthOfLongestRow = Math.max(...coordinates.map((row) => row.length))

    for (const [row, coordinateRow] of coordinates.entries()) {
        while (coordinateRow.length < lengthOfLongestRow) {
            coordinateRow.push({
                row,
                col: coordinateRow.length,
                movementCost: undefined,
                canStop: false,
            })
        }
    }

    return coordinates
}

const cloneCoordinateMap = (original: CoordinateMap): CoordinateMap => {
    const cloneCoordinatesSquaddiesCannotStopOn: Set<string> = new Set(
        original.coordinatesSquaddiesCannotStopOn
    )

    const cloneCoordinateBySquaddie: Map<
        string,
        Map<number, OffsetMaybeOffmapCoordinate>
    > = new Map()
    for (const [
        outOfBattleSquaddieId,
        mapping,
    ] of original.coordinateBySquaddie) {
        const cloneMapping: Map<number, OffsetMaybeOffmapCoordinate> = new Map()
        for (const [inBattleSquaddieId, coordinates] of mapping) {
            cloneMapping.set(inBattleSquaddieId, { ...coordinates })
        }
        cloneCoordinateBySquaddie.set(outOfBattleSquaddieId, cloneMapping)
    }

    return {
        id: original.id,
        name: original.name,
        coordinates: original.coordinates.map((row) =>
            row.map((c) => cloneCoordinate(c))
        ),
        coordinateBySquaddie: cloneCoordinateBySquaddie,
        coordinatesSquaddiesCannotStopOn: cloneCoordinatesSquaddiesCannotStopOn,
    }
}

const cloneCoordinate = (original: Coordinate): Coordinate => {
    return {
        row: original.row,
        col: original.col,
        movementCost: original.movementCost,
        canStop: original.canStop,
        squaddieId: original.squaddieId
            ? {
                  inBattleSquaddieId: original.squaddieId.inBattleSquaddieId,
                  outOfBattleSquaddieId:
                      original.squaddieId.outOfBattleSquaddieId,
              }
            : undefined,
    }
}

const throwIfMapIsUndefined = (path: CoordinateMap, callName: string) => {
    if (path == undefined)
        throw new Error(
            `[CoordinateMapService.${callName}]: Map must be defined`
        )
}

const throwIfCoordinateIsOffMap = (
    map: CoordinateMap,
    row: number,
    col: number,
    callName: string
) => {
    if (
        row < 0 ||
        row >= CoordinateMapService.getNumberOfRows({ map }) ||
        col < 0 ||
        col >= CoordinateMapService.getNumberOfColumns({ map })
    ) {
        throw new Error(
            `[CoordinatePathMapService.${callName}]: Coordinate (${row}, ${col}) is off map`
        )
    }
}

const getNumberOfRows = ({ map }: { map: CoordinateMap }): number => {
    throwIfMapIsUndefined(map, "getNumberOfRows")
    return map.coordinates.length
}

const getNumberOfColumns = ({ map }: { map: CoordinateMap }): number => {
    throwIfMapIsUndefined(map, "getNumberOfColumns")
    return map.coordinates[0].length
}

const calculateCoordinateProperties = (
    coordinates: Coordinate[][]
): Set<string> => {
    const cannotStopCoordinates: Set<string> = new Set()
    for (const row of coordinates) {
        for (const coordinate of row) {
            if (!coordinate.canStop) {
                cannotStopCoordinates.add(
                    OffsetCoordinateService.coordinateToKey(coordinate)
                )
            }
        }
    }
    return cannotStopCoordinates
}
