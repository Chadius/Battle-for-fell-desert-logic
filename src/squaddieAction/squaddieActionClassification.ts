import type { EnumLike } from "../enum.js"
import { AttributeScore } from "../proficiency/attributeScore.js"
import {
    ProficiencyType,
    type TProficiencyType,
} from "../proficiency/proficiencyLevel.js"
import { ActionRange, type TActionRange } from "./actionRange.js"
import { type SquaddieAction, SquaddieActionService } from "./squaddieAction.js"
import type { SquaddieActionEffect } from "./squaddieActionEffect.js"

export const SquaddieActionClassification = {
    WEAPON_MELEE_NATURAL: "WEAPON_MELEE_NATURAL",
    WEAPON_MELEE_SIMPLE: "WEAPON_MELEE_SIMPLE",
    WEAPON_MELEE_MARTIAL: "WEAPON_MELEE_MARTIAL",
    WEAPON_RANGED_NATURAL: "WEAPON_RANGED_NATURAL",
    WEAPON_RANGED_SIMPLE: "WEAPON_RANGED_SIMPLE",
    WEAPON_RANGED_MARTIAL: "WEAPON_RANGED_MARTIAL",
    WEAPON_AOE_NATURAL: "WEAPON_AOE_NATURAL",
    WEAPON_AOE_SIMPLE: "WEAPON_AOE_SIMPLE",
    WEAPON_AOE_MARTIAL: "WEAPON_AOE_MARTIAL",
    MIND_ATTACK: "MIND_ATTACK",
    MIND_AOE_ATTACK: "MIND_AOE_ATTACK",
    MIND_ASSIST: "MIND_ASSIST",
    SOUL_ATTACK: "SOUL_ATTACK",
    SOUL_AOE_ATTACK: "SOUL_AOE_ATTACK",
    SOUL_ASSIST: "SOUL_ASSIST",
    BODY_ATTACK: "BODY_ATTACK",
    BODY_AOE_ATTACK: "BODY_AOE_ATTACK",
    BODY_ASSIST: "BODY_ASSIST",
    MOVEMENT: "MOVEMENT",
    END_TURN: "END_TURN",
    UNKNOWN: "UNKNOWN",
} as const satisfies Record<string, string>
export type TSquaddieActionClassification = EnumLike<
    typeof SquaddieActionClassification
>

const WeaponReach = {
    MELEE: "MELEE",
    RANGED: "RANGED",
    AOE: "AOE",
} as const satisfies Record<string, string>
type TWeaponReach = EnumLike<typeof WeaponReach>

const MELEE_RANGES: ReadonlySet<TActionRange> = new Set([
    ActionRange.MELEE,
    ActionRange.REACH,
])

const weaponClassificationByReachAndProficiency: Record<
    TWeaponReach,
    Partial<Record<TProficiencyType, TSquaddieActionClassification>>
> = {
    [WeaponReach.MELEE]: {
        [ProficiencyType.WEAPON_NATURAL]:
            SquaddieActionClassification.WEAPON_MELEE_NATURAL,
        [ProficiencyType.WEAPON_SIMPLE]:
            SquaddieActionClassification.WEAPON_MELEE_SIMPLE,
        [ProficiencyType.WEAPON_MARTIAL]:
            SquaddieActionClassification.WEAPON_MELEE_MARTIAL,
    },
    [WeaponReach.RANGED]: {
        [ProficiencyType.WEAPON_NATURAL]:
            SquaddieActionClassification.WEAPON_RANGED_NATURAL,
        [ProficiencyType.WEAPON_SIMPLE]:
            SquaddieActionClassification.WEAPON_RANGED_SIMPLE,
        [ProficiencyType.WEAPON_MARTIAL]:
            SquaddieActionClassification.WEAPON_RANGED_MARTIAL,
    },
    [WeaponReach.AOE]: {
        [ProficiencyType.WEAPON_NATURAL]:
            SquaddieActionClassification.WEAPON_AOE_NATURAL,
        [ProficiencyType.WEAPON_SIMPLE]:
            SquaddieActionClassification.WEAPON_AOE_SIMPLE,
        [ProficiencyType.WEAPON_MARTIAL]:
            SquaddieActionClassification.WEAPON_AOE_MARTIAL,
    },
}

const attackOrAssistClassificationByAttribute = {
    [AttributeScore.MIND]: {
        attack: SquaddieActionClassification.MIND_ATTACK,
        areaAttack: SquaddieActionClassification.MIND_AOE_ATTACK,
        assist: SquaddieActionClassification.MIND_ASSIST,
    },
    [AttributeScore.SOUL]: {
        attack: SquaddieActionClassification.SOUL_ATTACK,
        areaAttack: SquaddieActionClassification.SOUL_AOE_ATTACK,
        assist: SquaddieActionClassification.SOUL_ASSIST,
    },
    [AttributeScore.BODY]: {
        attack: SquaddieActionClassification.BODY_ATTACK,
        areaAttack: SquaddieActionClassification.BODY_AOE_ATTACK,
        assist: SquaddieActionClassification.BODY_ASSIST,
    },
}

const effectsOf = (
    effects: SquaddieAction["effectOnTarget"]
): SquaddieActionEffect[] =>
    Object.values(effects ?? {}).filter(
        (effect): effect is SquaddieActionEffect => effect != undefined
    )

const changesMoreThanSpentActionPoints = (
    effect: SquaddieActionEffect
): boolean =>
    effect.damage != undefined ||
    effect.healing != undefined ||
    effect.conditions != undefined ||
    effect.movement != undefined ||
    effect.actionPoints?.restore != undefined

const affectsTarget = (squaddieAction: SquaddieAction): boolean =>
    effectsOf(squaddieAction.effectOnTarget).some(
        (effect) =>
            effect.actionPoints != undefined ||
            changesMoreThanSpentActionPoints(effect)
    )

const onlySpendsAllActionPoints = (squaddieAction: SquaddieAction): boolean =>
    !affectsTarget(squaddieAction) &&
    effectsOf(squaddieAction.effectOnActor).every(
        (effect) =>
            effect.actionPoints?.spent === "all" &&
            !changesMoreThanSpentActionPoints(effect)
    )

const onlyMovesActor = (squaddieAction: SquaddieAction): boolean =>
    !affectsTarget(squaddieAction) &&
    effectsOf(squaddieAction.effectOnActor).some(
        (effect) => effect.movement != undefined
    )

const weaponReach = (squaddieAction: SquaddieAction): TWeaponReach => {
    if (SquaddieActionService.coversArea(squaddieAction)) return WeaponReach.AOE
    if (MELEE_RANGES.has(squaddieAction.targeting.range))
        return WeaponReach.MELEE
    return WeaponReach.RANGED
}

const weaponClassification = (
    squaddieAction: SquaddieAction
): TSquaddieActionClassification | undefined =>
    weaponClassificationByReachAndProficiency[weaponReach(squaddieAction)][
        squaddieAction.proficiency
    ]

const attackOrAssistClassification = (
    squaddieAction: SquaddieAction
): TSquaddieActionClassification => {
    const classifications =
        attackOrAssistClassificationByAttribute[squaddieAction.attribute]
    if (!SquaddieActionService.isAttackAction(squaddieAction))
        return classifications.assist
    return SquaddieActionService.coversArea(squaddieAction)
        ? classifications.areaAttack
        : classifications.attack
}

const classificationOf = (
    squaddieAction: SquaddieAction
): TSquaddieActionClassification => {
    if (onlySpendsAllActionPoints(squaddieAction))
        return SquaddieActionClassification.END_TURN
    if (onlyMovesActor(squaddieAction))
        return SquaddieActionClassification.MOVEMENT
    const weaponActionClassification = weaponClassification(squaddieAction)
    if (weaponActionClassification == undefined)
        return attackOrAssistClassification(squaddieAction)
    return SquaddieActionService.isAttackAction(squaddieAction)
        ? weaponActionClassification
        : SquaddieActionClassification.UNKNOWN
}

export const SquaddieActionClassificationService = {
    classify: (squaddieAction: SquaddieAction): TSquaddieActionClassification =>
        classificationOf(squaddieAction),
}
