import {
    type InBattleSquaddieCollection,
    InBattleSquaddieCollectionService,
    type SerializedInBattleSquaddieCollection,
} from "../squaddie/inBattle/inBattleSquaddieCollection"
import type { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import type { MissionObjective } from "./missionObjective"
import { MissionObjectiveService } from "./missionObjective"
import type { TMissionAffiliationTurn } from "./missionTurn"

export interface MissionObjectiveSummary {
    id: string
    isCompleted: boolean
    hasGivenReward: boolean
}

export interface InMissionSummary {
    missionObjectives: MissionObjectiveSummary[]
    inBattleSquaddieCollection: InBattleSquaddieCollection
    recentPhaseTransitions: TMissionAffiliationTurn[]
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
        recentPhaseTransitions,
    }: {
        missionObjectives?: MissionObjectiveSummary[]
        inBattleSquaddieCollection?: InBattleSquaddieCollection
        recentPhaseTransitions?: TMissionAffiliationTurn[]
    }): InMissionSummary => {
        return {
            missionObjectives: missionObjectives ?? [],
            inBattleSquaddieCollection:
                inBattleSquaddieCollection ??
                InBattleSquaddieCollectionService.new(),
            recentPhaseTransitions: recentPhaseTransitions ?? [],
        }
    },

    createFromMission: ({
        missionObjectives,
        inBattleSquaddieManager,
        recentPhaseTransitions,
    }: {
        missionObjectives: MissionObjective[]
        inBattleSquaddieManager: InBattleSquaddieManager
        recentPhaseTransitions?: TMissionAffiliationTurn[]
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
            recentPhaseTransitions: recentPhaseTransitions ?? [],
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
            recentPhaseTransitions: inMissionSummary.recentPhaseTransitions,
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
            recentPhaseTransitions: serializable.recentPhaseTransitions ?? [],
        }
    },
}
