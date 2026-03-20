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
    areaOfEffectSize?: number
    targetCoordinateRequiresTarget?: boolean
}

export type ActionPointCost = number | "all"

export interface SquaddieActionEffect {
    actionPoints?: {
        spent: ActionPointCost
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

export interface MultipleAttackPenalty {
    applies: boolean
    contribution: number
}

export interface SquaddieAction {
    id: string
    name: string
    attribute: AttributeScoreType
    degreesOfSuccess: TDegreeOfSuccess[]
    targeting: SquaddieActionTargeting
    proficiency: TProficiencyType
    actorRollsToHit: boolean
    multipleAttackPenalty: MultipleAttackPenalty
    effectOnActor: DegreeOfSuccessEffects
    effectOnTarget?: DegreeOfSuccessEffects
}

const WEAPON_PROFICIENCY_TYPES: ReadonlySet<TProficiencyType> = new Set([
    ProficiencyType.WEAPON_NATURAL,
    ProficiencyType.WEAPON_SIMPLE,
    ProficiencyType.WEAPON_MARTIAL,
])

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
        areaOfEffectSize,
        targetCoordinateRequiresTarget,
        effectOnActor,
        effectOnTarget,
        actorRollsToHit,
        multipleAttackPenalty,
    }: Omit<Partial<SquaddieAction>, "multipleAttackPenalty"> &
        Pick<SquaddieAction, "id" | "name" | "effectOnActor"> &
        Partial<SquaddieActionTargeting> & {
            multipleAttackPenalty?: Partial<MultipleAttackPenalty>
        }): SquaddieAction => {
        const resolvedProficiency = proficiency ?? ProficiencyType.UNKNOWN
        const isWeapon = WEAPON_PROFICIENCY_TYPES.has(resolvedProficiency)
        const resolvedMultipleAttackPenalty: MultipleAttackPenalty = {
            applies: multipleAttackPenalty?.applies ?? isWeapon,
            contribution:
                multipleAttackPenalty?.contribution ?? (isWeapon ? 1 : 0),
        }
        return {
            id,
            name,
            attribute: attribute ?? AttributeScore.BODY,
            degreesOfSuccess:
                degreesOfSuccess ??
                (effectOnTarget
                    ? (Object.keys(effectOnTarget) as TDegreeOfSuccess[])
                    : [DegreeOfSuccess.SUCCESS]),
            proficiency: resolvedProficiency,
            targeting: targeting ?? {
                range: range ?? ActionRange.MELEE,
                shape: shape ?? CoordinateGeneratorShape.BLOOM,
                affiliationRelationship: affiliationRelationship ?? {
                    self: false,
                    foe: true,
                    friend: false,
                },
                areaOfEffectSize: areaOfEffectSize ?? 0,
                targetCoordinateRequiresTarget:
                    targetCoordinateRequiresTarget ?? true,
            },
            actorRollsToHit: actorRollsToHit ?? true,
            multipleAttackPenalty: resolvedMultipleAttackPenalty,
            effectOnActor,
            effectOnTarget,
        }
    },
    defaultEndTurn: (): SquaddieAction => {
        return SquaddieActionService.new({
            id: "default-end-turn",
            name: "End Turn",
            actorRollsToHit: false,
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
            actorRollsToHit: false,
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
