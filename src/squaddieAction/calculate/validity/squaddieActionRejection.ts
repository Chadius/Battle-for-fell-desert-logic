import type { EnumLike } from "../../../enum.js"

export interface SquaddieActionOnCooldownRejection {
    reason: typeof SquaddieActionRejectionReason.ON_COOLDOWN
    turnsRemaining: number
}

export interface SquaddieActionUsesPerTurnExhaustedRejection {
    reason: typeof SquaddieActionRejectionReason.USES_PER_TURN_EXHAUSTED
    usesThisTurn: number
    usesPerTurn: number
}

export interface SquaddieActionUsesPerMissionExhaustedRejection {
    reason: typeof SquaddieActionRejectionReason.USES_PER_MISSION_EXHAUSTED
    usesThisMission: number
    usesPerMission: number
}

export interface SquaddieActionNotEnoughActionPointsRejection {
    reason: typeof SquaddieActionRejectionReason.NOT_ENOUGH_ACTION_POINTS
    actionPointsNeeded: number
    actionPointsRemaining: number
}

export interface SquaddieActionRejectionWithoutDetails {
    reason: Exclude<
        TSquaddieActionRejectionReason,
        | typeof SquaddieActionRejectionReason.ON_COOLDOWN
        | typeof SquaddieActionRejectionReason.USES_PER_TURN_EXHAUSTED
        | typeof SquaddieActionRejectionReason.USES_PER_MISSION_EXHAUSTED
        | typeof SquaddieActionRejectionReason.NOT_ENOUGH_ACTION_POINTS
    >
}

/**
 * Why an action cannot be used. Logic sends only the code and the numbers the
 * code needs; the host writes the wording.
 */
export type SquaddieActionRejection =
    | SquaddieActionOnCooldownRejection
    | SquaddieActionUsesPerTurnExhaustedRejection
    | SquaddieActionUsesPerMissionExhaustedRejection
    | SquaddieActionNotEnoughActionPointsRejection
    | SquaddieActionRejectionWithoutDetails

export const SquaddieActionRejectionReason = {
    ON_COOLDOWN: "ON_COOLDOWN",
    USES_PER_TURN_EXHAUSTED: "USES_PER_TURN_EXHAUSTED",
    USES_PER_MISSION_EXHAUSTED: "USES_PER_MISSION_EXHAUSTED",
    NOT_ENOUGH_ACTION_POINTS: "NOT_ENOUGH_ACTION_POINTS",
    CANNOT_ACT: "CANNOT_ACT",
    DESTINATION_REQUIRED: "DESTINATION_REQUIRED",
    ACTOR_HAS_NO_POSITION: "ACTOR_HAS_NO_POSITION",
    DESTINATION_TOO_FAR: "DESTINATION_TOO_FAR",
    DESTINATION_TOO_CLOSE: "DESTINATION_TOO_CLOSE",
    DESTINATION_BLOCKED: "DESTINATION_BLOCKED",
    DESTINATION_OUT_OF_RANGE: "DESTINATION_OUT_OF_RANGE",
    DESTINATION_NOT_VISIBLE: "DESTINATION_NOT_VISIBLE",
    NO_VALID_MOVEMENT_DESTINATIONS: "NO_VALID_MOVEMENT_DESTINATIONS",
    NO_TARGETS_IN_RANGE: "NO_TARGETS_IN_RANGE",
    NO_TARGETS_CAN_BE_AFFECTED: "NO_TARGETS_CAN_BE_AFFECTED",
    TARGET_AFFILIATION_NOT_ALLOWED: "TARGET_AFFILIATION_NOT_ALLOWED",
    TARGETS_OUT_OF_RANGE: "TARGETS_OUT_OF_RANGE",
    TARGETS_NOT_VISIBLE: "TARGETS_NOT_VISIBLE",
    TARGET_COORDINATE_REQUIRED: "TARGET_COORDINATE_REQUIRED",
    TARGET_COORDINATE_OUT_OF_RANGE: "TARGET_COORDINATE_OUT_OF_RANGE",
    TARGET_COORDINATE_HAS_NO_TARGET: "TARGET_COORDINATE_HAS_NO_TARGET",
    NO_TARGETS_IN_AREA: "NO_TARGETS_IN_AREA",
} as const satisfies Record<string, string>
export type TSquaddieActionRejectionReason = EnumLike<
    typeof SquaddieActionRejectionReason
>
