import type { EnumLike } from "../enum.ts"

import type { OffsetCoordinate } from "./offsetCoordinate.ts"

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
    getAllNeighbors: (origin: OffsetCoordinate): OffsetCoordinate[] => {
        return [
            CoordinateDirection.RIGHT,
            CoordinateDirection.UP_RIGHT,
            CoordinateDirection.UP_LEFT,
            CoordinateDirection.LEFT,
            CoordinateDirection.DOWN_RIGHT,
            CoordinateDirection.DOWN_LEFT,
        ].map((direction) => getNeighbor(origin, direction))
    },
    getAllCoordinatesWithinRadius: (
        origin: OffsetCoordinate,
        range: number
    ): OffsetCoordinate[] => {
        if (range < 1) {
            return [origin]
        }

        const allInRange: OffsetCoordinate[] = []

        const originAxial = AxialCoordinateCalculator.offsetToAxial(origin)
        for (let q = -1 * range; q <= range; q++) {
            const rRange = [
                Math.max(-1 * range, -q - range),
                Math.min(range, -q + range),
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
    const rowIsEven = (origin.row & 1) === 0
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
        const col = hex.q + (hex.r - (hex.r & 1)) / 2
        return { col, row: hex.r }
    },
    offsetToAxial: (hex: OffsetCoordinate): AxialCoordinate => {
        const q = hex.col - (hex.row - (hex.row & 1)) / 2
        return { q, r: hex.row }
    },
}
