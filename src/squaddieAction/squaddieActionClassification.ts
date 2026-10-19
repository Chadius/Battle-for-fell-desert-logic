import type { EnumLike } from "../enum.js"
import { CoordinateGeneratorShape } from "../coordinateMap/shape.js"
import { AttributeScore } from "../proficiency/attributeScore.js"
import {
    ProficiencyType,
    type TProficiencyType,
} from "../proficiency/proficiencyLevel.js"
import { SquaddieConditionService } from "../proficiency/squaddieCondition.js"
import { ActionRange, type TActionRange } from "./actionRange.js"
import { ActionTargetScope } from "./actionTargetScope.js"
import {
    type DegreeOfSuccessEffects,
    type SquaddieAction,
    SquaddieActionService,
} from "./squaddieAction.js"
import {
    type SquaddieActionEffect,
    SquaddieActionEffectService,
} from "./squaddieActionEffect.js"

export const SquaddieActionClassificationProficiency = {
    WEAPON: "WEAPON",
    BODY: "BODY",
    MIND: "MIND",
    SOUL: "SOUL",
} as const satisfies Record<string, string>
export type TSquaddieActionClassificationProficiency = EnumLike<
    typeof SquaddieActionClassificationProficiency
>

export const SquaddieActionClassificationReach = {
    SELF: "SELF",
    MELEE: "MELEE",
    RANGED: "RANGED",
    LINE: "LINE",
    CONE: "CONE",
    BLOOM: "BLOOM",
} as const satisfies Record<string, string>
export type TSquaddieActionClassificationReach = EnumLike<
    typeof SquaddieActionClassificationReach
>

export const SquaddieActionClassificationOutcome = {
    DAMAGE: "DAMAGE",
    HINDER: "HINDER",
    ASSIST: "ASSIST",
} as const satisfies Record<string, string>
export type TSquaddieActionClassificationOutcome = EnumLike<
    typeof SquaddieActionClassificationOutcome
>

export const SquaddieActionClassification = {
    MOVE: "MOVE",
    END: "END",
    CARRY: "CARRY",
    UNKNOWN: "UNKNOWN",
} as const satisfies Record<string, string>
export type TSquaddieActionClassification =
    | EnumLike<typeof SquaddieActionClassification>
    | `${TSquaddieActionClassificationProficiency}_${TSquaddieActionClassificationReach}_${TSquaddieActionClassificationOutcome}`

const classificationProficiencyByProficiencyType: Record<
    TProficiencyType,
    TSquaddieActionClassificationProficiency | undefined
> = {
    [ProficiencyType.WEAPON_NATURAL]:
        SquaddieActionClassificationProficiency.WEAPON,
    [ProficiencyType.WEAPON_SIMPLE]:
        SquaddieActionClassificationProficiency.WEAPON,
    [ProficiencyType.WEAPON_MARTIAL]:
        SquaddieActionClassificationProficiency.WEAPON,
    [ProficiencyType.SKILL_BODY]: SquaddieActionClassificationProficiency.BODY,
    [ProficiencyType.DEFEND_BODY]: SquaddieActionClassificationProficiency.BODY,
    [ProficiencyType.SKILL_MIND]: SquaddieActionClassificationProficiency.MIND,
    [ProficiencyType.DEFEND_MIND]: SquaddieActionClassificationProficiency.MIND,
    [ProficiencyType.SKILL_SOUL]: SquaddieActionClassificationProficiency.SOUL,
    [ProficiencyType.DEFEND_SOUL]: SquaddieActionClassificationProficiency.SOUL,
    [ProficiencyType.ARMOR]: undefined,
    [ProficiencyType.UNKNOWN]: undefined,
}

const classificationProficiencyByAttribute = {
    [AttributeScore.BODY]: SquaddieActionClassificationProficiency.BODY,
    [AttributeScore.MIND]: SquaddieActionClassificationProficiency.MIND,
    [AttributeScore.SOUL]: SquaddieActionClassificationProficiency.SOUL,
}

const areaReachByShape = {
    [CoordinateGeneratorShape.BLOOM]: SquaddieActionClassificationReach.BLOOM,
    [CoordinateGeneratorShape.LINE]: SquaddieActionClassificationReach.LINE,
    [CoordinateGeneratorShape.CONE]: SquaddieActionClassificationReach.CONE,
}

const MELEE_RANGES: ReadonlySet<TActionRange> = new Set([
    ActionRange.MELEE,
    ActionRange.REACH,
])

const effectsOf = (
    effects: DegreeOfSuccessEffects | undefined
): SquaddieActionEffect[] =>
    Object.values(effects ?? {}).filter(
        (effect): effect is SquaddieActionEffect => effect != undefined
    )

const changesMoreThanPositionAndSpentActionPoints = (
    effect: SquaddieActionEffect
): boolean =>
    effect.damage != undefined ||
    effect.healing != undefined ||
    effect.conditions != undefined ||
    effect.actionPoints?.restore != undefined

const changesMoreThanSpentActionPoints = (
    effect: SquaddieActionEffect
): boolean =>
    changesMoreThanPositionAndSpentActionPoints(effect) ||
    effect.movement != undefined

const changesMoreThanPosition = (effect: SquaddieActionEffect): boolean =>
    changesMoreThanPositionAndSpentActionPoints(effect) ||
    effect.actionPoints != undefined

const changesAnything = (effect: SquaddieActionEffect): boolean =>
    changesMoreThanPosition(effect) || effect.movement != undefined

const affectsTarget = (squaddieAction: SquaddieAction): boolean =>
    effectsOf(squaddieAction.effectOnTarget).some(changesAnything)

const onlySpendsAllActionPoints = (squaddieAction: SquaddieAction): boolean =>
    !affectsTarget(squaddieAction) &&
    effectsOf(squaddieAction.effectOnActor).every(
        (effect) =>
            effect.actionPoints?.spent === "all" &&
            !changesMoreThanSpentActionPoints(effect)
    )

const onlyMovesActor = (squaddieAction: SquaddieAction): boolean => {
    const actorEffects = effectsOf(squaddieAction.effectOnActor)
    return (
        !affectsTarget(squaddieAction) &&
        actorEffects.some((effect) => effect.movement != undefined) &&
        !actorEffects.some(changesMoreThanPositionAndSpentActionPoints)
    )
}

const onlyMovesTargets = (squaddieAction: SquaddieAction): boolean => {
    const targetEffects = effectsOf(squaddieAction.effectOnTarget)
    return (
        targetEffects.some((effect) => effect.movement != undefined) &&
        !targetEffects.some(changesMoreThanPosition)
    )
}

const helps = (effect: SquaddieActionEffect): boolean =>
    effect.healing != undefined ||
    effect.actionPoints?.restore != undefined ||
    effect.conditions?.treat != undefined ||
    effect.conditions?.dispel != undefined ||
    (effect.conditions?.add ?? []).some((condition) =>
        SquaddieConditionService.isHelpful(condition)
    )

const foeEffectsOf = (
    squaddieAction: SquaddieAction
): SquaddieActionEffect[] =>
    squaddieAction.targeting.affiliationRelationship.foe
        ? effectsOf(squaddieAction.effectOnTarget)
        : []

const assistsSelfOrFriend = (squaddieAction: SquaddieAction): boolean => {
    const { self, friend } = squaddieAction.targeting.affiliationRelationship
    const targetsSelfOrFriend = self || friend
    return (
        (targetsSelfOrFriend &&
            effectsOf(squaddieAction.effectOnTarget).some(helps)) ||
        effectsOf(squaddieAction.effectOnActor).some(helps)
    )
}

const classificationProficiency = (
    squaddieAction: SquaddieAction
): TSquaddieActionClassificationProficiency =>
    classificationProficiencyByProficiencyType[squaddieAction.proficiency] ??
    classificationProficiencyByAttribute[squaddieAction.attribute]

const classificationReach = (
    squaddieAction: SquaddieAction
): TSquaddieActionClassificationReach => {
    switch (SquaddieActionService.getTargetScope(squaddieAction)) {
        case ActionTargetScope.AREA:
            return areaReachByShape[squaddieAction.targeting.shape]
        case ActionTargetScope.SELF:
            return SquaddieActionClassificationReach.SELF
    }
    return MELEE_RANGES.has(squaddieAction.targeting.range)
        ? SquaddieActionClassificationReach.MELEE
        : SquaddieActionClassificationReach.RANGED
}

const classificationOutcome = (
    squaddieAction: SquaddieAction
): TSquaddieActionClassificationOutcome | undefined => {
    const foeEffects = foeEffectsOf(squaddieAction)
    if (foeEffects.some((effect) => effect.damage != undefined))
        return SquaddieActionClassificationOutcome.DAMAGE
    if (foeEffects.some(SquaddieActionEffectService.hinders))
        return SquaddieActionClassificationOutcome.HINDER
    if (assistsSelfOrFriend(squaddieAction))
        return SquaddieActionClassificationOutcome.ASSIST
    return undefined
}

export const SquaddieActionClassificationService = {
    classify: (
        squaddieAction: SquaddieAction
    ): TSquaddieActionClassification => {
        if (onlySpendsAllActionPoints(squaddieAction))
            return SquaddieActionClassification.END
        if (onlyMovesActor(squaddieAction))
            return SquaddieActionClassification.MOVE
        if (onlyMovesTargets(squaddieAction))
            return SquaddieActionClassification.CARRY
        const outcome = classificationOutcome(squaddieAction)
        if (outcome == undefined) return SquaddieActionClassification.UNKNOWN
        return `${classificationProficiency(squaddieAction)}_${classificationReach(squaddieAction)}_${outcome}`
    },
}
