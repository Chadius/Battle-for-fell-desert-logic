import type { EnumLike } from "../enum.js"
import type { TCoordinateDirection } from "./coordinateCalculator.js"
import { CoordinateCalculator } from "./coordinateCalculator.js"
import type { OffsetCoordinate } from "./offsetCoordinate.js"

export const CoordinateGeneratorShape = {
    BLOOM: "BLOOM",
    LINE: "LINE",
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
                  shape: Exclude<
                      TCoordinateGeneratorShape,
                      | typeof CoordinateGeneratorShape.BLOOM
                      | typeof CoordinateGeneratorShape.LINE
                  >
                  radius: number
                  origin: OffsetCoordinate
              }
    ): OffsetCoordinate[] => {
        if (params.shape === CoordinateGeneratorShape.BLOOM)
            return calculateBloomCoordinates({
                radius: params.radius,
                origin: params.origin,
            })
        if (params.shape == CoordinateGeneratorShape.LINE)
            return calculateLineCoordinates({
                from: params.from,
                to: params.to,
                width: params.width,
            })
        return []
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

    const addToResultsExactlyOnce = (hex: OffsetCoordinate) => {
        const key = `${hex.row},${hex.col}`
        if (alreadyAddedCoordinates.has(key)) return
        alreadyAddedCoordinates.add(key)
        results.push(hex)
    }

    for (const centerHex of centerline) {
        addToResultsExactlyOnce(centerHex)

        for (let w = 1; w <= width; w++) {
            addToResultsExactlyOnce(
                CoordinateCalculator.getNeighbor(
                    centerHex,
                    firstPerpendicularDirection
                )
            )

            addToResultsExactlyOnce(
                CoordinateCalculator.getNeighbor(
                    centerHex,
                    secondPerpendicularDirection
                )
            )
        }
    }

    return results
}
