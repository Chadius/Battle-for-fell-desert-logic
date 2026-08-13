import type { EnumLike } from "../enum.js"
import type {
    AxialCoordinate,
    TCoordinateDirection,
} from "./coordinateCalculator.js"
import { CoordinateCalculator } from "./coordinateCalculator.js"
import {
    type OffsetCoordinate,
    OffsetCoordinateService,
} from "./offsetCoordinate.js"

export const CoordinateGeneratorShape = {
    BLOOM: "BLOOM",
    LINE: "LINE",
    CONE: "CONE",
} as const satisfies Record<string, string>
export type TCoordinateGeneratorShape = EnumLike<
    typeof CoordinateGeneratorShape
>

export const CoordinateShapeService = {
    calculateCoordinates: (
        params:
            | {
                  shape: typeof CoordinateGeneratorShape.BLOOM
                  radius: number
                  origin: OffsetCoordinate
              }
            | {
                  shape: typeof CoordinateGeneratorShape.LINE
                  from: OffsetCoordinate
                  to: OffsetCoordinate
                  width: number
              }
            | {
                  shape: typeof CoordinateGeneratorShape.CONE
                  origin: OffsetCoordinate
                  direction: TCoordinateDirection
                  width: number
                  length: number
              }
    ): OffsetCoordinate[] => {
        switch (params.shape) {
            case CoordinateGeneratorShape.BLOOM:
                return calculateBloomCoordinates({
                    radius: params.radius,
                    origin: params.origin,
                })
            case CoordinateGeneratorShape.LINE:
                return calculateLineCoordinates({
                    from: params.from,
                    to: params.to,
                    width: params.width,
                })
            case CoordinateGeneratorShape.CONE:
                return calculateConeCoordinates({
                    origin: params.origin,
                    direction: params.direction,
                    width: params.width,
                    length: params.length,
                })
        }
    },
}

const calculateBloomCoordinates = ({
    origin,
    radius,
}: {
    radius: number
    origin: OffsetCoordinate
}): OffsetCoordinate[] => {
    throwIfRadiusIsNegative({
        callName: calculateBloomCoordinates.name,
        radius,
    })

    return CoordinateCalculator.getAllCoordinatesWithinRadius(origin, radius)
}

const throwIfRadiusIsNegative = ({
    callName,
    radius,
}: {
    callName: string
    radius: number
}) => {
    if (radius >= 0) return
    throw new Error(
        `[CoordinateShapeService.${callName}]: radius must be a non-negative integer`
    )
}

const calculateLineCoordinates = ({
    from,
    to,
    width,
}: {
    from: OffsetCoordinate
    to: OffsetCoordinate
    width: number
}): OffsetCoordinate[] => {
    const centerline = CoordinateCalculator.calculateEveryCoordinateInLine(
        from,
        to
    )
    const [firstPerpendicularDirection, secondPerpendicularDirection]: [
        TCoordinateDirection,
        TCoordinateDirection,
    ] = CoordinateCalculator.getPerpendicularDirections(from, to)

    const alreadyAddedCoordinates = new Set<string>()
    const results: OffsetCoordinate[] = []

    for (const centerHex of centerline) {
        OffsetCoordinateService.addToResultsExactlyOnce({
            alreadyAddedCoordinates,
            results,
            hex: centerHex,
        })

        for (let w = 1; w <= width; w++) {
            OffsetCoordinateService.addToResultsExactlyOnce({
                alreadyAddedCoordinates,
                results,
                hex: CoordinateCalculator.getNeighbor(
                    centerHex,
                    firstPerpendicularDirection
                ),
            })

            OffsetCoordinateService.addToResultsExactlyOnce({
                alreadyAddedCoordinates,
                results,
                hex: CoordinateCalculator.getNeighbor(
                    centerHex,
                    secondPerpendicularDirection
                ),
            })
        }
    }

    return results
}

const throwIfWidthIsNegative = ({
    callName,
    width,
}: {
    callName: string
    width: number
}) => {
    if (width >= 0) return
    throw new Error(
        `[CoordinateShapeService.${callName}]: width must be a non-negative integer`
    )
}

const calculateConeCoordinates = ({
    origin,
    direction,
    width,
    length,
}: {
    origin: OffsetCoordinate
    direction: TCoordinateDirection
    width: number
    length: number
}): OffsetCoordinate[] => {
    throwIfWidthIsNegative({
        callName: calculateConeCoordinates.name,
        width,
    })

    const originAxial = CoordinateCalculator.offsetToAxial(origin)

    const alreadyAddedCoordinates = new Set<string>()
    const results: OffsetCoordinate[] = []

    OffsetCoordinateService.addToResultsExactlyOnce({
        alreadyAddedCoordinates,
        results,
        hex: origin,
    })

    if (width === 0) {
        fillConeRay({
            originAxial,
            direction,
            length,
            results,
            alreadyAddedCoordinates,
        })
        return results
    }

    const sectorPairs = CoordinateCalculator.getConeSectorDirectionPairs(
        direction,
        width
    )

    for (const [firstDirection, secondDirection] of sectorPairs) {
        fillConeSector({
            originAxial,
            firstDirection,
            secondDirection,
            length,
            results,
            alreadyAddedCoordinates,
        })
    }

    return results
}

const fillConeRay = ({
    originAxial,
    direction,
    length,
    alreadyAddedCoordinates,
    results,
}: {
    originAxial: AxialCoordinate
    direction: TCoordinateDirection
    length: number
    alreadyAddedCoordinates: Set<string>
    results: OffsetCoordinate[]
}) => {
    const axialOffset = CoordinateCalculator.getAxialOffset(direction)
    for (let distance = 1; distance <= length; distance++) {
        OffsetCoordinateService.addToResultsExactlyOnce({
            results,
            alreadyAddedCoordinates,
            hex: CoordinateCalculator.axialToOffset({
                q: originAxial.q + axialOffset.q * distance,
                r: originAxial.r + axialOffset.r * distance,
            }),
        })
    }
}

const fillConeSector = ({
    originAxial,
    firstDirection,
    secondDirection,
    length,
    alreadyAddedCoordinates,
    results,
}: {
    originAxial: AxialCoordinate
    firstDirection: TCoordinateDirection
    secondDirection: TCoordinateDirection
    length: number
    alreadyAddedCoordinates: Set<string>
    results: OffsetCoordinate[]
}) => {
    const firstOffset = CoordinateCalculator.getAxialOffset(firstDirection)
    const secondOffset = CoordinateCalculator.getAxialOffset(secondDirection)

    for (let firstStep = 0; firstStep <= length; firstStep++) {
        for (
            let secondStep = 0;
            secondStep <= length - firstStep;
            secondStep++
        ) {
            OffsetCoordinateService.addToResultsExactlyOnce({
                results,
                alreadyAddedCoordinates,
                hex: CoordinateCalculator.axialToOffset({
                    q:
                        originAxial.q +
                        firstOffset.q * firstStep +
                        secondOffset.q * secondStep,
                    r:
                        originAxial.r +
                        firstOffset.r * firstStep +
                        secondOffset.r * secondStep,
                }),
            })
        }
    }
}
