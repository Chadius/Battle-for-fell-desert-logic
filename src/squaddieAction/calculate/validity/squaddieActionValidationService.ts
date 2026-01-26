import type {
    BattleSquaddieId,
    InBattleSquaddieManager,
} from "../../../squaddie/inBattle/inBattleSquaddieManager"
import type { SquaddieActionManager } from "../../squaddieActionManager"
import type { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager"
import { SquaddieAffiliationService } from "../../../affiliation/affiliation"
import { ActionRangeService, type TActionRange } from "../../actionRange"
import { CoordinateCalculator } from "../../../coordinateMap/coordinateCalculator"
import type { SquaddieAction } from "../../squaddieAction"
import {
    CoordinateMapAStarAdapter,
    type CoordinateMapSearchLimits,
} from "../../../coordinateMap/coordinateMapAStarAdapter"
import { AStarSearchService } from "../../../aStarSearch/aStarSearch"
import type { CoordinateMovePath } from "../../../coordinateMap/path/path"
import type { SquaddieActionDecisions } from "../result/squaddieActionResultCalculator"
import {
    type OffsetCoordinate,
    OffsetCoordinateService,
} from "../../../coordinateMap/offsetCoordinate"
import type { AStarGraph } from "../../../aStarSearch/aStarGraph"

export interface ActionValidationResult {
    isValid: boolean
    reason?: string
    movementPath?: CoordinateMovePath
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

        return {
            isValid: true,
            movementPath: movementValidation.movementPath,
        }
    },
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
}: {
    actor: BattleSquaddieId
    targets: BattleSquaddieId[]
    actionRange: TActionRange
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    mapId: string
}): BattleSquaddieId[] => {
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

    const actorPosition = {
        row: actorCoordinate.row,
        col: actorCoordinate.col,
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
