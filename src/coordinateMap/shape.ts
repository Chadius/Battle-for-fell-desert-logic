import type { EnumLike } from "../enum.ts"
import { CoordinateCalculator } from "./coordinateCalculator.ts"
import type { OffsetCoordinate } from "./offsetCoordinate.ts"

export const CoordinateGeneratorShape = {
    BLOOM: "BLOOM",
} as const satisfies Record<string, string>
export type TCoordinateGeneratorShape = EnumLike<
    typeof CoordinateGeneratorShape
>

export const CoordinateShapeService = {
    calculateCoordinates: ({
        shape,
        origin,
        radius,
    }:
        | {
              shape: "BLOOM"
              radius: number
              origin: OffsetCoordinate
          }
        | {
              shape: TCoordinateGeneratorShape
              radius: number
              origin: OffsetCoordinate
          }): OffsetCoordinate[] => {
        if (shape == CoordinateGeneratorShape.BLOOM)
            return calculateBloomCoordinates({ radius, origin })
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
