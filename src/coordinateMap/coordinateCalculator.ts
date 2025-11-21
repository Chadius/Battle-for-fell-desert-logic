import type { EnumLike } from "../enum.ts"
import type { OffsetCoordinate } from "./coordinateMap.ts"

export const CoordinateDirection = {
    RIGHT: 0,
    UP_RIGHT: 1,
    UP_LEFT: 2,
    LEFT: 3,
    DOWN_LEFT: 4,
    DOWN_RIGHT: 5,
} as const satisfies Record<string, number>
export type TCoordinateDirection = EnumLike<typeof CoordinateDirection>

const directionDifferencesByRowIsEven = {
    true: [
        [+1, 0],
        [0, -1],
        [-1, -1],
        [-1, 0],
        [-1, +1],
        [0, +1],
    ],
    false: [
        [+1, 0],
        [+1, -1],
        [0, -1],
        [-1, 0],
        [0, +1],
        [+1, +1],
    ],
}

export const CoordinateCalculator = {
    getNeighbor: (
        origin: OffsetCoordinate,
        direction: TCoordinateDirection
    ): OffsetCoordinate => getNeighbor(origin, direction),
    getAllCoordinatesInRange: (
        origin: OffsetCoordinate,
        radius: number
    ): OffsetCoordinate[] => {
        const allInRange: OffsetCoordinate[] = []

        const originAxial = AxialCoordinateCalculator.offsetToAxial(origin)
        for (let q = -1 * radius; q <= radius; q++) {
            const rRange = [
                Math.max(-1 * radius, -q - radius),
                Math.min(radius, -q + radius),
            ]

            for (let r = rRange[0]; r <= rRange[1]; r++) {
                const inRangeCoordinate: AxialCoordinate = {
                    q: originAxial.q + q,
                    r: originAxial.r + r,
                }
                allInRange.push(
                    AxialCoordinateCalculator.axialToOffset(inRangeCoordinate)
                )
            }
        }

        return allInRange
    },
}

const getNeighbor = (
    origin: OffsetCoordinate,
    direction: TCoordinateDirection
): OffsetCoordinate => {
    const rowIsEven = origin.row % 2 === 0
    const directionDifferences = rowIsEven
        ? directionDifferencesByRowIsEven.true
        : directionDifferencesByRowIsEven.false
    const directionDifference = directionDifferences[direction]
    return {
        col: origin.col + directionDifference[0],
        row: origin.row + directionDifference[1],
    }
}

interface AxialCoordinate {
    q: number
    r: number
}

const AxialCoordinateCalculator = {
    axialToOffset: (hex: AxialCoordinate): OffsetCoordinate => {
        const col =
            hex.r % 2 === 0 ? hex.q + hex.r / 2 : hex.q + (hex.r - 1) / 2
        return { col, row: hex.r }
    },
    offsetToAxial: (hex: OffsetCoordinate): AxialCoordinate => {
        const q =
            hex.row % 2 === 0
                ? hex.col + hex.row / 2
                : hex.col + (hex.row - 1) / 2
        return { q, r: hex.row }
    },
}
