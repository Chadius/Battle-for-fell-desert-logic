import type { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager.js"
import type { BattleSquaddieId } from "../squaddie/inBattle/battleSquaddieId.js"
import {
    type AllSquaddiesDefeatedCriteria,
    type MissionObjectiveCriteria,
    type MissionObjectiveCriteriaContext,
    MissionObjectiveCriteriaService,
    MissionObjectiveCriteriaType,
    type PhaseReachedCriteria,
    type SpecificSquaddiesDefeatedCriteria,
    type SpecificSquaddiesInjuredCriteria,
    type TMissionObjectiveCriteriaType,
} from "./missionObjectiveCriteria.js"
import type { TMissionObjectiveRewardType } from "./missionObjectiveReward.js"
import {
    type MissionObjective,
    MissionObjectiveService,
} from "./missionObjective.js"
import type { MissionTurn, TMissionAffiliationTurn } from "./missionTurn.js"

export interface SquaddieDefeatStatus {
    battleSquaddieId: BattleSquaddieId
    isDefeated: boolean
}

export interface AllSquaddiesDefeatedProgress {
    type: typeof MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED
    squaddies: SquaddieDefeatStatus[]
    defeatedCount: number
    remainingCount: number
}

export interface SpecificSquaddiesInjuredProgress {
    type: typeof MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_INJURED
    squaddies: SquaddieDefeatStatus[]
}

export interface SpecificSquaddiesDefeatedProgress {
    type: typeof MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_DEFEATED
    squaddies: SquaddieDefeatStatus[]
}

export interface PhaseReachedProgress {
    type: typeof MissionObjectiveCriteriaType.PHASE_REACHED
    turnCount: number
    missionAffiliationTurn: TMissionAffiliationTurn
    turnsRemaining: number
}

export interface ArmyLeaderDefeatedProgress {
    type: typeof MissionObjectiveCriteriaType.ARMY_LEADER_DEFEATED
    leader: SquaddieDefeatStatus
}

export type MissionObjectiveCriteriaProgress =
    | AllSquaddiesDefeatedProgress
    | SpecificSquaddiesInjuredProgress
    | SpecificSquaddiesDefeatedProgress
    | PhaseReachedProgress
    | ArmyLeaderDefeatedProgress

export interface MissionObjectiveCriteriaStatus {
    type: TMissionObjectiveCriteriaType
    isSatisfied: boolean
    progress?: MissionObjectiveCriteriaProgress
}

export interface MissionObjectiveStatus {
    id: string
    hidden: boolean
    isCompleted: boolean
    hasGivenReward: boolean
    rewardTypes: TMissionObjectiveRewardType[]
    criteria: MissionObjectiveCriteriaStatus[]
}

export const MissionObjectiveProgressService = {
    calculateObjectiveStatus: ({
        objective,
        inBattleSquaddieManager,
        context,
    }: {
        objective: MissionObjective
        inBattleSquaddieManager: InBattleSquaddieManager
        context?: MissionObjectiveCriteriaContext
    }): MissionObjectiveStatus => ({
        id: objective.id,
        hidden: objective.hidden ?? false,
        isCompleted: MissionObjectiveService.isComplete(
            objective,
            inBattleSquaddieManager,
            context
        ),
        hasGivenReward: objective.hasGivenReward,
        rewardTypes: objective.rewards.map((reward) => reward.type),
        criteria: objective.criteria.map((criteria) =>
            calculateCriteriaStatus(criteria, inBattleSquaddieManager, context)
        ),
    }),

    calculateCriteriaProgress: (
        criteria: MissionObjectiveCriteria,
        inBattleSquaddieManager: InBattleSquaddieManager,
        context?: MissionObjectiveCriteriaContext
    ): MissionObjectiveCriteriaProgress | undefined =>
        calculateCriteriaProgress(criteria, inBattleSquaddieManager, context),
}

const calculateCriteriaStatus = (
    criteria: MissionObjectiveCriteria,
    inBattleSquaddieManager: InBattleSquaddieManager,
    context?: MissionObjectiveCriteriaContext
): MissionObjectiveCriteriaStatus => ({
    type: criteria.type,
    isSatisfied: MissionObjectiveCriteriaService.isSatisfied(
        criteria,
        inBattleSquaddieManager,
        context
    ),
    progress: calculateCriteriaProgress(
        criteria,
        inBattleSquaddieManager,
        context
    ),
})

const calculateCriteriaProgress = (
    criteria: MissionObjectiveCriteria,
    inBattleSquaddieManager: InBattleSquaddieManager,
    context?: MissionObjectiveCriteriaContext
): MissionObjectiveCriteriaProgress | undefined => {
    switch (criteria.type) {
        case MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED:
            return calculateAllSquaddiesDefeatedProgress(
                criteria,
                inBattleSquaddieManager
            )
        case MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_INJURED:
        case MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_DEFEATED:
            return calculateSpecificSquaddiesProgress(
                criteria,
                inBattleSquaddieManager
            )
        case MissionObjectiveCriteriaType.PHASE_REACHED:
            return calculatePhaseReachedProgress(criteria, context?.missionTurn)
        case MissionObjectiveCriteriaType.ARMY_LEADER_DEFEATED:
            return calculateArmyLeaderDefeatedProgress(
                inBattleSquaddieManager,
                context
            )
    }
}

const getSquaddieDefeatStatus = (
    battleSquaddieId: BattleSquaddieId,
    inBattleSquaddieManager: InBattleSquaddieManager
): SquaddieDefeatStatus => ({
    battleSquaddieId,
    isDefeated: inBattleSquaddieManager.isSquaddieDefeated(battleSquaddieId),
})

const getSelectedSquaddieDefeatStatuses = (
    criteria:
        | AllSquaddiesDefeatedCriteria
        | SpecificSquaddiesInjuredCriteria
        | SpecificSquaddiesDefeatedCriteria,
    inBattleSquaddieManager: InBattleSquaddieManager
): SquaddieDefeatStatus[] =>
    MissionObjectiveCriteriaService.getBattleSquaddieIdsSelectedByCriteria(
        criteria,
        inBattleSquaddieManager
    ).map((battleSquaddieId) =>
        getSquaddieDefeatStatus(battleSquaddieId, inBattleSquaddieManager)
    )

const calculateAllSquaddiesDefeatedProgress = (
    criteria: AllSquaddiesDefeatedCriteria,
    inBattleSquaddieManager: InBattleSquaddieManager
): AllSquaddiesDefeatedProgress => {
    const squaddies = getSelectedSquaddieDefeatStatuses(
        criteria,
        inBattleSquaddieManager
    )
    const defeatedCount = squaddies.filter(
        (squaddie) => squaddie.isDefeated
    ).length
    return {
        type: criteria.type,
        squaddies,
        defeatedCount,
        remainingCount: squaddies.length - defeatedCount,
    }
}

const calculateSpecificSquaddiesProgress = (
    criteria:
        | SpecificSquaddiesInjuredCriteria
        | SpecificSquaddiesDefeatedCriteria,
    inBattleSquaddieManager: InBattleSquaddieManager
): SpecificSquaddiesInjuredProgress | SpecificSquaddiesDefeatedProgress => ({
    type: criteria.type,
    squaddies: getSelectedSquaddieDefeatStatuses(
        criteria,
        inBattleSquaddieManager
    ),
})

const calculatePhaseReachedProgress = (
    criteria: PhaseReachedCriteria,
    missionTurn?: MissionTurn
): PhaseReachedProgress | undefined => {
    if (missionTurn == undefined) return undefined

    return {
        type: criteria.type,
        turnCount: criteria.turnCount,
        missionAffiliationTurn: criteria.missionAffiliationTurn,
        turnsRemaining: Math.max(0, criteria.turnCount - missionTurn.turnCount),
    }
}

const calculateArmyLeaderDefeatedProgress = (
    inBattleSquaddieManager: InBattleSquaddieManager,
    context?: MissionObjectiveCriteriaContext
): ArmyLeaderDefeatedProgress | undefined => {
    const leaderBattleSquaddieId =
        MissionObjectiveCriteriaService.getArmyLeaderBattleSquaddieId(
            inBattleSquaddieManager,
            context?.army
        )
    if (leaderBattleSquaddieId == undefined) return undefined

    return {
        type: MissionObjectiveCriteriaType.ARMY_LEADER_DEFEATED,
        leader: getSquaddieDefeatStatus(
            leaderBattleSquaddieId,
            inBattleSquaddieManager
        ),
    }
}
