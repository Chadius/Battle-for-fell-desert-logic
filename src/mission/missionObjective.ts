import type { MissionObjectiveReward } from "./missionObjectiveReward"
import { MissionObjectiveRewardService } from "./missionObjectiveReward"
import type { MissionObjectiveCriteria } from "./missionObjectiveCriteria"
import { MissionObjectiveCriteriaService } from "./missionObjectiveCriteria"
import type { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"

export interface MissionObjective {
    id: string
    rewards: MissionObjectiveReward[]
    hasGivenReward: boolean
    criteria: MissionObjectiveCriteria[]
}

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
        inBattleSquaddieManager: InBattleSquaddieManager
    ): boolean => {
        return objective.criteria.every((criterion) =>
            MissionObjectiveCriteriaService.isSatisfied(
                criterion,
                inBattleSquaddieManager
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
        inBattleSquaddieManager: InBattleSquaddieManager
    ): MissionObjective[] => {
        return objectives.filter((objective) => {
            const isComplete = MissionObjectiveService.isComplete(
                objective,
                inBattleSquaddieManager
            )
            const hasNotGivenReward = !objective.hasGivenReward
            return isComplete && hasNotGivenReward
        })
    },
}
