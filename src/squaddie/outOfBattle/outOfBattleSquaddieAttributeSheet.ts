import { z } from "zod"
import type {
    TProficiencyLevel,
    TProficiencyType,
} from "../../proficiency/proficiencyLevel"
import { type AttributeScoreType } from "../../proficiency/attributeScore"
import type { SquaddieMovementInfo } from "../squaddieMovementInfo"

export interface OutOfBattleSquaddieAttributeSheet {
    id: string
    maxHitPoints: number
    movement: SquaddieMovementInfo
    proficiencyLevels: Map<TProficiencyType, TProficiencyLevel>
    attributeScores: { [key in AttributeScoreType]: number }
    rank: number
    items: {
        maxCapacity: number
        itemIds: string[]
    }
    sneakAttackDamage?: number
}

const squaddieMovementSpecialTraversalInfoSchema = z.object({
    minimumRange: z.number().optional(),
    maximumRange: z.number().optional(),
    actionPointsOfMovement: z.number().optional(),
})

const squaddieMovementInfoSchema = z.object({
    movementPointsPerAction: z.number(),
    skipOverPits: z.boolean(),
    moveThroughWalls: z.boolean(),
    stopOnSquaddies: z.boolean(),
    reduceMoveCosts: z.boolean(),
    squaddieMovementSpecialTraversalInfo:
        squaddieMovementSpecialTraversalInfoSchema.optional(),
})

export const outOfBattleSquaddieAttributeSheetSchema = z.object({
    id: z.string().min(1),
    maxHitPoints: z.number(),
    movement: squaddieMovementInfoSchema,
    proficiencyLevels: z.record(z.string(), z.string()),
    attributeScores: z.record(z.string(), z.number()),
    rank: z.number(),
    items: z.object({
        maxCapacity: z.number(),
        itemIds: z.array(z.string()),
    }),
    sneakAttackDamage: z.number().optional(),
})

export type SerializedOutOfBattleSquaddieAttributeSheet = z.infer<
    typeof outOfBattleSquaddieAttributeSheetSchema
>

export const OutOfBattleSquaddieAttributeSheetService = {
    new: ({
        id,
        maxHitPoints,
        movement,
        proficiencyLevels,
        rank,
        attributeScores,
        items,
        sneakAttackDamage,
    }: Partial<
        Omit<
            OutOfBattleSquaddieAttributeSheet,
            "movement" | "proficiencyLevels"
        >
    > & {
        id: string
        attributeScores: { [key in AttributeScoreType]: number }
        movement: Partial<OutOfBattleSquaddieAttributeSheet["movement"]>
        items?: Partial<OutOfBattleSquaddieAttributeSheet["items"]>
        proficiencyLevels?:
            | Map<TProficiencyType, TProficiencyLevel>
            | { [key in TProficiencyType]?: TProficiencyLevel }
    }): OutOfBattleSquaddieAttributeSheet => {
        const proficiencyLevelsMap =
            proficiencyLevels instanceof Map
                ? proficiencyLevels
                : new Map(
                      Object.entries(proficiencyLevels ?? {}) as [
                          TProficiencyType,
                          TProficiencyLevel,
                      ][]
                  )

        return {
            id,
            maxHitPoints: maxHitPoints ?? 1,
            movement: {
                movementPointsPerAction: movement?.movementPointsPerAction ?? 2,
                skipOverPits: movement?.skipOverPits ?? false,
                moveThroughWalls: movement?.moveThroughWalls ?? false,
                stopOnSquaddies: movement?.stopOnSquaddies ?? false,
                reduceMoveCosts: movement?.reduceMoveCosts ?? false,
            },
            proficiencyLevels: proficiencyLevelsMap,
            rank: rank ?? 0,
            attributeScores,
            items: {
                maxCapacity: items?.maxCapacity ?? 3,
                itemIds: items?.itemIds ?? [],
            },
            sneakAttackDamage,
        }
    },
    clone: (
        original: OutOfBattleSquaddieAttributeSheet
    ): OutOfBattleSquaddieAttributeSheet => clone(original),
    getItemCapacity({
        attributeSheet,
    }: {
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    }): number {
        return attributeSheet.items.maxCapacity
    },
    getItemIds({
        attributeSheet,
    }: {
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    }): string[] {
        return [...attributeSheet.items.itemIds]
    },
    addItem: ({
        attributeSheet,
        itemId,
    }: {
        attributeSheet: OutOfBattleSquaddieAttributeSheet
        itemId: string
    }): OutOfBattleSquaddieAttributeSheet => {
        const newAttributeSheet = clone(attributeSheet)
        if (
            newAttributeSheet.items.itemIds.length <
            newAttributeSheet.items.maxCapacity
        )
            newAttributeSheet.items.itemIds.push(itemId)
        return newAttributeSheet
    },
    reorderItemSlots: ({
        attributeSheet,
        itemSlotA,
        itemSlotB,
    }: {
        attributeSheet: OutOfBattleSquaddieAttributeSheet
        itemSlotA: number
        itemSlotB: number
    }) => {
        const newAttributeSheet = clone(attributeSheet)
        if (
            itemSlotA >= 0 &&
            itemSlotA < newAttributeSheet.items.itemIds.length &&
            itemSlotB >= 0 &&
            itemSlotB < newAttributeSheet.items.itemIds.length
        ) {
            const temp = newAttributeSheet.items.itemIds[itemSlotA]
            newAttributeSheet.items.itemIds[itemSlotA] =
                newAttributeSheet.items.itemIds[itemSlotB]
            newAttributeSheet.items.itemIds[itemSlotB] = temp
        }

        return newAttributeSheet
    },
    removeItem: ({
        attributeSheet,
        itemId,
    }: {
        attributeSheet: OutOfBattleSquaddieAttributeSheet
        itemId: string
    }) => {
        const newAttributeSheet = clone(attributeSheet)
        const firstOccurrenceIndex =
            newAttributeSheet.items.itemIds.indexOf(itemId)
        newAttributeSheet.items.itemIds = [
            ...newAttributeSheet.items.itemIds.slice(0, firstOccurrenceIndex),
            ...newAttributeSheet.items.itemIds.slice(firstOccurrenceIndex + 1),
        ]
        return newAttributeSheet
    },
    serialize: (
        sheet: OutOfBattleSquaddieAttributeSheet
    ): SerializedOutOfBattleSquaddieAttributeSheet => {
        const proficiencyLevels: Record<string, string> = {}
        sheet.proficiencyLevels.forEach((level, type) => {
            proficiencyLevels[type] = level
        })
        return {
            id: sheet.id,
            maxHitPoints: sheet.maxHitPoints,
            movement: { ...sheet.movement },
            proficiencyLevels,
            attributeScores: { ...sheet.attributeScores },
            rank: sheet.rank,
            items: {
                maxCapacity: sheet.items.maxCapacity,
                itemIds: [...sheet.items.itemIds],
            },
            sneakAttackDamage: sheet.sneakAttackDamage,
        }
    },
    deserialize: (data: unknown): OutOfBattleSquaddieAttributeSheet => {
        const result = outOfBattleSquaddieAttributeSheetSchema.safeParse(data)
        if (!result.success) {
            const details = result.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ")
            throw new Error(
                `[OutOfBattleSquaddieAttributeSheetService.deserialize]: ${details}`
            )
        }
        const serialized = result.data
        return {
            id: serialized.id,
            maxHitPoints: serialized.maxHitPoints,
            movement: { ...serialized.movement },
            proficiencyLevels: new Map(
                Object.entries(serialized.proficiencyLevels) as [
                    TProficiencyType,
                    TProficiencyLevel,
                ][]
            ),
            attributeScores: serialized.attributeScores as {
                [key in AttributeScoreType]: number
            },
            rank: serialized.rank,
            items: {
                maxCapacity: serialized.items.maxCapacity,
                itemIds: [...serialized.items.itemIds],
            },
            sneakAttackDamage: serialized.sneakAttackDamage,
        }
    },
}

const clone = (
    original: OutOfBattleSquaddieAttributeSheet
): OutOfBattleSquaddieAttributeSheet => {
    const newProficiencyLevels = new Map(original.proficiencyLevels.entries())

    const newAttributeScores: OutOfBattleSquaddieAttributeSheet["attributeScores"] =
        {
            ...original.attributeScores,
        }
    for (const [attributeScoreType, score] of Object.entries(
        original.attributeScores
    )) {
        newAttributeScores[attributeScoreType as AttributeScoreType] = score
    }

    const newItems: OutOfBattleSquaddieAttributeSheet["items"] = {
        itemIds: [...original.items.itemIds],
        maxCapacity: original.items.maxCapacity,
    }

    return {
        ...original,
        movement: { ...original.movement },
        proficiencyLevels: newProficiencyLevels,
        attributeScores: newAttributeScores,
        items: newItems,
    }
}
