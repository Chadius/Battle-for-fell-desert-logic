import { z } from "zod"

export interface SquaddieMovementSpecialTraversalInfo {
    minimumRange?: number
    maximumRange?: number
    actionPointsOfMovement?: number
}

export interface SquaddieMovementInfo {
    movementPointsPerAction: number
    skipOverPits: boolean
    moveThroughWalls: boolean
    stopOnSquaddies: boolean
    reduceMoveCosts: boolean
    squaddieMovementSpecialTraversalInfo?: SquaddieMovementSpecialTraversalInfo
}

const MINIMUM_RANGE_MESSAGE =
    "SquaddieMovementSpecialTraversalInfo.minimumRange is either undefined or a nonnegative integer"
const MAXIMUM_RANGE_MESSAGE =
    "maximumRange is either undefined or a nonnegative integer. It cannot be less than minimumRange if it exists."
const ACTION_POINTS_OF_MOVEMENT_MESSAGE =
    "actionPointsOfMovement is either undefined or a nonnegative integer."
const MOVEMENT_POINTS_PER_ACTION_MESSAGE =
    "Movement Points per action must be a nonnegative integer"

const squaddieMovementSpecialTraversalInfoSchema = z
    .object({
        minimumRange: z
            .number()
            .int(MINIMUM_RANGE_MESSAGE)
            .nonnegative(MINIMUM_RANGE_MESSAGE)
            .optional(),
        maximumRange: z
            .number()
            .int(MAXIMUM_RANGE_MESSAGE)
            .nonnegative(MAXIMUM_RANGE_MESSAGE)
            .optional(),
        actionPointsOfMovement: z
            .number()
            .int(ACTION_POINTS_OF_MOVEMENT_MESSAGE)
            .nonnegative(ACTION_POINTS_OF_MOVEMENT_MESSAGE)
            .optional(),
    })
    .refine(
        (data) =>
            data.minimumRange === undefined ||
            data.maximumRange === undefined ||
            data.maximumRange >= data.minimumRange,
        {
            message: MAXIMUM_RANGE_MESSAGE,
            path: ["maximumRange"],
        }
    )

export const squaddieMovementInfoSchema = z.object({
    movementPointsPerAction: z
        .number()
        .int(MOVEMENT_POINTS_PER_ACTION_MESSAGE)
        .nonnegative(MOVEMENT_POINTS_PER_ACTION_MESSAGE),
    skipOverPits: z.boolean(),
    moveThroughWalls: z.boolean(),
    stopOnSquaddies: z.boolean(),
    reduceMoveCosts: z.boolean(),
    squaddieMovementSpecialTraversalInfo:
        squaddieMovementSpecialTraversalInfoSchema.optional(),
})

export type SerializedSquaddieMovementInfo = z.infer<
    typeof squaddieMovementInfoSchema
>
