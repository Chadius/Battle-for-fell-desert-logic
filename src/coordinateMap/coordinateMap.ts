import type { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager.ts"
import {
    type CoordinateMovePath,
    CoordinateMovePathMoveType,
    CoordinateMovePathService,
    type CoordinateMovePathStep,
} from "./path/path.ts"

export type OffsetCoordinate = {
    row: number
    col: number
}

export type OffsetMaybeOffmapCoordinate = {
    row: number | undefined
    col: number | undefined
}

interface Coordinate {
    row: number
    col: number
    movementCost: number | undefined
    canStop: boolean
    squaddieId?: { outOfBattle: string; inBattle: number }
}

export interface CoordinateMap {
    id: string
    name: string
    coordinates: Coordinate[][]
    coordinateBySquaddie: {
        [outOfBattle: string]: {
            [inBattle: string]: OffsetMaybeOffmapCoordinate
        }
    }
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
        return {
            id,
            name,
            coordinates:
                convertMovementPropertiesIntoCoordinates(movementProperties),
            coordinateBySquaddie: {},
        }
    },
    addSquaddie: ({
        map,
        squaddieId,
        coordinate,
    }: {
        map: CoordinateMap
        squaddieId: { outOfBattle: string; inBattle: number }
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
            (squaddieAtDestination.outOfBattle != squaddieId.outOfBattle ||
                squaddieAtDestination.inBattle != squaddieId.inBattle)
        ) {
            throw new Error(
                `[CoordinateMap.addSquaddie]: another squaddie is at (${coordinate.row}, ${coordinate.col})`
            )
        }

        if (
            copyMap.coordinateBySquaddie[squaddieId.outOfBattle]?.[
                squaddieId.inBattle
            ] != undefined
        ) {
            const row =
                copyMap.coordinateBySquaddie[squaddieId.outOfBattle][
                    squaddieId.inBattle
                ].row
            const col =
                copyMap.coordinateBySquaddie[squaddieId.outOfBattle][
                    squaddieId.inBattle
                ].col
            if (row != undefined && col != undefined) {
                copyMap.coordinates[row][col].squaddieId = undefined
            }

            delete copyMap.coordinateBySquaddie[squaddieId.outOfBattle][
                squaddieId.inBattle
            ]
            delete copyMap.coordinateBySquaddie[squaddieId.outOfBattle]
        }

        copyMap.coordinateBySquaddie[squaddieId.outOfBattle] ||= {}
        copyMap.coordinateBySquaddie[squaddieId.outOfBattle][
            squaddieId.inBattle
        ] = { ...coordinate }

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
        squaddieId: { outOfBattle: string; inBattle: number }
    }): OffsetMaybeOffmapCoordinate | undefined {
        return map.coordinateBySquaddie[squaddieId.outOfBattle]?.[
            squaddieId.inBattle
        ]
    },
    getSquaddieAtCoordinate: ({
        map,
        coordinate,
    }: {
        map: CoordinateMap
        coordinate: OffsetCoordinate
    }):
        | {
              outOfBattle: string
              inBattle: number
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
        squaddieId: { outOfBattle: string; inBattle: number }
    }): CoordinateMap => {
        const squaddieCoordinateInfo =
            map.coordinateBySquaddie[squaddieId.outOfBattle]?.[
                squaddieId.inBattle
            ]
        if (squaddieCoordinateInfo == undefined) return map

        const copyMap = cloneCoordinateMap(map)

        if (
            squaddieCoordinateInfo.row != undefined &&
            squaddieCoordinateInfo.col != undefined
        )
            copyMap.coordinates[squaddieCoordinateInfo.row][
                squaddieCoordinateInfo.col
            ].squaddieId = undefined
        delete copyMap.coordinateBySquaddie[squaddieId.outOfBattle][
            squaddieId.inBattle
        ]

        if (
            Object.keys(copyMap.coordinateBySquaddie[squaddieId.outOfBattle])
                .length == 0
        )
            delete copyMap.coordinateBySquaddie[squaddieId.outOfBattle]
        return copyMap
    },
    getAllSquaddieCoordinatesOnMap: (
        map: CoordinateMap
    ): {
        squaddieId: {
            outOfBattle: string
            inBattle: number
        }
        coordinate: OffsetMaybeOffmapCoordinate
    }[] => {
        let squaddieCoordinateInfo = []
        for (const outOfBattleSquaddieId of Object.keys(
            map.coordinateBySquaddie
        )) {
            for (const inBattleSquaddieId of Object.keys(
                map.coordinateBySquaddie[outOfBattleSquaddieId]
            )) {
                squaddieCoordinateInfo.push({
                    squaddieId: {
                        outOfBattle: outOfBattleSquaddieId,
                        inBattle: Number(inBattleSquaddieId),
                    },
                    coordinate: {
                        ...map.coordinateBySquaddie[outOfBattleSquaddieId][
                            Number(inBattleSquaddieId)
                        ],
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
                inBattle: inBattleSquaddieId,
                outOfBattle: outOfBattleSquaddieId,
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
    getNumberOfRows: ({ map }: { map: CoordinateMap }): number => {
        throwIfMapIsUndefined(map, "getNumberOfRows")
        return map.coordinates.length
    },
    getNumberOfColumns: ({ map }: { map: CoordinateMap }): number => {
        throwIfMapIsUndefined(map, "getNumberOfColumns")
        return map.coordinates[0].length
    },
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
    return {
        id: original.id,
        name: original.name,
        coordinates: original.coordinates.map((row) =>
            row.map((c) => cloneCoordinate(c))
        ),
        coordinateBySquaddie: { ...original.coordinateBySquaddie },
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
                  inBattle: original.squaddieId.inBattle,
                  outOfBattle: original.squaddieId.outOfBattle,
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
