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
}
