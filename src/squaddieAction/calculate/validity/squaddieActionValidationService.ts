import type {
    BattleSquaddieId,
    InBattleSquaddieManager,
} from "../../../squaddie/inBattle/inBattleSquaddieManager"
import type { SquaddieActionManager } from "../../squaddieActionManager"
import type { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager"
import { SquaddieAffiliationService } from "../../../affiliation/affiliation"
import { ActionRangeService, type TActionRange } from "../../actionRange"
import { CoordinateCalculator } from "../../../coordinateMap/coordinateCalculator"
import {
    type ActionPointCost,
    type SquaddieAction,
    SquaddieActionService,
} from "../../squaddieAction"
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
import type { InBattleSquaddie } from "../../../squaddie/inBattle/inBattleSquaddie"

export interface InvalidSquaddieAction {
    actionId: string
    actionName: string
    reason: string
}

export interface SquaddieActionValidity {
    battleSquaddieId: BattleSquaddieId
    invalidActions: InvalidSquaddieAction[]
    validActions: { actionId: string; actionName: string }[]
}

export interface ActionValidationResult {
    isValid: boolean
    reason?: string
    movementPath?: CoordinateMovePath
}

export interface ValidSquaddieActionOption {
    action: SquaddieAction
    decisions: SquaddieActionDecisions & {
        targetCoordinate?: OffsetCoordinate
        targetSquaddieIds?: BattleSquaddieId[]
    }
    movementPath?: CoordinateMovePath
    actionPointsRemaining: InBattleSquaddie["actionPoints"]
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

        const effectValidation = validateTargetsCanBeAffected({
            actor,
            targets,
            squaddieAction,
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
    getAllValidTargetsInRangeOfAction: ({
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
        const affiliationRelationship =
            squaddieAction.targeting.affiliationRelationship
        const actionRange = squaddieAction.targeting.range

        const allSquaddiesOnMap =
            managers.coordinateMapCollectionManager.getAllSquaddieCoordinatesOnMap(
                map.mapId
            )

        const allTargets: BattleSquaddieId[] = allSquaddiesOnMap.map(
            (info) => ({
                inBattleSquaddieId: info.squaddieId.inBattleSquaddieId,
                outOfBattleSquaddieId: info.squaddieId.outOfBattleSquaddieId,
            })
        )

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
            coordinateMapCollectionManager:
                managers.coordinateMapCollectionManager,
            mapId: map.mapId,
            positionOverride,
        })

        const reachableCoordinateKeys = getReachableCoordinateKeys({
            actor,
            actionRange,
            coordinateMapCollectionManager:
                managers.coordinateMapCollectionManager,
            mapId: map.mapId,
            positionOverride,
        })

        const reachableCoordinatesWithSquaddiesInRange = new Map<
            string,
            Set<string>
        >()
        for (const target of distanceFilteredTargets) {
            const targetCoordinate =
                managers.coordinateMapCollectionManager.getSquaddieCoordinate({
                    mapId: map.mapId,
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

            const squaddieKey =
                SquaddieIdConverterService.squaddieIdToKey(target)

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
        const validActions: { actionId: string; actionName: string }[] = []

        for (const actionId of actionIds) {
            if (!managers.squaddieActionManager.has(actionId)) continue
            const squaddieAction = managers.squaddieActionManager.get(actionId)

            const invalidReason = getActionInvalidReason({
                actor,
                squaddieAction,
                currentActionPoints,
                managers,
                map,
            })

            if (invalidReason == undefined) {
                validActions.push({
                    actionId,
                    actionName: squaddieAction.name,
                })
            } else {
                invalidActions.push({
                    actionId,
                    actionName: squaddieAction.name,
                    reason: invalidReason,
                })
            }
        }

        validActions.push({
            actionId: "default-end-turn",
            actionName: "End Turn",
        })

        const movementOptions = generateMovementOptions({
            actor,
            managers,
            map,
            currentActionPoints,
        })

        if (movementOptions.length > 0) {
            validActions.push({
                actionId: "default-move",
                actionName: "Move",
            })
        } else {
            invalidActions.push({
                actionId: "default-move",
                actionName: "Move",
                reason: "No valid movement destinations",
            })
        }

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
        if (actionOption.decisions.desiredMovementDestination != undefined) {
            newPosition = actionOption.decisions.desiredMovementDestination
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

const getActionInvalidReason = ({
    actor,
    squaddieAction,
    currentActionPoints,
    managers,
    map,
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
}): string | undefined => {
    const actionPointCost =
        squaddieAction.effectOnActor.SUCCESS?.actionPoints?.spent

    const apReason = getActionPointInvalidReason({
        actionPointCost,
        currentActionPoints,
    })
    if (apReason != undefined) return apReason

    const validTargets =
        SquaddieActionValidationService.getAllValidTargetsInRangeOfAction({
            actor,
            action: { id: squaddieAction.id },
            managers,
            map,
        })

    if (validTargets.size === 0) return "No applicable targets in range"

    if (
        !anyTargetGroupHasEffect({
            actor,
            validTargets,
            squaddieAction,
            managers,
            map,
        })
    ) {
        return "No targets can be affected"
    }

    return undefined
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

const anyTargetGroupHasEffect = ({
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
}): boolean => {
    for (const [, squaddieKeys] of validTargets) {
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

        if (hasEffect) return true
    }
    return false
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

    const pathfindingValidTargets = filterTargetsByPathfinding({
        actor,
        targets: inRangeTargets,
        actionRange,
        coordinateMapCollectionManager,
        mapId,
    })

    if (pathfindingValidTargets.length !== inRangeTargets.length) {
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

const filterTargetsByPathfinding = ({
    actor,
    targets,
    actionRange,
    coordinateMapCollectionManager,
    mapId,
}: {
    actor: BattleSquaddieId
    targets: BattleSquaddieId[]
    actionRange: TActionRange
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

    let allTargetsAreOnTheMap = true

    const targetCoordinateKeys = new Set(
        targets.map((target) => {
            const squaddieCoordinate =
                coordinateMapCollectionManager.getSquaddieCoordinate({
                    mapId,
                    squaddieId: target,
                })
            if (squaddieCoordinate == undefined) {
                allTargetsAreOnTheMap = false
                return ""
            }
            return OffsetCoordinateService.coordinateToKey({
                row: squaddieCoordinate.row!,
                col: squaddieCoordinate.col!,
            })
        })
    )

    if (!allTargetsAreOnTheMap) {
        return []
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

    const stopCondition = (node: OffsetCoordinate) => {
        const key = OffsetCoordinateService.coordinateToKey(node)
        targetCoordinateKeys.delete(key)
        return targetCoordinateKeys.size === 0
    }

    AStarSearchService.search<
        OffsetCoordinate,
        CoordinateMovePath,
        AStarGraph<OffsetCoordinate, CoordinateMovePath>
    >({
        start: actorPosition,
        graph: adapter,
        stopCondition,
    })

    return targetCoordinateKeys.size === 0 ? targets : []
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
    if (!hasMovementPathCost) {
        return { isValid: true }
    }

    if (decisions?.desiredMovementDestination == undefined) {
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

    const destination = decisions.desiredMovementDestination
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
        coordinateMapCollectionManager: coordinateMapCollectionManager,
        mapId: mapId,
        inBattleSquaddieManager: inBattleSquaddieManager,
        actor: actor,
        destination: destination,
        actorPosition: actorPosition,
    })
}

const validateMovementPathWithPathfinding = ({
    coordinateMapCollectionManager,
    mapId,
    inBattleSquaddieManager,
    actor,
    destination,
    actorPosition,
}: {
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    mapId: string
    inBattleSquaddieManager: InBattleSquaddieManager
    actor: BattleSquaddieId
    destination: OffsetCoordinate
    actorPosition: OffsetCoordinate
}): ActionValidationResult => {
    const map = coordinateMapCollectionManager.getMapById(mapId)
    const searchLimits =
        CoordinateMapAStarAdapter.getCoordinateMapSearchLimitsFromSquaddie({
            manager: inBattleSquaddieManager,
            battleSquaddieId: actor,
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

    return { isValid: true, movementPath: path }
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
    inBattleSquaddieManager,
    squaddieActionManager,
    coordinateMapCollectionManager,
    mapId,
}: {
    actor: BattleSquaddieId
    targets: BattleSquaddieId[]
    squaddieAction: SquaddieAction
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

    const results = SquaddieActionResultCalculator.calculateResult({
        actor,
        targets,
        action: { id: squaddieAction.id },
        managers: {
            inBattleSquaddieManager,
            squaddieActionManager,
            coordinateMapCollectionManager,
        },
        degreeOfSuccess: DegreeOfSuccess.SUCCESS,
        map: { mapId },
    })

    const targetResults = results.filter((result) =>
        targets.some(
            (t) =>
                t.inBattleSquaddieId === result.inBattleSquaddieId &&
                t.outOfBattleSquaddieId === result.outOfBattleSquaddieId
        )
    )

    const hasAffectedTarget = targetResults.some(squaddieActionResultHasEffect)

    if (!hasAffectedTarget) {
        return { isValid: false, reason: "No targets can be affected" }
    }

    return { isValid: true }
}

const getReachableCoordinateKeys = ({
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
    const options: ValidSquaddieActionOption[] = []

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
            return options
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

    const coordinateMap = managers.coordinateMapCollectionManager.getMapById(
        map.mapId
    )
    const adapter = new CoordinateMapAStarAdapter({
        map: coordinateMap,
        searchLimits,
        inBattleSquaddieManager: managers.inBattleSquaddieManager,
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

    for (const [_key, visited] of adapter.coordinatePathMap
        .visitedCoordinates) {
        if (visited.cachedMovePath == undefined) continue

        if (
            visited.row === actorPosition.row &&
            visited.col === actorPosition.col
        ) {
            continue
        }

        const pathCost = CoordinateMovePathService.getTotalMoveCost(
            visited.cachedMovePath
        )
        const actionPointsSpent = Math.ceil(
            pathCost / movementInfo.movementPerAction
        )
        const actionPointsRemaining =
            currentActionPoints.current - actionPointsSpent

        options.push({
            action: SquaddieActionService.defaultMove(),
            decisions: {
                desiredMovementDestination: {
                    row: visited.row,
                    col: visited.col,
                },
            },
            movementPath: visited.cachedMovePath,
            actionPointsRemaining: { current: actionPointsRemaining },
        })
    }

    return options
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
        const actionPointCost =
            squaddieAction.effectOnActor.SUCCESS?.actionPoints?.spent

        if (actionPointCost === "all") {
            if (currentActionPoints.current <= 0) continue
        } else if (
            actionPointCost != undefined &&
            actionPointCost > currentActionPoints.current
        ) {
            continue
        }

        const validTargets =
            SquaddieActionValidationService.getAllValidTargetsInRangeOfAction({
                actor,
                action: { id: actionId },
                managers,
                map,
                positionOverride,
            })
        addSquaddieTargetEffectsToOptions({
            validTargets: validTargets,
            actor: actor,
            squaddieAction: squaddieAction,
            managers: managers,
            map: map,
            actionPointCost: actionPointCost,
            currentActionPoints: currentActionPoints,
            options: options,
        })
    }

    return options
}

const addSquaddieTargetEffectsToOptions = ({
    validTargets,
    actor,
    squaddieAction,
    managers,
    map,
    actionPointCost,
    currentActionPoints,
    options,
}: {
    validTargets: Map<string, Set<string>>
    actor: BattleSquaddieId
    squaddieAction: SquaddieAction
    managers: {
        inBattleSquaddieManager: InBattleSquaddieManager
        squaddieActionManager: SquaddieActionManager
        coordinateMapCollectionManager: CoordinateMapCollectionManager
    }
    map: { mapId: string }
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

        const hasEffect = checkIfActionHasEffectOnTargets({
            actor,
            targets: targetSquaddieIds,
            squaddieAction,
            managers,
            map,
        })

        if (!hasEffect) continue

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
        degreeOfSuccess: DegreeOfSuccess.SUCCESS,
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
}
