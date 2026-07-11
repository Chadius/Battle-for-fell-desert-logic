import { z } from "zod"
import type { TProficiencyType } from "../proficiency/proficiencyLevel.js"
import { ProficiencyType } from "../proficiency/proficiencyLevel.js"
import type { AttributeScoreType } from "../proficiency/attributeScore.js"
import { AttributeScore } from "../proficiency/attributeScore.js"
import {
    squaddieConditionSchema,
    SquaddieConditionService,
    SquaddieConditionType,
    type SquaddieCondition,
    type TSquaddieConditionType,
} from "../proficiency/squaddieCondition.js"
import type { ActionPointCost } from "./squaddieAction.js"
import {
    movementEffectSchema,
    type SquaddieActionMovementEffect,
} from "./squaddieActionMovementEffect.js"

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
        sneakAttackDamage?: number
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
    movement?: SquaddieActionMovementEffect
}

export const squaddieActionEffectSchema = z.object({
    actionPoints: z
        .object({
            spent: z.union([z.number(), z.literal("all")]),
            restore: z.number().optional(),
            additional: z
                .object({
                    movementPathActionPointCost: z.boolean().optional(),
                })
                .optional(),
        })
        .optional(),
    damage: z
        .object({
            raw: z.number(),
            targetProficiency: z.enum(ProficiencyType),
            attributeScoreType: z.enum(AttributeScore).optional(),
            sneakAttackDamage: z.number().optional(),
        })
        .optional(),
    healing: z
        .object({
            raw: z.number(),
            attributeScoreType: z.enum(AttributeScore).optional(),
        })
        .optional(),
    conditions: z
        .object({
            add: z.array(squaddieConditionSchema).optional(),
            dispel: z
                .object({
                    all: z.boolean(),
                    types: z.array(z.enum(SquaddieConditionType)),
                    amount: z.number().optional(),
                })
                .optional(),
            treat: z
                .object({
                    all: z.boolean(),
                    types: z.array(z.enum(SquaddieConditionType)),
                    amount: z.number().optional(),
                })
                .optional(),
        })
        .optional(),
    movement: movementEffectSchema.optional(),
})

export type SerializedSquaddieActionEffect = z.infer<
    typeof squaddieActionEffectSchema
>

const serializeSquaddieActionEffect = (
    effect: SquaddieActionEffect
): SerializedSquaddieActionEffect => ({
    actionPoints: effect.actionPoints,
    damage: effect.damage,
    healing: effect.healing,
    conditions:
        effect.conditions == undefined
            ? undefined
            : {
                  add: effect.conditions.add?.map((c) =>
                      SquaddieConditionService.serialize(c)
                  ),
                  dispel:
                      effect.conditions.dispel == undefined
                          ? undefined
                          : {
                                all: effect.conditions.dispel.all,
                                types: [...effect.conditions.dispel.types],
                                amount: effect.conditions.dispel.amount,
                            },
                  treat:
                      effect.conditions.treat == undefined
                          ? undefined
                          : {
                                all: effect.conditions.treat.all,
                                types: [...effect.conditions.treat.types],
                                amount: effect.conditions.treat.amount,
                            },
              },
    movement: effect.movement,
})

export const SquaddieActionEffectService = {
    serialize: (effect: SquaddieActionEffect): SerializedSquaddieActionEffect =>
        serializeSquaddieActionEffect(effect),
    deserialize: (data: unknown): SquaddieActionEffect => {
        const result = squaddieActionEffectSchema.safeParse(data)
        if (!result.success) {
            const details = result.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ")
            throw new Error(
                `[SquaddieActionEffectService.deserialize]: ${details}`
            )
        }
        return result.data as SquaddieActionEffect
    },
}
