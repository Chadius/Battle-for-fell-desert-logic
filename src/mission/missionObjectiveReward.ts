import { z } from "zod"
import type { EnumLike } from "../enum.js"
import {
    ChallengeModifierType,
    type TChallengeModifierType,
} from "../squaddieAction/calculate/challengeModifier/challengeModifierSetting.js"

export const MissionObjectiveRewardType = {
    NEXT_MISSIONS: "NEXT_MISSIONS",
    MISSION_ENDS: "MISSION_ENDS",
    MISSION_FAILURE: "MISSION_FAILURE",
    PLAY_MOVIE: "PLAY_MOVIE",
    SET_CHALLENGE_MODIFIER: "SET_CHALLENGE_MODIFIER",
} as const satisfies Record<string, string>

export type TMissionObjectiveRewardType = EnumLike<
    typeof MissionObjectiveRewardType
>

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
    | NextMissionsReward
    | MissionEndsReward
    | MissionFailureReward
    | PlayMovieReward
    | SetChallengeModifierReward

export const missionObjectiveRewardSchema = z.discriminatedUnion("type", [
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

interface MissionObjectiveRewardJSON {
    type: string
    missionIds?: string[]
    movieId?: string
    challengeModifierType?: string
    value?: boolean
}

const nextMissionsRewardFromJSON = (
    data: MissionObjectiveRewardJSON
): NextMissionsReward =>
    MissionObjectiveRewardService.newNextMissionsReward(data.missionIds!)

const playMovieRewardFromJSON = (
    data: MissionObjectiveRewardJSON
): PlayMovieReward => {
    if (data.movieId === undefined)
        throw new Error(
            `[MissionObjectiveRewardService.createFromJSON]: movieId is required for PLAY_MOVIE reward`
        )
    return MissionObjectiveRewardService.newPlayMovieReward(data.movieId)
}

const setChallengeModifierRewardFromJSON = (
    data: MissionObjectiveRewardJSON
): SetChallengeModifierReward => {
    if (data.challengeModifierType === undefined)
        throw new Error(
            `[MissionObjectiveRewardService.createFromJSON]: challengeModifierType is required for SET_CHALLENGE_MODIFIER reward`
        )
    if (data.value === undefined)
        throw new Error(
            `[MissionObjectiveRewardService.createFromJSON]: value is required for SET_CHALLENGE_MODIFIER reward`
        )
    if (
        !Object.values(ChallengeModifierType).includes(
            data.challengeModifierType as TChallengeModifierType
        )
    )
        throw new Error(
            `[MissionObjectiveRewardService.createFromJSON]: '${data.challengeModifierType}' is not a valid challengeModifierType`
        )
    return MissionObjectiveRewardService.newSetChallengeModifierReward(
        data.challengeModifierType as TChallengeModifierType,
        data.value
    )
}

export const MissionObjectiveRewardService = {
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

    createFromJSON: (
        data: MissionObjectiveRewardJSON
    ): MissionObjectiveReward => {
        if (data.type === MissionObjectiveRewardType.NEXT_MISSIONS) {
            return nextMissionsRewardFromJSON(data)
        }

        if (data.type === MissionObjectiveRewardType.MISSION_ENDS) {
            return MissionObjectiveRewardService.newMissionEndsReward()
        }

        if (data.type === MissionObjectiveRewardType.MISSION_FAILURE) {
            return MissionObjectiveRewardService.newMissionFailureReward()
        }

        if (data.type === MissionObjectiveRewardType.PLAY_MOVIE) {
            return playMovieRewardFromJSON(data)
        }

        if (data.type === MissionObjectiveRewardType.SET_CHALLENGE_MODIFIER) {
            return setChallengeModifierRewardFromJSON(data)
        }

        throw new Error(
            `[MissionObjectiveRewardService.createFromJSON]: invalid reward type: ${data.type}`
        )
    },
}
