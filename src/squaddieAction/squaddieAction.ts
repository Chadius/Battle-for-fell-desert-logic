import { z } from "zod"
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
import type { EnumLike } from "../enum"
import {
    type SquaddieActionEffect,
    squaddieActionEffectSchema,
    SquaddieActionEffectService,
} from "./squaddieActionEffect"
import { MovementEffectType } from "./squaddieActionMovementEffect"

export {
    type TMovementEffectType,
    type SquaddieActionMovementEffect,
    type TeleportToActorChosenMovement,
    MovementEffectType,
} from "./squaddieActionMovementEffect"
export {
    type SerializedSquaddieActionEffect,
    SquaddieActionEffectService,
} from "./squaddieActionEffect"

export const HowToDetermineDegreeOfSuccess = {
    ACTOR_ROLLS_TO_HIT: "ACTOR_ROLLS_TO_HIT",
    TARGETS_ROLL_TO_RESIST: "TARGETS_ROLL_TO_RESIST",
    AUTOMATIC_SUCCESS: "AUTOMATIC_SUCCESS",
} as const satisfies Record<string, string>
export type THowToDetermineDegreeOfSuccess = EnumLike<
    typeof HowToDetermineDegreeOfSuccess
>

interface SquaddieActionTargeting {
    range: TActionRange
    shape: TCoordinateGeneratorShape
    affiliationRelationship: {
        self: boolean
        foe: boolean
        friend: boolean
    }
    areaOfEffectSize?: number
    aimCoordinateRequiresTarget?: boolean
    skipOverPits?: boolean
    moveThroughWalls?: boolean
}

export type ActionPointCost = number | "all"

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
    howToDetermineDegreeOfSuccess: THowToDetermineDegreeOfSuccess
    multipleAttackPenalty: MultipleAttackPenalty
    effectOnActor: DegreeOfSuccessEffects
    effectOnTarget?: DegreeOfSuccessEffects
}

const WEAPON_PROFICIENCY_TYPES: ReadonlySet<TProficiencyType> = new Set([
    ProficiencyType.WEAPON_NATURAL,
    ProficiencyType.WEAPON_SIMPLE,
    ProficiencyType.WEAPON_MARTIAL,
])

const degreeOfSuccessEffectsSchema = z.object({
    SUCCESS: squaddieActionEffectSchema,
    CRITICAL: squaddieActionEffectSchema.optional(),
    FAILURE: squaddieActionEffectSchema.optional(),
    BOTCH: squaddieActionEffectSchema.optional(),
})

type SerializedDegreeOfSuccessEffects = z.infer<
    typeof degreeOfSuccessEffectsSchema
>

export const squaddieActionSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    attribute: z.enum(AttributeScore),
    degreesOfSuccess: z.array(z.enum(DegreeOfSuccess)),
    targeting: z.object({
        range: z.enum(ActionRange),
        shape: z.enum(CoordinateGeneratorShape),
        affiliationRelationship: z.object({
            self: z.boolean(),
            foe: z.boolean(),
            friend: z.boolean(),
        }),
        areaOfEffectSize: z.number().optional(),
        aimCoordinateRequiresTarget: z.boolean().optional(),
        skipOverPits: z.boolean().optional(),
        moveThroughWalls: z.boolean().optional(),
    }),
    proficiency: z.enum(ProficiencyType),
    howToDetermineDegreeOfSuccess: z.enum(HowToDetermineDegreeOfSuccess),
    multipleAttackPenalty: z.object({
        applies: z.boolean(),
        contribution: z.number(),
    }),
    effectOnActor: degreeOfSuccessEffectsSchema,
    effectOnTarget: degreeOfSuccessEffectsSchema.optional(),
})

export type SerializedSquaddieAction = z.infer<typeof squaddieActionSchema>

const serializeDegreeOfSuccessEffects = (
    effects: DegreeOfSuccessEffects
): SerializedDegreeOfSuccessEffects => {
    const result: SerializedDegreeOfSuccessEffects = {
        SUCCESS: SquaddieActionEffectService.serialize(effects.SUCCESS),
    }
    if (effects.CRITICAL != undefined)
        result.CRITICAL = SquaddieActionEffectService.serialize(
            effects.CRITICAL
        )
    if (effects.FAILURE != undefined)
        result.FAILURE = SquaddieActionEffectService.serialize(effects.FAILURE)
    if (effects.BOTCH != undefined)
        result.BOTCH = SquaddieActionEffectService.serialize(effects.BOTCH)
    return result
}

const serializeSquaddieAction = (
    action: SquaddieAction
): SerializedSquaddieAction => ({
    id: action.id,
    name: action.name,
    attribute: action.attribute,
    degreesOfSuccess: [...action.degreesOfSuccess],
    targeting: {
        ...action.targeting,
        affiliationRelationship: {
            ...action.targeting.affiliationRelationship,
        },
    },
    proficiency: action.proficiency,
    howToDetermineDegreeOfSuccess: action.howToDetermineDegreeOfSuccess,
    multipleAttackPenalty: { ...action.multipleAttackPenalty },
    effectOnActor: serializeDegreeOfSuccessEffects(action.effectOnActor),
    effectOnTarget:
        action.effectOnTarget == undefined
            ? undefined
            : serializeDegreeOfSuccessEffects(action.effectOnTarget),
})

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
        aimCoordinateRequiresTarget,
        skipOverPits,
        moveThroughWalls,
        effectOnActor,
        effectOnTarget,
        howToDetermineDegreeOfSuccess,
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
                aimCoordinateRequiresTarget:
                    aimCoordinateRequiresTarget ?? true,
                skipOverPits: skipOverPits ?? true,
                moveThroughWalls: moveThroughWalls ?? false,
            },
            howToDetermineDegreeOfSuccess:
                howToDetermineDegreeOfSuccess ??
                HowToDetermineDegreeOfSuccess.ACTOR_ROLLS_TO_HIT,
            multipleAttackPenalty: resolvedMultipleAttackPenalty,
            effectOnActor,
            effectOnTarget,
        }
    },
    defaultEndTurn: (): SquaddieAction => {
        return SquaddieActionService.new({
            id: "default-end-turn",
            name: "End Turn",
            howToDetermineDegreeOfSuccess:
                HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
            affiliationRelationship: {
                self: true,
                foe: false,
                friend: false,
            },
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
            howToDetermineDegreeOfSuccess:
                HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
            affiliationRelationship: {
                self: true,
                foe: false,
                friend: false,
            },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: {
                        spent: 0,
                        additional: {
                            movementPathActionPointCost: true,
                        },
                    },
                    movement: {
                        movementType: MovementEffectType.ACTOR_CHOSEN,
                    },
                },
            },
        })
    },
    serialize: (action: SquaddieAction): SerializedSquaddieAction =>
        serializeSquaddieAction(action),
    deserialize: (data: unknown): SquaddieAction => {
        const result = squaddieActionSchema.safeParse(data)
        if (!result.success) {
            const details = result.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ")
            throw new Error(`[SquaddieActionService.deserialize]: ${details}`)
        }
        return result.data as SquaddieAction
    },
    getRequiredDecisions: (
        action: SquaddieAction
    ): {
        requiresSpecificTarget: boolean
        requiresAimCoordinate: boolean
        requiresTargetDestination: boolean
        actorIsAimCoordinate: boolean
    } => {
        const targetsFoeOrFriend =
            action.targeting.affiliationRelationship.foe ||
            action.targeting.affiliationRelationship.friend

        const aimCoordinateRequiresTarget =
            action.targeting.aimCoordinateRequiresTarget ?? true

        const isAoe = (action.targeting.areaOfEffectSize ?? 0) > 0

        const actorNeedsDestination =
            action.effectOnActor.SUCCESS?.movement?.movementType ===
            MovementEffectType.ACTOR_CHOSEN_SPECIAL_TRAVERSAL

        const targetNeedsDestination = Object.values(
            action.effectOnTarget ?? {}
        ).some(
            (effect) =>
                effect?.movement?.movementType ===
                    MovementEffectType.TELEPORT_TO_ACTOR_CHOSEN &&
                effect.movement.destinationRange !== ActionRange.SELF
        )

        const requiresAimCoordinate =
            (!aimCoordinateRequiresTarget && targetsFoeOrFriend) ||
            (isAoe && !aimCoordinateRequiresTarget)

        const actorIsAimCoordinate =
            requiresAimCoordinate && action.targeting.range === ActionRange.SELF

        return {
            requiresSpecificTarget:
                (aimCoordinateRequiresTarget && targetsFoeOrFriend) ||
                (isAoe && aimCoordinateRequiresTarget),
            requiresAimCoordinate,
            requiresTargetDestination:
                actorNeedsDestination || targetNeedsDestination,
            actorIsAimCoordinate,
        }
    },
}
