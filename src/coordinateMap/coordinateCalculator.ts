import type { EnumLike } from "../enum"

import type { OffsetCoordinate } from "./offsetCoordinate"

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

const axialDirectionOffsets: Map<
    TCoordinateDirection,
    { q: number; r: number }
> = new Map([
    [CoordinateDirection.RIGHT, { q: +1, r: 0 }],
    [CoordinateDirection.UP_RIGHT, { q: +1, r: -1 }],
    [CoordinateDirection.UP_LEFT, { q: 0, r: -1 }],
    [CoordinateDirection.LEFT, { q: -1, r: 0 }],
    [CoordinateDirection.DOWN_LEFT, { q: -1, r: +1 }],
    [CoordinateDirection.DOWN_RIGHT, { q: 0, r: +1 }],
])

export const CoordinateCalculator = {
    getNeighbor: (
        origin: OffsetCoordinate,
        direction: TCoordinateDirection
    ): OffsetCoordinate => getNeighbor(origin, direction),
    getAxialOffset: (
        direction: TCoordinateDirection
    ): { q: number; r: number } => axialDirectionOffsets.get(direction)!,
    calculateEveryCoordinateInLine: (
        from: OffsetCoordinate,
        to: OffsetCoordinate
    ): OffsetCoordinate[] => calculateEveryCoordinateInLine(from, to),
    getPerpendicularDirections: (
        from: OffsetCoordinate,
        to: OffsetCoordinate
    ): [TCoordinateDirection, TCoordinateDirection] =>
        getPerpendicularDirections(from, to),
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
    getDistanceBetween: (
        from: OffsetCoordinate,
        to: OffsetCoordinate
    ): number => {
        const fromAxial = AxialCoordinateCalculator.offsetToAxial(from)
        const toAxial = AxialCoordinateCalculator.offsetToAxial(to)
        const dq = toAxial.q - fromAxial.q
        const dr = toAxial.r - fromAxial.r
        return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2
    },
    getCoordinatesInRing: (
        center: OffsetCoordinate,
        radius: number
    ): OffsetCoordinate[] => {
        if (radius === 0) {
            return [center]
        }

        const centerAxial = AxialCoordinateCalculator.offsetToAxial(center)

        const startDirection = axialDirectionOffsets.get(
            CoordinateDirection.DOWN_LEFT
        )!
        let currentAxial = {
            q: centerAxial.q + startDirection.q * radius,
            r: centerAxial.r + startDirection.r * radius,
        }

        const results: OffsetCoordinate[] = []

        for (const direction of [
            CoordinateDirection.RIGHT,
            CoordinateDirection.UP_RIGHT,
            CoordinateDirection.UP_LEFT,
            CoordinateDirection.LEFT,
            CoordinateDirection.DOWN_LEFT,
            CoordinateDirection.DOWN_RIGHT,
        ]) {
            const directionVector = axialDirectionOffsets.get(direction)!

            for (let step = 0; step < radius; step++) {
                results.push(
                    AxialCoordinateCalculator.axialToOffset(currentAxial)
                )

                currentAxial = {
                    q: currentAxial.q + directionVector.q,
                    r: currentAxial.r + directionVector.r,
                }
            }
        }

        return results
    },
    offsetToAxial: (hex: OffsetCoordinate): AxialCoordinate =>
        AxialCoordinateCalculator.offsetToAxial(hex),
    axialToOffset: (hex: AxialCoordinate): OffsetCoordinate =>
        AxialCoordinateCalculator.axialToOffset(hex),
    getOppositeDirection: (
        inputDirection: TCoordinateDirection
    ): TCoordinateDirection => {
        const directions: {
            [t in TCoordinateDirection]: TCoordinateDirection
        } = {
            [CoordinateDirection.RIGHT]: CoordinateDirection.LEFT,
            [CoordinateDirection.UP_RIGHT]: CoordinateDirection.DOWN_LEFT,
            [CoordinateDirection.UP_LEFT]: CoordinateDirection.DOWN_RIGHT,
            [CoordinateDirection.LEFT]: CoordinateDirection.RIGHT,
            [CoordinateDirection.DOWN_LEFT]: CoordinateDirection.UP_RIGHT,
            [CoordinateDirection.DOWN_RIGHT]: CoordinateDirection.UP_LEFT,
        }
        return directions[inputDirection]
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

const roundFractionalCubeCoordinatesToNearestNeighbor = (
    fractionalQ: number,
    fractionalR: number,
    fractionalS: number
): { q: number; r: number } => {
    let roundedQ = Math.round(fractionalQ)
    let roundedR = Math.round(fractionalR)
    const roundedS = Math.round(fractionalS)

    const differenceQ = Math.abs(fractionalQ - roundedQ)
    const differenceR = Math.abs(fractionalR - roundedR)
    const differenceS = Math.abs(fractionalS - roundedS)

    if (differenceQ > differenceR && differenceQ > differenceS) {
        roundedQ = -roundedR - roundedS
    } else if (differenceR > differenceS) {
        roundedR = -roundedQ - roundedS
    }
    return { q: roundedQ, r: roundedR }
}

const calculateEveryCoordinateInLine = (
    from: OffsetCoordinate,
    to: OffsetCoordinate
): OffsetCoordinate[] => {
    const numberOfCoordinates = Math.round(
        CoordinateCalculator.getDistanceBetween(from, to)
    )
    if (numberOfCoordinates === 0) return [{ ...from }]

    const fromAxial = AxialCoordinateCalculator.offsetToAxial(from)
    const toAxial = AxialCoordinateCalculator.offsetToAxial(to)
    const results: OffsetCoordinate[] = []

    for (let i = 0; i <= numberOfCoordinates; i++) {
        const t = i / numberOfCoordinates

        const fractionalQ = fromAxial.q + (toAxial.q - fromAxial.q) * t
        const fractionalR = fromAxial.r + (toAxial.r - fromAxial.r) * t
        const fractionalS = -fractionalQ - fractionalR

        results.push(
            AxialCoordinateCalculator.axialToOffset(
                roundFractionalCubeCoordinatesToNearestNeighbor(
                    fractionalQ,
                    fractionalR,
                    fractionalS
                )
            )
        )
    }
    return results
}

const getPerpendicularDirections = (
    from: OffsetCoordinate,
    to: OffsetCoordinate
): [TCoordinateDirection, TCoordinateDirection] => {
    const fromAxial = AxialCoordinateCalculator.offsetToAxial(from)
    const toAxial = AxialCoordinateCalculator.offsetToAxial(to)
    const dq = toAxial.q - fromAxial.q
    const dr = toAxial.r - fromAxial.r

    if (dq === 0 && dr === 0) {
        return [CoordinateDirection.UP_LEFT, CoordinateDirection.DOWN_RIGHT]
    }

    const allDirections: TCoordinateDirection[] = [
        CoordinateDirection.RIGHT,
        CoordinateDirection.UP_RIGHT,
        CoordinateDirection.UP_LEFT,
        CoordinateDirection.LEFT,
        CoordinateDirection.DOWN_LEFT,
        CoordinateDirection.DOWN_RIGHT,
    ]

    const directionsSortedByDotProduct = allDirections
        .map((dir) => {
            const axialOffset = axialDirectionOffsets.get(dir)!
            const dotProduct = Math.abs(axialOffset.q * dq + axialOffset.r * dr)
            return { dir, dotProduct: dotProduct }
        })
        .sort((a, b) => a.dotProduct - b.dotProduct)

    return [
        directionsSortedByDotProduct[0].dir,
        directionsSortedByDotProduct[1].dir,
    ]
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
