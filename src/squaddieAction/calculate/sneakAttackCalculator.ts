import type { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager"
import type { CoordinateMapCollectionManager } from "../../coordinateMap/coordinateMapManager"
import type { SquaddieAction } from "../squaddieAction"
import type { SquaddieActionEffect } from "../squaddieActionEffect"
import type { TDegreeOfSuccess } from "../../degreesOfSuccess/degreeOfSuccess"
import { DegreeOfSuccess } from "../../degreesOfSuccess/degreeOfSuccess"
import {
    ProficiencyType,
    type TProficiencyType,
} from "../../proficiency/proficiencyLevel"
import { SquaddieConditionType } from "../../proficiency/squaddieCondition"
import { FlankingService } from "../../coordinateMap/flankingService"

const weaponProficiencyTypes = new Set<TProficiencyType>([
    ProficiencyType.WEAPON_NATURAL,
    ProficiencyType.WEAPON_SIMPLE,
    ProficiencyType.WEAPON_MARTIAL,
])

export const SneakAttackCalculator = {
    computeSneakAttackBonus({
        actor,
        actorPassiveSneakAttack,
        target,
        squaddieAction,
        damageEffect,
        degreeOfSuccess,
        inBattleSquaddieManager,
        map,
    }: {
        actor: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }
        actorPassiveSneakAttack: number
        target: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }
        squaddieAction: SquaddieAction
        damageEffect: SquaddieActionEffect["damage"] | undefined
        degreeOfSuccess: TDegreeOfSuccess
        inBattleSquaddieManager: InBattleSquaddieManager
        map?: { mapId: string; manager: CoordinateMapCollectionManager }
    }): number {
        if (damageEffect == undefined) return 0
        if (!weaponProficiencyTypes.has(squaddieAction.proficiency)) return 0

        const isTargetVulnerable = isVulnerable({
            actor,
            target,
            inBattleSquaddieManager,
            map,
        })
        if (!isTargetVulnerable) return 0

        const actionSneakAttack = damageEffect.sneakAttackDamage ?? 0
        const criticalMultiplier =
            degreeOfSuccess === DegreeOfSuccess.CRITICAL ? 2 : 1
        const passiveSneakAttack = actorPassiveSneakAttack * criticalMultiplier

        return Math.max(actionSneakAttack, passiveSneakAttack)
    },
}

const isVulnerable = ({
    actor,
    target,
    inBattleSquaddieManager,
    map,
}: {
    actor: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }
    target: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }
    inBattleSquaddieManager: InBattleSquaddieManager
    map?: { mapId: string; manager: CoordinateMapCollectionManager }
}): boolean => {
    const conditions = inBattleSquaddieManager.getSquaddieConditions(target)
    const hasActiveOffGuard = (
        conditions.get(SquaddieConditionType.OFF_GUARD) ?? []
    ).some((c) => (c.amount?.current ?? 0) > 0)
    if (hasActiveOffGuard) return true

    if (map == undefined) return false
    return FlankingService.isActorFlankingTarget({
        actor,
        target,
        mapId: map.mapId,
        coordinateMapCollectionManager: map.manager,
        inBattleSquaddieManager,
    })
}
