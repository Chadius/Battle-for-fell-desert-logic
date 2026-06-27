import type { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager"
import type { SquaddieActionManager } from "../../squaddieActionManager"
import type { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager"
import { SquaddieAffiliationService } from "../../../affiliation/affiliation"
import {
    ActionRange,
    ActionRangeService,
    type TActionRange,
} from "../../actionRange"
import { CoordinateCalculator } from "../../../coordinateMap/coordinateCalculator"
import {
    type ActionPointCost,
    MovementEffectType,
    type SquaddieAction,
    SquaddieActionService,
} from "../../squaddieAction"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap"
import type { SquaddieMovementInfo } from "../../../squaddie/squaddieMovementInfo"
import {
    CoordinateMapAStarAdapter,
    type CoordinateMapSearchLimits,
} from "../../../coordinateMap/coordinateMapAStarAdapter"
import { AStarSearchService } from "../../../aStarSearch/aStarSearch"
import {
    type CoordinateMovePath,
    CoordinateMovePathService,
} from "../../../coordinateMap/path/path"
import {
    type SquaddieActionDecisions,
    SquaddieActionResultCalculator,
} from "../result/squaddieActionResultCalculator"
import {
    type OffsetCoordinate,
    OffsetCoordinateService,
} from "../../../coordinateMap/offsetCoordinate"
import type { AStarGraph } from "../../../aStarSearch/aStarGraph"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess"
import type { SquaddieActionResult } from "../result/squaddieActionResult"
import { SquaddieIdConverterService } from "../../../squaddie/idConverterService"
import type {
    BattleSquaddieId,
    InBattleSquaddie,
} from "../../../squaddie/inBattle/inBattleSquaddie"
import { AoeTargetResolutionService } from "../aoe/aoeTargetResolutionService"
import { LineOfSightService } from "../../../coordinateMap/lineOfSightService"
import { CoordinateGeneratorShape } from "../../../coordinateMap/shape"

export interface InvalidSquaddieAction {
    actionId: string
    actionName: string
    reason: string
    apCost?: ActionPointCost
    cooldownTurns?: number
    usesPerTurn?: number
}

export interface ValidSquaddieAction {
    actionId: string
    actionName: string
    reachableCoordinates: OffsetCoordinate[]
    aimCoordinateResults: AimCoordinateResult[]
    apCost?: ActionPointCost
    cooldownTurns?: number
    usesPerTurn?: number
}

export interface SquaddieActionValidity {
    battleSquaddieId: BattleSquaddieId
    invalidActions: InvalidSquaddieAction[]
    validActions: ValidSquaddieAction[]
}

export interface ActionValidationResult {
    isValid: boolean
    reason?: string
    movementPath?: CoordinateMovePath
}

export interface ValidSquaddieActionOption {
    action: SquaddieAction
    decisions: SquaddieActionDecisions & {
        targetSquaddieIds?: BattleSquaddieId[]
    }
    movementPath?: CoordinateMovePath
    actionPointsRemaining: InBattleSquaddie["actionPoints"]
}

export interface AimCoordinateResult {
    aimCoordinate: OffsetCoordinate
    targetIds: BattleSquaddieId[]
}

export const SquaddieActionValidationService = {
    isActionValid: ({
        actor,
        action,
        targets,
        managers,
        map,
    }: {
        managers: {
            inBattleSquaddieManager: InBattleSquaddieManager
            squaddieActionManager: SquaddieActionManager
            coordinateMapCollectionManager: CoordinateMapCollectionManager
        }
        actor: BattleSquaddieId
        targets: BattleSquaddieId[]
        action: {
            id: string
            decisions?: SquaddieActionDecisions
        }
        map: {
            mapId: string
        }
    }): ActionValidationResult => {
        const squaddieAction = managers.squaddieActionManager.get(action.id)

        const cooldownValidation = validateActionCooldown({
            actor,
            squaddieAction,
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
        })
        if (!cooldownValidation.isValid) {
            return cooldownValidation
        }

        const usesValidation = validateActionUsesPerTurn({
            actor,
            squaddieAction,
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
        })
        if (!usesValidation.isValid) {
            return usesValidation
        }

        if (
            SquaddieActionService.getRequiredDecisions(squaddieAction)
                .requiresTargetDestination &&
            action.decisions?.targetDestination == undefined
        ) {
            return {
                isValid: false,
                reason: "This action requires a destination.",
            }
        }

        const actionPointCost =
            squaddieAction.effectOnActor.SUCCESS?.actionPoints?.spent

        const actionPointValidation = validateActionPointCost({
            actionPointCost,
            actor,
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
        })
        if (!actionPointValidation.isValid) {
            return actionPointValidation
        }

        const movementValidation = validateMovementPathByDistance({
            actor,
            squaddieAction,
            decisions: action.decisions,
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
            coordinateMapCollectionManager:
                managers.coordinateMapCollectionManager,
            mapId: map.mapId,
        })
        if (!movementValidation.isValid) {
            return movementValidation
        }

        const occupiedValidation = validateMovementDestinationNotOccupied({
            actor,
            squaddieAction,
            decisions: action.decisions,
            coordinateMapCollectionManager:
                managers.coordinateMapCollectionManager,
            mapId: map.mapId,
        })
        if (!occupiedValidation.isValid) {
            return occupiedValidation
        }

        const teleportDestinationValidation = validateActionDestination({
            actor,
            squaddieAction,
            decisions: action.decisions,
            coordinateMapCollectionManager:
                managers.coordinateMapCollectionManager,
            mapId: map.mapId,
        })
        if (!teleportDestinationValidation.isValid) {
            return teleportDestinationValidation
        }

        const isAoe = (squaddieAction.targeting.areaOfEffectSize ?? 0) > 0
        if (isAoe) {
            const aoeValidation = validateAoeAction({
                actor,
                targetCoordinate: action.decisions?.targetCoordinate,
                targets,
                squaddieAction,
                coordinateMapCollectionManager:
                    managers.coordinateMapCollectionManager,
                mapId: map.mapId,
            })
            if (!aoeValidation.isValid) {
                return aoeValidation
            }
        } else {
            const targetValidation = validateTargetsInRange({
                actor,
                targets,
                squaddieAction,
                inBattleSquaddieManager: managers.inBattleSquaddieManager,
                coordinateMapCollectionManager:
                    managers.coordinateMapCollectionManager,
                mapId: map.mapId,
            })
            if (!targetValidation.isValid) {
                return targetValidation
            }
        }

        const effectValidation = validateTargetsCanBeAffected({
            actor,
            targets,
            squaddieAction,
            decisions: action.decisions,
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
            squaddieActionManager: managers.squaddieActionManager,
            coordinateMapCollectionManager:
                managers.coordinateMapCollectionManager,
            mapId: map.mapId,
        })
        if (!effectValidation.isValid) {
            return effectValidation
        }

        return {
            isValid: true,
            movementPath: movementValidation.movementPath,
        }
    },
    calculateReachableSquaddiesByCoordinate: ({
        actor,
        action,
        managers,
        map,
        positionOverride,
    }: {
        managers: {
            inBattleSquaddieManager: InBattleSquaddieManager
            squaddieActionManager: SquaddieActionManager
            coordinateMapCollectionManager: CoordinateMapCollectionManager
        }
        actor: BattleSquaddieId
        action: { id: string }
        map: { mapId: string }
        positionOverride?: OffsetCoordinate
    }): Map<string, Set<string>> => {
        const squaddieAction = managers.squaddieActionManager.get(action.id)
        const actionRange = squaddieAction.targeting.range

        const reachableCoordinateKeys = getReachableCoordinateKeys({
            actor,
            actionRange,
            coordinateMapCollectionManager:
                managers.coordinateMapCollectionManager,
            mapId: map.mapId,
            positionOverride,
        })

        if ((squaddieAction.targeting.areaOfEffectSize ?? 0) > 0) {
            return resolveAoeTargetsByBlastCenter({
                actor,
                squaddieAction,
                reachableCoordinateKeys,
                mapId: map.mapId,
                managers,
            })
        }

        return groupSingleTargetsByCoordinate({
            actor,
            squaddieAction,
            reachableCoordinateKeys,
            managers,
            mapId: map.mapId,
            positionOverride,
        })
    },
    generateValidSquaddieActions: ({
        actor,
        managers,
        map,
        actionPointsOverride,
        positionOverride,
    }: {
        managers: {
            inBattleSquaddieManager: InBattleSquaddieManager
            squaddieActionManager: SquaddieActionManager
            coordinateMapCollectionManager: CoordinateMapCollectionManager
        }
        actor: BattleSquaddieId
        map: { mapId: string }
        actionPointsOverride?: InBattleSquaddie["actionPoints"]
        positionOverride?: OffsetCoordinate
    }): ValidSquaddieActionOption[] => {
        const currentActionPoints =
            actionPointsOverride ??
            managers.inBattleSquaddieManager.getActionPoints(actor)

        const options: ValidSquaddieActionOption[] = []

        options.push(
            generateEndTurnOption(),
            ...generateMovementOptions({
                actor,
                managers,
                map,
                currentActionPoints,
                positionOverride,
            }),
            ...generateAbilityActionOptions({
                actor,
                managers,
                map,
                currentActionPoints,
                positionOverride,
            })
        )

        return options
    },
    generateMovementOptionsForAction: ({
        actor,
        squaddieAction,
        managers,
        map,
        currentActionPoints,
    }: {
        actor: BattleSquaddieId
        squaddieAction: SquaddieAction
        managers: {
            inBattleSquaddieManager: InBattleSquaddieManager
            squaddieActionManager: SquaddieActionManager
            coordinateMapCollectionManager: CoordinateMapCollectionManager
        }
        map: { mapId: string }
        currentActionPoints: InBattleSquaddie["actionPoints"]
    }): ValidSquaddieActionOption[] => {
        const hasTeleportTargetEffect = Object.values(
            squaddieAction.effectOnTarget ?? {}
        ).some(
            (effect) =>
                effect?.movement?.movementType ===
                MovementEffectType.TELEPORT_TO_ACTOR_CHOSEN
        )
        if (hasTeleportTargetEffect) {
            return generateMovementOptionsForTeleportDestination({
                actor,
                squaddieAction,
                managers,
                map,
                currentActionPoints,
            })
        }
        return generateMovementOptionsForSpecialTraversal({
            actor,
            squaddieAction,
            managers,
            map,
            currentActionPoints,
        })
    },
    categorizeSquaddieActions: ({
        actor,
        managers,
        map,
    }: {
        managers: {
            inBattleSquaddieManager: InBattleSquaddieManager
            squaddieActionManager: SquaddieActionManager
            coordinateMapCollectionManager: CoordinateMapCollectionManager
        }
        actor: BattleSquaddieId
        map: { mapId: string }
    }): SquaddieActionValidity => {
        const squaddieInfo = managers.inBattleSquaddieManager.getSquaddie(actor)
        const actionIds = squaddieInfo.inBattleSquaddie.actionIds.natural
        const currentActionPoints =
            managers.inBattleSquaddieManager.getActionPoints(actor)

        const invalidActions: InvalidSquaddieAction[] = []
        const validActions: ValidSquaddieAction[] = []

        for (const actionId of actionIds) {
            if (!managers.squaddieActionManager.has(actionId)) continue
            const squaddieAction = managers.squaddieActionManager.get(actionId)

            const cooldownValidation = validateActionCooldown({
                actor,
                squaddieAction,
                inBattleSquaddieManager: managers.inBattleSquaddieManager,
            })
            const apCost =
                squaddieAction.effectOnActor.SUCCESS?.actionPoints?.spent

            if (!cooldownValidation.isValid) {
                invalidActions.push({
                    actionId,
                    actionName: squaddieAction.name,
                    reason: cooldownValidation.reason!,
                    apCost,
                    cooldownTurns: squaddieAction.cooldownTurns,
                    usesPerTurn: squaddieAction.usesPerTurn,
                })
                continue
            }

            const usesValidation = validateActionUsesPerTurn({
                actor,
                squaddieAction,
                inBattleSquaddieManager: managers.inBattleSquaddieManager,
            })
            if (!usesValidation.isValid) {
                invalidActions.push({
                    actionId,
                    actionName: squaddieAction.name,
                    reason: usesValidation.reason!,
                    apCost,
                    cooldownTurns: squaddieAction.cooldownTurns,
                    usesPerTurn: squaddieAction.usesPerTurn,
                })
                continue
            }

            const apReason = getActionPointInvalidReason({
                actionPointCost: apCost,
                currentActionPoints,
            })
            if (apReason != undefined) {
                invalidActions.push({
                    actionId,
                    actionName: squaddieAction.name,
                    reason: apReason,
                    apCost,
                    cooldownTurns: squaddieAction.cooldownTurns,
                    usesPerTurn: squaddieAction.usesPerTurn,
                })
                continue
            }

            const reachableCoordinateKeys = getReachableCoordinateKeys({
                actor,
                actionRange: squaddieAction.targeting.range,
                coordinateMapCollectionManager:
                    managers.coordinateMapCollectionManager,
                mapId: map.mapId,
            })
            const reachableCoordinates = [...reachableCoordinateKeys].map(
                (key) => OffsetCoordinateService.keyToCoordinate(key)
            )

            const aimCoordinateResults = calculateAimCoordinateResults({
                actor,
                action: { id: actionId },
                managers,
                map,
            })

            if (aimCoordinateResults.length === 0) {
                invalidActions.push({
                    actionId,
                    actionName: squaddieAction.name,
                    reason: "No applicable targets in range",
                    apCost,
                    cooldownTurns: squaddieAction.cooldownTurns,
                    usesPerTurn: squaddieAction.usesPerTurn,
                })
                continue
            }

            const effectiveAimCoordinateResults = aimCoordinateResults.filter(
                (entry) =>
                    entry.targetIds.length === 0 ||
                    checkIfActionHasEffectOnTargets({
                        actor,
                        targets: entry.targetIds,
                        squaddieAction,
                        managers,
                        map,
                    })
            )

            if (effectiveAimCoordinateResults.length === 0) {
                invalidActions.push({
                    actionId,
                    actionName: squaddieAction.name,
                    reason: "No targets can be affected",
                    apCost,
                    cooldownTurns: squaddieAction.cooldownTurns,
                    usesPerTurn: squaddieAction.usesPerTurn,
                })
                continue
            }

            validActions.push({
                actionId,
                actionName: squaddieAction.name,
                reachableCoordinates,
                aimCoordinateResults: effectiveAimCoordinateResults,
                apCost,
                cooldownTurns: squaddieAction.cooldownTurns,
                usesPerTurn: squaddieAction.usesPerTurn,
            })
        }

        validActions.push({
            actionId: "default-end-turn",
            actionName: "End Turn",
            reachableCoordinates: [],
            aimCoordinateResults: [],
            apCost: "all",
        })
        checkForValidMovementAction(
            actor,
            managers,
            map,
            currentActionPoints,
            validActions,
            invalidActions
        )

        return {
            battleSquaddieId: actor,
            invalidActions,
            validActions,
        }
    },
    generateValidSquaddieTurns: ({
        actor,
        managers,
        map,
        actionPointsOverride,
        positionOverride,
    }: {
        managers: {
            inBattleSquaddieManager: InBattleSquaddieManager
            squaddieActionManager: SquaddieActionManager
            coordinateMapCollectionManager: CoordinateMapCollectionManager
        }
        actor: BattleSquaddieId
        map: { mapId: string }
        actionPointsOverride?: InBattleSquaddie["actionPoints"]
        positionOverride?: OffsetCoordinate
    }): ValidSquaddieActionOption[][] => {
        const allTurnSequences: ValidSquaddieActionOption[][] = []

        const currentActionPoints =
            actionPointsOverride ??
            managers.inBattleSquaddieManager.getActionPoints(actor)

        let currentPosition: OffsetCoordinate | undefined = positionOverride

        if (currentPosition == undefined) {
            const actorCoordinate =
                managers.coordinateMapCollectionManager.getSquaddieCoordinate({
                    mapId: map.mapId,
                    squaddieId: actor,
                })

            if (
                actorCoordinate?.row == undefined ||
                actorCoordinate?.col == undefined
            ) {
                return allTurnSequences
            }

            currentPosition = {
                row: actorCoordinate.row,
                col: actorCoordinate.col,
            }
        }

        generateTurnsRecursively({
            actor,
            managers,
            map,
            currentPosition,
            currentActionPoints,
            currentSequence: [],
            allTurnSequences,
        })

        return allTurnSequences
    },
}

const generateTurnsRecursively = ({
    actor,
    managers,
    map,
    currentPosition,
    currentActionPoints,
    currentSequence,
    allTurnSequences,
}: {
    actor: BattleSquaddieId
    managers: {
        inBattleSquaddieManager: InBattleSquaddieManager
        squaddieActionManager: SquaddieActionManager
        coordinateMapCollectionManager: CoordinateMapCollectionManager
    }
    map: { mapId: string }
    currentPosition: OffsetCoordinate
    currentActionPoints: InBattleSquaddie["actionPoints"]
    currentSequence: ValidSquaddieActionOption[]
    allTurnSequences: ValidSquaddieActionOption[][]
}): void => {
    const availableActions =
        SquaddieActionValidationService.generateValidSquaddieActions({
            actor,
            managers,
            map,
            actionPointsOverride: currentActionPoints,
            positionOverride: currentPosition,
        })

    for (const actionOption of availableActions) {
        const newSequence = [...currentSequence, actionOption]

        const isEndTurn = actionOption.action.id === "default-end-turn"
        if (isEndTurn) {
            allTurnSequences.push(newSequence)
            continue
        }

        const canContinue = managers.inBattleSquaddieManager.canSquaddieAct({
            battleSquaddieId: actor,
            actionPoints: actionOption.actionPointsRemaining,
        })

        if (!canContinue) {
            allTurnSequences.push(newSequence)
            continue
        }

        let newPosition = currentPosition
        if (actionOption.decisions.targetDestination != undefined) {
            newPosition = actionOption.decisions.targetDestination
        }

        generateTurnsRecursively({
            actor,
            managers,
            map,
            currentPosition: newPosition,
            currentActionPoints: actionOption.actionPointsRemaining,
            currentSequence: newSequence,
            allTurnSequences,
        })
    }
}

interface ActionCategorizationResult {
    invalidReason?: string
    validTargets?: Map<string, Set<string>>
}

const getActionCategorizationResult = ({
    actor,
    squaddieAction,
    currentActionPoints,
    managers,
    map,
    positionOverride,
}: {
    actor: BattleSquaddieId
    squaddieAction: SquaddieAction
    currentActionPoints: { current: number }
    managers: {
        inBattleSquaddieManager: InBattleSquaddieManager
        squaddieActionManager: SquaddieActionManager
        coordinateMapCollectionManager: CoordinateMapCollectionManager
    }
    map: { mapId: string }
    positionOverride?: OffsetCoordinate
}): ActionCategorizationResult => {
    const actionPointCost =
        squaddieAction.effectOnActor.SUCCESS?.actionPoints?.spent

    const apReason = getActionPointInvalidReason({
        actionPointCost,
        currentActionPoints,
    })
    if (apReason != undefined) return { invalidReason: apReason }

    const allTargetsInRange =
        SquaddieActionValidationService.calculateReachableSquaddiesByCoordinate(
            {
                actor,
                action: { id: squaddieAction.id },
                managers,
                map,
                positionOverride,
            }
        )

    if (allTargetsInRange.size === 0)
        return { invalidReason: "No applicable targets in range" }

    const effectiveTargets = filterTargetGroupsWithEffect({
        actor,
        validTargets: allTargetsInRange,
        squaddieAction,
        managers,
        map,
    })

    if (effectiveTargets.size === 0) {
        return { invalidReason: "No targets can be affected" }
    }

    return { validTargets: effectiveTargets }
}

const filterTargetGroupsWithEffect = ({
    actor,
    validTargets,
    squaddieAction,
    managers,
    map,
}: {
    actor: BattleSquaddieId
    validTargets: Map<string, Set<string>>
    squaddieAction: SquaddieAction
    managers: {
        inBattleSquaddieManager: InBattleSquaddieManager
        squaddieActionManager: SquaddieActionManager
        coordinateMapCollectionManager: CoordinateMapCollectionManager
    }
    map: { mapId: string }
}): Map<string, Set<string>> => {
    const effectiveTargets = new Map<string, Set<string>>()
    for (const [coordinateKey, squaddieKeys] of validTargets) {
        const targetSquaddieIds: BattleSquaddieId[] = []
        for (const squaddieKey of squaddieKeys) {
            targetSquaddieIds.push(
                SquaddieIdConverterService.keyToSquaddieId(squaddieKey)
            )
        }

        const hasEffect = checkIfActionHasEffectOnTargets({
            actor,
            targets: targetSquaddieIds,
            squaddieAction,
            managers,
            map,
        })

        if (hasEffect) {
            effectiveTargets.set(coordinateKey, squaddieKeys)
        }
    }
    return effectiveTargets
}

const getActionPointInvalidReason = ({
    actionPointCost,
    currentActionPoints,
}: {
    actionPointCost?: ActionPointCost
    currentActionPoints: { current: number }
}): string | undefined => {
    if (actionPointCost === "all") {
        if (currentActionPoints.current <= 0) return "Squaddie cannot act"
        return undefined
    }

    if (
        actionPointCost != undefined &&
        actionPointCost > currentActionPoints.current
    ) {
        return `Needs ${actionPointCost} action points`
    }

    return undefined
}

const validateTargetsInRange = ({
    actor,
    targets,
    squaddieAction,
    inBattleSquaddieManager,
    coordinateMapCollectionManager,
    mapId,
}: {
    actor: BattleSquaddieId
    targets: BattleSquaddieId[]
    squaddieAction: SquaddieAction
    inBattleSquaddieManager: InBattleSquaddieManager
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    mapId: string
}): ActionValidationResult => {
    if (targets.length === 0) {
        return { isValid: true }
    }

    const affiliationRelationship =
        squaddieAction.targeting.affiliationRelationship
    const actionRange = squaddieAction.targeting.range

    const affiliationFilteredTargets = filterTargetsByAffiliation({
        actor,
        targets,
        affiliationRelationship,
        inBattleSquaddieManager,
    })

    if (affiliationFilteredTargets.length !== targets.length) {
        return { isValid: false, reason: "All targets must be in range" }
    }

    const inRangeTargets = filterTargetsByDistance({
        actor,
        targets: affiliationFilteredTargets,
        actionRange,
        coordinateMapCollectionManager,
        mapId,
    })

    if (inRangeTargets.length !== affiliationFilteredTargets.length) {
        return { isValid: false, reason: "All targets must be in range" }
    }

    const losValidTargets = filterTargetsByLineOfSight({
        actor,
        targets: inRangeTargets,
        squaddieAction,
        coordinateMapCollectionManager,
        mapId,
    })

    if (losValidTargets.length !== inRangeTargets.length) {
        return { isValid: false, reason: "All targets must be in range" }
    }

    return { isValid: true }
}

const filterTargetsByAffiliation = ({
    actor,
    targets,
    affiliationRelationship,
    inBattleSquaddieManager,
}: {
    actor: BattleSquaddieId
    targets: BattleSquaddieId[]
    affiliationRelationship: { self: boolean; friend: boolean; foe: boolean }
    inBattleSquaddieManager: InBattleSquaddieManager
}): BattleSquaddieId[] => {
    const actorAffiliation =
        inBattleSquaddieManager.getSquaddie(actor).outOfBattleSquaddie
            .affiliation

    return targets.filter((target) => {
        const isSelf =
            target.inBattleSquaddieId === actor.inBattleSquaddieId &&
            target.outOfBattleSquaddieId === actor.outOfBattleSquaddieId

        if (isSelf) {
            return affiliationRelationship.self
        }

        const targetAffiliation =
            inBattleSquaddieManager.getSquaddie(target).outOfBattleSquaddie
                .affiliation

        const areFriends = SquaddieAffiliationService.areFriends({
            actor: actorAffiliation,
            target: targetAffiliation,
        })

        return (
            (areFriends && affiliationRelationship.friend) ||
            (!areFriends && affiliationRelationship.foe)
        )
    })
}

const filterTargetsByDistance = ({
    actor,
    targets,
    actionRange,
    coordinateMapCollectionManager,
    mapId,
    positionOverride,
}: {
    actor: BattleSquaddieId
    targets: BattleSquaddieId[]
    actionRange: TActionRange
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    mapId: string
    positionOverride?: OffsetCoordinate
}): BattleSquaddieId[] => {
    let actorPosition: OffsetCoordinate

    if (positionOverride == undefined) {
        const actorCoordinate =
            coordinateMapCollectionManager.getSquaddieCoordinate({
                mapId,
                squaddieId: actor,
            })

        if (
            actorCoordinate?.row == undefined ||
            actorCoordinate?.col == undefined
        ) {
            return []
        }

        actorPosition = {
            row: actorCoordinate.row,
            col: actorCoordinate.col,
        }
    } else {
        actorPosition = positionOverride
    }

    const { minimum, maximum } =
        ActionRangeService.minAndMaxByRange[actionRange]

    return targets.filter((target) => {
        const targetCoordinate =
            coordinateMapCollectionManager.getSquaddieCoordinate({
                mapId,
                squaddieId: target,
            })

        if (
            targetCoordinate?.row == undefined ||
            targetCoordinate?.col == undefined
        ) {
            return false
        }

        const distance = CoordinateCalculator.getDistanceBetween(
            actorPosition,
            { row: targetCoordinate.row, col: targetCoordinate.col }
        )

        return distance >= minimum && distance <= maximum
    })
}

const filterTargetsByLineOfSight = ({
    actor,
    targets,
    squaddieAction,
    coordinateMapCollectionManager,
    mapId,
}: {
    actor: BattleSquaddieId
    targets: BattleSquaddieId[]
    squaddieAction: SquaddieAction
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    mapId: string
}): BattleSquaddieId[] => {
    if (targets.length === 0) return targets

    const actorCoordinate =
        coordinateMapCollectionManager.getSquaddieCoordinate({
            mapId,
            squaddieId: actor,
        })

    if (
        actorCoordinate?.row == undefined ||
        actorCoordinate?.col == undefined
    ) {
        return []
    }

    const actorPosition: OffsetCoordinate = {
        row: actorCoordinate.row,
        col: actorCoordinate.col,
    }

    const skipOverPits = squaddieAction.targeting.skipOverPits ?? true
    const moveThroughWalls = squaddieAction.targeting.moveThroughWalls ?? false

    return targets.filter((target) => {
        const targetCoordinate =
            coordinateMapCollectionManager.getSquaddieCoordinate({
                mapId,
                squaddieId: target,
            })

        if (
            targetCoordinate?.row == undefined ||
            targetCoordinate?.col == undefined
        ) {
            return false
        }

        return LineOfSightService.hasLineOfSight({
            from: actorPosition,
            to: {
                row: targetCoordinate.row,
                col: targetCoordinate.col,
            },
            mapId,
            coordinateMapCollectionManager,
            skipOverPits,
            moveThroughWalls,
        })
    })
}

const validateActionCooldown = ({
    actor,
    squaddieAction,
    inBattleSquaddieManager,
}: {
    actor: BattleSquaddieId
    squaddieAction: SquaddieAction
    inBattleSquaddieManager: InBattleSquaddieManager
}): ActionValidationResult => {
    const turnsRemaining = inBattleSquaddieManager.getActionCooldown({
        battleSquaddieId: actor,
        actionId: squaddieAction.id,
    })
    const pluralTurns = turnsRemaining == 1 ? "turn" : "turns"
    if (turnsRemaining != undefined) {
        return {
            isValid: false,
            reason: `Cannot be used for ${turnsRemaining} ${pluralTurns}`,
        }
    }
    return { isValid: true }
}

const validateActionUsesPerTurn = ({
    actor,
    squaddieAction,
    inBattleSquaddieManager,
}: {
    actor: BattleSquaddieId
    squaddieAction: SquaddieAction
    inBattleSquaddieManager: InBattleSquaddieManager
}): ActionValidationResult => {
    if (squaddieAction.usesPerTurn == undefined) return { isValid: true }
    const usesThisTurn = inBattleSquaddieManager.getActionUsesThisTurn({
        battleSquaddieId: actor,
        actionId: squaddieAction.id,
    })
    if (usesThisTurn >= squaddieAction.usesPerTurn) {
        return {
            isValid: false,
            reason: `Already used ${usesThisTurn} of ${squaddieAction.usesPerTurn} time${squaddieAction.usesPerTurn === 1 ? "" : "s"} this turn`,
        }
    }
    return { isValid: true }
}

const validateActionPointCost = ({
    actionPointCost,
    actor,
    inBattleSquaddieManager,
}: {
    actionPointCost?: ActionPointCost
    actor: BattleSquaddieId
    inBattleSquaddieManager: InBattleSquaddieManager
}): ActionValidationResult => {
    if (actionPointCost == undefined || actionPointCost === 0) {
        return { isValid: true }
    }

    if (actionPointCost === "all") {
        const canAct = inBattleSquaddieManager.canSquaddieAct({
            battleSquaddieId: actor,
        })
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

const validateMovementDestinationNotOccupied = ({
    actor,
    squaddieAction,
    decisions,
    coordinateMapCollectionManager,
    mapId,
}: {
    actor: BattleSquaddieId
    squaddieAction: SquaddieAction
    decisions: SquaddieActionDecisions | undefined
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    mapId: string
}): ActionValidationResult => {
    const actorMovement =
        squaddieAction.effectOnActor.SUCCESS?.movement?.movementType
    const isActorMovementAction =
        actorMovement === MovementEffectType.ACTOR_CHOSEN ||
        actorMovement === MovementEffectType.ACTOR_CHOSEN_SPECIAL_TRAVERSAL
    if (!isActorMovementAction) {
        return { isValid: true }
    }

    const destination = decisions?.targetDestination
    if (destination == undefined) {
        return { isValid: true }
    }

    const map = coordinateMapCollectionManager.getMapById(mapId)
    const occupant = CoordinateMapService.getSquaddieAtCoordinate({
        map,
        coordinate: destination,
    })
    const occupantIsADifferentSquaddie =
        occupant != undefined &&
        (occupant.outOfBattleSquaddieId !== actor.outOfBattleSquaddieId ||
            occupant.inBattleSquaddieId !== actor.inBattleSquaddieId)
    if (occupantIsADifferentSquaddie) {
        return { isValid: false, reason: "Destination is occupied" }
    }

    return { isValid: true }
}

const validateMovementPathByDistance = ({
    actor,
    squaddieAction,
    decisions,
    inBattleSquaddieManager,
    coordinateMapCollectionManager,
    mapId,
}: {
    actor: BattleSquaddieId
    squaddieAction: SquaddieAction
    decisions: SquaddieActionDecisions | undefined
    inBattleSquaddieManager: InBattleSquaddieManager
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    mapId: string
}): ActionValidationResult => {
    const hasMovementPathCost =
        squaddieAction.effectOnActor.SUCCESS?.actionPoints?.additional
            ?.movementPathActionPointCost
    const actorMovementEffect = squaddieAction.effectOnActor.SUCCESS?.movement
    const isSpecialTraversal =
        actorMovementEffect?.movementType ===
        MovementEffectType.ACTOR_CHOSEN_SPECIAL_TRAVERSAL

    if (!hasMovementPathCost && !isSpecialTraversal) {
        return { isValid: true }
    }

    if (decisions?.targetDestination == undefined) {
        return { isValid: true }
    }

    const actorCoordinate =
        coordinateMapCollectionManager.getSquaddieCoordinate({
            mapId,
            squaddieId: actor,
        })

    if (
        actorCoordinate?.row == undefined ||
        actorCoordinate?.col == undefined
    ) {
        return { isValid: false, reason: "Actor has no position" }
    }
    const actorPosition = {
        row: actorCoordinate.row,
        col: actorCoordinate.col,
    }

    const destination = decisions.targetDestination
    const specialTraversalOverrides = isSpecialTraversal
        ? actorMovementEffect.traversal
        : undefined

    if (specialTraversalOverrides) {
        const actionPointCost =
            squaddieAction.effectOnActor.SUCCESS?.actionPoints?.spent
        return validateMovementPathWithPathfinding({
            coordinateMapCollectionManager,
            mapId,
            inBattleSquaddieManager,
            actor,
            destination,
            actorPosition,
            traversalOverrides: specialTraversalOverrides,
            actionPointCostOverride:
                typeof actionPointCost === "number"
                    ? actionPointCost
                    : undefined,
        })
    }

    const hexDistance = CoordinateCalculator.getDistanceBetween(
        actorPosition,
        destination
    )
    const maximumMovementCost = inBattleSquaddieManager.getSquaddieMovementInfo(
        {
            inBattleSquaddieId: actor.inBattleSquaddieId,
            outOfBattleSquaddieId: actor.outOfBattleSquaddieId,
        }
    ).maximumMovementCost
    if (hexDistance > maximumMovementCost) {
        return { isValid: false, reason: "Destination is too far away" }
    }
    return validateMovementPathWithPathfinding({
        coordinateMapCollectionManager,
        mapId,
        inBattleSquaddieManager,
        actor,
        destination,
        actorPosition,
    })
}

const validateMovementPathWithPathfinding = ({
    coordinateMapCollectionManager,
    mapId,
    inBattleSquaddieManager,
    actor,
    destination,
    actorPosition,
    traversalOverrides,
    actionPointCostOverride,
}: {
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    mapId: string
    inBattleSquaddieManager: InBattleSquaddieManager
    actor: BattleSquaddieId
    destination: OffsetCoordinate
    actorPosition: OffsetCoordinate
    traversalOverrides?: Partial<
        Omit<SquaddieMovementInfo, "movementPointsPerAction">
    >
    actionPointCostOverride?: number
}): ActionValidationResult => {
    const map = coordinateMapCollectionManager.getMapById(mapId)
    let searchLimits =
        CoordinateMapAStarAdapter.getCoordinateMapSearchLimitsFromSquaddie({
            manager: inBattleSquaddieManager,
            battleSquaddieId: actor,
        })
    searchLimits = applyMovementOverrides({
        traversalOverrides,
        searchLimits,
        actionPointCostOverride,
        inBattleSquaddieManager,
        actor,
    })

    const adapter: CoordinateMapAStarAdapter = new CoordinateMapAStarAdapter({
        map,
        searchLimits,
        inBattleSquaddieManager,
    })

    const reachesDestination = (node: { row: number; col: number }) =>
        node.row === destination.row && node.col === destination.col

    const path = AStarSearchService.search<
        OffsetCoordinate,
        CoordinateMovePath,
        AStarGraph<OffsetCoordinate, CoordinateMovePath>
    >({
        start: actorPosition,
        graph: adapter,
        stopCondition: reachesDestination,
    })

    if (path == undefined) {
        return { isValid: false, reason: "Destination is blocked" }
    }

    if (
        traversalOverrides?.squaddieMovementSpecialTraversalInfo
            ?.minimumRange != undefined &&
        CoordinateMovePathService.getTotalMoveCost(path) <
            traversalOverrides?.squaddieMovementSpecialTraversalInfo
                ?.minimumRange
    ) {
        return { isValid: false, reason: "Destination is too close" }
    }

    return { isValid: true, movementPath: path }
}

const applyMovementOverrides = ({
    traversalOverrides,
    searchLimits,
    actionPointCostOverride,
    inBattleSquaddieManager,
    actor,
}: {
    traversalOverrides?: Partial<
        Omit<SquaddieMovementInfo, "movementPointsPerAction">
    >
    searchLimits: CoordinateMapSearchLimits
    actionPointCostOverride?: number
    inBattleSquaddieManager: InBattleSquaddieManager
    actor: BattleSquaddieId
}): CoordinateMapSearchLimits => {
    if (traversalOverrides != undefined) {
        searchLimits = { ...searchLimits, ...traversalOverrides }
    }

    const needsMovementPointsPerAction =
        actionPointCostOverride != undefined ||
        traversalOverrides?.squaddieMovementSpecialTraversalInfo
            ?.actionPointsOfMovement != undefined
    if (needsMovementPointsPerAction) {
        const { movementPointsPerAction } =
            inBattleSquaddieManager.getSquaddieMovementInfo({
                inBattleSquaddieId: actor.inBattleSquaddieId,
                outOfBattleSquaddieId: actor.outOfBattleSquaddieId,
            })
        if (actionPointCostOverride != undefined) {
            searchLimits.maximumMoveCost =
                actionPointCostOverride * movementPointsPerAction
        }
        if (
            traversalOverrides?.squaddieMovementSpecialTraversalInfo
                ?.actionPointsOfMovement != undefined
        ) {
            searchLimits.maximumMoveCost =
                traversalOverrides?.squaddieMovementSpecialTraversalInfo
                    ?.actionPointsOfMovement * movementPointsPerAction
        }
    }

    if (
        traversalOverrides?.squaddieMovementSpecialTraversalInfo
            ?.maximumRange != undefined
    ) {
        searchLimits.maximumMoveCost =
            traversalOverrides?.squaddieMovementSpecialTraversalInfo?.maximumRange
    }
    return searchLimits
}

const squaddieActionResultHasEffect = (
    result: SquaddieActionResult
): boolean => {
    if (result.damage?.net != undefined && result.damage.net > 0) return true
    if (result.healing?.net != undefined && result.healing.net > 0) return true
    if (
        result.conditionsAdded != undefined &&
        result.conditionsAdded.length > 0
    )
        return true
    if (
        result.dispel?.dispelledConditions?.size != undefined &&
        result.dispel.dispelledConditions.size > 0
    )
        return true
    if (
        result.treat?.treatedConditions?.size != undefined &&
        result.treat.treatedConditions.size > 0
    )
        return true
    if (result.movement?.expectedPath != undefined) return true

    return (
        result.actionPoints?.restore?.net != undefined &&
        result.actionPoints.restore.net > 0
    )
}

const validateTargetsCanBeAffected = ({
    actor,
    targets,
    squaddieAction,
    decisions,
    inBattleSquaddieManager,
    squaddieActionManager,
    coordinateMapCollectionManager,
    mapId,
}: {
    actor: BattleSquaddieId
    targets: BattleSquaddieId[]
    squaddieAction: SquaddieAction
    decisions?: SquaddieActionDecisions
    inBattleSquaddieManager: InBattleSquaddieManager
    squaddieActionManager: SquaddieActionManager
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    mapId: string
}): ActionValidationResult => {
    if (targets.length === 0) {
        return { isValid: true }
    }

    if (squaddieAction.effectOnTarget == undefined) {
        return { isValid: true }
    }

    const hasAffectedTarget = Object.values(DegreeOfSuccess).some((degree) => {
        const results = SquaddieActionResultCalculator.calculateResult({
            actor,
            targets,
            action: { id: squaddieAction.id, decisions },
            managers: {
                inBattleSquaddieManager,
                squaddieActionManager,
                coordinateMapCollectionManager,
            },
            degreeOfSuccess: degree,
            map: { mapId },
        })

        const targetResults = results.filter((result) =>
            targets.some(
                (t) =>
                    t.inBattleSquaddieId === result.inBattleSquaddieId &&
                    t.outOfBattleSquaddieId === result.outOfBattleSquaddieId
            )
        )

        return targetResults.some(squaddieActionResultHasEffect)
    })

    if (!hasAffectedTarget) {
        return { isValid: false, reason: "No targets can be affected" }
    }

    return { isValid: true }
}

const validateAoeAction = ({
    actor,
    targetCoordinate,
    targets,
    squaddieAction,
    coordinateMapCollectionManager,
    mapId,
}: {
    actor: BattleSquaddieId
    targetCoordinate: OffsetCoordinate | undefined
    targets: BattleSquaddieId[]
    squaddieAction: SquaddieAction
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    mapId: string
}): ActionValidationResult => {
    let resolvedTargetCoordinate = resolveToSelfIfActionRangeIsSelf({
        targetCoordinate,
        squaddieAction,
        actor,
        coordinateMapCollectionManager,
        mapId,
    })
    if (resolvedTargetCoordinate == undefined) {
        return { isValid: true }
    }

    const centerValidation = validateAoeCenterInRange({
        actor,
        targetCoordinate: resolvedTargetCoordinate,
        squaddieAction,
        coordinateMapCollectionManager,
        mapId,
    })
    if (!centerValidation.isValid) return centerValidation

    if (targets.length === 0) {
        return { isValid: false, reason: "No valid targets in blast radius" }
    }

    const requiresTargetAtCenter =
        squaddieAction.targeting.aimCoordinateRequiresTarget ?? true
    if (requiresTargetAtCenter) {
        return validateTargetAtCenter({
            targetCoordinate: resolvedTargetCoordinate,
            targets,
            coordinateMapCollectionManager,
            mapId,
        })
    }

    return { isValid: true }
}

const validateAoeCenterInRange = ({
    actor,
    targetCoordinate,
    squaddieAction,
    coordinateMapCollectionManager,
    mapId,
}: {
    actor: BattleSquaddieId
    targetCoordinate: OffsetCoordinate | undefined
    squaddieAction: SquaddieAction
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    mapId: string
}): ActionValidationResult => {
    if (targetCoordinate == undefined) {
        return {
            isValid: false,
            reason: "AoE action requires a target coordinate",
        }
    }

    const reachableKeys = getReachableCoordinateKeys({
        actor,
        actionRange: squaddieAction.targeting.range,
        coordinateMapCollectionManager,
        mapId,
    })

    const centerKey = OffsetCoordinateService.coordinateToKey(targetCoordinate)
    if (!reachableKeys.has(centerKey)) {
        return { isValid: false, reason: "Blast center is out of range" }
    }

    return { isValid: true }
}

const validateTargetAtCenter = ({
    targetCoordinate,
    targets,
    coordinateMapCollectionManager,
    mapId,
}: {
    targetCoordinate: OffsetCoordinate
    targets: BattleSquaddieId[]
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    mapId: string
}): ActionValidationResult => {
    const squaddieAtCenter =
        coordinateMapCollectionManager.getSquaddieAtCoordinate({
            mapId,
            coordinate: targetCoordinate,
        })

    if (squaddieAtCenter == undefined) {
        return {
            isValid: false,
            reason: "Target coordinate must have a target",
        }
    }

    const isInTargetList = targets.some(
        (t) =>
            t.inBattleSquaddieId === squaddieAtCenter.inBattleSquaddieId &&
            t.outOfBattleSquaddieId === squaddieAtCenter.outOfBattleSquaddieId
    )

    if (!isInTargetList) {
        return {
            isValid: false,
            reason: "Target coordinate must have a target",
        }
    }

    return { isValid: true }
}

const resolveAoeTargetsByBlastCenter = ({
    actor,
    squaddieAction,
    reachableCoordinateKeys,
    mapId,
    managers,
}: {
    actor: BattleSquaddieId
    squaddieAction: SquaddieAction
    reachableCoordinateKeys: Set<string>
    mapId: string
    managers: {
        inBattleSquaddieManager: InBattleSquaddieManager
        coordinateMapCollectionManager: CoordinateMapCollectionManager
    }
}): Map<string, Set<string>> => {
    const result = new Map<string, Set<string>>()
    for (const coordinateKey of reachableCoordinateKeys) {
        const blastCenter =
            OffsetCoordinateService.keyToCoordinate(coordinateKey)
        const aoeTargets = AoeTargetResolutionService.resolveAoeTargets({
            action: squaddieAction,
            actor,
            targetCoordinate: blastCenter,
            mapId,
            managers,
        })
        if (aoeTargets.length > 0) {
            const squaddieKeys = new Set(
                aoeTargets.map((t) =>
                    SquaddieIdConverterService.squaddieIdToKey(t)
                )
            )
            result.set(coordinateKey, squaddieKeys)
        }
    }
    return result
}

const groupSingleTargetsByCoordinate = ({
    actor,
    squaddieAction,
    reachableCoordinateKeys,
    managers,
    mapId,
    positionOverride,
}: {
    actor: BattleSquaddieId
    squaddieAction: SquaddieAction
    reachableCoordinateKeys: Set<string>
    managers: {
        inBattleSquaddieManager: InBattleSquaddieManager
        squaddieActionManager: SquaddieActionManager
        coordinateMapCollectionManager: CoordinateMapCollectionManager
    }
    mapId: string
    positionOverride?: OffsetCoordinate
}): Map<string, Set<string>> => {
    const affiliationRelationship =
        squaddieAction.targeting.affiliationRelationship
    const actionRange = squaddieAction.targeting.range

    const allSquaddiesOnMap =
        managers.coordinateMapCollectionManager.getAllSquaddieCoordinatesOnMap(
            mapId
        )

    const allTargets: BattleSquaddieId[] = allSquaddiesOnMap.map((info) => ({
        inBattleSquaddieId: info.squaddieId.inBattleSquaddieId,
        outOfBattleSquaddieId: info.squaddieId.outOfBattleSquaddieId,
    }))

    const affiliationFilteredTargets = filterTargetsByAffiliation({
        actor,
        targets: allTargets,
        affiliationRelationship,
        inBattleSquaddieManager: managers.inBattleSquaddieManager,
    })

    const distanceFilteredTargets = filterTargetsByDistance({
        actor,
        targets: affiliationFilteredTargets,
        actionRange,
        coordinateMapCollectionManager: managers.coordinateMapCollectionManager,
        mapId,
        positionOverride,
    })

    const reachableCoordinatesWithSquaddiesInRange = new Map<
        string,
        Set<string>
    >()

    for (const target of distanceFilteredTargets) {
        const targetCoordinate =
            managers.coordinateMapCollectionManager.getSquaddieCoordinate({
                mapId,
                squaddieId: target,
            })
        if (
            targetCoordinate?.row == undefined ||
            targetCoordinate?.col == undefined
        ) {
            continue
        }

        const coordinateKey = OffsetCoordinateService.coordinateToKey({
            row: targetCoordinate.row,
            col: targetCoordinate.col,
        })

        if (!reachableCoordinateKeys.has(coordinateKey)) {
            continue
        }

        const squaddieKey = SquaddieIdConverterService.squaddieIdToKey(target)

        if (!reachableCoordinatesWithSquaddiesInRange.has(coordinateKey)) {
            reachableCoordinatesWithSquaddiesInRange.set(
                coordinateKey,
                new Set<string>()
            )
        }
        reachableCoordinatesWithSquaddiesInRange
            .get(coordinateKey)!
            .add(squaddieKey)
    }

    return reachableCoordinatesWithSquaddiesInRange
}

export const getReachableCoordinateKeys = ({
    actor,
    actionRange,
    coordinateMapCollectionManager,
    mapId,
    positionOverride,
}: {
    actor: BattleSquaddieId
    actionRange: TActionRange
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    mapId: string
    positionOverride?: OffsetCoordinate
}): Set<string> => {
    const reachableKeys = new Set<string>()

    let actorPosition: OffsetCoordinate

    if (positionOverride == undefined) {
        const actorCoordinate =
            coordinateMapCollectionManager.getSquaddieCoordinate({
                mapId,
                squaddieId: actor,
            })

        if (
            actorCoordinate?.row == undefined ||
            actorCoordinate?.col == undefined
        ) {
            return reachableKeys
        }

        actorPosition = {
            row: actorCoordinate.row,
            col: actorCoordinate.col,
        }
    } else {
        actorPosition = positionOverride
    }

    const { minimum, maximum } =
        ActionRangeService.minAndMaxByRange[actionRange]

    const searchLimits: CoordinateMapSearchLimits = {
        stopOnSquaddies: true,
        reduceMoveCosts: true,
        skipOverPits: true,
        moveThroughWalls: false,
        minimumDistance: minimum,
        maximumMoveCost: maximum,
    }

    const map = coordinateMapCollectionManager.getMapById(mapId)
    const adapter = new CoordinateMapAStarAdapter({
        map,
        searchLimits,
    })

    const neverStop = () => false

    AStarSearchService.search<
        OffsetCoordinate,
        CoordinateMovePath,
        AStarGraph<OffsetCoordinate, CoordinateMovePath>
    >({
        start: actorPosition,
        graph: adapter,
        stopCondition: neverStop,
    })

    for (const [key, visited] of adapter.coordinatePathMap.visitedCoordinates) {
        if (visited.cachedMovePath != undefined) {
            reachableKeys.add(key)
        }
    }

    return reachableKeys
}

const generateEndTurnOption = (): ValidSquaddieActionOption => {
    return {
        action: SquaddieActionService.defaultEndTurn(),
        decisions: {},
        actionPointsRemaining: { current: 0 },
    }
}

const runAStarAndCollectMovementOptions = ({
    actorPosition,
    searchLimits,
    action,
    coordinateMap,
    inBattleSquaddieManager,
    getActionPointsRemaining,
}: {
    actorPosition: OffsetCoordinate
    searchLimits: CoordinateMapSearchLimits
    action: SquaddieAction
    coordinateMap: ReturnType<CoordinateMapCollectionManager["getMapById"]>
    inBattleSquaddieManager: InBattleSquaddieManager
    getActionPointsRemaining: (path: CoordinateMovePath) => number
}): ValidSquaddieActionOption[] => {
    const options: ValidSquaddieActionOption[] = []

    const adapter = new CoordinateMapAStarAdapter({
        map: coordinateMap,
        searchLimits,
        inBattleSquaddieManager,
    })

    AStarSearchService.search<
        OffsetCoordinate,
        CoordinateMovePath,
        AStarGraph<OffsetCoordinate, CoordinateMovePath>
    >({
        start: actorPosition,
        graph: adapter,
        stopCondition: () => false,
    })

    for (const [_key, visited] of adapter.coordinatePathMap
        .visitedCoordinates) {
        if (visited.cachedMovePath == undefined) continue

        if (
            visited.row === actorPosition.row &&
            visited.col === actorPosition.col
        ) {
            continue
        }

        options.push({
            action,
            decisions: {
                targetDestination: {
                    row: visited.row,
                    col: visited.col,
                },
            },
            movementPath: visited.cachedMovePath,
            actionPointsRemaining: {
                current: getActionPointsRemaining(visited.cachedMovePath),
            },
        })
    }

    return options
}

const generateMovementOptions = ({
    actor,
    managers,
    map,
    currentActionPoints,
    positionOverride,
}: {
    actor: BattleSquaddieId
    managers: {
        inBattleSquaddieManager: InBattleSquaddieManager
        squaddieActionManager: SquaddieActionManager
        coordinateMapCollectionManager: CoordinateMapCollectionManager
    }
    map: { mapId: string }
    currentActionPoints: InBattleSquaddie["actionPoints"]
    positionOverride?: OffsetCoordinate
}): ValidSquaddieActionOption[] => {
    let actorPosition: OffsetCoordinate

    if (positionOverride == undefined) {
        const actorCoordinate =
            managers.coordinateMapCollectionManager.getSquaddieCoordinate({
                mapId: map.mapId,
                squaddieId: actor,
            })

        if (
            actorCoordinate?.row == undefined ||
            actorCoordinate?.col == undefined
        ) {
            return []
        }

        actorPosition = {
            row: actorCoordinate.row,
            col: actorCoordinate.col,
        }
    } else {
        actorPosition = positionOverride
    }

    const movementInfo =
        managers.inBattleSquaddieManager.getSquaddieMovementInfo({
            ...actor,
            actionPoints: currentActionPoints,
        })

    const searchLimits =
        CoordinateMapAStarAdapter.getCoordinateMapSearchLimitsFromSquaddie({
            manager: managers.inBattleSquaddieManager,
            battleSquaddieId: actor,
        })
    searchLimits.maximumMoveCost = movementInfo.maximumMovementCost

    return runAStarAndCollectMovementOptions({
        actorPosition,
        searchLimits,
        action: SquaddieActionService.defaultMove(),
        coordinateMap: managers.coordinateMapCollectionManager.getMapById(
            map.mapId
        ),
        inBattleSquaddieManager: managers.inBattleSquaddieManager,
        getActionPointsRemaining: (path) => {
            const pathCost = CoordinateMovePathService.getTotalMoveCost(path)
            const actionPointsSpent =
                managers.inBattleSquaddieManager.calculateActionPointsForMovement(
                    {
                        inBattleSquaddieId: actor.inBattleSquaddieId,
                        outOfBattleSquaddieId: actor.outOfBattleSquaddieId,
                        movementCost: pathCost,
                    }
                )
            return currentActionPoints.current - actionPointsSpent
        },
    })
}

const generateMovementOptionsForTeleportDestination = ({
    actor,
    squaddieAction,
    managers,
    map,
    currentActionPoints,
}: {
    actor: BattleSquaddieId
    squaddieAction: SquaddieAction
    managers: {
        inBattleSquaddieManager: InBattleSquaddieManager
        squaddieActionManager: SquaddieActionManager
        coordinateMapCollectionManager: CoordinateMapCollectionManager
    }
    map: { mapId: string }
    currentActionPoints: InBattleSquaddie["actionPoints"]
}): ValidSquaddieActionOption[] => {
    const teleportEffect = Object.values(
        squaddieAction.effectOnTarget ?? {}
    ).find(
        (effect) =>
            effect?.movement?.movementType ===
            MovementEffectType.TELEPORT_TO_ACTOR_CHOSEN
    )
    if (teleportEffect == undefined) return []

    const destinationRange = (
        teleportEffect.movement as {
            movementType: typeof MovementEffectType.TELEPORT_TO_ACTOR_CHOSEN
            destinationRange?: TActionRange
        }
    ).destinationRange
    if (destinationRange == undefined || destinationRange === ActionRange.SELF)
        return []

    const actorCoordinate =
        managers.coordinateMapCollectionManager.getSquaddieCoordinate({
            mapId: map.mapId,
            squaddieId: actor,
        })
    if (actorCoordinate?.row == undefined || actorCoordinate?.col == undefined)
        return []

    const actorPosition: OffsetCoordinate = {
        row: actorCoordinate.row,
        col: actorCoordinate.col,
    }

    const { maximum } = ActionRangeService.minAndMaxByRange[destinationRange]
    const rawActionPointCost =
        squaddieAction.effectOnActor.SUCCESS?.actionPoints?.spent
    const actionPointCostFlat =
        rawActionPointCost === "all"
            ? currentActionPoints.current
            : (rawActionPointCost ?? 0)

    const options: ValidSquaddieActionOption[] = []

    for (let ring = 0; ring <= maximum; ring++) {
        const candidates = CoordinateCalculator.getCoordinatesInRing(
            actorPosition,
            ring
        )
        for (const candidate of candidates) {
            let placementIsPossible =
                teleportDestinationPlacementIsPossibleForThisTarget({
                    candidateCoordinate: candidate,
                    actorCoordinate: actorPosition,
                    coordinateMapCollectionManager:
                        managers.coordinateMapCollectionManager,
                    mapId: map.mapId,
                })
            if (placementIsPossible) {
                options.push({
                    action: squaddieAction,
                    decisions: { targetDestination: candidate },
                    actionPointsRemaining: {
                        current:
                            currentActionPoints.current - actionPointCostFlat,
                    },
                })
            }
        }
    }

    return options
}

const teleportDestinationPlacementIsPossibleForThisTarget = ({
    candidateCoordinate,
    actorCoordinate,
    coordinateMapCollectionManager,
    mapId,
}: {
    candidateCoordinate: OffsetCoordinate
    actorCoordinate: OffsetCoordinate
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    mapId: string
}): boolean => {
    const coordinateMap = coordinateMapCollectionManager.getMapById(mapId)

    if (
        !CoordinateMapService.isCoordinateOnMap({
            coordinate: candidateCoordinate,
            map: coordinateMap,
        })
    )
        return false
    if (
        !CoordinateMapService.canSquaddieStopAtCoordinate({
            map: coordinateMap,
            coordinate: candidateCoordinate,
        })
    )
        return false
    return LineOfSightService.hasLineOfSight({
        from: actorCoordinate,
        to: candidateCoordinate,
        mapId,
        coordinateMapCollectionManager,
        skipOverPits: true,
        moveThroughWalls: false,
    })
}

const generateMovementOptionsForSpecialTraversal = ({
    actor,
    squaddieAction,
    managers,
    map,
    currentActionPoints,
}: {
    actor: BattleSquaddieId
    squaddieAction: SquaddieAction
    managers: {
        inBattleSquaddieManager: InBattleSquaddieManager
        squaddieActionManager: SquaddieActionManager
        coordinateMapCollectionManager: CoordinateMapCollectionManager
    }
    map: { mapId: string }
    currentActionPoints: InBattleSquaddie["actionPoints"]
}): ValidSquaddieActionOption[] => {
    const actorCoordinate =
        managers.coordinateMapCollectionManager.getSquaddieCoordinate({
            mapId: map.mapId,
            squaddieId: actor,
        })

    if (
        actorCoordinate?.row == undefined ||
        actorCoordinate?.col == undefined
    ) {
        return []
    }

    const actorPosition: OffsetCoordinate = {
        row: actorCoordinate.row,
        col: actorCoordinate.col,
    }

    const successEffect = squaddieAction.effectOnActor.SUCCESS
    const traversalOverrides =
        successEffect?.movement?.movementType ===
        MovementEffectType.ACTOR_CHOSEN_SPECIAL_TRAVERSAL
            ? successEffect.movement.traversal
            : undefined
    const rawActionPointCost = successEffect?.actionPoints?.spent
    const actionPointCostFlat =
        rawActionPointCost === "all"
            ? currentActionPoints.current
            : (rawActionPointCost ?? 0)

    let searchLimits =
        CoordinateMapAStarAdapter.getCoordinateMapSearchLimitsFromSquaddie({
            manager: managers.inBattleSquaddieManager,
            battleSquaddieId: actor,
        })
    searchLimits = applyMovementOverrides({
        traversalOverrides,
        searchLimits,
        actionPointCostOverride:
            traversalOverrides?.squaddieMovementSpecialTraversalInfo
                ?.actionPointsOfMovement == undefined
                ? actionPointCostFlat
                : undefined,
        inBattleSquaddieManager: managers.inBattleSquaddieManager,
        actor,
    })

    return runAStarAndCollectMovementOptions({
        actorPosition,
        searchLimits,
        action: squaddieAction,
        coordinateMap: managers.coordinateMapCollectionManager.getMapById(
            map.mapId
        ),
        inBattleSquaddieManager: managers.inBattleSquaddieManager,
        getActionPointsRemaining: () =>
            currentActionPoints.current - actionPointCostFlat,
    })
}

const generateAbilityActionOptions = ({
    actor,
    managers,
    map,
    currentActionPoints,
    positionOverride,
}: {
    actor: BattleSquaddieId
    managers: {
        inBattleSquaddieManager: InBattleSquaddieManager
        squaddieActionManager: SquaddieActionManager
        coordinateMapCollectionManager: CoordinateMapCollectionManager
    }
    map: { mapId: string }
    currentActionPoints: InBattleSquaddie["actionPoints"]
    positionOverride?: OffsetCoordinate
}): ValidSquaddieActionOption[] => {
    const options: ValidSquaddieActionOption[] = []

    const squaddieInfo = managers.inBattleSquaddieManager.getSquaddie(actor)
    const actionIds = squaddieInfo.inBattleSquaddie.actionIds.natural

    for (const actionId of actionIds) {
        if (!managers.squaddieActionManager.has(actionId)) continue

        const squaddieAction = managers.squaddieActionManager.get(actionId)

        const result = getActionCategorizationResult({
            actor,
            squaddieAction,
            currentActionPoints,
            managers,
            map,
            positionOverride,
        })

        if (
            result.invalidReason != undefined ||
            result.validTargets == undefined
        )
            continue

        const actionPointCost =
            squaddieAction.effectOnActor.SUCCESS?.actionPoints?.spent

        addSquaddieTargetEffectsToOptions({
            validTargets: result.validTargets,
            squaddieAction,
            actionPointCost,
            currentActionPoints,
            options,
        })
    }

    return options
}

const addSquaddieTargetEffectsToOptions = ({
    validTargets,
    squaddieAction,
    actionPointCost,
    currentActionPoints,
    options,
}: {
    validTargets: Map<string, Set<string>>
    squaddieAction: SquaddieAction
    actionPointCost?: ActionPointCost
    currentActionPoints: { current: number }
    options: ValidSquaddieActionOption[]
}) => {
    for (const [coordinateKey, squaddieKeys] of validTargets) {
        const coordinate =
            OffsetCoordinateService.keyToCoordinate(coordinateKey)

        const targetSquaddieIds: BattleSquaddieId[] = []
        for (const squaddieKey of squaddieKeys) {
            const squaddieId =
                SquaddieIdConverterService.keyToSquaddieId(squaddieKey)
            targetSquaddieIds.push(squaddieId)
        }

        const actionPointsSpentValue =
            actionPointCost === "all"
                ? currentActionPoints.current
                : (actionPointCost ?? 0)
        const actionPointsRemaining =
            currentActionPoints.current - actionPointsSpentValue

        options.push({
            action: squaddieAction,
            decisions: {
                targetCoordinate: coordinate,
                targetSquaddieIds,
            },
            actionPointsRemaining: { current: actionPointsRemaining },
        })
    }
}

const checkIfActionHasEffectOnTargets = ({
    actor,
    targets,
    squaddieAction,
    managers,
    map,
}: {
    actor: BattleSquaddieId
    targets: BattleSquaddieId[]
    squaddieAction: SquaddieAction
    managers: {
        inBattleSquaddieManager: InBattleSquaddieManager
        squaddieActionManager: SquaddieActionManager
        coordinateMapCollectionManager: CoordinateMapCollectionManager
    }
    map: { mapId: string }
}): boolean => {
    if (squaddieAction.effectOnTarget == undefined) {
        return true
    }

    if (
        SquaddieActionService.getRequiredDecisions(squaddieAction)
            .requiresTargetDestination
    ) {
        return targets.length > 0
    }

    return Object.values(DegreeOfSuccess).some((degree) => {
        const results = SquaddieActionResultCalculator.calculateResult({
            actor,
            targets,
            action: { id: squaddieAction.id },
            managers: {
                inBattleSquaddieManager: managers.inBattleSquaddieManager,
                squaddieActionManager: managers.squaddieActionManager,
                coordinateMapCollectionManager:
                    managers.coordinateMapCollectionManager,
            },
            degreeOfSuccess: degree,
            map: { mapId: map.mapId },
        })

        const targetResults = results.filter((result) =>
            targets.some(
                (t) =>
                    t.inBattleSquaddieId === result.inBattleSquaddieId &&
                    t.outOfBattleSquaddieId === result.outOfBattleSquaddieId
            )
        )

        return targetResults.some(squaddieActionResultHasEffect)
    })
}

const checkForValidMovementAction = (
    actor: BattleSquaddieId,
    managers: {
        inBattleSquaddieManager: InBattleSquaddieManager
        squaddieActionManager: SquaddieActionManager
        coordinateMapCollectionManager: CoordinateMapCollectionManager
    },
    map: { mapId: string },
    currentActionPoints: {
        current: number
    },
    validActions: ValidSquaddieAction[],
    invalidActions: InvalidSquaddieAction[]
) => {
    const movementOptions = generateMovementOptions({
        actor,
        managers,
        map,
        currentActionPoints,
    })

    if (movementOptions.length > 0) {
        const movementTargetCoordinates: OffsetCoordinate[] = movementOptions
            .filter((option) => option.decisions.targetDestination != undefined)
            .map((option) => option.decisions.targetDestination!)
        validActions.push({
            actionId: "default-move",
            actionName: "Move",
            reachableCoordinates: movementTargetCoordinates,
            aimCoordinateResults: movementTargetCoordinates.map(
                (aimCoordinate) => ({
                    aimCoordinate,
                    targetIds: [],
                })
            ),
        })
    } else {
        invalidActions.push({
            actionId: "default-move",
            actionName: "Move",
            reason: "No valid movement destinations",
        })
    }
}

export const calculateAimCoordinateResults = ({
    actor,
    action,
    managers,
    map,
}: {
    actor: BattleSquaddieId
    action: { id: string }
    managers: {
        inBattleSquaddieManager: InBattleSquaddieManager
        squaddieActionManager: SquaddieActionManager
        coordinateMapCollectionManager: CoordinateMapCollectionManager
    }
    map: { mapId: string }
}): AimCoordinateResult[] => {
    const squaddieAction = managers.squaddieActionManager.get(action.id)
    const reachableCoordinateKeys = getReachableCoordinateKeys({
        actor,
        actionRange: squaddieAction.targeting.range,
        coordinateMapCollectionManager: managers.coordinateMapCollectionManager,
        mapId: map.mapId,
    })

    const isAreaEffect = (squaddieAction.targeting.areaOfEffectSize ?? 0) > 0
    const isDirectionalShape =
        squaddieAction.targeting.shape === CoordinateGeneratorShape.LINE
    if (isAreaEffect || isDirectionalShape) {
        return calculateAimCoordinateResultsWithAreaOfEffect({
            squaddieAction,
            reachableCoordinateKeys,
            actor,
            mapId: map.mapId,
            managers,
        })
    }

    const coordinateToTargets = groupSingleTargetsByCoordinate({
        actor,
        squaddieAction,
        reachableCoordinateKeys,
        managers,
        mapId: map.mapId,
    })
    const results: AimCoordinateResult[] = []
    for (const [coordinateKey, squaddieKeySet] of coordinateToTargets) {
        results.push({
            aimCoordinate:
                OffsetCoordinateService.keyToCoordinate(coordinateKey),
            targetIds: [...squaddieKeySet].map((k) =>
                SquaddieIdConverterService.keyToSquaddieId(k)
            ),
        })
    }
    return results
}

const validateActionDestination = ({
    actor,
    squaddieAction,
    decisions,
    coordinateMapCollectionManager,
    mapId,
}: {
    actor: BattleSquaddieId
    squaddieAction: SquaddieAction
    decisions: SquaddieActionDecisions | undefined
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    mapId: string
}): ActionValidationResult => {
    const teleportEffect = Object.values(
        squaddieAction.effectOnTarget ?? {}
    ).find(
        (effect) =>
            effect?.movement?.movementType ===
            MovementEffectType.TELEPORT_TO_ACTOR_CHOSEN
    )
    if (teleportEffect == undefined) return { isValid: true }

    const movement = teleportEffect.movement as {
        movementType: typeof MovementEffectType.TELEPORT_TO_ACTOR_CHOSEN
        destinationRange?: TActionRange
    }
    const { destinationRange } = movement
    if (destinationRange == undefined || destinationRange === ActionRange.SELF)
        return { isValid: true }

    const destination = decisions?.targetDestination
    if (destination == undefined) return { isValid: true }

    const map = coordinateMapCollectionManager.getMapById(mapId)
    const actorCoordinateMaybeOffmap =
        CoordinateMapService.getSquaddieCoordinate({
            map,
            squaddieId: actor,
        })
    const actorCoordinate =
        CoordinateMapService.convertOffsetMaybeOffmapCoordinate(
            actorCoordinateMaybeOffmap
        )
    if (actorCoordinate == undefined) return { isValid: true }

    const distance = CoordinateCalculator.getDistanceBetween(
        actorCoordinate,
        destination
    )
    const { maximum } = ActionRangeService.minAndMaxByRange[destinationRange]
    if (distance > maximum) {
        return { isValid: false, reason: "Destination is out of range" }
    }

    const isPassable = CoordinateMapService.canSquaddieStopAtCoordinate({
        map,
        coordinate: destination,
        squaddieId: actor,
    })
    if (!isPassable) {
        return { isValid: false, reason: "Destination is blocked" }
    }

    const hasLos = LineOfSightService.hasLineOfSight({
        from: actorCoordinate,
        to: destination,
        mapId,
        coordinateMapCollectionManager,
        skipOverPits: true,
        moveThroughWalls: false,
    })
    if (!hasLos) {
        return { isValid: false, reason: "Destination is not visible" }
    }

    return { isValid: true }
}

const calculateAimCoordinateResultsWithAreaOfEffect = ({
    squaddieAction,
    reachableCoordinateKeys,
    actor,
    mapId,
    managers,
}: {
    squaddieAction: SquaddieAction
    reachableCoordinateKeys: Set<string>
    actor: BattleSquaddieId
    mapId: string
    managers: {
        inBattleSquaddieManager: InBattleSquaddieManager
        squaddieActionManager: SquaddieActionManager
        coordinateMapCollectionManager: CoordinateMapCollectionManager
    }
}) => {
    const results: AimCoordinateResult[] = []
    for (const coordinateKey of reachableCoordinateKeys) {
        const aimCoordinate =
            OffsetCoordinateService.keyToCoordinate(coordinateKey)
        const resolvedTargets = AoeTargetResolutionService.resolveAoeTargets({
            action: squaddieAction,
            actor,
            targetCoordinate: aimCoordinate,
            mapId,
            managers,
        })

        if (resolvedTargets.length === 0) {
            continue
        }
        results.push({ aimCoordinate, targetIds: resolvedTargets })
    }
    return results
}

const resolveToSelfIfActionRangeIsSelf = ({
    targetCoordinate,
    squaddieAction,
    coordinateMapCollectionManager,
    actor,
    mapId,
}: {
    targetCoordinate: OffsetCoordinate | undefined
    squaddieAction: SquaddieAction
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    actor: BattleSquaddieId
    mapId: string
}): OffsetCoordinate | undefined => {
    if (
        targetCoordinate != undefined ||
        squaddieAction.targeting.range !== ActionRange.SELF
    ) {
        return targetCoordinate
    }

    const actorCoordinate =
        coordinateMapCollectionManager.getSquaddieCoordinate({
            mapId,
            squaddieId: actor,
        })
    if (
        actorCoordinate?.row == undefined ||
        actorCoordinate?.col == undefined
    ) {
        return undefined
    }
    return {
        row: actorCoordinate.row,
        col: actorCoordinate.col,
    }
}
