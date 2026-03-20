import { CoordinateShapeService } from "../../../coordinateMap/shape"
import { SquaddieAffiliationService } from "../../../affiliation/affiliation"
import type {
    BattleSquaddieId,
    InBattleSquaddieManager,
} from "../../../squaddie/inBattle/inBattleSquaddieManager"
import type { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager"
import type { SquaddieAction } from "../../squaddieAction"
import type { OffsetCoordinate } from "../../../coordinateMap/offsetCoordinate"

export const AoeTargetResolutionService = {
    resolveAoeTargets({
        action,
        actor,
        targetCoordinate,
        mapId,
        managers,
    }: {
        action: SquaddieAction
        actor: BattleSquaddieId
        targetCoordinate: OffsetCoordinate
        mapId: string
        managers: {
            coordinateMapCollectionManager: CoordinateMapCollectionManager
            inBattleSquaddieManager: InBattleSquaddieManager
        }
    }): BattleSquaddieId[] {
        const affectedCoordinates = CoordinateShapeService.calculateCoordinates(
            {
                shape: action.targeting.shape,
                origin: targetCoordinate,
                radius: action.targeting.areaOfEffectSize ?? 0,
            }
        )

        const candidates = collectSquaddiesAtCoordinates({
            affectedCoordinates,
            mapId,
            coordinateMapCollectionManager:
                managers.coordinateMapCollectionManager,
        })

        return filterByAffiliation({
            actor,
            candidates,
            affiliationRelationship: action.targeting.affiliationRelationship,
            inBattleSquaddieManager: managers.inBattleSquaddieManager,
        })
    },
}

const collectSquaddiesAtCoordinates = ({
    affectedCoordinates,
    mapId,
    coordinateMapCollectionManager,
}: {
    affectedCoordinates: OffsetCoordinate[]
    mapId: string
    coordinateMapCollectionManager: CoordinateMapCollectionManager
}): BattleSquaddieId[] => {
    const result: BattleSquaddieId[] = []
    for (const coordinate of affectedCoordinates) {
        const squaddieId =
            coordinateMapCollectionManager.getSquaddieAtCoordinate({
                mapId,
                coordinate,
            })
        if (squaddieId != undefined) {
            result.push(squaddieId)
        }
    }
    return result
}

const filterByAffiliation = ({
    actor,
    candidates,
    affiliationRelationship,
    inBattleSquaddieManager,
}: {
    actor: BattleSquaddieId
    candidates: BattleSquaddieId[]
    affiliationRelationship: { self: boolean; friend: boolean; foe: boolean }
    inBattleSquaddieManager: InBattleSquaddieManager
}): BattleSquaddieId[] => {
    const actorAffiliation =
        inBattleSquaddieManager.getSquaddie(actor).outOfBattleSquaddie
            .affiliation

    return candidates.filter((candidate) => {
        const isSelf =
            candidate.inBattleSquaddieId === actor.inBattleSquaddieId &&
            candidate.outOfBattleSquaddieId === actor.outOfBattleSquaddieId

        if (isSelf) return affiliationRelationship.self

        const candidateAffiliation =
            inBattleSquaddieManager.getSquaddie(candidate).outOfBattleSquaddie
                .affiliation

        const areFriends = SquaddieAffiliationService.areFriends({
            actor: actorAffiliation,
            target: candidateAffiliation,
        })

        return (
            (areFriends && affiliationRelationship.friend) ||
            (!areFriends && affiliationRelationship.foe)
        )
    })
}
