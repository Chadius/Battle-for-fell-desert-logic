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
    mapId: string
    mapName: string
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
        mapId,
        mapName,
        missionObjectives,
        inBattleSquaddieCollection,
        recentPhaseTransitions,
    }: {
        mapId?: string
        mapName?: string
        missionObjectives?: MissionObjectiveSummary[]
        inBattleSquaddieCollection?: InBattleSquaddieCollection
        recentPhaseTransitions?: TMissionAffiliationTurn[]
    }): InMissionSummary => {
        return {
            mapId: mapId ?? "",
            mapName: mapName ?? "",
            missionObjectives: missionObjectives ?? [],
            inBattleSquaddieCollection:
                inBattleSquaddieCollection ??
                InBattleSquaddieCollectionService.new(),
            recentPhaseTransitions: recentPhaseTransitions ?? [],
        }
    },

    createFromMission: ({
        mapId,
        mapName,
        missionObjectives,
        inBattleSquaddieManager,
        recentPhaseTransitions,
        revealHiddenObjectives = false,
    }: {
        mapId?: string
        mapName?: string
        missionObjectives: MissionObjective[]
        inBattleSquaddieManager: InBattleSquaddieManager
        recentPhaseTransitions?: TMissionAffiliationTurn[]
        revealHiddenObjectives?: boolean
    }): InMissionSummary => {
        const missionObjectiveSummaries: MissionObjectiveSummary[] =
            missionObjectives
                .filter(
                    (missionObjective) =>
                        !missionObjective.hidden || revealHiddenObjectives
                )
                .map((missionObjective) => ({
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
            mapId,
            mapName,
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
        inBattleSquaddieManager.addFromJson(serializedCollection)

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
            mapId: inMissionSummary.mapId,
            mapName: inMissionSummary.mapName,
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
            mapId: serializable.mapId ?? "",
            mapName: serializable.mapName ?? "",
            missionObjectives: serializable.missionObjectives,
            inBattleSquaddieCollection:
                InBattleSquaddieCollectionService.deserialize(
                    serializable.inBattleSquaddieCollection
                ),
            recentPhaseTransitions: serializable.recentPhaseTransitions ?? [],
        }
    },
}
