import type {
    BattleSquaddieId,
    InBattleSquaddieManager,
} from "../../../squaddie/inBattle/inBattleSquaddieManager"
import type { SquaddieActionManager } from "../../squaddieActionManager"

export interface ActionValidationResult {
    isValid: boolean
    reason?: string
}

export const SquaddieActionValidationService = {
    isActionValid: ({
        actor,
        action,
        managers,
    }: {
        managers: {
            inBattleSquaddieManager: InBattleSquaddieManager
            squaddieActionManager: SquaddieActionManager
        }
        actor: BattleSquaddieId
        action: {
            id: string
        }
    }): ActionValidationResult => {
        const squaddieAction = managers.squaddieActionManager.get(action.id)
        const actionPointCost =
            squaddieAction.effectOnActor.SUCCESS?.actionPoints?.spent

        return validateActionPointCost({
            actionPointCost,
            actor,
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
        })
    },
}

const validateActionPointCost = ({
    actionPointCost,
    actor,
    inBattleSquaddieManager,
}: {
    actionPointCost: number | "all" | undefined
    actor: BattleSquaddieId
    inBattleSquaddieManager: InBattleSquaddieManager
}): ActionValidationResult => {
    if (actionPointCost == undefined || actionPointCost === 0) {
        return { isValid: true }
    }

    if (actionPointCost === "all") {
        const canAct = inBattleSquaddieManager.canSquaddieAct(actor)
        if (!canAct) {
            return { isValid: false, reason: "Squaddie cannot act" }
        }
        return { isValid: true }
    }

    const { current } = inBattleSquaddieManager.getActionPoints(actor)
    if (current < actionPointCost) {
        return {
            isValid: false,
            reason: `Needs ${actionPointCost} action points`,
        }
    }

    return { isValid: true }
}
