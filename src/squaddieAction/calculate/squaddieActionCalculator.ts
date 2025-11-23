import type { SquaddieActionManager } from "../squaddieActionManager.ts"
import type { OutOfBattleSquaddieAttributeSheet } from "../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet.ts"
import type { SquaddieActionEffect } from "../squaddieAction.ts"
import type { InBattleSquaddie } from "../../squaddie/inBattle/inBattleSquaddie.ts"
import type { OutOfBattleSquaddie } from "../../squaddie/outOfBattle/outOfBattleSquaddie.ts"
import type { SquaddieActionResult } from "./squaddieActionResult.ts"
import type { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager.ts"
import { type TDegreeOfSuccess } from "../../degreesOfSuccess/degreeOfSuccess.ts"
import { ProficiencyLevelConst } from "../../proficiency/proficiencyLevel.ts"

export const SquaddieActionCalculator = {
    calculateResult: ({
        actor,
        targets,
        action,
        inBattleSquaddieManager,
        degreeOfSuccess,
    }: {
        degreeOfSuccess: TDegreeOfSuccess
        inBattleSquaddieManager: InBattleSquaddieManager
        actor: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
        targets: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }[]
        action: { id: string; manager: SquaddieActionManager }
    }): SquaddieActionResult[] => {
        const {
            inBattleSquaddie: actorInBattleSquaddie,
            outOfBattleSquaddie: actorOutOfBattleSquaddie,
            attributeSheet: actorAttributeSheet,
        } = inBattleSquaddieManager.getSquaddie({
            ...actor,
        })

        const squaddieAction = action.manager.get(action.id)
        const results: SquaddieActionResult[] = calculateEffectOnSquaddie({
            effect: squaddieAction.effectOnActor[degreeOfSuccess],
            inBattleSquaddieManager,
            actor: {
                inBattleSquaddie: actorInBattleSquaddie,
                outOfBattleSquaddie: actorOutOfBattleSquaddie,
                attributeSheet: actorAttributeSheet,
            },
            target: {
                inBattleSquaddie: actorInBattleSquaddie,
                outOfBattleSquaddie: actorOutOfBattleSquaddie,
                attributeSheet: actorAttributeSheet,
            },
        })

        results.push(
            ...targets.flatMap((target) => {
                if (
                    squaddieAction.effectOnTarget?.[degreeOfSuccess] ==
                    undefined
                )
                    return []

                const targetSquaddie = inBattleSquaddieManager.getSquaddie({
                    ...target,
                })
                return calculateEffectOnSquaddie({
                    effect: squaddieAction.effectOnTarget[degreeOfSuccess],
                    inBattleSquaddieManager,
                    actor: {
                        inBattleSquaddie: actorInBattleSquaddie,
                        outOfBattleSquaddie: actorOutOfBattleSquaddie,
                        attributeSheet: actorAttributeSheet,
                    },
                    target: targetSquaddie,
                })
            })
        )
        return results
    },
}

const calculateActionPointChange = ({
    actionPoints,
    inBattleSquaddie,
    outOfBattleSquaddie,
    inBattleSquaddieManager,
}: {
    actionPoints: SquaddieActionEffect["actionPoints"] | undefined
    inBattleSquaddie: InBattleSquaddie
    outOfBattleSquaddie: OutOfBattleSquaddie
    attributeSheet: OutOfBattleSquaddieAttributeSheet
    inBattleSquaddieManager: InBattleSquaddieManager
}): SquaddieActionResult[] => {
    if (actionPoints == undefined) return []

    return [
        {
            inBattleSquaddieId: inBattleSquaddie.id,
            outOfBattleSquaddieId: outOfBattleSquaddie.id,
            actionPoints: inBattleSquaddieManager.previewSpendActionPoints({
                inBattleSquaddieId: inBattleSquaddie.id,
                outOfBattleSquaddieId: outOfBattleSquaddie.id,
                actionPoints:
                    actionPoints.spent == "all"
                        ? inBattleSquaddie.actionPoints.current
                        : actionPoints.spent,
            }),
        },
    ]
}

const calculateEffectOnSquaddie = ({
    effect,
    target,
    inBattleSquaddieManager,
}: {
    effect: SquaddieActionEffect | undefined
    inBattleSquaddieManager: InBattleSquaddieManager
    actor: {
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    }
    target: {
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    }
}): SquaddieActionResult[] => {
    if (effect == undefined) return []

    let results: SquaddieActionResult[] = []
    results.push(
        ...calculateActionPointChange({
            inBattleSquaddieManager,
            actionPoints: effect?.actionPoints,
            ...target,
        }),
        ...calculateDamageResults({
            inBattleSquaddieManager,
            damage: effect?.damage,
            ...target,
        }),
        ...calculateHealingResults({
            inBattleSquaddieManager,
            healing: effect?.healing,
            ...target,
        })
    )

    return results
}

const calculateDamageResults = ({
    damage,
    inBattleSquaddie,
    outOfBattleSquaddie,
    inBattleSquaddieManager,
}: {
    damage: SquaddieActionEffect["damage"] | undefined
    inBattleSquaddie: InBattleSquaddie
    outOfBattleSquaddie: OutOfBattleSquaddie
    attributeSheet: OutOfBattleSquaddieAttributeSheet
    inBattleSquaddieManager: InBattleSquaddieManager
}): SquaddieActionResult[] => {
    if (damage == undefined) return []

    const damageAttributeScoreType =
        ProficiencyLevelConst.attributeScoreByProficiencyType[
            damage.targetProficiency
        ] ?? damage.attributeScoreType

    const previewedDamage = inBattleSquaddieManager.previewDamageToSquaddie({
        inBattleSquaddieId: inBattleSquaddie.id,
        outOfBattleSquaddieId: outOfBattleSquaddie.id,
        damage: {
            amount: damage.raw,
            type: damageAttributeScoreType,
        },
    })

    if (previewedDamage == undefined) return []

    return [
        {
            inBattleSquaddieId: inBattleSquaddie.id,
            outOfBattleSquaddieId: outOfBattleSquaddie.id,
            damage: {
                net: previewedDamage.net,
                raw: damage.raw,
                willKo: previewedDamage.willKo,
                absorbed: previewedDamage.absorbed,
                type: damageAttributeScoreType,
            },
        },
    ]
}

const calculateHealingResults = ({
    healing,
    inBattleSquaddie,
    outOfBattleSquaddie,
    inBattleSquaddieManager,
}: {
    healing: SquaddieActionEffect["healing"] | undefined
    inBattleSquaddie: InBattleSquaddie
    outOfBattleSquaddie: OutOfBattleSquaddie
    attributeSheet: OutOfBattleSquaddieAttributeSheet
    inBattleSquaddieManager: InBattleSquaddieManager
}): SquaddieActionResult[] => {
    if (healing == undefined) return []

    const previewedHealing = inBattleSquaddieManager.previewHealingToSquaddie({
        inBattleSquaddieId: inBattleSquaddie.id,
        outOfBattleSquaddieId: outOfBattleSquaddie.id,
        healing,
    })

    if (previewedHealing == undefined) return []

    return [
        {
            inBattleSquaddieId: inBattleSquaddie.id,
            outOfBattleSquaddieId: outOfBattleSquaddie.id,
            healing: {
                net: previewedHealing.net,
                ...healing,
            },
        },
    ]
}
