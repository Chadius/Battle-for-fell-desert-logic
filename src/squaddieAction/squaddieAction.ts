import {
    AttributeScore,
    type AttributeScoreType,
} from "../proficiency/attributeScore.ts"
import { ActionRange, type TActionRange } from "./actionRange.ts"
import {
    CoordinateGeneratorShape,
    type TCoordinateGeneratorShape,
} from "../coordinateMap/shape.ts"
import {
    DegreeOfSuccess,
    type TDegreeOfSuccess,
} from "../degreesOfSuccess/degreeOfSuccess.ts"
import {
    ProficiencyType,
    type TProficiencyType,
} from "../proficiency/proficiencyLevel.ts"

interface SquaddieActionTargeting {
    range: TActionRange
    shape: TCoordinateGeneratorShape
    affiliationRelationship: {
        self: boolean
        foe: boolean
        friend: boolean
    }
}

export interface SquaddieActionEffect {
    actionPoints?: {
        spent: number | "all"
    }
}

export interface SquaddieAction {
    id: string
    name: string
    attribute: AttributeScoreType
    degreesOfSuccess: TDegreeOfSuccess[]
    targeting: SquaddieActionTargeting
    proficiency: TProficiencyType
    effect: SquaddieActionEffect
}

export const SquaddieActionService = {
    new: ({
        id,
        name,
        attribute,
        degreesOfSuccess,
        targeting,
        proficiency,
        range,
        shape,
        affiliationRelationship,
        effect,
    }: Partial<SquaddieAction> &
        Pick<SquaddieAction, "id" | "name" | "effect"> &
        Partial<SquaddieActionTargeting>): SquaddieAction => {
        return {
            id,
            name,
            attribute: attribute ?? AttributeScore.BODY,
            degreesOfSuccess: degreesOfSuccess ?? [
                DegreeOfSuccess.CRITICAL,
                DegreeOfSuccess.SUCCESS,
                DegreeOfSuccess.FAILURE,
                DegreeOfSuccess.BOTCH,
            ],
            proficiency: proficiency ?? ProficiencyType.UNKNOWN,
            targeting: targeting ?? {
                range: range ?? ActionRange.MELEE,
                shape: shape ?? CoordinateGeneratorShape.BLOOM,
                affiliationRelationship: affiliationRelationship ?? {
                    self: false,
                    foe: true,
                    friend: false,
                },
            },
            effect,
        }
    },
}
