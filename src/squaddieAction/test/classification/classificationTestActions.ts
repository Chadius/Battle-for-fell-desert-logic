import { type TActionRange, ActionRange } from "../../actionRange.js"
import {
    CoordinateGeneratorShape,
    type TCoordinateGeneratorShape,
} from "../../../coordinateMap/shape.js"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.js"
import {
    ProficiencyType,
    type TProficiencyType,
} from "../../../proficiency/proficiencyLevel.js"
import {
    AttributeScore,
    type AttributeScoreType,
} from "../../../proficiency/attributeScore.js"
import {
    SquaddieConditionService,
    SquaddieConditionSource,
    SquaddieConditionType,
} from "../../../proficiency/squaddieCondition.js"
import {
    type SquaddieAction,
    SquaddieActionService,
} from "../../squaddieAction.js"
import type { SquaddieActionEffect } from "../../squaddieActionEffect.js"

export interface ClassificationTestActionOptions {
    attribute?: AttributeScoreType
    proficiency?: TProficiencyType
    range?: TActionRange
    shape?: TCoordinateGeneratorShape
    areaOfEffectSize?: number
}

export const spendOneActionPoint = {
    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
}

export const ClassificationTestEffects = {
    damage: {
        damage: { raw: 2, targetProficiency: ProficiencyType.ARMOR },
    } satisfies SquaddieActionEffect,
    healing: { healing: { raw: 2 } } satisfies SquaddieActionEffect,
    armor: {
        conditions: {
            add: [
                SquaddieConditionService.new({
                    type: SquaddieConditionType.ARMOR,
                    duration: undefined,
                    amount: { amount: 1 },
                    source: SquaddieConditionSource.PHYSICAL,
                }),
            ],
        },
    } satisfies SquaddieActionEffect,
    treatSlowed: {
        conditions: {
            treat: {
                all: false,
                types: [SquaddieConditionType.SLOWED],
                amount: undefined,
            },
        },
    } satisfies SquaddieActionEffect,
    dispelSlowed: {
        conditions: {
            dispel: {
                all: false,
                types: [SquaddieConditionType.SLOWED],
                amount: undefined,
            },
        },
    } satisfies SquaddieActionEffect,
    slowed: {
        conditions: {
            add: [
                SquaddieConditionService.new({
                    type: SquaddieConditionType.SLOWED,
                    duration: undefined,
                    amount: { amount: 1 },
                    source: SquaddieConditionSource.ELEMENTAL,
                }),
            ],
        },
    } satisfies SquaddieActionEffect,
}

const testAction = ({
    id,
    options,
    affiliationRelationship,
    effectOnTarget,
}: {
    id: string
    options: ClassificationTestActionOptions
    affiliationRelationship: SquaddieAction["targeting"]["affiliationRelationship"]
    effectOnTarget: SquaddieActionEffect
}): SquaddieAction =>
    SquaddieActionService.new({
        id,
        attribute: options.attribute ?? AttributeScore.BODY,
        proficiency: options.proficiency ?? ProficiencyType.UNKNOWN,
        range: options.range ?? ActionRange.MELEE,
        shape: options.shape ?? CoordinateGeneratorShape.BLOOM,
        areaOfEffectSize: options.areaOfEffectSize ?? 0,
        affiliationRelationship,
        effectOnActor: spendOneActionPoint,
        effectOnTarget: { [DegreeOfSuccess.SUCCESS]: effectOnTarget },
    })

const foeOnly = { self: false, foe: true, friend: false }

export const ClassificationTestActions = {
    attack: (options: ClassificationTestActionOptions): SquaddieAction =>
        testAction({
            id: "attack",
            options,
            affiliationRelationship: foeOnly,
            effectOnTarget: ClassificationTestEffects.damage,
        }),
    hinder: (options: ClassificationTestActionOptions): SquaddieAction =>
        testAction({
            id: "hinder",
            options,
            affiliationRelationship: foeOnly,
            effectOnTarget: ClassificationTestEffects.slowed,
        }),
    assist: (options: ClassificationTestActionOptions): SquaddieAction =>
        testAction({
            id: "assist",
            options,
            affiliationRelationship: { self: true, foe: false, friend: true },
            effectOnTarget: ClassificationTestEffects.healing,
        }),
}
