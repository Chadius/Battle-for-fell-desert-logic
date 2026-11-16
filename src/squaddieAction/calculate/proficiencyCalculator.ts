import type { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager.js"
import type { SquaddieAction } from "../squaddieAction.js"
import {
    ProficiencyLevelConst,
    ProficiencyType,
} from "../../proficiency/proficiencyLevel.js"
import {
    SquaddieConditionService,
    SquaddieConditionType,
} from "../../proficiency/squaddieCondition.js"
import type { BattleSquaddieId } from "../../squaddie/inBattle/battleSquaddieId.js"

const FLANKING_DEFENSE_PENALTY = 1

export const ProficiencyCalculator = {
    getActorProficiencyBonus: ({
        actor,
        squaddieAction,
        inBattleSquaddieManager,
    }: {
        actor: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
        squaddieAction: SquaddieAction
        inBattleSquaddieManager: InBattleSquaddieManager
    }): number => {
        return inBattleSquaddieManager.getProficiencyBonus({
            inBattleSquaddieId: actor.inBattleSquaddieId,
            outOfBattleSquaddieId: actor.outOfBattleSquaddieId,
            type: squaddieAction.proficiency,
        }).total
    },

    getTargetDefensiveBonus: ({
        target,
        squaddieAction,
        inBattleSquaddieManager,
        isTargetOffGuardByFlanking,
    }: {
        target: BattleSquaddieId
        squaddieAction: SquaddieAction
        inBattleSquaddieManager: InBattleSquaddieManager
        isTargetOffGuardByFlanking?: boolean
    }): number => {
        const defensiveProficiencyType =
            ProficiencyLevelConst.defendingProficiencyTypeByProficiencyType.get(
                squaddieAction.proficiency
            )
        if (defensiveProficiencyType == undefined) {
            return 0
        }
        const baseDefense = inBattleSquaddieManager.getProficiencyBonus({
            inBattleSquaddieId: target.inBattleSquaddieId,
            outOfBattleSquaddieId: target.outOfBattleSquaddieId,
            type: defensiveProficiencyType,
        }).total

        return isTargetOffGuardByFlanking
            ? baseDefense - FLANKING_DEFENSE_PENALTY
            : baseDefense
    },

    isTargetOffGuardByFlanking: ({
        target,
        squaddieAction,
        inBattleSquaddieManager,
        isActorFlankingTarget,
    }: {
        target: BattleSquaddieId
        squaddieAction: SquaddieAction
        inBattleSquaddieManager: InBattleSquaddieManager
        isActorFlankingTarget: boolean
    }): boolean =>
        isTargetOffGuardByFlanking({
            target,
            squaddieAction,
            inBattleSquaddieManager,
            isActorFlankingTarget,
        }),

    calculateModifierDifference: ({
        rollingSquaddieBonus,
        staticBonus,
        multipleAttackPenalty,
    }: {
        rollingSquaddieBonus: number
        staticBonus: number
        multipleAttackPenalty?: number
    }): number => {
        return (
            rollingSquaddieBonus -
            staticBonus -
            6 -
            (multipleAttackPenalty ?? 0)
        )
    },

    getMapPenaltyFromAttackCount: (
        attackContributionThisTurn: number
    ): number => {
        if (attackContributionThisTurn <= 0) return 0
        if (attackContributionThisTurn === 1) return 3
        return 6
    },
}

const isTargetOffGuardByFlanking = ({
    target,
    squaddieAction,
    inBattleSquaddieManager,
    isActorFlankingTarget,
}: {
    target: BattleSquaddieId
    squaddieAction: SquaddieAction
    inBattleSquaddieManager: InBattleSquaddieManager
    isActorFlankingTarget: boolean
}): boolean => {
    if (!isActorFlankingTarget) return false

    const defensiveProficiencyType =
        ProficiencyLevelConst.defendingProficiencyTypeByProficiencyType.get(
            squaddieAction.proficiency
        )
    if (defensiveProficiencyType !== ProficiencyType.ARMOR) return false

    const targetConditions = inBattleSquaddieManager.getSquaddieConditions({
        inBattleSquaddieId: target.inBattleSquaddieId,
        outOfBattleSquaddieId: target.outOfBattleSquaddieId,
    })
    const isAlreadyOffGuard =
        SquaddieConditionService.calculateEffectiveAmount(
            targetConditions.get(SquaddieConditionType.OFF_GUARD)
        ) > 0
    return !isAlreadyOffGuard
}
