import { z } from "zod"
import {
    AttributeScore,
    type AttributeScoreType,
} from "../proficiency/attributeScore.js"
import { ActionRange, type TActionRange } from "./actionRange.js"
import {
    CoordinateGeneratorShape,
    type TCoordinateGeneratorShape,
} from "../coordinateMap/shape.js"
import {
    DegreeOfSuccess,
    type TDegreeOfSuccess,
} from "../degreesOfSuccess/degreeOfSuccess.js"
import {
    ProficiencyType,
    type TProficiencyType,
} from "../proficiency/proficiencyLevel.js"
import { SquaddieConditionService } from "../proficiency/squaddieCondition.js"
import type { EnumLike } from "../enum.js"
import {
    type SquaddieActionEffect,
    squaddieActionEffectSchema,
    SquaddieActionEffectService,
} from "./squaddieActionEffect.js"
import { MovementEffectType } from "./squaddieActionMovementEffect.js"

export {
    type TMovementEffectType,
    type SquaddieActionMovementEffect,
    type TeleportToActorChosenMovement,
    MovementEffectType,
} from "./squaddieActionMovementEffect.js"
export {
    type SerializedSquaddieActionEffect,
    SquaddieActionEffectService,
} from "./squaddieActionEffect.js"

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
    cooldownTurns?: number
    usesPerTurn?: number
    usesPerMission?: number
    glossaryTermIds?: string[]
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
    cooldownTurns: z.number().int().min(1).optional(),
    usesPerTurn: z.number().int().min(1).optional(),
    usesPerMission: z.number().int().min(1).optional(),
    glossaryTermIds: z.array(z.string()).optional(),
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
    cooldownTurns: action.cooldownTurns,
    usesPerTurn: action.usesPerTurn,
    usesPerMission: action.usesPerMission,
    glossaryTermIds: action.glossaryTermIds
        ? [...action.glossaryTermIds]
        : undefined,
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
        cooldownTurns,
        usesPerTurn,
        usesPerMission,
        glossaryTermIds,
    }: Omit<Partial<SquaddieAction>, "multipleAttackPenalty"> &
        Pick<SquaddieAction, "id" | "name" | "effectOnActor"> &
        Partial<SquaddieActionTargeting> & {
            multipleAttackPenalty?: Partial<MultipleAttackPenalty>
        }): SquaddieAction => {
        if (
            cooldownTurns != undefined &&
            (!Number.isInteger(cooldownTurns) || cooldownTurns < 1)
        ) {
            throw new Error(
                `[SquaddieActionService.new]: cooldownTurns must be positive integer, got ${cooldownTurns}`
            )
        }
        if (
            usesPerTurn != undefined &&
            (!Number.isInteger(usesPerTurn) || usesPerTurn < 1)
        ) {
            throw new Error(
                `[SquaddieActionService.new]: usesPerTurn must be a positive integer, got ${usesPerTurn}`
            )
        }
        if (
            usesPerMission != undefined &&
            (!Number.isInteger(usesPerMission) || usesPerMission < 1)
        ) {
            throw new Error(
                `[SquaddieActionService.new]: usesPerMission must be a positive integer, got ${usesPerMission}`
            )
        }
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
            cooldownTurns,
            usesPerTurn,
            usesPerMission,
            glossaryTermIds,
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
    isAttackAction: (action: SquaddieAction): boolean => {
        if (!action.targeting.affiliationRelationship.foe) return false

        return Object.values(action.effectOnTarget ?? {}).some(
            (effect) =>
                effect?.damage != undefined ||
                (effect?.conditions?.add ?? []).some((condition) =>
                    SquaddieConditionService.isHindering(condition)
                )
        )
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
