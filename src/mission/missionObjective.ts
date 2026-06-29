import { z } from "zod"
import type { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import {
    type MissionObjectiveCriteria,
    type MissionObjectiveCriteriaContext,
    missionObjectiveCriteriaSchema,
    MissionObjectiveCriteriaService,
    type SerializedMissionObjectiveCriteria,
} from "./missionObjectiveCriteria"
import {
    type MissionObjectiveReward,
    missionObjectiveRewardSchema,
    MissionObjectiveRewardService,
    type SerializedMissionObjectiveReward,
} from "./missionObjectiveReward"

export interface MissionObjective {
    id: string
    rewards: MissionObjectiveReward[]
    hasGivenReward: boolean
    criteria: MissionObjectiveCriteria[]
}

export const missionObjectiveSchema = z.object({
    id: z.string().min(1),
    rewards: z.array(missionObjectiveRewardSchema),
    criteria: z.array(missionObjectiveCriteriaSchema),
    hasGivenReward: z.boolean(),
})

export type SerializedMissionObjective = z.infer<typeof missionObjectiveSchema>

export const MissionObjectiveService = {
    new: ({
        id,
        rewards,
        criteria,
        hasGivenReward = false,
    }: {
        id: string
        rewards: MissionObjectiveReward[]
        criteria: MissionObjectiveCriteria[]
        hasGivenReward?: boolean
    }): MissionObjective => {
        if (id == undefined || id === "") {
            throw new Error(
                "[MissionObjectiveService.new]: id must be a non-empty string"
            )
        }

        if (rewards == undefined || rewards.length === 0) {
            throw new Error(
                "[MissionObjectiveService.new]: rewards must have at least 1 reward"
            )
        }

        if (criteria == undefined || criteria.length === 0) {
            throw new Error(
                "[MissionObjectiveService.new]: criteria must have at least 1 criterion"
            )
        }

        return {
            id,
            rewards: [...rewards],
            hasGivenReward,
            criteria: [...criteria],
        }
    },

    serialize: (objective: MissionObjective): SerializedMissionObjective => {
        return {
            id: objective.id,
            rewards: objective.rewards.map(
                (r: MissionObjectiveReward): SerializedMissionObjectiveReward =>
                    MissionObjectiveRewardService.serialize(r)
            ),
            criteria: objective.criteria.map(
                (
                    c: MissionObjectiveCriteria
                ): SerializedMissionObjectiveCriteria =>
                    MissionObjectiveCriteriaService.serialize(c)
            ),
            hasGivenReward: objective.hasGivenReward,
        }
    },

    createFromJSON: (data: {
        id: string
        rewards: any[]
        criteria: any[]
        hasGivenReward?: boolean
    }): MissionObjective => {
        const deserializedRewards = data.rewards.map((reward) =>
            MissionObjectiveRewardService.createFromJSON(reward)
        )

        const deserializedCriteria = data.criteria.map((criterion) =>
            MissionObjectiveCriteriaService.createFromJSON(criterion)
        )

        return MissionObjectiveService.new({
            id: data.id,
            rewards: deserializedRewards,
            criteria: deserializedCriteria,
            hasGivenReward: data.hasGivenReward,
        })
    },

    isComplete: (
        objective: MissionObjective,
        inBattleSquaddieManager: InBattleSquaddieManager,
        context?: MissionObjectiveCriteriaContext
    ): boolean => {
        return objective.criteria.every((criterion) =>
            MissionObjectiveCriteriaService.isSatisfied(
                criterion,
                inBattleSquaddieManager,
                context
            )
        )
    },

    hasGivenReward: (objective: MissionObjective): boolean => {
        return objective.hasGivenReward
    },

    markRewardAsGiven: (objective: MissionObjective): MissionObjective => {
        return {
            ...objective,
            rewards: [...objective.rewards],
            criteria: [...objective.criteria],
            hasGivenReward: true,
        }
    },

    getCompletedObjectivesWithoutReward: (
        objectives: MissionObjective[],
        inBattleSquaddieManager: InBattleSquaddieManager,
        context?: MissionObjectiveCriteriaContext
    ): MissionObjective[] => {
        return objectives.filter((objective) => {
            const isComplete = MissionObjectiveService.isComplete(
                objective,
                inBattleSquaddieManager,
                context
            )
            const hasNotGivenReward = !objective.hasGivenReward
            return isComplete && hasNotGivenReward
        })
    },
}
