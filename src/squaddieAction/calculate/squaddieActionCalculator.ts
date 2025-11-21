import type { SquaddieActionManager } from "../squaddieActionManager.ts"
import type { OutOfBattleSquaddieAttributeSheet } from "../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet.ts"
import type { SquaddieAction } from "../squaddieAction.ts"
import type { InBattleSquaddie } from "../../squaddie/inBattle/inBattleSquaddie.ts"
import type { OutOfBattleSquaddie } from "../../squaddie/outOfBattle/outOfBattleSquaddie.ts"
import type { SquaddieActionResult } from "./squaddieActionResult.ts"
import type { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager.ts"
import {
    DegreeOfSuccess,
    type TDegreeOfSuccess,
} from "../../degreesOfSuccess/degreeOfSuccess.ts"
import {
    ProficiencyLevelConst,
    type TProficiencyType,
} from "../../proficiency/proficiencyLevel.ts"
import type { AttributeScoreType } from "../../proficiency/attributeScore.ts"

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
        const results: SquaddieActionResult[] = [
            ...calculateActionOnSelf({
                squaddieAction,
                inBattleSquaddie: actorInBattleSquaddie,
                outOfBattleSquaddie: actorOutOfBattleSquaddie,
                attributeSheet: actorAttributeSheet,
            }),
        ]

        results.push(
            ...targets
                .map((target) => {
                    return calculateResultsOnFoe({
                        degreeOfSuccess,
                        squaddieAction,
                        inBattleSquaddieManager,
                        actor: {
                            inBattleSquaddie: actorInBattleSquaddie,
                            outOfBattleSquaddie: actorOutOfBattleSquaddie,
                            attributeSheet: actorAttributeSheet,
                        },
                        target: inBattleSquaddieManager.getSquaddie({
                            ...target,
                        }),
                    })
                })
                .flat()
        )
        return results
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
    let actionPoints =
        squaddieAction.effectOnActor[DegreeOfSuccess.SUCCESS].actionPoints
    if (actionPoints == undefined) return []

    if (actionPoints.spent == "all") {
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
    return [
        {
            inBattleSquaddieId: inBattleSquaddie.id,
            outOfBattleSquaddieId: outOfBattleSquaddie.id,
            actionPoints: {
                spent: actionPoints.spent,
            },
        },
    ]
}

const calculateResultsOnFoe = ({
    squaddieAction,
    target,
    degreeOfSuccess,
    inBattleSquaddieManager,
}: {
    degreeOfSuccess: TDegreeOfSuccess
    squaddieAction: SquaddieAction
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
    if (squaddieAction.effectOnTarget == undefined) return []
    if (squaddieAction.effectOnTarget[degreeOfSuccess] == undefined) return []

    const effect = squaddieAction.effectOnTarget[degreeOfSuccess]
    let results: SquaddieActionResult[] = []
    results.push(
        ...calculateDamageResults({
            inBattleSquaddieManager,
            damage: effect?.damage,
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
    damage:
        | {
              raw: number
              targetProficiency: TProficiencyType
              attributeScoreType?: AttributeScoreType
          }
        | undefined
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
