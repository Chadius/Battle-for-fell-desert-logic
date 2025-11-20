import type { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager.ts"
import type { SquaddieActionManager } from "../squaddieActionManager.ts"
import type { OutOfBattleSquaddieAttributeSheet } from "../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet.ts"
import type { SquaddieAction } from "../squaddieAction.ts"
import type { InBattleSquaddie } from "../../squaddie/inBattle/inBattleSquaddie.ts"
import type { OutOfBattleSquaddie } from "../../squaddie/outOfBattle/outOfBattleSquaddie.ts"

export interface SquaddieActionResult {
    inBattleSquaddieId: number
    outOfBattleSquaddieId: string
    actionPoints?: {
        spent: number
    }
}

export const SquaddieActionResolverOnSelf = {
    calculateResult: ({
        actor,
        action,
    }: {
        actor: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
            inBattleSquaddieManager: InBattleSquaddieManager
        }
        action: { id: string; manager: SquaddieActionManager }
    }): SquaddieActionResult[] => {
        const { inBattleSquaddie, outOfBattleSquaddie, attributeSheet } =
            actor.inBattleSquaddieManager.getSquaddie({
                ...actor,
            })

        const squaddieAction = action.manager.get(action.id)

        return calculateActionOnSelf({
            squaddieAction,
            inBattleSquaddie,
            outOfBattleSquaddie,
            attributeSheet,
        })
    },
}

const calculateActionOnSelf = ({
    squaddieAction,
    inBattleSquaddie,
    outOfBattleSquaddie,
    attributeSheet,
}: {
    squaddieAction: SquaddieAction
    inBattleSquaddie: InBattleSquaddie
    outOfBattleSquaddie: OutOfBattleSquaddie
    attributeSheet: OutOfBattleSquaddieAttributeSheet
}): SquaddieActionResult[] => {
    const results: SquaddieActionResult[] = []

    results.push(
        ...calculateActionPointChangeToSelf({
            squaddieAction,
            inBattleSquaddie,
            outOfBattleSquaddie,
            attributeSheet,
        })
    )
    return results
}

const calculateActionPointChangeToSelf = ({
    squaddieAction,
    inBattleSquaddie,
    outOfBattleSquaddie,
}: {
    squaddieAction: SquaddieAction
    inBattleSquaddie: InBattleSquaddie
    outOfBattleSquaddie: OutOfBattleSquaddie
    attributeSheet: OutOfBattleSquaddieAttributeSheet
}): SquaddieActionResult[] => {
    if (squaddieAction.effect.actionPoints == undefined) return []

    if (squaddieAction.effect.actionPoints.spent == "all") {
        return [
            {
                inBattleSquaddieId: inBattleSquaddie.id,
                outOfBattleSquaddieId: outOfBattleSquaddie.id,
                actionPoints: {
                    spent: inBattleSquaddie.actionPoints.current,
                },
            },
        ]
    }
    return []
}
