import type { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager"
import type { SquaddieAction } from "../squaddieAction"
import {
    ProficiencyLevelConst,
    ProficiencyType,
} from "../../proficiency/proficiencyLevel"
import { SquaddieConditionType } from "../../proficiency/squaddieCondition"

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
        isActorFlankingTarget,
    }: {
        target: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
        squaddieAction: SquaddieAction
        inBattleSquaddieManager: InBattleSquaddieManager
        isActorFlankingTarget?: boolean
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

        if (
            isActorFlankingTarget &&
            defensiveProficiencyType === ProficiencyType.ARMOR
        ) {
            const targetConditions =
                inBattleSquaddieManager.getSquaddieConditions({
                    inBattleSquaddieId: target.inBattleSquaddieId,
                    outOfBattleSquaddieId: target.outOfBattleSquaddieId,
                })
            const hasActiveOffGuard = (
                targetConditions.get(SquaddieConditionType.OFF_GUARD) ?? []
            ).some((c) => (c.amount?.current ?? 0) > 0)

            if (!hasActiveOffGuard) {
                return baseDefense - 1
            }
        }

        return baseDefense
    },

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
