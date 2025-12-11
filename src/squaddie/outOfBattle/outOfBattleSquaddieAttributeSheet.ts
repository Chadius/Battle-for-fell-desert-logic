import type {
    TProficiencyLevel,
    TProficiencyType,
} from "../../proficiency/proficiencyLevel.ts"
import { type AttributeScoreType } from "../../proficiency/attributeScore.ts"

export interface OutOfBattleSquaddieAttributeSheet {
    id: string
    maxHitPoints: number
    movement: {
        distancePerAction: number
        skipOverPits: boolean
        moveThroughWalls: boolean
        stopOnSquaddies: boolean
    }
    proficiencyLevels: { [key in TProficiencyType]?: TProficiencyLevel }
    attributeScores: { [key in AttributeScoreType]: number }
    rank: number
    items: {
        maxCapacity: number
        itemIds: string[]
    }
}

export const OutOfBattleSquaddieAttributeSheetService = {
    new: ({
        id,
        maxHitPoints,
        movement,
        proficiencyLevels,
        rank,
        attributeScores,
        items,
    }: Partial<Omit<OutOfBattleSquaddieAttributeSheet, "movement">> & {
        id: string
        attributeScores: { [key in AttributeScoreType]: number }
        movement: Partial<OutOfBattleSquaddieAttributeSheet["movement"]>
        items?: Partial<OutOfBattleSquaddieAttributeSheet["items"]>
    }): OutOfBattleSquaddieAttributeSheet => {
        return {
            id,
            maxHitPoints: maxHitPoints ?? 1,
            movement: {
                distancePerAction: movement?.distancePerAction ?? 2,
                skipOverPits: movement?.skipOverPits ?? false,
                moveThroughWalls: movement?.moveThroughWalls ?? false,
                stopOnSquaddies: movement?.stopOnSquaddies ?? false,
            },
            proficiencyLevels: proficiencyLevels ?? {},
            rank: rank ?? 0,
            attributeScores,
            items: {
                maxCapacity: items?.maxCapacity ?? 3,
                itemIds: items?.itemIds ?? [],
            },
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
}

const clone = (
    original: OutOfBattleSquaddieAttributeSheet
): OutOfBattleSquaddieAttributeSheet => {
    const newProficiencyLevels: OutOfBattleSquaddieAttributeSheet["proficiencyLevels"] =
        {}
    for (const [proficiencyType, proficiencyLevel] of Object.entries(
        original.proficiencyLevels
    )) {
        newProficiencyLevels[proficiencyType as TProficiencyType] =
            proficiencyLevel
    }

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
