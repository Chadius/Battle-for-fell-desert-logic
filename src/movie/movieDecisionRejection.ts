import type { EnumLike } from "../enum.js"

/**
 * Why a movie decision was refused. Logic sends only the code; the host
 * writes the wording, or treats the refusal as its own bug.
 */
export interface MovieDecisionRejection {
    reason: TMovieDecisionRejectionReason
}

export type MovieDecisionResult =
    | { isValid: true }
    | { isValid: false; rejection: MovieDecisionRejection }

export const MovieDecisionRejectionReason = {
    NO_MOVIE_PLAYING: "NO_MOVIE_PLAYING",
    SCENE_IS_NOT_A_CONVERSATION: "SCENE_IS_NOT_A_CONVERSATION",
    LINE_IS_NOT_A_DECISION: "LINE_IS_NOT_A_DECISION",
    UNKNOWN_DECISION_ID: "UNKNOWN_DECISION_ID",
} as const satisfies Record<string, string>
export type TMovieDecisionRejectionReason = EnumLike<
    typeof MovieDecisionRejectionReason
>
