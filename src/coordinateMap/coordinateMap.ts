import type { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import type { SquaddieMovementInfo } from "../squaddie/squaddieMovementInfo"
import {
    type CoordinateMovePath,
    CoordinateMovePathMoveType,
    CoordinateMovePathService,
} from "./path/path"
import {
    type OffsetCoordinate,
    OffsetCoordinateService,
} from "./offsetCoordinate"
import {
    CoordinateMapAStarAdapter,
    type CoordinateMapSearchLimits,
} from "./coordinateMapAStarAdapter"
import { AStarSearchService } from "../aStarSearch/aStarSearch"
import type { AStarGraph } from "../aStarSearch/aStarGraph"
import type { BattleSquaddieId } from "../squaddie/inBattle/battleSquaddieId"
import { SquaddieIdConverterService } from "../squaddie/idConverterService"

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
    coordinateBySquaddie: Map<string, OffsetMaybeOffmapCoordinate>
    coordinatesSquaddiesCannotStopOn: Set<string>
}

export interface SerializedCoordinateMap {
    id: string
    name: string
    coordinates: Coordinate[][]
    coordinateBySquaddie: {
        [squaddieKey: string]: OffsetMaybeOffmapCoordinate
    }
    coordinatesSquaddiesCannotStopOn: string[]
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

        const squaddieKey =
            SquaddieIdConverterService.squaddieIdToKey(squaddieId)
        if (copyMap.coordinateBySquaddie.has(squaddieKey)) {
            const oldCoordinate = copyMap.coordinateBySquaddie.get(squaddieKey)!

            if (
                oldCoordinate.row != undefined &&
                oldCoordinate.col != undefined
            ) {
                copyMap.coordinates[oldCoordinate.row][
                    oldCoordinate.col
                ].squaddieId = undefined
            }
            copyMap.coordinateBySquaddie.delete(squaddieKey)
        }

        copyMap.coordinateBySquaddie.set(squaddieKey, { ...coordinate })

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
        return map.coordinateBySquaddie.get(
            SquaddieIdConverterService.squaddieIdToKey(squaddieId)
        )
    },
    getSquaddieAtCoordinate: ({
        map,
        coordinate,
    }: {
        map: CoordinateMap
        coordinate: OffsetCoordinate
    }): BattleSquaddieId | undefined => {
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
        const squaddieKey =
            SquaddieIdConverterService.squaddieIdToKey(squaddieId)
        const squaddieCoordinateInfo = map.coordinateBySquaddie.get(squaddieKey)
        if (squaddieCoordinateInfo == undefined) return map

        const copyMap = cloneCoordinateMap(map)

        if (
            squaddieCoordinateInfo.row != undefined &&
            squaddieCoordinateInfo.col != undefined
        )
            copyMap.coordinates[squaddieCoordinateInfo.row][
                squaddieCoordinateInfo.col
            ].squaddieId = undefined
        copyMap.coordinateBySquaddie.delete(squaddieKey)
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
        for (const [
            squaddieKey,
            coordinate,
        ] of map.coordinateBySquaddie.entries()) {
            squaddieCoordinateInfo.push({
                squaddieId:
                    SquaddieIdConverterService.keyToSquaddieId(squaddieKey),
                coordinate: { ...coordinate },
            })
        }
        return squaddieCoordinateInfo
    },
    calculateRoute: ({
        map,
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        inBattleSquaddieManager,
        stopConditions,
        traversalOverrides,
    }: {
        map: CoordinateMap
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        inBattleSquaddieManager: InBattleSquaddieManager
        stopConditions: {
            desiredDestination: { row: number; col: number } | undefined
        }[]
        traversalOverrides?: Partial<
            Omit<SquaddieMovementInfo, "movementPointsPerAction">
        >
    }): {
        expectedPath: CoordinateMovePath
    } => {
        const destinationRow = stopConditions[0].desiredDestination?.row ?? 0
        const destinationCol = stopConditions[0].desiredDestination?.col ?? 0

        const startCoordinate = CoordinateMapService.getSquaddieCoordinate({
            map,
            squaddieId: {
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            },
        })

        if (
            startCoordinate?.row == undefined ||
            startCoordinate?.col == undefined
        ) {
            return {
                expectedPath: createFallbackPath({
                    row: destinationRow,
                    col: destinationCol,
                }),
            }
        }

        const aStarPath = searchForPath({
            map,
            inBattleSquaddieManager,
            inBattleSquaddieId,
            outOfBattleSquaddieId,
            start: {
                row: startCoordinate.row,
                col: startCoordinate.col,
            },
            destinationRow,
            destinationCol,
            traversalOverrides,
        })

        return {
            expectedPath:
                aStarPath ??
                createFallbackPath({
                    row: destinationRow,
                    col: destinationCol,
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
    canSquaddieStopAtCoordinate: ({
        map,
        coordinate,
        squaddieId,
    }: {
        map: CoordinateMap
        coordinate: OffsetCoordinate
        squaddieId?: BattleSquaddieId
    }): boolean => {
        if (!CoordinateMapService.isCoordinateOnMap({ coordinate, map }))
            return false

        const coordinateKey =
            OffsetCoordinateService.coordinateToKey(coordinate)
        if (map.coordinatesSquaddiesCannotStopOn.has(coordinateKey))
            return false

        const allSquaddies =
            CoordinateMapService.getAllSquaddieCoordinatesOnMap(map)
        for (const info of allSquaddies) {
            if (
                info.squaddieId.inBattleSquaddieId ===
                    squaddieId?.inBattleSquaddieId &&
                info.squaddieId.outOfBattleSquaddieId ===
                    squaddieId.outOfBattleSquaddieId
            )
                continue
            if (
                info.coordinate.row === coordinate.row &&
                info.coordinate.col === coordinate.col
            )
                return false
        }

        return true
    },
    serialize: (map: CoordinateMap): SerializedCoordinateMap => {
        const coordinateBySquaddie: {
            [squaddieKey: string]: OffsetMaybeOffmapCoordinate
        } = {}

        for (const [
            squaddieKey,
            coordinate,
        ] of map.coordinateBySquaddie.entries()) {
            coordinateBySquaddie[squaddieKey] = { ...coordinate }
        }

        return {
            id: map.id,
            name: map.name,
            coordinates: map.coordinates.map((row) =>
                row.map((c) => cloneCoordinate(c))
            ),
            coordinateBySquaddie,
            coordinatesSquaddiesCannotStopOn: Array.from(
                map.coordinatesSquaddiesCannotStopOn
            ),
        }
    },
    deserialize: (serialized: SerializedCoordinateMap): CoordinateMap => {
        const coordinateBySquaddie: Map<string, OffsetMaybeOffmapCoordinate> =
            new Map()

        for (const [squaddieKey, coordinate] of Object.entries(
            serialized.coordinateBySquaddie
        )) {
            coordinateBySquaddie.set(squaddieKey, { ...coordinate })
        }

        return {
            id: serialized.id,
            name: serialized.name,
            coordinates: serialized.coordinates.map((row) =>
                row.map((c) => cloneCoordinate(c))
            ),
            coordinateBySquaddie,
            coordinatesSquaddiesCannotStopOn: new Set(
                serialized.coordinatesSquaddiesCannotStopOn
            ),
        }
    },
    convertOffsetMaybeOffmapCoordinate: (
        maybeOffmap?: OffsetMaybeOffmapCoordinate
    ): OffsetCoordinate | undefined => {
        if (maybeOffmap?.row == undefined || maybeOffmap?.col == undefined) {
            return undefined
        }
        return {
            row: maybeOffmap.row,
            col: maybeOffmap.col,
        }
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

    const cloneCoordinateBySquaddie: Map<string, OffsetMaybeOffmapCoordinate> =
        new Map()
    for (const [squaddieKey, coordinates] of original.coordinateBySquaddie) {
        cloneCoordinateBySquaddie.set(squaddieKey, { ...coordinates })
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

const createFallbackPath = ({
    row,
    col,
}: {
    row: number
    col: number
}): CoordinateMovePath => {
    return CoordinateMovePathService.new({
        steps: [
            {
                row,
                col,
                moveType: CoordinateMovePathMoveType.START,
                moveCost: 0,
            },
        ],
    })
}

const searchForPath = ({
    map,
    inBattleSquaddieManager,
    inBattleSquaddieId,
    outOfBattleSquaddieId,
    start,
    destinationRow,
    destinationCol,
    traversalOverrides,
}: {
    map: CoordinateMap
    inBattleSquaddieManager: InBattleSquaddieManager
    inBattleSquaddieId: number
    outOfBattleSquaddieId: string
    start: OffsetCoordinate
    destinationRow: number
    destinationCol: number
    traversalOverrides?: Partial<
        Omit<SquaddieMovementInfo, "movementPointsPerAction">
    >
}): CoordinateMovePath | undefined => {
    let searchLimits: CoordinateMapSearchLimits | undefined
    try {
        searchLimits =
            CoordinateMapAStarAdapter.getCoordinateMapSearchLimitsFromSquaddie({
                manager: inBattleSquaddieManager,
                battleSquaddieId: {
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                },
            })
    } catch {
        searchLimits = undefined
    }

    if (traversalOverrides != undefined) {
        searchLimits = {
            ...searchLimits,
            ...traversalOverrides,
        }
    }

    const adapter = new CoordinateMapAStarAdapter({
        map,
        searchLimits,
        inBattleSquaddieManager,
    })

    return AStarSearchService.search<
        OffsetCoordinate,
        CoordinateMovePath,
        AStarGraph<OffsetCoordinate, CoordinateMovePath>
    >({
        start,
        graph: adapter,
        stopCondition: (node: OffsetCoordinate) =>
            node.row === destinationRow && node.col === destinationCol,
    })
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
