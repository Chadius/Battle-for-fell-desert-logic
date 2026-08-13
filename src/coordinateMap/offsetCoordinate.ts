export type OffsetCoordinate = {
    row: number
    col: number
}

export const OffsetCoordinateService = {
    coordinateToKey: (coordinate: OffsetCoordinate) =>
        `${coordinate.row},${coordinate.col}`,
    keyToCoordinate: (key: string): OffsetCoordinate => {
        const [row, col] = key.split(",").map(Number)
        return { row, col }
    },
    addToResultsExactlyOnce: ({
        alreadyAddedCoordinates,
        results,
        hex,
    }: {
        alreadyAddedCoordinates: Set<string>
        results: OffsetCoordinate[]
        hex: OffsetCoordinate
    }) => {
        const key = OffsetCoordinateService.coordinateToKey(hex)
        if (alreadyAddedCoordinates.has(key)) return
        alreadyAddedCoordinates.add(key)
        results.push(hex)
        return results
    },
}
