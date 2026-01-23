import type { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager"
import type { TDegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess"
import type {
    BattleSquaddieId,
    InBattleSquaddieManager,
} from "../../../squaddie/inBattle/inBattleSquaddieManager"
import type { SquaddieActionManager } from "../../squaddieActionManager"
import {
    type SerializedSquaddieActionResult,
    type SquaddieActionResult,
    SquaddieActionResultService,
} from "./squaddieActionResult"
import type { SquaddieActionEffect } from "../../squaddieAction"
import type { InBattleSquaddie } from "../../../squaddie/inBattle/inBattleSquaddie"
import type { OutOfBattleSquaddie } from "../../../squaddie/outOfBattle/outOfBattleSquaddie"
import type { OutOfBattleSquaddieAttributeSheet } from "../../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet"
import { ProficiencyLevelConst } from "../../../proficiency/proficiencyLevel"
import type {
    SquaddieCondition,
    TSquaddieConditionType,
} from "../../../proficiency/squaddieCondition"
import { SquaddieConditionService } from "../../../proficiency/squaddieCondition"
import {
    type CoordinateMovePath,
    CoordinateMovePathService,
} from "../../../coordinateMap/path/path"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap"
import type { RollGenerator } from "../roll/rollGenerator"
import { SquaddieIdConverterService } from "../../../squaddie/idConverterService"
import { ProficiencyCalculator } from "../proficiencyCalculator"
import { SquaddieActionForecastCalculator } from "../forecast/squaddieActionForecastCalculator"

export type SquaddieActionDecisions = {
    desiredMovementDestination?: {
        row: number
        col: number
    }
}

export interface ForecastedActionResult {
    battleSquaddieId: BattleSquaddieId
    degreeOfSuccess: TDegreeOfSuccess
    chanceOutOf36: number
    squaddieActionResults: SquaddieActionResult[]
}

export type SerializedForecastedActionResult = Omit<
    ForecastedActionResult,
    "squaddieActionResults"
> & {
    squaddieActionResults: SerializedSquaddieActionResult[]
}

export const SquaddieActionResultCalculator = {
    calculateResult: ({
        actor,
        targets,
        action,
        managers,
        degreeOfSuccess,
        map,
    }: {
        managers: {
            inBattleSquaddieManager: InBattleSquaddieManager
            squaddieActionManager: SquaddieActionManager
            coordinateMapCollectionManager?: CoordinateMapCollectionManager
        }
        degreeOfSuccess: TDegreeOfSuccess
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
            decisions?: SquaddieActionDecisions
        }
        map?: {
            mapId: string
        }
    }): SquaddieActionResult[] => {
        const {
            inBattleSquaddie: actorInBattleSquaddie,
            outOfBattleSquaddie: actorOutOfBattleSquaddie,
            attributeSheet: actorAttributeSheet,
        } = managers.inBattleSquaddieManager.getSquaddie({
            ...actor,
        })

        const squaddieAction = managers.squaddieActionManager.get(action.id)
        const results: SquaddieActionResult[] = calculateEffectOnSquaddie({
            effect: squaddieAction.effectOnActor[degreeOfSuccess],
            decisions: action.decisions,
            map,
            managers,
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

                const targetSquaddie =
                    managers.inBattleSquaddieManager.getSquaddie({
                        ...target,
                    })
                return calculateEffectOnSquaddie({
                    effect: squaddieAction.effectOnTarget[degreeOfSuccess],
                    decisions: action.decisions,
                    managers,
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

    calculateActionResultsWithRolls: ({
        actor,
        targets,
        action,
        managers,
        rollGenerator,
        map,
    }: {
        managers: {
            inBattleSquaddieManager: InBattleSquaddieManager
            squaddieActionManager: SquaddieActionManager
            coordinateMapCollectionManager?: CoordinateMapCollectionManager
        }
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
            decisions?: SquaddieActionDecisions
        }
        rollGenerator: RollGenerator
        map?: {
            mapId: string
        }
    }): {
        actorRoll: [number, number]
        targetResults: Map<
            string,
            {
                degreeOfSuccess: TDegreeOfSuccess
                squaddieActionResults: SquaddieActionResult[]
            }
        >
    } => {
        const squaddieAction = managers.squaddieActionManager.get(action.id)

        const actorProficiencyBonus =
            ProficiencyCalculator.getActorProficiencyBonus({
                actor,
                squaddieAction,
                inBattleSquaddieManager: managers.inBattleSquaddieManager,
            })

        const rollResult = rollGenerator.roll(2)
        const actorRoll: [number, number] = [rollResult[0], rollResult[1]]

        const targetModifierDifferences = new Map<string, number>()

        for (const target of targets) {
            const targetDefensiveBonus =
                ProficiencyCalculator.getTargetDefensiveBonus({
                    target,
                    squaddieAction,
                    inBattleSquaddieManager: managers.inBattleSquaddieManager,
                })

            const modifierDifference =
                ProficiencyCalculator.calculateModifierDifference({
                    actorBonus: actorProficiencyBonus,
                    targetDefensiveBonus,
                })

            const targetKey = SquaddieIdConverterService.squaddieIdToKey({
                inBattleSquaddieId: target.inBattleSquaddieId,
                outOfBattleSquaddieId: target.outOfBattleSquaddieId,
            })

            targetModifierDifferences.set(targetKey, modifierDifference)
        }

        const degreesByTarget =
            SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets({
                actorRoll,
                targetModifierDifferences,
                supportedDegreesOfSuccess: squaddieAction.degreesOfSuccess,
            })

        const targetResults = new Map<
            string,
            {
                degreeOfSuccess: TDegreeOfSuccess
                squaddieActionResults: SquaddieActionResult[]
            }
        >()

        for (const [targetKey, degreeOfSuccess] of degreesByTarget) {
            const target = targets.find(
                (t) =>
                    SquaddieIdConverterService.squaddieIdToKey({
                        inBattleSquaddieId: t.inBattleSquaddieId,
                        outOfBattleSquaddieId: t.outOfBattleSquaddieId,
                    }) === targetKey
            )!

            const results = SquaddieActionResultCalculator.calculateResult({
                degreeOfSuccess,
                managers,
                actor,
                targets: [target],
                action,
                map,
            })

            targetResults.set(targetKey, {
                degreeOfSuccess,
                squaddieActionResults: results,
            })
        }

        return {
            actorRoll,
            targetResults,
        }
    },

    reverseResult: (original: SquaddieActionResult): SquaddieActionResult => {
        validateResultForReversal(original)

        let reversed: SquaddieActionResult = {
            inBattleSquaddieId: original.inBattleSquaddieId,
            outOfBattleSquaddieId: original.outOfBattleSquaddieId,
        }

        reversed = reverseActionPoints(original, reversed)
        reversed = reverseDamage(original, reversed)
        reversed = reverseHealing(original, reversed)
        reversed = reverseConditionsAdded(original, reversed)
        reversed = reverseDispel(original, reversed)
        reversed = reverseTreat(original, reversed)
        reversed = reverseMovement(original, reversed)
        return reversed
    },

    calculateForecastedResults: ({
        actor,
        targets,
        action,
        inBattleSquaddieManager,
        map,
    }: {
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
        inBattleSquaddieManager: InBattleSquaddieManager
        map?: {
            mapId: string
            manager: CoordinateMapCollectionManager
        }
    }): ForecastedActionResult[] => {
        const chances = SquaddieActionForecastCalculator.forecastChanceToHit({
            actor,
            targets,
            action,
            inBattleSquaddieManager,
        })

        const results: ForecastedActionResult[] = []

        for (const [forecastKey, chanceOutOf36] of chances) {
            if (chanceOutOf36 === 0) continue

            const { battleSquaddieId, degreeOfSuccess } =
                SquaddieActionForecastCalculator.parseForecastKey(forecastKey)

            const squaddieActionResults =
                SquaddieActionResultCalculator.calculateResult({
                    actor,
                    targets: [
                        {
                            inBattleSquaddieId:
                                battleSquaddieId.inBattleSquaddieId,
                            outOfBattleSquaddieId:
                                battleSquaddieId.outOfBattleSquaddieId,
                        },
                    ],
                    action: {
                        id: action.id,
                        decisions: action.decisions,
                    },
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager: action.manager,
                        coordinateMapCollectionManager: map?.manager,
                    },
                    degreeOfSuccess,
                    map: map ? { mapId: map.mapId } : undefined,
                })

            results.push({
                battleSquaddieId,
                degreeOfSuccess,
                chanceOutOf36,
                squaddieActionResults,
            })
        }

        return results
    },

    serializeForecastedActionResult: (
        result: ForecastedActionResult
    ): SerializedForecastedActionResult => {
        return {
            battleSquaddieId: { ...result.battleSquaddieId },
            degreeOfSuccess: result.degreeOfSuccess,
            chanceOutOf36: result.chanceOutOf36,
            squaddieActionResults: result.squaddieActionResults.map(
                SquaddieActionResultService.serialize
            ),
        }
    },

    deserializeSerializedForecastedActionResult: (
        results: SerializedForecastedActionResult[]
    ): ForecastedActionResult[] => {
        return results.map((result) => {
            const deserializedSquaddieActionResults =
                result.squaddieActionResults.map(
                    SquaddieActionResultService.deserialize
                )
            return {
                ...result,
                squaddieActionResults: deserializedSquaddieActionResults,
            }
        })
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
    managers,
    decisions,
    map,
}: {
    effect: SquaddieActionEffect | undefined
    managers: {
        inBattleSquaddieManager: InBattleSquaddieManager
        coordinateMapCollectionManager?: CoordinateMapCollectionManager
    }
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
    }
}): SquaddieActionResult[] => {
    if (effect == undefined) return []

    let results: SquaddieActionResult[] = []
    results.push(
        ...calculateActionPointChange({
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
            actionPoints: effect?.actionPoints,
            ...target,
        }),
        ...calculateDamageResults({
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
            damage: effect?.damage,
            ...target,
        }),
        ...calculateHealingResults({
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
            healing: effect?.healing,
            ...target,
        }),
        ...calculateActionPointsRestorationResults({
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
            actionPointsRestore: effect?.actionPoints?.restore,
            ...target,
        }),
        ...calculateConditionAddResults({
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
            conditions: effect?.conditions?.add,
            ...target,
        }),
        ...calculateConditionDispelResults({
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
            conditions: effect?.conditions?.dispel,
            ...target,
        }),
        ...calculateConditionTreatResults({
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
            conditions: effect?.conditions?.treat,
            ...target,
        }),
        ...calculateMovementResults({
            managers,
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

const calculateActionPointsRestorationResults = ({
    actionPointsRestore,
    inBattleSquaddie,
    outOfBattleSquaddie,
    inBattleSquaddieManager,
}: {
    actionPointsRestore: number | undefined
    inBattleSquaddie: InBattleSquaddie
    outOfBattleSquaddie: OutOfBattleSquaddie
    attributeSheet: OutOfBattleSquaddieAttributeSheet
    inBattleSquaddieManager: InBattleSquaddieManager
}): SquaddieActionResult[] => {
    if (actionPointsRestore == undefined) return []

    const previewedRestoration =
        inBattleSquaddieManager.previewRestoreActionPoints({
            inBattleSquaddieId: inBattleSquaddie.id,
            outOfBattleSquaddieId: outOfBattleSquaddie.id,
            actionPoints: actionPointsRestore,
        })

    return [
        {
            inBattleSquaddieId: inBattleSquaddie.id,
            outOfBattleSquaddieId: outOfBattleSquaddie.id,
            actionPoints: {
                spent: 0,
                restore: {
                    net: previewedRestoration.restored,
                    raw: actionPointsRestore,
                },
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
    managers,
    decisions,
    movement,
    map,
    actionPointsEffect,
}: {
    managers: {
        inBattleSquaddieManager: InBattleSquaddieManager
        coordinateMapCollectionManager?: CoordinateMapCollectionManager
    }
    actionPointsEffect: SquaddieActionEffect["actionPoints"] | undefined
    movement: SquaddieActionEffect["movement"] | undefined
    map?: {
        mapId: string
    }
    decisions: SquaddieActionDecisions | undefined
    inBattleSquaddie: InBattleSquaddie
    outOfBattleSquaddie: OutOfBattleSquaddie
    attributeSheet: OutOfBattleSquaddieAttributeSheet
}): SquaddieActionResult[] => {
    if (movement == undefined) return []
    if (
        map == undefined ||
        managers.coordinateMapCollectionManager == undefined
    )
        return []

    if (
        movement.moveToSelectedDestination &&
        decisions?.desiredMovementDestination == undefined
    )
        return []

    const routeInfo: {
        expectedPath: CoordinateMovePath
    } = CoordinateMapService.calculateRoute({
        map: managers.coordinateMapCollectionManager.getMapById(map.mapId),
        inBattleSquaddieManager: managers.inBattleSquaddieManager,
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

const validateResultForReversal = (original: SquaddieActionResult): void => {
    validateResultForReversalDamageHealing(original)
    validateResultForReversalConditionEffects(original)
    validateResultForReversalConditionsAdded(original)
}

const validateResultForReversalDamageHealing = (
    original: SquaddieActionResult
): void => {
    if (original.damage && original.healing) {
        throw new Error(
            "[SquaddieActionResultCalculator.reverseResult]: Result cannot have both damage and healing"
        )
    }
}

const validateResultForReversalConditionEffects = (
    original: SquaddieActionResult
): void => {
    const conditionEffectCount = [
        original.conditionsAdded ? 1 : 0,
        original.dispel ? 1 : 0,
        original.treat ? 1 : 0,
    ].reduce((a, b) => a + b, 0)

    if (conditionEffectCount > 1) {
        throw new Error(
            "[SquaddieActionResultCalculator.reverseResult]: Result cannot have multiple condition effects"
        )
    }
}

const validateResultForReversalConditionsAdded = (
    original: SquaddieActionResult
): void => {
    if (!(original.conditionsAdded && original.conditionsAdded.length > 0)) {
        return
    }

    let hasHindering = false
    let hasHelpful = false
    for (const condition of original.conditionsAdded) {
        if (SquaddieConditionService.isHindering(condition)) hasHindering = true
        if (SquaddieConditionService.isHelpful(condition)) hasHelpful = true
    }
    if (hasHindering && hasHelpful) {
        throw new Error(
            "[SquaddieActionResultCalculator.reverseResult]: conditionsAdded cannot contain both hindering and helpful conditions"
        )
    }
}

const extractConditionsFromMap = (
    conditionMap: Map<TSquaddieConditionType, Omit<SquaddieCondition, "type">[]>
): SquaddieCondition[] => {
    const conditions: SquaddieCondition[] = []
    for (const [type, conditionDataArray] of conditionMap) {
        for (const conditionData of conditionDataArray) {
            conditions.push({
                type,
                amount: conditionData.amount,
                limit: conditionData.limit,
            })
        }
    }
    return conditions
}

const reverseActionPoints = (
    original: SquaddieActionResult,
    reversed: SquaddieActionResult
): SquaddieActionResult => {
    if (original.actionPoints == undefined) return reversed

    reversed.actionPoints = {
        spent: original.actionPoints.restore?.net ?? 0,
        restore:
            original.actionPoints.spent > 0
                ? {
                      net: original.actionPoints.spent,
                      raw: original.actionPoints.spent,
                  }
                : undefined,
    }
    return reversed
}

const reverseDamage = (
    original: SquaddieActionResult,
    reversed: SquaddieActionResult
): SquaddieActionResult => {
    if (original.damage == undefined) return reversed

    reversed.healing = {
        net: original.damage.net,
        raw: original.damage.net,
    }

    return reversed
}

const reverseHealing = (
    original: SquaddieActionResult,
    reversed: SquaddieActionResult
): SquaddieActionResult => {
    if (original.healing == undefined) return reversed

    reversed.damage = {
        net: original.healing.net,
        raw: original.healing.net,
        absorbed: 0,
        willKo: false,
        type: undefined,
    }

    return reversed
}

const reverseConditionsAdded = (
    original: SquaddieActionResult,
    reversed: SquaddieActionResult
): SquaddieActionResult => {
    if ((original.conditionsAdded ?? []).length == 0) return reversed

    const hinderingConditions: SquaddieCondition[] = []
    const helpfulConditions: SquaddieCondition[] = []

    for (const condition of original.conditionsAdded!) {
        if (SquaddieConditionService.isHindering(condition)) {
            hinderingConditions.push(condition)
        } else if (SquaddieConditionService.isHelpful(condition)) {
            helpfulConditions.push(condition)
        }
    }

    if (hinderingConditions.length > 0) {
        const types = Array.from(
            new Set(hinderingConditions.map((c) => c.type))
        )
        const totalAmount = hinderingConditions.reduce(
            (sum, c) => sum + (c.amount ?? 0),
            0
        )
        reversed.treat = {
            conditionTypes: { types, all: false },
            amount: totalAmount > 0 ? totalAmount : undefined,
        }
    }

    if (helpfulConditions.length > 0) {
        const types = Array.from(new Set(helpfulConditions.map((c) => c.type)))
        const totalAmount = helpfulConditions.reduce(
            (sum, c) => sum + (c.amount ?? 0),
            0
        )
        reversed.dispel = {
            conditionTypes: { types, all: false },
            amount: totalAmount > 0 ? totalAmount : undefined,
        }
    }

    return reversed
}

const reverseDispel = (
    original: SquaddieActionResult,
    reversed: SquaddieActionResult
): SquaddieActionResult => {
    if (
        original.dispel?.dispelledConditions == undefined ||
        original.dispel.dispelledConditions.size == 0
    )
        return reversed

    reversed.conditionsAdded = extractConditionsFromMap(
        original.dispel.dispelledConditions
    )

    return reversed
}

const reverseTreat = (
    original: SquaddieActionResult,
    reversed: SquaddieActionResult
): SquaddieActionResult => {
    if (
        original.treat?.treatedConditions == undefined ||
        original.treat.treatedConditions.size == 0
    )
        return reversed

    reversed.conditionsAdded = extractConditionsFromMap(
        original.treat.treatedConditions
    )

    return reversed
}

const reverseMovement = (
    original: SquaddieActionResult,
    reversed: SquaddieActionResult
): SquaddieActionResult => {
    if (original.movement?.expectedPath == undefined) return reversed
    const start = CoordinateMovePathService.getStartCoordinate(
        original.movement.expectedPath
    )
    const end = CoordinateMovePathService.getEndCoordinate(
        original.movement.expectedPath
    )

    reversed.movement = {
        expectedPath: CoordinateMovePathService.new({
            steps: [
                {
                    row: end.row,
                    col: end.col,
                    moveType: start.moveType,
                    moveCost: 0,
                },
                {
                    row: start.row,
                    col: start.col,
                    moveType: end.moveType,
                    moveCost: 0,
                },
            ],
        }),
    }
    return reversed
}
