import {
    AttributeScore,
    type AttributeScoreType,
} from "../proficiency/attributeScore"
import { ActionRange, type TActionRange } from "./actionRange"
import {
    CoordinateGeneratorShape,
    type TCoordinateGeneratorShape,
} from "../coordinateMap/shape"
import {
    DegreeOfSuccess,
    type TDegreeOfSuccess,
} from "../degreesOfSuccess/degreeOfSuccess"
import {
    ProficiencyType,
    type TProficiencyType,
} from "../proficiency/proficiencyLevel"
import type {
    SquaddieCondition,
    TSquaddieConditionType,
} from "../proficiency/squaddieCondition"

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
        restore?: number
        additional?: {
            movementPathActionPointCost?: boolean
        }
    }
    damage?: {
        raw: number
        targetProficiency: TProficiencyType
        attributeScoreType?: AttributeScoreType
    }
    healing?: {
        raw: number
        attributeScoreType?: AttributeScoreType
    }
    conditions?: {
        add?: SquaddieCondition[]
        dispel?: {
            all: boolean
            types: TSquaddieConditionType[]
            amount: number | undefined
        }
        treat?: {
            all: boolean
            types: TSquaddieConditionType[]
            amount: number | undefined
        }
    }
    movement?: {
        moveToSelectedDestination: boolean
    }
}

type DegreeOfSuccessEffects = {
    SUCCESS: SquaddieActionEffect
} & {
    [d in Exclude<TDegreeOfSuccess, "SUCCESS">]?: SquaddieActionEffect
}

export interface SquaddieAction {
    id: string
    name: string
    attribute: AttributeScoreType
    degreesOfSuccess: TDegreeOfSuccess[]
    targeting: SquaddieActionTargeting
    proficiency: TProficiencyType
    actorRollsToHit: boolean
    effectOnActor: DegreeOfSuccessEffects
    effectOnTarget?: DegreeOfSuccessEffects
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
        effectOnActor,
        effectOnTarget,
        actorRollsToHit,
    }: Partial<SquaddieAction> &
        Pick<SquaddieAction, "id" | "name" | "effectOnActor"> &
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
            actorRollsToHit: actorRollsToHit ?? true,
            effectOnActor,
            effectOnTarget,
        }
    },
    defaultEndTurn: (): SquaddieAction => {
        return SquaddieActionService.new({
            id: "default-end-turn",
            name: "End Turn",
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: {
                        spent: "all",
                    },
                },
            },
            range: ActionRange.SELF,
        })
    },
    defaultMove: (): SquaddieAction => {
        return SquaddieActionService.new({
            id: "default-move",
            name: "Move",
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: {
                        spent: 0,
                        additional: {
                            movementPathActionPointCost: true,
                        },
                    },
                    movement: {
                        moveToSelectedDestination: true,
                    },
                },
            },
        })
    },
}
