import type { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager"
import type { TDegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess"
import type { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager"
import type { SquaddieActionManager } from "../../squaddieActionManager"
import {
    type SerializedSquaddieActionResult,
    type SquaddieActionResult,
    SquaddieActionResultService,
} from "./squaddieActionResult"
import type { SquaddieAction } from "../../squaddieAction"
import {
    HowToDetermineDegreeOfSuccess,
    MovementEffectType,
} from "../../squaddieAction"
import {
    ActionRange,
    ActionRangeService,
    type TActionRange,
} from "../../actionRange"
import type {
    BattleSquaddieId,
    InBattleSquaddie,
} from "../../../squaddie/inBattle/inBattleSquaddie"
import type { OutOfBattleSquaddie } from "../../../squaddie/outOfBattle/outOfBattleSquaddie"
import type { OutOfBattleSquaddieAttributeSheet } from "../../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet"
import { ProficiencyLevelConst } from "../../../proficiency/proficiencyLevel"
import {
    type SquaddieCondition,
    SquaddieConditionService,
    SquaddieConditionSource,
    type TSquaddieConditionType,
} from "../../../proficiency/squaddieCondition"
import {
    type CoordinateMovePath,
    CoordinateMovePathMoveType,
    CoordinateMovePathService,
} from "../../../coordinateMap/path/path"
import {
    type CoordinateMap,
    CoordinateMapService,
} from "../../../coordinateMap/coordinateMap"
import { CoordinateCalculator } from "../../../coordinateMap/coordinateCalculator"
import {
    type OffsetCoordinate,
    OffsetCoordinateService,
} from "../../../coordinateMap/offsetCoordinate"
import type { RollGenerator } from "../roll/rollGenerator"
import { SquaddieIdConverterService } from "../../../squaddie/idConverterService"
import type { SquaddieMovementInfo } from "../../../squaddie/squaddieMovementInfo"
import { ProficiencyCalculator } from "../proficiencyCalculator"
import { SquaddieActionForecastCalculator } from "../forecast/squaddieActionForecastCalculator"
import type { SquaddieActionEffect } from "../../squaddieActionEffect"
import { FlankingService } from "../../../coordinateMap/flankingService"
import { SneakAttackCalculator } from "../sneakAttackCalculator"

export type SquaddieActionDecisions = {
    targetDestination?: {
        row: number
        col: number
    }
    targetCoordinate?: {
        row: number
        col: number
    }
}

export interface ActionModifierBreakdown {
    actorProficiencyBonus: number
    targetDefensiveBonus: number
    multipleAttackPenalty: number
    netModifier: number
    isFlankingTarget: boolean
    sneakAttackDamage?: number
}

export interface ForecastedActionResult {
    battleSquaddieId: BattleSquaddieId
    degreeOfSuccess: TDegreeOfSuccess
    chanceOutOf36: number
    squaddieActionResults: SquaddieActionResult[]
    modifierBreakdown?: ActionModifierBreakdown
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
        includeActorEffects = true,
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
        includeActorEffects?: boolean
    }): SquaddieActionResult[] => {
        const actorSquaddie =
            managers.inBattleSquaddieManager.getSquaddie(actor)

        const squaddieAction = managers.squaddieActionManager.get(action.id)
        const actorEffectiveDegree = resolveActorEffectiveDegree(
            degreeOfSuccess,
            squaddieAction.effectOnActor
        )

        const actorResults: SquaddieActionResult[] = includeActorEffects
            ? calculateEffectOnSquaddie({
                  effect: squaddieAction.effectOnActor[actorEffectiveDegree],
                  decisions: action.decisions,
                  map,
                  managers,
                  actor: actorSquaddie,
                  target: actorSquaddie,
              })
            : []

        const coordinateMap = map?.mapId
            ? managers.coordinateMapCollectionManager?.getMapById(map.mapId)
            : undefined
        const scatterDestinations = computeScatterDestinations({
            effect: squaddieAction.effectOnTarget?.[degreeOfSuccess],
            targets,
            desiredDestination: action.decisions?.targetDestination,
            coordinateMap,
            actorCoordinate:
                CoordinateMapService.convertOffsetMaybeOffmapCoordinate(
                    coordinateMap
                        ? CoordinateMapService.getSquaddieCoordinate({
                              map: coordinateMap,
                              squaddieId: actor,
                          })
                        : undefined
                ),
        })

        const targetResults = calculateAllTargetEffects({
            targets,
            squaddieAction,
            degreeOfSuccess,
            scatterDestinations,
            actionDecisions: action.decisions,
            managers,
            map,
            actorSquaddie,
            coordinateMap,
        })

        return [...actorResults, ...targetResults]
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
        actorRoll?: [number, number]
        targetResults: Map<
            string,
            {
                degreeOfSuccess: TDegreeOfSuccess
                squaddieActionResults: SquaddieActionResult[]
                targetRoll?: [number, number]
            }
        >
    } => {
        const squaddieAction = managers.squaddieActionManager.get(action.id)

        if (
            squaddieAction.howToDetermineDegreeOfSuccess ===
            HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS
        ) {
            return calculateActionResultsWithoutRolls({
                targets: targets,
                managers: managers,
                actor: actor,
                action: action,
                map: map,
            })
        }

        if (
            squaddieAction.howToDetermineDegreeOfSuccess ===
            HowToDetermineDegreeOfSuccess.TARGETS_ROLL_TO_RESIST
        ) {
            return calculateWithTargetRolls({
                targets,
                managers,
                actor,
                action,
                rollGenerator,
                map,
            })
        }
        return calculateWithActorRoll({
            actor: actor,
            squaddieAction: squaddieAction,
            managers: managers,
            rollGenerator: rollGenerator,
            targets: targets,
            action: action,
            map: map,
        })
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
            map,
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

            const modifierBreakdown = computeModifierBreakdown({
                actor,
                target: {
                    inBattleSquaddieId: battleSquaddieId.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        battleSquaddieId.outOfBattleSquaddieId,
                },
                action,
                inBattleSquaddieManager,
                map,
            })

            results.push({
                battleSquaddieId,
                degreeOfSuccess,
                chanceOutOf36,
                squaddieActionResults,
                modifierBreakdown,
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
            modifierBreakdown:
                result.modifierBreakdown == undefined
                    ? undefined
                    : { ...result.modifierBreakdown },
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
    target,
    inBattleSquaddieManager,
}: {
    actionPoints: SquaddieActionEffect["actionPoints"] | undefined
    target: {
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    }
    inBattleSquaddieManager: InBattleSquaddieManager
}): SquaddieActionResult[] => {
    if (actionPoints == undefined) return []

    return [
        {
            inBattleSquaddieId: target.inBattleSquaddie.id,
            outOfBattleSquaddieId: target.outOfBattleSquaddie.id,
            actionPoints: inBattleSquaddieManager.previewSpendActionPoints({
                inBattleSquaddieId: target.inBattleSquaddie.id,
                outOfBattleSquaddieId: target.outOfBattleSquaddie.id,
                actionPoints:
                    actionPoints.spent == "all"
                        ? target.inBattleSquaddie.actionPoints.current
                        : actionPoints.spent,
            }),
        },
    ]
}

const calculateEffectOnSquaddie = ({
    effect,
    actor,
    target,
    managers,
    decisions,
    map,
    overrideCoordinateMap,
    sneakAttackBonus = 0,
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
    overrideCoordinateMap?: CoordinateMap
    sneakAttackBonus?: number
}): SquaddieActionResult[] => {
    if (effect == undefined) return []

    let results: SquaddieActionResult[] = []
    results.push(
        ...calculateActionPointChange({
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
            actionPoints: effect?.actionPoints,
            target,
        }),
        ...calculateDamageResults({
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
            damage: effect?.damage,
            target,
            sneakAttackBonus,
        }),
        ...calculateHealingResults({
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
            healing: effect?.healing,
            target,
        }),
        ...calculateActionPointsRestorationResults({
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
            actionPointsRestore: effect?.actionPoints?.restore,
            target,
        }),
        ...calculateConditionAddResults({
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
            conditions: effect?.conditions?.add,
            target,
        }),
        ...calculateConditionDispelResults({
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
            conditions: effect?.conditions?.dispel,
            target,
        }),
        ...calculateConditionTreatResults({
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
            conditions: effect?.conditions?.treat,
            target,
        }),
        ...calculateMovementResults({
            managers,
            decisions,
            movement: effect?.movement,
            map,
            actionPointsEffect: effect?.actionPoints,
            actorInBattleSquaddie: actor.inBattleSquaddie,
            target,
            overrideCoordinateMap,
        })
    )

    return results
}

const calculateDamageResults = ({
    damage,
    target,
    inBattleSquaddieManager,
    sneakAttackBonus = 0,
}: {
    damage: SquaddieActionEffect["damage"] | undefined
    target: {
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    }
    inBattleSquaddieManager: InBattleSquaddieManager
    sneakAttackBonus?: number
}): SquaddieActionResult[] => {
    if (damage == undefined) return []

    const damageAttributeScoreType =
        ProficiencyLevelConst.attributeScoreByProficiencyType.get(
            damage.targetProficiency
        ) ?? damage.attributeScoreType

    const totalDamage = damage.raw + sneakAttackBonus

    const previewedDamage = inBattleSquaddieManager.previewDamageToSquaddie({
        inBattleSquaddieId: target.inBattleSquaddie.id,
        outOfBattleSquaddieId: target.outOfBattleSquaddie.id,
        damage: {
            amount: totalDamage,
            type: damageAttributeScoreType,
        },
    })

    if (previewedDamage == undefined) return []

    return [
        {
            inBattleSquaddieId: target.inBattleSquaddie.id,
            outOfBattleSquaddieId: target.outOfBattleSquaddie.id,
            damage: {
                net: previewedDamage.net,
                raw: totalDamage,
                willKo: previewedDamage.willKo,
                absorbed: previewedDamage.absorbed,
                type: damageAttributeScoreType,
                sneakAttackDamage:
                    sneakAttackBonus > 0 ? sneakAttackBonus : undefined,
            },
        },
    ]
}

const calculateHealingResults = ({
    healing,
    target,
    inBattleSquaddieManager,
}: {
    healing: SquaddieActionEffect["healing"] | undefined
    target: {
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    }
    inBattleSquaddieManager: InBattleSquaddieManager
}): SquaddieActionResult[] => {
    if (healing == undefined) return []

    const previewedHealing = inBattleSquaddieManager.previewHealingToSquaddie({
        inBattleSquaddieId: target.inBattleSquaddie.id,
        outOfBattleSquaddieId: target.outOfBattleSquaddie.id,
        healing,
    })

    if (previewedHealing == undefined) return []

    return [
        {
            inBattleSquaddieId: target.inBattleSquaddie.id,
            outOfBattleSquaddieId: target.outOfBattleSquaddie.id,
            healing: {
                net: previewedHealing.net,
                ...healing,
            },
        },
    ]
}

const calculateActionPointsRestorationResults = ({
    actionPointsRestore,
    target,
    inBattleSquaddieManager,
}: {
    actionPointsRestore: number | undefined
    target: {
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    }
    inBattleSquaddieManager: InBattleSquaddieManager
}): SquaddieActionResult[] => {
    if (actionPointsRestore == undefined) return []

    const previewedRestoration =
        inBattleSquaddieManager.previewRestoreActionPoints({
            inBattleSquaddieId: target.inBattleSquaddie.id,
            outOfBattleSquaddieId: target.outOfBattleSquaddie.id,
            actionPoints: actionPointsRestore,
        })

    return [
        {
            inBattleSquaddieId: target.inBattleSquaddie.id,
            outOfBattleSquaddieId: target.outOfBattleSquaddie.id,
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
    target,
    inBattleSquaddieManager,
}: {
    conditions: SquaddieCondition[] | undefined
    target: {
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    }
    inBattleSquaddieManager: InBattleSquaddieManager
}): SquaddieActionResult[] => {
    if (conditions == undefined) return []

    const info = inBattleSquaddieManager.previewAddConditionsToSquaddie({
        inBattleSquaddieId: target.inBattleSquaddie.id,
        outOfBattleSquaddieId: target.outOfBattleSquaddie.id,
        conditions,
    })

    return [
        {
            inBattleSquaddieId: target.inBattleSquaddie.id,
            outOfBattleSquaddieId: target.outOfBattleSquaddie.id,
            conditionsAdded: info.newConditions,
        },
    ]
}

const calculateConditionDispelResults = ({
    conditions,
    target,
    inBattleSquaddieManager,
}: {
    conditions:
        | {
              all: boolean
              types: TSquaddieConditionType[]
              amount: number | undefined
          }
        | undefined
    target: {
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    }
    inBattleSquaddieManager: InBattleSquaddieManager
}): SquaddieActionResult[] => {
    if (conditions == undefined) return []

    const dispelledConditionsResult =
        inBattleSquaddieManager.previewDispelConditions({
            inBattleSquaddieId: target.inBattleSquaddie.id,
            outOfBattleSquaddieId: target.outOfBattleSquaddie.id,
            conditionTypes: {
                all: conditions.all,
                types: conditions.types,
            },
            amount: conditions.amount,
        })

    return [
        {
            inBattleSquaddieId: target.inBattleSquaddie.id,
            outOfBattleSquaddieId: target.outOfBattleSquaddie.id,
            dispel: dispelledConditionsResult,
        },
    ]
}

const calculateConditionTreatResults = ({
    conditions,
    target,
    inBattleSquaddieManager,
}: {
    conditions:
        | {
              all: boolean
              types: TSquaddieConditionType[]
              amount: number | undefined
          }
        | undefined
    target: {
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    }
    inBattleSquaddieManager: InBattleSquaddieManager
}): SquaddieActionResult[] => {
    if (conditions == undefined) return []

    const treatConditionsResult =
        inBattleSquaddieManager.previewTreatConditions({
            inBattleSquaddieId: target.inBattleSquaddie.id,
            outOfBattleSquaddieId: target.outOfBattleSquaddie.id,
            conditionTypes: {
                all: conditions.all,
                types: conditions.types,
            },
            amount: conditions.amount,
        })

    return [
        {
            inBattleSquaddieId: target.inBattleSquaddie.id,
            outOfBattleSquaddieId: target.outOfBattleSquaddie.id,
            treat: treatConditionsResult,
        },
    ]
}

const calculateMovementResults = ({
    target,
    managers,
    decisions,
    movement,
    map,
    actionPointsEffect,
    actorInBattleSquaddie,
    overrideCoordinateMap,
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
    target: {
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    }
    actorInBattleSquaddie: InBattleSquaddie
    overrideCoordinateMap?: CoordinateMap
}): SquaddieActionResult[] => {
    if (movement == undefined) return []
    if (
        map == undefined ||
        managers.coordinateMapCollectionManager == undefined
    )
        return []

    const coordinateMap =
        overrideCoordinateMap ??
        managers.coordinateMapCollectionManager.getMapById(map.mapId)

    switch (movement.movementType) {
        case MovementEffectType.ACTOR_CHOSEN:
            return calculateActorChosenMovementResults({
                target,
                managers,
                decisions,
                actionPointsEffect,
                coordinateMap,
            })
        case MovementEffectType.ACTOR_CHOSEN_SPECIAL_TRAVERSAL:
            return calculateActorChosenMovementResults({
                target,
                managers,
                decisions,
                actionPointsEffect,
                coordinateMap,
                traversalOverrides: movement.traversal,
            })
        case MovementEffectType.TELEPORT_TO_ACTOR_CHOSEN:
            return calculateTeleportToActorChosenResults({
                target,
                decisions,
            })
        case MovementEffectType.FORCED_TOWARD_ACTOR:
            return calculateForcedTowardActorResults({
                target: {
                    inBattleSquaddieId: target.inBattleSquaddie.id,
                    outOfBattleSquaddieId: target.outOfBattleSquaddie.id,
                },
                actorInBattleSquaddie,
                coordinateMap,
                forcedDistance: movement.forcedDistance ?? 1,
            })
    }
}

const calculateActorChosenMovementResults = ({
    target,
    managers,
    decisions,
    actionPointsEffect,
    coordinateMap,
    traversalOverrides,
}: {
    managers: {
        inBattleSquaddieManager: InBattleSquaddieManager
        coordinateMapCollectionManager?: CoordinateMapCollectionManager
    }
    actionPointsEffect: SquaddieActionEffect["actionPoints"] | undefined
    decisions: SquaddieActionDecisions | undefined
    target: {
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    }
    coordinateMap: CoordinateMap
    traversalOverrides?: Partial<
        Omit<SquaddieMovementInfo, "movementPointsPerAction">
    >
}): SquaddieActionResult[] => {
    if (decisions?.targetDestination == undefined) return []

    const routeInfo = CoordinateMapService.calculateRoute({
        map: coordinateMap,
        inBattleSquaddieManager: managers.inBattleSquaddieManager,
        inBattleSquaddieId: target.inBattleSquaddie.id,
        outOfBattleSquaddieId: target.outOfBattleSquaddie.id,
        stopConditions: [
            {
                desiredDestination: decisions.targetDestination,
            },
        ],
        traversalOverrides,
    })

    let actionPointCost = 0
    if (actionPointsEffect?.additional?.movementPathActionPointCost)
        actionPointCost +=
            managers.inBattleSquaddieManager.calculateActionPointsForMovement({
                inBattleSquaddieId: target.inBattleSquaddie.id,
                outOfBattleSquaddieId: target.outOfBattleSquaddie.id,
                movementCost: CoordinateMovePathService.getTotalMoveCost(
                    routeInfo.expectedPath
                ),
            })

    return [
        {
            inBattleSquaddieId: target.inBattleSquaddie.id,
            outOfBattleSquaddieId: target.outOfBattleSquaddie.id,
            movement: { expectedPath: routeInfo.expectedPath },
            actionPoints: { spent: actionPointCost },
        },
    ]
}

const sortTargetsByDistanceToActor = (
    targets: BattleSquaddieId[],
    actorCoordinate: OffsetCoordinate | undefined,
    coordinateMap: CoordinateMap
) => {
    return [...targets].sort((a, b) => {
        if (actorCoordinate == undefined) return 0
        const coordMaybeOffmapA = CoordinateMapService.getSquaddieCoordinate({
            map: coordinateMap,
            squaddieId: a,
        })
        const coordinateA =
            CoordinateMapService.convertOffsetMaybeOffmapCoordinate(
                coordMaybeOffmapA
            )
        const coordMaybeOffmapB = CoordinateMapService.getSquaddieCoordinate({
            map: coordinateMap,
            squaddieId: b,
        })
        const coordinateB =
            CoordinateMapService.convertOffsetMaybeOffmapCoordinate(
                coordMaybeOffmapB
            )
        const distA =
            coordinateA == undefined
                ? Infinity
                : CoordinateCalculator.getDistanceBetween(
                      actorCoordinate,
                      coordinateA
                  )
        const distB =
            coordinateB == undefined
                ? Infinity
                : CoordinateCalculator.getDistanceBetween(
                      actorCoordinate,
                      coordinateB
                  )
        return distA - distB
    })
}
const computeScatterDestinations = ({
    effect,
    targets,
    desiredDestination,
    coordinateMap,
    actorCoordinate,
}: {
    effect: SquaddieActionEffect | undefined
    targets: BattleSquaddieId[]
    desiredDestination: OffsetCoordinate | undefined
    coordinateMap: CoordinateMap | undefined
    actorCoordinate: OffsetCoordinate | undefined
}): Map<string, OffsetCoordinate | undefined> => {
    const result = new Map<string, OffsetCoordinate | undefined>()
    if (
        effect?.movement?.movementType !==
            MovementEffectType.TELEPORT_TO_ACTOR_CHOSEN ||
        coordinateMap == undefined
    )
        return result

    const { destinationRange } = effect.movement

    let effectiveOrigin: OffsetCoordinate | undefined =
        calculateEffectiveOrigin(
            destinationRange,
            actorCoordinate,
            desiredDestination
        )

    if (effectiveOrigin == undefined)
        return markAllTargetsInvalid(targets, result)

    const sortedTargets = sortTargetsByDistanceToActor(
        targets,
        actorCoordinate,
        coordinateMap
    )

    const claimedCoordinateKeys = new Set<string>()
    const maxSearchRadius =
        CoordinateMapService.getNumberOfColumns({
            map: coordinateMap,
        }) + CoordinateMapService.getNumberOfRows({ map: coordinateMap })

    for (const target of sortedTargets) {
        const targetBattleSquaddieKey =
            SquaddieIdConverterService.squaddieIdToKey(target)
        let assignedCoordinate: OffsetCoordinate | undefined
        for (
            let ring = 0;
            ring <= maxSearchRadius && assignedCoordinate == undefined;
            ring++
        ) {
            const candidates = CoordinateCalculator.getCoordinatesInRing(
                effectiveOrigin,
                ring
            )
            for (const candidate of candidates) {
                const coordinateKey =
                    OffsetCoordinateService.coordinateToKey(candidate)
                if (
                    !claimedCoordinateKeys.has(coordinateKey) &&
                    CoordinateMapService.canSquaddieStopAtCoordinate({
                        map: coordinateMap,
                        coordinate: candidate,
                        squaddieId: target,
                    })
                ) {
                    assignedCoordinate = candidate
                    claimedCoordinateKeys.add(coordinateKey)
                    break
                }
            }
        }
        result.set(targetBattleSquaddieKey, assignedCoordinate)
    }

    return result
}

const calculateTeleportToActorChosenResults = ({
    target,
    decisions,
}: {
    target: {
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
    }
    decisions: SquaddieActionDecisions | undefined
}): SquaddieActionResult[] => {
    if (decisions?.targetDestination == undefined) return []

    const { row, col } = decisions.targetDestination
    const teleportPath: CoordinateMovePath = CoordinateMovePathService.new({
        steps: [
            {
                row,
                col,
                moveType: CoordinateMovePathMoveType.START,
                moveCost: 0,
            },
        ],
    })

    return [
        {
            inBattleSquaddieId: target.inBattleSquaddie.id,
            outOfBattleSquaddieId: target.outOfBattleSquaddie.id,
            movement: { expectedPath: teleportPath },
            actionPoints: { spent: 0 },
        },
    ]
}

const calculateForcedTowardActorResults = ({
    target,
    actorInBattleSquaddie,
    coordinateMap,
    forcedDistance,
}: {
    target: BattleSquaddieId
    actorInBattleSquaddie: InBattleSquaddie
    coordinateMap: CoordinateMap
    forcedDistance: number
}): SquaddieActionResult[] => {
    const targetCoordinate = CoordinateMapService.getSquaddieCoordinate({
        map: coordinateMap,
        squaddieId: {
            inBattleSquaddieId: target.inBattleSquaddieId,
            outOfBattleSquaddieId: target.outOfBattleSquaddieId,
        },
    })
    const actorCoordinate = CoordinateMapService.getSquaddieCoordinate({
        map: coordinateMap,
        squaddieId: {
            inBattleSquaddieId: actorInBattleSquaddie.id,
            outOfBattleSquaddieId: actorInBattleSquaddie.outOfBattleSquaddieId,
        },
    })

    if (
        targetCoordinate?.row == undefined ||
        targetCoordinate?.col == undefined ||
        actorCoordinate?.row == undefined ||
        actorCoordinate?.col == undefined
    )
        return []

    const lineTowardActor = CoordinateCalculator.calculateEveryCoordinateInLine(
        { row: targetCoordinate.row, col: targetCoordinate.col },
        { row: actorCoordinate.row, col: actorCoordinate.col }
    )

    const targetBattleSquaddieId = {
        inBattleSquaddieId: target.inBattleSquaddieId,
        outOfBattleSquaddieId: target.outOfBattleSquaddieId,
    }
    let lastValidCoordinate = {
        row: targetCoordinate.row,
        col: targetCoordinate.col,
    }
    const stepsWalked = []
    for (
        let i = 1;
        i <= Math.min(forcedDistance, lineTowardActor.length - 1);
        i++
    ) {
        const candidate = lineTowardActor[i]
        if (
            !CoordinateMapService.canSquaddieStopAtCoordinate({
                map: coordinateMap,
                coordinate: candidate,
                squaddieId: targetBattleSquaddieId,
            })
        )
            break
        lastValidCoordinate = candidate
        stepsWalked.push(candidate)
    }

    const pathSteps = [
        {
            row: targetCoordinate.row,
            col: targetCoordinate.col,
            moveType: CoordinateMovePathMoveType.START,
            moveCost: 0,
        },
        ...stepsWalked.map((step) => ({
            row: step.row,
            col: step.col,
            moveType: CoordinateMovePathMoveType.WALK,
            moveCost: 1,
        })),
    ]

    if (
        lastValidCoordinate.row === targetCoordinate.row &&
        lastValidCoordinate.col === targetCoordinate.col
    )
        return []

    return [
        {
            inBattleSquaddieId: target.inBattleSquaddieId,
            outOfBattleSquaddieId: target.outOfBattleSquaddieId,
            movement: {
                expectedPath: CoordinateMovePathService.new({
                    steps: pathSteps,
                }),
            },
            actionPoints: { spent: 0 },
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

const resolveActorEffectiveDegree = (
    degree: TDegreeOfSuccess,
    effectOnActor: SquaddieAction["effectOnActor"]
): TDegreeOfSuccess => {
    if (effectOnActor[degree] != undefined) return degree

    if (degree === DegreeOfSuccess.CRITICAL) return DegreeOfSuccess.SUCCESS
    if (degree === DegreeOfSuccess.FAILURE) return DegreeOfSuccess.SUCCESS
    if (degree === DegreeOfSuccess.BOTCH) {
        if (effectOnActor[DegreeOfSuccess.FAILURE] != undefined)
            return DegreeOfSuccess.FAILURE
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
            conditions.push(
                SquaddieConditionService.new({
                    type,
                    amount:
                        conditionData.amount != undefined
                            ? { amount: conditionData.amount.current }
                            : undefined,
                    duration: conditionData.limit.duration,
                    source: SquaddieConditionSource.ITEM,
                })
            )
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
            (sum, c) => sum + (c.amount?.current ?? 0),
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
            (sum, c) => sum + (c.amount?.current ?? 0),
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

const computeModifierBreakdown = ({
    actor,
    target,
    action,
    inBattleSquaddieManager,
    map,
}: {
    actor: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }
    target: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }
    action: {
        id: string
        manager: SquaddieActionManager
    }
    inBattleSquaddieManager: InBattleSquaddieManager
    map?: {
        mapId: string
        manager: CoordinateMapCollectionManager
    }
}): ActionModifierBreakdown | undefined => {
    const squaddieAction = action.manager.get(action.id)
    if (
        squaddieAction.howToDetermineDegreeOfSuccess ===
        HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS
    )
        return undefined

    const actorProficiencyBonus =
        ProficiencyCalculator.getActorProficiencyBonus({
            actor,
            squaddieAction,
            inBattleSquaddieManager,
        })

    const attackContributionThisTurn = squaddieAction.multipleAttackPenalty
        .applies
        ? inBattleSquaddieManager.getAttackContributionThisTurn({
              inBattleSquaddieId: actor.inBattleSquaddieId,
              outOfBattleSquaddieId: actor.outOfBattleSquaddieId,
          })
        : 0
    const multipleAttackPenalty =
        ProficiencyCalculator.getMapPenaltyFromAttackCount(
            attackContributionThisTurn
        )

    const isFlankingTarget =
        map == undefined
            ? false
            : FlankingService.isActorFlankingTarget({
                  actor,
                  target,
                  mapId: map.mapId,
                  coordinateMapCollectionManager: map.manager,
                  inBattleSquaddieManager,
              })

    const targetDefensiveBonus = ProficiencyCalculator.getTargetDefensiveBonus({
        target,
        squaddieAction,
        inBattleSquaddieManager,
        isActorFlankingTarget: isFlankingTarget,
    })

    const netModifier =
        actorProficiencyBonus - targetDefensiveBonus - multipleAttackPenalty

    const actorSheet = inBattleSquaddieManager.getSquaddie(actor).attributeSheet
    const successEffect =
        squaddieAction.effectOnTarget?.[DegreeOfSuccess.SUCCESS]
    const sneakAttackDamage = SneakAttackCalculator.computeSneakAttackBonus({
        actor,
        actorPassiveSneakAttack: actorSheet.sneakAttackDamage ?? 0,
        target,
        squaddieAction,
        damageEffect: successEffect?.damage,
        degreeOfSuccess: DegreeOfSuccess.SUCCESS,
        inBattleSquaddieManager,
        map,
    })

    return {
        actorProficiencyBonus,
        targetDefensiveBonus,
        multipleAttackPenalty,
        netModifier,
        isFlankingTarget,
        sneakAttackDamage:
            sneakAttackDamage > 0 ? sneakAttackDamage : undefined,
    }
}

const calculateActionResultsWithoutRolls = ({
    targets,
    managers,
    actor,
    action,
    map,
}: {
    targets: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }[]
    managers: {
        inBattleSquaddieManager: InBattleSquaddieManager
        squaddieActionManager: SquaddieActionManager
        coordinateMapCollectionManager?: CoordinateMapCollectionManager
    }
    actor: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }
    action: { id: string; decisions?: SquaddieActionDecisions }
    map?: {
        mapId: string
    }
}) => {
    const targetResults = new Map<
        string,
        {
            degreeOfSuccess: TDegreeOfSuccess
            squaddieActionResults: SquaddieActionResult[]
        }
    >()

    let isFirstTarget = true
    for (const target of targets) {
        const targetKey = SquaddieIdConverterService.squaddieIdToKey({
            inBattleSquaddieId: target.inBattleSquaddieId,
            outOfBattleSquaddieId: target.outOfBattleSquaddieId,
        })

        const results = SquaddieActionResultCalculator.calculateResult({
            degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            managers,
            actor,
            targets: [target],
            action,
            map,
            includeActorEffects: isFirstTarget,
        })
        isFirstTarget = false

        targetResults.set(targetKey, {
            degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            squaddieActionResults: results,
        })
    }

    return {
        actorRoll: undefined,
        targetResults,
    }
}

const calculateWithTargetRolls = ({
    targets,
    managers,
    actor,
    action,
    rollGenerator,
    map,
}: {
    targets: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }[]
    managers: {
        inBattleSquaddieManager: InBattleSquaddieManager
        squaddieActionManager: SquaddieActionManager
        coordinateMapCollectionManager?: CoordinateMapCollectionManager
    }
    actor: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }
    action: { id: string; decisions?: SquaddieActionDecisions }
    rollGenerator: RollGenerator
    map?: { mapId: string }
}) => {
    const squaddieAction = managers.squaddieActionManager.get(action.id)

    const actorBonus = ProficiencyCalculator.getActorProficiencyBonus({
        actor,
        squaddieAction,
        inBattleSquaddieManager: managers.inBattleSquaddieManager,
    })
    const targetNumber = 6 + actorBonus

    const allowedDegrees = new Set<TDegreeOfSuccess>(
        squaddieAction.degreesOfSuccess ?? [
            DegreeOfSuccess.CRITICAL,
            DegreeOfSuccess.SUCCESS,
            DegreeOfSuccess.FAILURE,
            DegreeOfSuccess.BOTCH,
        ]
    )

    const targetResults = new Map<
        string,
        {
            degreeOfSuccess: TDegreeOfSuccess
            squaddieActionResults: SquaddieActionResult[]
            targetRoll?: [number, number]
        }
    >()

    let isFirstTarget = true
    for (const target of targets) {
        const rollResult = rollGenerator.roll(2)
        const targetRoll: [number, number] = [rollResult[0], rollResult[1]]
        const isMaxRoll = targetRoll[0] === 6 && targetRoll[1] === 6
        const isMinRoll = targetRoll[0] === 1 && targetRoll[1] === 1

        const targetDefenseBonus =
            ProficiencyCalculator.getTargetDefensiveBonus({
                target,
                squaddieAction,
                inBattleSquaddieManager: managers.inBattleSquaddieManager,
            })

        const degreeValue =
            targetRoll[0] + targetRoll[1] + targetDefenseBonus - targetNumber

        let degree = getBaseDegreeFromValue(degreeValue)
        if (isMaxRoll) {
            degree = increaseDegree(degree)
        } else if (isMinRoll) {
            degree = decreaseDegree(degree)
        }
        degree = redistributeUnsupportedDegree(degree, allowedDegrees)

        const targetKey = SquaddieIdConverterService.squaddieIdToKey({
            inBattleSquaddieId: target.inBattleSquaddieId,
            outOfBattleSquaddieId: target.outOfBattleSquaddieId,
        })

        const results = SquaddieActionResultCalculator.calculateResult({
            degreeOfSuccess: degree,
            managers,
            actor,
            targets: [target],
            action,
            map,
            includeActorEffects: isFirstTarget,
        })
        isFirstTarget = false

        targetResults.set(targetKey, {
            degreeOfSuccess: degree,
            squaddieActionResults: results,
            targetRoll,
        })
    }

    return {
        actorRoll: undefined,
        targetResults,
    }
}

const calculateEffectiveOrigin = (
    destinationRange: TActionRange | undefined,
    actorCoordinate: OffsetCoordinate | undefined,
    desiredDestination: OffsetCoordinate | undefined
): OffsetCoordinate | undefined => {
    let effectiveOrigin: OffsetCoordinate | undefined
    if (destinationRange === ActionRange.SELF) {
        effectiveOrigin = actorCoordinate
    } else if (destinationRange == undefined) {
        if (desiredDestination == undefined) return undefined
        effectiveOrigin = desiredDestination
    } else {
        if (desiredDestination == undefined) return undefined
        if (actorCoordinate != undefined) {
            const distance = CoordinateCalculator.getDistanceBetween(
                actorCoordinate,
                desiredDestination
            )
            const { maximum } =
                ActionRangeService.minAndMaxByRange[destinationRange]
            if (distance > maximum) return undefined
        }
        effectiveOrigin = desiredDestination
    }
    return effectiveOrigin
}

const markAllTargetsInvalid = (
    targets: BattleSquaddieId[],
    result: Map<string, OffsetCoordinate | undefined>
): Map<string, OffsetCoordinate | undefined> => {
    for (const target of targets) {
        result.set(
            SquaddieIdConverterService.squaddieIdToKey(target),
            undefined
        )
    }
    return result
}

const calculateWithActorRoll = ({
    actor,
    squaddieAction,
    managers,
    rollGenerator,
    targets,
    action,
    map,
}: {
    actor: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }
    squaddieAction: SquaddieAction
    managers: {
        inBattleSquaddieManager: InBattleSquaddieManager
        squaddieActionManager: SquaddieActionManager
        coordinateMapCollectionManager?: CoordinateMapCollectionManager
    }
    rollGenerator: RollGenerator
    targets: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }[]
    action: { id: string; decisions?: SquaddieActionDecisions }
    map: { mapId: string } | undefined
}) => {
    const actorProficiencyBonus =
        ProficiencyCalculator.getActorProficiencyBonus({
            actor,
            squaddieAction,
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
        })

    const attackContributionThisTurn = squaddieAction.multipleAttackPenalty
        .applies
        ? managers.inBattleSquaddieManager.getAttackContributionThisTurn({
              inBattleSquaddieId: actor.inBattleSquaddieId,
              outOfBattleSquaddieId: actor.outOfBattleSquaddieId,
          })
        : 0
    const mapPenalty = ProficiencyCalculator.getMapPenaltyFromAttackCount(
        attackContributionThisTurn
    )

    const rollResult = rollGenerator.roll(2)
    const actorRoll: [number, number] = [rollResult[0], rollResult[1]]

    const targetModifierDifferences = new Map<string, number>()

    for (const target of targets) {
        const isActorFlankingTarget =
            map != undefined &&
            managers.coordinateMapCollectionManager != undefined
                ? FlankingService.isActorFlankingTarget({
                      actor,
                      target,
                      mapId: map.mapId,
                      coordinateMapCollectionManager:
                          managers.coordinateMapCollectionManager,
                      inBattleSquaddieManager: managers.inBattleSquaddieManager,
                  })
                : false

        const targetDefensiveBonus =
            ProficiencyCalculator.getTargetDefensiveBonus({
                target,
                squaddieAction,
                inBattleSquaddieManager: managers.inBattleSquaddieManager,
                isActorFlankingTarget,
            })

        const modifierDifference =
            ProficiencyCalculator.calculateModifierDifference({
                rollingSquaddieBonus: actorProficiencyBonus,
                staticBonus: targetDefensiveBonus,
                multipleAttackPenalty: mapPenalty,
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

    let isFirstTarget = true
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
            includeActorEffects: isFirstTarget,
        })
        isFirstTarget = false

        targetResults.set(targetKey, {
            degreeOfSuccess,
            squaddieActionResults: results,
        })
    }

    return {
        actorRoll,
        targetResults,
    }
}
const applyMovementToWorkingMap = (
    workingCoordinateMap: CoordinateMap,
    results: SquaddieActionResult[]
): CoordinateMap => {
    let updatedMap = workingCoordinateMap
    for (const r of results) {
        const steps = r.movement?.expectedPath?.steps
        if (steps && steps.length > 0) {
            const lastStep = steps.at(-1)!
            updatedMap = CoordinateMapService.addSquaddie({
                map: updatedMap,
                squaddieId: {
                    inBattleSquaddieId: r.inBattleSquaddieId,
                    outOfBattleSquaddieId: r.outOfBattleSquaddieId,
                },
                coordinate: { row: lastStep.row, col: lastStep.col },
            })
        }
    }
    return updatedMap
}

const calculateAllTargetEffects = ({
    targets,
    squaddieAction,
    degreeOfSuccess,
    scatterDestinations,
    actionDecisions,
    managers,
    map,
    actorSquaddie,
    coordinateMap,
}: {
    targets: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }[]
    squaddieAction: SquaddieAction
    degreeOfSuccess: TDegreeOfSuccess
    scatterDestinations: Map<string, OffsetCoordinate | undefined>
    actionDecisions: SquaddieActionDecisions | undefined
    managers: {
        inBattleSquaddieManager: InBattleSquaddieManager
        coordinateMapCollectionManager?: CoordinateMapCollectionManager
    }
    map: { mapId: string } | undefined
    actorSquaddie: {
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    }
    coordinateMap: CoordinateMap | undefined
}): SquaddieActionResult[] => {
    if (squaddieAction.effectOnTarget?.[degreeOfSuccess] == undefined) return []

    const actorCoordinate = coordinateMap
        ? CoordinateMapService.convertOffsetMaybeOffmapCoordinate(
              CoordinateMapService.getSquaddieCoordinate({
                  map: coordinateMap,
                  squaddieId: {
                      inBattleSquaddieId: actorSquaddie.inBattleSquaddie.id,
                      outOfBattleSquaddieId:
                          actorSquaddie.outOfBattleSquaddie.id,
                  },
              })
          )
        : undefined

    const sortedTargets =
        coordinateMap && actorCoordinate
            ? sortTargetsByDistanceToActor(
                  targets,
                  actorCoordinate,
                  coordinateMap
              )
            : targets

    const results: SquaddieActionResult[] = []
    let workingCoordinateMap: CoordinateMap | undefined = coordinateMap

    for (const target of sortedTargets) {
        const targetSquaddie =
            managers.inBattleSquaddieManager.getSquaddie(target)
        const targetKey = SquaddieIdConverterService.squaddieIdToKey(target)
        const perTargetDecisions: SquaddieActionDecisions | undefined =
            scatterDestinations.has(targetKey)
                ? {
                      ...actionDecisions,
                      targetDestination: scatterDestinations.get(targetKey),
                  }
                : actionDecisions

        const sneakAttackBonus = SneakAttackCalculator.computeSneakAttackBonus({
            actor: {
                inBattleSquaddieId: actorSquaddie.inBattleSquaddie.id,
                outOfBattleSquaddieId: actorSquaddie.outOfBattleSquaddie.id,
            },
            actorPassiveSneakAttack:
                actorSquaddie.attributeSheet.sneakAttackDamage ?? 0,
            target,
            squaddieAction,
            damageEffect:
                squaddieAction.effectOnTarget?.[degreeOfSuccess]?.damage,
            degreeOfSuccess,
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
            map:
                map?.mapId && managers.coordinateMapCollectionManager
                    ? {
                          mapId: map.mapId,
                          manager: managers.coordinateMapCollectionManager,
                      }
                    : undefined,
        })

        const targetResults = calculateEffectOnSquaddie({
            effect: squaddieAction.effectOnTarget[degreeOfSuccess],
            decisions: perTargetDecisions,
            map,
            managers,
            actor: actorSquaddie,
            target: targetSquaddie,
            overrideCoordinateMap: workingCoordinateMap,
            sneakAttackBonus,
        })

        results.push(...targetResults)

        if (workingCoordinateMap) {
            workingCoordinateMap = applyMovementToWorkingMap(
                workingCoordinateMap,
                targetResults
            )
        }
    }

    return results
}
