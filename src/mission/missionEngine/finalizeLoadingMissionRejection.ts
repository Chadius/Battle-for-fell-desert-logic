import type { EnumLike } from "../../enum.js"

/**
 * Why `MissionEngine.finalizeLoadingMission` refused to start a mission whose
 * files loaded correctly. Logic sends only the code; the host writes the
 * wording.
 */
export interface FinalizeLoadingMissionRejection {
    reason: TFinalizeLoadingMissionRejectionReason
}

export type FinalizeLoadingMissionResult =
    | { isValid: true }
    | { isValid: false; missionFileErrors: string[] }
    | { isValid: false; rejection: FinalizeLoadingMissionRejection }

export const FinalizeLoadingMissionRejectionReason = {
    NO_PLAYER_SQUADDIE_CAN_DEPLOY: "NO_PLAYER_SQUADDIE_CAN_DEPLOY",
} as const satisfies Record<string, string>
export type TFinalizeLoadingMissionRejectionReason = EnumLike<
    typeof FinalizeLoadingMissionRejectionReason
>
