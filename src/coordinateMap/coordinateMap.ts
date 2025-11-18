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
        const copyMap = clone(map)
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

        const copyMap = clone(map)

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

const clone = (original: CoordinateMap): CoordinateMap => {
    return {
        id: original.id,
        name: original.name,
        coordinates: [...original.coordinates],
        coordinateBySquaddie: { ...original.coordinateBySquaddie },
    }
}
