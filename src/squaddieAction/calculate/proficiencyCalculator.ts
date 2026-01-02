import type { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager"
import type { SquaddieAction } from "../squaddieAction"
import { ProficiencyLevelConst } from "../../proficiency/proficiencyLevel"

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
    }: {
        target: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
        squaddieAction: SquaddieAction
        inBattleSquaddieManager: InBattleSquaddieManager
    }): number => {
        const defensiveProficiencyType =
            ProficiencyLevelConst.defendingProficiencyTypeByProficiencyType.get(
                squaddieAction.proficiency
            )
        if (defensiveProficiencyType == undefined) {
            return 0
        }
        return inBattleSquaddieManager.getProficiencyBonus({
            inBattleSquaddieId: target.inBattleSquaddieId,
            outOfBattleSquaddieId: target.outOfBattleSquaddieId,
            type: defensiveProficiencyType,
        }).total
    },

    calculateModifierDifference: ({
        actorBonus,
        targetDefensiveBonus,
    }: {
        actorBonus: number
        targetDefensiveBonus: number
    }): number => {
        return actorBonus - targetDefensiveBonus - 6
    },
}
