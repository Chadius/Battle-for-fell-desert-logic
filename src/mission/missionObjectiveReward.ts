import { z } from "zod"
import type { EnumLike } from "../enum"
import {
    ChallengeModifierType,
    type TChallengeModifierType,
} from "../squaddieAction/calculate/challengeModifier/challengeModifierSetting"

export const MissionObjectiveRewardType = {
    DIALOGUE: "DIALOGUE",
    NEXT_MISSIONS: "NEXT_MISSIONS",
    MISSION_ENDS: "MISSION_ENDS",
    MISSION_FAILURE: "MISSION_FAILURE",
    PLAY_MOVIE: "PLAY_MOVIE",
    SET_CHALLENGE_MODIFIER: "SET_CHALLENGE_MODIFIER",
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

export interface PlayMovieReward {
    type: typeof MissionObjectiveRewardType.PLAY_MOVIE
    movieId: string
}

export interface SetChallengeModifierReward {
    type: typeof MissionObjectiveRewardType.SET_CHALLENGE_MODIFIER
    challengeModifierType: TChallengeModifierType
    value: boolean
}

export type MissionObjectiveReward =
    | DialogueReward
    | NextMissionsReward
    | MissionEndsReward
    | MissionFailureReward
    | PlayMovieReward
    | SetChallengeModifierReward

export const missionObjectiveRewardSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal(MissionObjectiveRewardType.DIALOGUE),
        dialogueIds: z.array(z.string()),
    }),
    z.object({
        type: z.literal(MissionObjectiveRewardType.NEXT_MISSIONS),
        missionIds: z.array(z.string()),
    }),
    z.object({ type: z.literal(MissionObjectiveRewardType.MISSION_ENDS) }),
    z.object({ type: z.literal(MissionObjectiveRewardType.MISSION_FAILURE) }),
    z.object({
        type: z.literal(MissionObjectiveRewardType.PLAY_MOVIE),
        movieId: z.string(),
    }),
    z.object({
        type: z.literal(MissionObjectiveRewardType.SET_CHALLENGE_MODIFIER),
        challengeModifierType: z.enum(ChallengeModifierType),
        value: z.boolean(),
    }),
])

export type SerializedMissionObjectiveReward = z.infer<
    typeof missionObjectiveRewardSchema
>

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

    newPlayMovieReward: (movieId: string): PlayMovieReward => {
        return {
            type: MissionObjectiveRewardType.PLAY_MOVIE,
            movieId,
        }
    },

    newSetChallengeModifierReward: (
        challengeModifierType: TChallengeModifierType,
        value: boolean
    ): SetChallengeModifierReward => {
        return {
            type: MissionObjectiveRewardType.SET_CHALLENGE_MODIFIER,
            challengeModifierType,
            value,
        }
    },
    serialize: (
        reward: MissionObjectiveReward
    ): SerializedMissionObjectiveReward => {
        if (reward.type === MissionObjectiveRewardType.DIALOGUE) {
            return { type: reward.type, dialogueIds: [...reward.dialogueIds] }
        }
        if (reward.type === MissionObjectiveRewardType.NEXT_MISSIONS) {
            return { type: reward.type, missionIds: [...reward.missionIds] }
        }
        if (reward.type === MissionObjectiveRewardType.PLAY_MOVIE) {
            return { type: reward.type, movieId: reward.movieId }
        }
        if (reward.type === MissionObjectiveRewardType.SET_CHALLENGE_MODIFIER) {
            return {
                type: reward.type,
                challengeModifierType: reward.challengeModifierType,
                value: reward.value,
            }
        }
        return { type: reward.type }
    },

    createFromJSON: (data: {
        type: string
        dialogueIds?: string[]
        missionIds?: string[]
        movieId?: string
        challengeModifierType?: string
        value?: boolean
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
            return MissionObjectiveRewardService.newMissionFailureReward()
        }

        if (data.type === MissionObjectiveRewardType.PLAY_MOVIE) {
            if (data.movieId === undefined)
                throw new Error(
                    `[MissionObjectiveRewardService.createFromJSON]: movieId is required for PLAY_MOVIE reward`
                )
            return MissionObjectiveRewardService.newPlayMovieReward(
                data.movieId
            )
        }

        if (data.type === MissionObjectiveRewardType.SET_CHALLENGE_MODIFIER) {
            if (data.challengeModifierType === undefined)
                throw new Error(
                    `[MissionObjectiveRewardService.createFromJSON]: challengeModifierType is required for SET_CHALLENGE_MODIFIER reward`
                )
            if (data.value === undefined)
                throw new Error(
                    `[MissionObjectiveRewardService.createFromJSON]: value is required for SET_CHALLENGE_MODIFIER reward`
                )
            return MissionObjectiveRewardService.newSetChallengeModifierReward(
                data.challengeModifierType as TChallengeModifierType,
                data.value
            )
        }

        throw new Error(
            `[MissionObjectiveRewardService.createFromJSON]: invalid reward type: ${data.type}`
        )
    },
}
