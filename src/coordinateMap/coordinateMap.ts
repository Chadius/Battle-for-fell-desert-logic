interface Coordinate {
    q: number
    r: number
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
            [inBattle: string]: { q: number | undefined; r: number | undefined }
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
        coordinate: { q: number | undefined; r: number | undefined }
    }): CoordinateMap => {
        const copyMap = clone(map)
        const willMoveSquaddieOffMap =
            coordinate.q == undefined && coordinate.r == undefined
        const squaddieAtDestination =
            !willMoveSquaddieOffMap &&
            copyMap.coordinates[coordinate.q!][coordinate.r!].squaddieId
        if (
            !willMoveSquaddieOffMap &&
            squaddieAtDestination &&
            (squaddieAtDestination.outOfBattle != squaddieId.outOfBattle ||
                squaddieAtDestination.inBattle != squaddieId.inBattle)
        ) {
            throw new Error(
                `[CoordinateMap.addSquaddie]: another squaddie is at (${coordinate.q}, ${coordinate.r})`
            )
        }

        if (
            copyMap.coordinateBySquaddie[squaddieId.outOfBattle]?.[
                squaddieId.inBattle
            ] != undefined
        ) {
            const q =
                copyMap.coordinateBySquaddie[squaddieId.outOfBattle][
                    squaddieId.inBattle
                ].q
            const r =
                copyMap.coordinateBySquaddie[squaddieId.outOfBattle][
                    squaddieId.inBattle
                ].r
            if (q != undefined && r != undefined) {
                copyMap.coordinates[q][r].squaddieId = undefined
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

        if (coordinate.q != undefined && coordinate.r != undefined)
            copyMap.coordinates[coordinate.q][coordinate.r].squaddieId = {
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
    }): { q: number | undefined; r: number | undefined } | undefined {
        return map.coordinateBySquaddie[squaddieId.outOfBattle]?.[
            squaddieId.inBattle
        ]
    },
    getSquaddieAtCoordinate: ({
        map,
        coordinate,
    }: {
        map: CoordinateMap
        coordinate: { q: number; r: number }
    }):
        | {
              outOfBattle: string
              inBattle: number
          }
        | undefined => {
        const coordinateDescription =
            map.coordinates[coordinate.q]?.[coordinate.r]
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
            squaddieCoordinateInfo.q != undefined &&
            squaddieCoordinateInfo.r != undefined
        )
            copyMap.coordinates[squaddieCoordinateInfo.q][
                squaddieCoordinateInfo.r
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
        coordinate: { q: number | undefined; r: number | undefined }
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

    for (const [q, row] of movementProperties.entries()) {
        const coordinateRow: Coordinate[] = []
        const coordinateChars = row
            .split(" ")
            .map((s) => s.trim())
            .filter(Boolean)
        for (const [r, char] of coordinateChars.entries()) {
            switch (char) {
                case "1":
                    coordinateRow.push({ q, r, movementCost: 1, canStop: true })
                    break
                case "2":
                    coordinateRow.push({ q, r, movementCost: 2, canStop: true })
                    break
                case "-":
                    coordinateRow.push({
                        q,
                        r,
                        movementCost: 1,
                        canStop: false,
                    })
                    break
                default:
                    coordinateRow.push({
                        q,
                        r,
                        movementCost: undefined,
                        canStop: false,
                    })
            }
        }
        coordinates.push(coordinateRow)
    }

    let lengthOfLongestRow = Math.max(...coordinates.map((row) => row.length))

    for (const [q, coordinateRow] of coordinates.entries()) {
        while (coordinateRow.length < lengthOfLongestRow) {
            coordinateRow.push({
                q,
                r: coordinateRow.length,
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
