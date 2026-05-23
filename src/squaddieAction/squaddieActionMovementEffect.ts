import { z } from "zod"
import { ActionRange, type TActionRange } from "./actionRange"
import type { SquaddieMovementInfo } from "../squaddie/squaddieMovementInfo"
import type { EnumLike } from "../enum"

export const MovementEffectType = {
    ACTOR_CHOSEN: "ACTOR_CHOSEN",
    ACTOR_CHOSEN_SPECIAL_TRAVERSAL: "ACTOR_CHOSEN_SPECIAL_TRAVERSAL",
    TELEPORT_TO_ACTOR_CHOSEN: "TELEPORT_TO_ACTOR_CHOSEN",
    FORCED_TOWARD_ACTOR: "FORCED_TOWARD_ACTOR",
} as const satisfies Record<string, string>
export type TMovementEffectType = EnumLike<typeof MovementEffectType>

type ActorChosenMovement = {
    movementType: typeof MovementEffectType.ACTOR_CHOSEN
}

type ActorChosenSpecialTraversalMovement = {
    movementType: typeof MovementEffectType.ACTOR_CHOSEN_SPECIAL_TRAVERSAL
    traversal: Partial<Omit<SquaddieMovementInfo, "movementPointsPerAction">>
}

export type TeleportToActorChosenMovement = {
    movementType: typeof MovementEffectType.TELEPORT_TO_ACTOR_CHOSEN
    destinationRange?: TActionRange
}

type ForcedTowardActorMovement = {
    movementType: typeof MovementEffectType.FORCED_TOWARD_ACTOR
    forcedDistance: number
}

export type SquaddieActionMovementEffect =
    | ActorChosenMovement
    | ActorChosenSpecialTraversalMovement
    | TeleportToActorChosenMovement
    | ForcedTowardActorMovement

const traversalInfoSchema = z.object({
    minimumRange: z.number().optional(),
    maximumRange: z.number().optional(),
    actionPointsOfMovement: z.number().optional(),
})

const traversalSchema = z.object({
    skipOverPits: z.boolean().optional(),
    moveThroughWalls: z.boolean().optional(),
    stopOnSquaddies: z.boolean().optional(),
    reduceMoveCosts: z.boolean().optional(),
    squaddieMovementSpecialTraversalInfo: traversalInfoSchema.optional(),
})

export const movementEffectSchema = z.discriminatedUnion("movementType", [
    z.object({
        movementType: z.literal(MovementEffectType.ACTOR_CHOSEN),
    }),
    z.object({
        movementType: z.literal(
            MovementEffectType.ACTOR_CHOSEN_SPECIAL_TRAVERSAL
        ),
        traversal: traversalSchema,
    }),
    z.object({
        movementType: z.literal(MovementEffectType.TELEPORT_TO_ACTOR_CHOSEN),
        destinationRange: z.enum(ActionRange).optional(),
    }),
    z.object({
        movementType: z.literal(MovementEffectType.FORCED_TOWARD_ACTOR),
        forcedDistance: z.number(),
    }),
])

export type SerializedMovementEffect = z.infer<typeof movementEffectSchema>
