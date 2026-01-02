import type { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager"
import type { TDegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess"
import type { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager"
import type { SquaddieActionManager } from "../../squaddieActionManager"
import type { SquaddieActionResult } from "./squaddieActionResult"
import type { SquaddieActionEffect } from "../../squaddieAction"
import type { InBattleSquaddie } from "../../../squaddie/inBattle/inBattleSquaddie"
import type { OutOfBattleSquaddie } from "../../../squaddie/outOfBattle/outOfBattleSquaddie"
import type { OutOfBattleSquaddieAttributeSheet } from "../../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet"
import { ProficiencyLevelConst } from "../../../proficiency/proficiencyLevel"
import type {
    SquaddieCondition,
    TSquaddieConditionType,
} from "../../../proficiency/squaddieCondition"
import {
    type CoordinateMovePath,
    CoordinateMovePathService,
} from "../../../coordinateMap/path/path"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap"

export type SquaddieActionDecisions = {
    desiredMovementDestination?: {
        row: number
        col: number
    }
}

export const SquaddieActionResultCalculator = {
    calculateResult: ({
        actor,
        targets,
        action,
        inBattleSquaddieManager,
        degreeOfSuccess,
        map,
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
        action: {
            id: string
            manager: SquaddieActionManager
            decisions?: SquaddieActionDecisions
        }
        map?: {
            mapId: string
            manager: CoordinateMapCollectionManager
        }
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
            decisions: action.decisions,
            map,
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
                    decisions: action.decisions,
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
    calculateDegreeOfSuccessForTargets: ({
        actorRoll,
        targetModifierDifferences,
        supportedDegreesOfSuccess,
    }: {
        actorRoll: [number, number]
        targetModifierDifferences: Map<string, number>
        supportedDegreesOfSuccess?: TDegreeOfSuccess[]
    }): Map<string, TDegreeOfSuccess> => {
        const rollTotal = actorRoll[0] + actorRoll[1]
        const isMaxRoll = actorRoll[0] === 6 && actorRoll[1] === 6
        const isMinRoll = actorRoll[0] === 1 && actorRoll[1] === 1

        const allowedDegrees: Set<TDegreeOfSuccess> = new Set(
            supportedDegreesOfSuccess ?? [
                DegreeOfSuccess.CRITICAL,
                DegreeOfSuccess.SUCCESS,
                DegreeOfSuccess.FAILURE,
                DegreeOfSuccess.BOTCH,
            ]
        )

        const results = new Map<string, TDegreeOfSuccess>()

        for (const [
            targetKey,
            modifierDifference,
        ] of targetModifierDifferences) {
            const totalValue = rollTotal + modifierDifference

            let degree = getBaseDegreeFromValue(totalValue)

            if (isMaxRoll) {
                degree = increaseDegree(degree)
            } else if (isMinRoll) {
                degree = decreaseDegree(degree)
            }

            degree = redistributeUnsupportedDegree(degree, allowedDegrees)

            results.set(targetKey, degree)
        }

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
    decisions,
    map,
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
    decisions?: SquaddieActionDecisions
    map?: {
        mapId: string
        manager: CoordinateMapCollectionManager
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
        }),
        ...calculateConditionAddResults({
            inBattleSquaddieManager,
            conditions: effect?.conditions?.add,
            ...target,
        }),
        ...calculateConditionDispelResults({
            inBattleSquaddieManager,
            conditions: effect?.conditions?.dispel,
            ...target,
        }),
        ...calculateConditionTreatResults({
            inBattleSquaddieManager,
            conditions: effect?.conditions?.treat,
            ...target,
        }),
        ...calculateMovementResults({
            inBattleSquaddieManager,
            decisions,
            movement: effect?.movement,
            map,
            actionPointsEffect: effect?.actionPoints,
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
        ProficiencyLevelConst.attributeScoreByProficiencyType.get(
            damage.targetProficiency
        ) ?? damage.attributeScoreType

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

const calculateConditionAddResults = ({
    conditions,
    inBattleSquaddie,
    outOfBattleSquaddie,
    inBattleSquaddieManager,
}: {
    conditions: SquaddieCondition[] | undefined
    inBattleSquaddie: InBattleSquaddie
    outOfBattleSquaddie: OutOfBattleSquaddie
    attributeSheet: OutOfBattleSquaddieAttributeSheet
    inBattleSquaddieManager: InBattleSquaddieManager
}): SquaddieActionResult[] => {
    if (conditions == undefined) return []

    const info = inBattleSquaddieManager.previewAddConditionsToSquaddie({
        inBattleSquaddieId: inBattleSquaddie.id,
        outOfBattleSquaddieId: outOfBattleSquaddie.id,
        conditions,
    })

    return [
        {
            inBattleSquaddieId: inBattleSquaddie.id,
            outOfBattleSquaddieId: outOfBattleSquaddie.id,
            conditionsAdded: info.newConditions,
        },
    ]
}

const calculateConditionDispelResults = ({
    conditions,
    inBattleSquaddie,
    outOfBattleSquaddie,
    inBattleSquaddieManager,
}: {
    conditions:
        | {
              all: boolean
              types: TSquaddieConditionType[]
              amount: number | undefined
          }
        | undefined
    inBattleSquaddie: InBattleSquaddie
    outOfBattleSquaddie: OutOfBattleSquaddie
    attributeSheet: OutOfBattleSquaddieAttributeSheet
    inBattleSquaddieManager: InBattleSquaddieManager
}): SquaddieActionResult[] => {
    if (conditions == undefined) return []

    const dispelledConditionsResult =
        inBattleSquaddieManager.previewDispelConditions({
            inBattleSquaddieId: inBattleSquaddie.id,
            outOfBattleSquaddieId: outOfBattleSquaddie.id,
            conditionTypes: {
                all: conditions.all,
                types: conditions.types,
            },
            amount: conditions.amount,
        })

    return [
        {
            inBattleSquaddieId: inBattleSquaddie.id,
            outOfBattleSquaddieId: outOfBattleSquaddie.id,
            dispel: dispelledConditionsResult,
        },
    ]
}

const calculateConditionTreatResults = ({
    conditions,
    inBattleSquaddie,
    outOfBattleSquaddie,
    inBattleSquaddieManager,
}: {
    conditions:
        | {
              all: boolean
              types: TSquaddieConditionType[]
              amount: number | undefined
          }
        | undefined
    inBattleSquaddie: InBattleSquaddie
    outOfBattleSquaddie: OutOfBattleSquaddie
    attributeSheet: OutOfBattleSquaddieAttributeSheet
    inBattleSquaddieManager: InBattleSquaddieManager
}): SquaddieActionResult[] => {
    if (conditions == undefined) return []

    const treatConditionsResult =
        inBattleSquaddieManager.previewTreatConditions({
            inBattleSquaddieId: inBattleSquaddie.id,
            outOfBattleSquaddieId: outOfBattleSquaddie.id,
            conditionTypes: {
                all: conditions.all,
                types: conditions.types,
            },
            amount: conditions.amount,
        })

    return [
        {
            inBattleSquaddieId: inBattleSquaddie.id,
            outOfBattleSquaddieId: outOfBattleSquaddie.id,
            treat: treatConditionsResult,
        },
    ]
}

const calculateMovementResults = ({
    inBattleSquaddie,
    outOfBattleSquaddie,
    inBattleSquaddieManager,
    decisions,
    movement,
    map,
    actionPointsEffect,
}: {
    actionPointsEffect: SquaddieActionEffect["actionPoints"] | undefined
    movement: SquaddieActionEffect["movement"] | undefined
    map?: {
        mapId: string
        manager: CoordinateMapCollectionManager
    }
    decisions: SquaddieActionDecisions | undefined
    inBattleSquaddie: InBattleSquaddie
    outOfBattleSquaddie: OutOfBattleSquaddie
    attributeSheet: OutOfBattleSquaddieAttributeSheet
    inBattleSquaddieManager: InBattleSquaddieManager
}): SquaddieActionResult[] => {
    if (movement == undefined) return []
    if (map == undefined) return []

    if (
        movement.moveToSelectedDestination &&
        decisions?.desiredMovementDestination == undefined
    )
        return []

    const routeInfo: {
        expectedPath: CoordinateMovePath
    } = CoordinateMapService.calculateRoute({
        map: map.manager.getMapById(map.mapId),
        inBattleSquaddieManager,
        inBattleSquaddieId: inBattleSquaddie.id,
        outOfBattleSquaddieId: outOfBattleSquaddie.id,
        stopConditions: [
            {
                desiredDestination: decisions?.desiredMovementDestination,
            },
        ],
    })

    let actionPointCost = 0
    if (actionPointsEffect?.additional?.movementPathActionPointCost)
        actionPointCost += CoordinateMovePathService.getTotalMoveCost(
            routeInfo.expectedPath
        )

    return [
        {
            inBattleSquaddieId: inBattleSquaddie.id,
            outOfBattleSquaddieId: outOfBattleSquaddie.id,
            movement: {
                expectedPath: routeInfo.expectedPath,
            },
            actionPoints: {
                spent: actionPointCost,
            },
        },
    ]
}

const getBaseDegreeFromValue = (value: number): TDegreeOfSuccess => {
    if (value >= 6) return DegreeOfSuccess.CRITICAL
    if (value <= -6) return DegreeOfSuccess.BOTCH
    if (value >= 0) return DegreeOfSuccess.SUCCESS
    return DegreeOfSuccess.FAILURE
}

const increaseDegree = (degree: TDegreeOfSuccess): TDegreeOfSuccess => {
    if (degree === DegreeOfSuccess.BOTCH) return DegreeOfSuccess.FAILURE
    if (degree === DegreeOfSuccess.FAILURE) return DegreeOfSuccess.SUCCESS
    if (degree === DegreeOfSuccess.SUCCESS) return DegreeOfSuccess.CRITICAL
    return DegreeOfSuccess.CRITICAL
}

const decreaseDegree = (degree: TDegreeOfSuccess): TDegreeOfSuccess => {
    if (degree === DegreeOfSuccess.CRITICAL) return DegreeOfSuccess.SUCCESS
    if (degree === DegreeOfSuccess.SUCCESS) return DegreeOfSuccess.FAILURE
    if (degree === DegreeOfSuccess.FAILURE) return DegreeOfSuccess.BOTCH
    return DegreeOfSuccess.BOTCH
}

const redistributeUnsupportedDegree = (
    degree: TDegreeOfSuccess,
    supportedDegreesOfSuccess: Set<TDegreeOfSuccess>
): TDegreeOfSuccess => {
    if (supportedDegreesOfSuccess.has(degree)) return degree

    if (degree === DegreeOfSuccess.CRITICAL) {
        return DegreeOfSuccess.SUCCESS
    }

    if (degree === DegreeOfSuccess.BOTCH) {
        if (supportedDegreesOfSuccess.has(DegreeOfSuccess.FAILURE)) {
            return DegreeOfSuccess.FAILURE
        }
        return DegreeOfSuccess.SUCCESS
    }

    if (degree === DegreeOfSuccess.FAILURE) {
        return DegreeOfSuccess.SUCCESS
    }

    return degree
}
