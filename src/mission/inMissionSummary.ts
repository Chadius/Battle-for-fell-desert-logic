import { type SerializableInBattleSquaddieCollection } from "../squaddie/inBattle/inBattleSquaddieCollection"
import type { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import type { MissionObjective } from "./missionObjective"
import { MissionObjectiveService } from "./missionObjective"

export interface MissionObjectiveSummary {
    id: string
    isCompleted: boolean
    hasGivenReward: boolean
}

export interface InMissionSummary {
    missionObjectives: MissionObjectiveSummary[]
    inBattleSquaddieCollection: SerializableInBattleSquaddieCollection
}

export const InMissionSummaryService = {
    new: ({
        missionObjectives,
        inBattleSquaddieCollection,
    }: {
        missionObjectives?: MissionObjectiveSummary[]
        inBattleSquaddieCollection?: SerializableInBattleSquaddieCollection
    }): InMissionSummary => {
        return {
            missionObjectives: missionObjectives ?? [],
            inBattleSquaddieCollection: inBattleSquaddieCollection ?? {
                byOutOfBattleSquaddieId: {},
            },
        }
    },

    createFromMission: ({
        missionObjectives,
        inBattleSquaddieManager,
    }: {
        missionObjectives: MissionObjective[]
        inBattleSquaddieManager: InBattleSquaddieManager
    }): InMissionSummary => {
        const missionObjectiveSummaries: MissionObjectiveSummary[] =
            missionObjectives.map((missionObjective) => ({
                id: missionObjective.id,
                isCompleted: MissionObjectiveService.isComplete(
                    missionObjective,
                    inBattleSquaddieManager
                ),
                hasGivenReward: missionObjective.hasGivenReward,
            }))

        const inBattleSquaddieCollection =
            inBattleSquaddieManager.serializeCollection()

        return InMissionSummaryService.new({
            missionObjectives: missionObjectiveSummaries,
            inBattleSquaddieCollection,
        })
    },

    applyToMission: ({
        InMissionSummary,
        missionObjectives,
        inBattleSquaddieManager,
    }: {
        InMissionSummary: InMissionSummary
        missionObjectives: MissionObjective[]
        inBattleSquaddieManager: InBattleSquaddieManager
    }): MissionObjective[] => {
        inBattleSquaddieManager.loadCollectionFromJSON(
            InMissionSummary.inBattleSquaddieCollection
        )

        return missionObjectives.map((missionObjective) => {
            const savedState = InMissionSummary.missionObjectives.find(
                (missionObjectiveSummary) =>
                    missionObjectiveSummary.id === missionObjective.id
            )
            if (savedState == undefined) {
                return missionObjective
            }

            if (savedState.hasGivenReward && !missionObjective.hasGivenReward) {
                return MissionObjectiveService.markRewardAsGiven(
                    missionObjective
                )
            }
            return missionObjective
        })
    },
}
