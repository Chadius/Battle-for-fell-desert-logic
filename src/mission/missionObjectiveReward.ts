import type { EnumLike } from "../enum"

export const MissionObjectiveRewardType = {
    DIALOGUE: "DIALOGUE",
    NEXT_MISSIONS: "NEXT_MISSIONS",
    MISSION_ENDS: "MISSION_ENDS",
    MISSION_FAILURE: "MISSION_FAILURE",
} as const satisfies Record<string, string>

export type TMissionObjectiveRewardType = EnumLike<
    typeof MissionObjectiveRewardType
>

export interface DialogueReward {
    type: typeof MissionObjectiveRewardType.DIALOGUE
    dialogueIds: string[]
}

export interface NextMissionsReward {
    type: typeof MissionObjectiveRewardType.NEXT_MISSIONS
    missionIds: string[]
}

export interface MissionEndsReward {
    type: typeof MissionObjectiveRewardType.MISSION_ENDS
}

export interface MissionFailureReward {
    type: typeof MissionObjectiveRewardType.MISSION_FAILURE
}

export type MissionObjectiveReward =
    | DialogueReward
    | NextMissionsReward
    | MissionEndsReward
    | MissionFailureReward

export const MissionObjectiveRewardService = {
    newDialogueReward: (dialogueIds: string[]): DialogueReward => {
        if (dialogueIds == undefined || dialogueIds.length === 0) {
            throw new Error(
                "[MissionObjectiveRewardService.newDialogueReward]: dialogueIds must have at least 1 id"
            )
        }

        return {
            type: MissionObjectiveRewardType.DIALOGUE,
            dialogueIds: [...dialogueIds],
        }
    },

    newNextMissionsReward: (missionIds: string[]): NextMissionsReward => {
        return {
            type: MissionObjectiveRewardType.NEXT_MISSIONS,
            missionIds: [...missionIds],
        }
    },

    newMissionEndsReward: (): MissionEndsReward => {
        return {
            type: MissionObjectiveRewardType.MISSION_ENDS,
        }
    },
    newMissionFailureReward: (): MissionFailureReward => {
        return {
            type: MissionObjectiveRewardType.MISSION_FAILURE,
        }
    },
    createFromJSON: (data: {
        type: string
        dialogueIds?: string[]
        missionIds?: string[]
    }): MissionObjectiveReward => {
        if (data.type === MissionObjectiveRewardType.DIALOGUE) {
            return MissionObjectiveRewardService.newDialogueReward(
                data.dialogueIds!
            )
        }

        if (data.type === MissionObjectiveRewardType.NEXT_MISSIONS) {
            return MissionObjectiveRewardService.newNextMissionsReward(
                data.missionIds!
            )
        }

        if (data.type === MissionObjectiveRewardType.MISSION_ENDS) {
            return MissionObjectiveRewardService.newMissionEndsReward()
        }

        if (data.type === MissionObjectiveRewardType.MISSION_FAILURE) {
            return MissionObjectiveRewardService.newMissionEndsReward()
        }

        throw new Error(
            `[MissionObjectiveRewardService.createFromJSON]: invalid reward type: ${data.type}`
        )
    },
}
