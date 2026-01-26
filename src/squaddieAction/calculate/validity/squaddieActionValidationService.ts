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

export interface ActionValidationResult {
    isValid: boolean
    reason?: string
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

        return validateTargetsInRange({
            actor,
            targets,
            squaddieAction,
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
            coordinateMapCollectionManager:
                managers.coordinateMapCollectionManager,
            mapId: map.mapId,
        })
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

    const inRangeTargets = filterTargetsByDistance({
        actor,
        targets: affiliationFilteredTargets,
        actionRange,
        coordinateMapCollectionManager,
        mapId,
    })

    if (inRangeTargets.length === 0) {
        return { isValid: false, reason: "No targets are in range" }
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
