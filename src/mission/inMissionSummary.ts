import {
    type InBattleSquaddieCollection,
    InBattleSquaddieCollectionService,
    type SerializedInBattleSquaddieCollection,
} from "../squaddie/inBattle/inBattleSquaddieCollection"
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
    inBattleSquaddieCollection: InBattleSquaddieCollection
}

export type SerializedInMissionSummary = Omit<
    InMissionSummary,
    "inBattleSquaddieCollection"
> & {
    inBattleSquaddieCollection: SerializedInBattleSquaddieCollection
}

export const InMissionSummaryService = {
    new: ({
        missionObjectives,
        inBattleSquaddieCollection,
    }: {
        missionObjectives?: MissionObjectiveSummary[]
        inBattleSquaddieCollection?: InBattleSquaddieCollection
    }): InMissionSummary => {
        return {
            missionObjectives: missionObjectives ?? [],
            inBattleSquaddieCollection:
                inBattleSquaddieCollection ??
                InBattleSquaddieCollectionService.new(),
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
            inBattleSquaddieManager.cloneCollection()

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
        const serializedCollection =
            InBattleSquaddieCollectionService.serialize(
                InMissionSummary.inBattleSquaddieCollection
            )
        inBattleSquaddieManager.loadCollectionFromJSON(serializedCollection)

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

    serialize: (
        inMissionSummary: InMissionSummary
    ): SerializedInMissionSummary => {
        return {
            missionObjectives: inMissionSummary.missionObjectives,
            inBattleSquaddieCollection:
                InBattleSquaddieCollectionService.serialize(
                    inMissionSummary.inBattleSquaddieCollection
                ),
        }
    },

    deserialize: (
        serializable: SerializedInMissionSummary
    ): InMissionSummary => {
        return {
            missionObjectives: serializable.missionObjectives,
            inBattleSquaddieCollection:
                InBattleSquaddieCollectionService.deserialize(
                    serializable.inBattleSquaddieCollection
                ),
        }
    },
}
