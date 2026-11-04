import type { EnumLike } from "../../enum.js"
import type { BattleSquaddieId } from "../../squaddie/inBattle/inBattleSquaddie.js"
import type { SquaddieActionRejection } from "../../squaddieAction/calculate/validity/squaddieActionRejection.js"

export interface ReadyActionAnotherSquaddieHasReadiedActionRejection {
    reason: typeof ReadyActionRejectionReason.ANOTHER_SQUADDIE_HAS_READIED_ACTION
    squaddieWithReadiedAction: BattleSquaddieId
}

export interface ReadyActionAnotherSquaddieIsMidTurnRejection {
    reason: typeof ReadyActionRejectionReason.ANOTHER_SQUADDIE_IS_MID_TURN
    squaddieMidTurn: BattleSquaddieId
}

export interface ReadyActionRejectionWithoutDetails {
    reason: Exclude<
        TReadyActionRejectionReason,
        | typeof ReadyActionRejectionReason.ANOTHER_SQUADDIE_HAS_READIED_ACTION
        | typeof ReadyActionRejectionReason.ANOTHER_SQUADDIE_IS_MID_TURN
    >
}

/**
 * Why `MissionEngine.readyAction` refused. Either the mission is not ready
 * for this squaddie to act, or the action itself is invalid. Logic sends only
 * the code and the details the code needs; the host writes the wording.
 */
export type ReadyActionRejection =
    | ReadyActionAnotherSquaddieHasReadiedActionRejection
    | ReadyActionAnotherSquaddieIsMidTurnRejection
    | ReadyActionRejectionWithoutDetails
    | SquaddieActionRejection

export type ReadyActionResult =
    | { isValid: true }
    | { isValid: false; rejection: ReadyActionRejection }

export const ReadyActionRejectionReason = {
    MOVIE_PLAYING: "MOVIE_PLAYING",
    CAMPAIGN_SQUADDIE_DEPLOYMENT_IN_PROGRESS:
        "CAMPAIGN_SQUADDIE_DEPLOYMENT_IN_PROGRESS",
    NOT_SQUADDIE_TURN: "NOT_SQUADDIE_TURN",
    AI_CONTROLLED: "AI_CONTROLLED",
    ANOTHER_SQUADDIE_HAS_READIED_ACTION: "ANOTHER_SQUADDIE_HAS_READIED_ACTION",
    ANOTHER_SQUADDIE_IS_MID_TURN: "ANOTHER_SQUADDIE_IS_MID_TURN",
} as const satisfies Record<string, string>
export type TReadyActionRejectionReason = EnumLike<
    typeof ReadyActionRejectionReason
>
