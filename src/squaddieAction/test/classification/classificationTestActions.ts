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
    type SquaddieAction,
    SquaddieActionService,
} from "../../squaddieAction.js"

export interface ClassificationTestActionOptions {
    attribute?: AttributeScoreType
    proficiency?: TProficiencyType
    range?: TActionRange
    shape?: TCoordinateGeneratorShape
    areaOfEffectSize?: number
}

const spendOneActionPoint = {
    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
}

export const ClassificationTestActions = {
    attack: ({
        attribute,
        proficiency,
        range,
        shape,
        areaOfEffectSize,
    }: ClassificationTestActionOptions): SquaddieAction =>
        SquaddieActionService.new({
            id: "attack",
            name: "Attack",
            attribute: attribute ?? AttributeScore.BODY,
            proficiency: proficiency ?? ProficiencyType.UNKNOWN,
            range: range ?? ActionRange.MELEE,
            shape: shape ?? CoordinateGeneratorShape.BLOOM,
            areaOfEffectSize: areaOfEffectSize ?? 0,
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: spendOneActionPoint,
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    damage: {
                        raw: 2,
                        targetProficiency: ProficiencyType.ARMOR,
                    },
                },
            },
        }),
    assist: ({
        attribute,
        proficiency,
        range,
        areaOfEffectSize,
    }: ClassificationTestActionOptions): SquaddieAction =>
        SquaddieActionService.new({
            id: "assist",
            name: "Assist",
            attribute: attribute ?? AttributeScore.BODY,
            proficiency: proficiency ?? ProficiencyType.UNKNOWN,
            range: range ?? ActionRange.MELEE,
            areaOfEffectSize: areaOfEffectSize ?? 0,
            affiliationRelationship: { self: true, foe: false, friend: true },
            effectOnActor: spendOneActionPoint,
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: { healing: { raw: 2 } },
            },
        }),
}
