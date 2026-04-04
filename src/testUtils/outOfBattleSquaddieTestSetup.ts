import {
    AttributeScore,
    type AttributeScoreType,
} from "../proficiency/attributeScore"
import type {
    TProficiencyLevel,
    TProficiencyType,
} from "../proficiency/proficiencyLevel"
import {
    type OutOfBattleSquaddieAttributeSheet,
    OutOfBattleSquaddieAttributeSheetService,
} from "../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection"
import { OutOfBattleSquaddieCollectionService } from "../squaddie/outOfBattle/outOfBattleSquaddieCollection"
import { OutOfBattleSquaddieManager } from "../squaddie/outOfBattle/outOfBattleSquaddieManager"

export interface TestAttributeSheetOptions {
    id?: string
    maxHitPoints?: number
    distancePerAction?: number
    skipOverPits?: boolean
    moveThroughWalls?: boolean
    stopOnSquaddies?: boolean
    reduceMoveCosts?: boolean
    attributeScores?: Partial<{ [key in AttributeScoreType]: number }>
    proficiencyLevels?:
        | Map<TProficiencyType, TProficiencyLevel>
        | { [key in TProficiencyType]?: TProficiencyLevel }
    rank?: number
    items?: {
        itemIds?: string[]
        maxCapacity?: number
    }
}

const DEFAULT_ATTRIBUTE_SCORES: { [key in AttributeScoreType]: number } = {
    [AttributeScore.BODY]: 5,
    [AttributeScore.MIND]: 5,
    [AttributeScore.SOUL]: 5,
}

export const OutOfBattleSquaddieTestSetup = {
    createTestAttributeSheet: (
        options?: TestAttributeSheetOptions
    ): OutOfBattleSquaddieAttributeSheet => {
        const attributeScores = {
            ...DEFAULT_ATTRIBUTE_SCORES,
            ...options?.attributeScores,
        }

        return OutOfBattleSquaddieAttributeSheetService.new({
            id: options?.id ?? "test-sheet",
            maxHitPoints: options?.maxHitPoints ?? 5,
            movement: {
                movementPointsPerAction: options?.distancePerAction ?? 2,
                skipOverPits: options?.skipOverPits,
                moveThroughWalls: options?.moveThroughWalls,
                stopOnSquaddies: options?.stopOnSquaddies,
                reduceMoveCosts: options?.reduceMoveCosts,
            },
            attributeScores,
            proficiencyLevels: options?.proficiencyLevels,
            rank: options?.rank ?? 0,
            items: {
                maxCapacity: options?.items?.maxCapacity ?? 3,
                itemIds: options?.items?.itemIds ?? [],
            },
        })
    },

    createManagerWithTestAttributeSheet: (options?: {
        attributeSheetOptions?: TestAttributeSheetOptions
        sheetId?: string
    }): {
        manager: OutOfBattleSquaddieManager
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    } => {
        const sheetOptions: TestAttributeSheetOptions = {
            ...options?.attributeSheetOptions,
        }
        if (options?.sheetId != undefined) {
            sheetOptions.id = options.sheetId
        }

        const attributeSheet =
            OutOfBattleSquaddieTestSetup.createTestAttributeSheet(sheetOptions)

        const manager = new OutOfBattleSquaddieManager(
            OutOfBattleSquaddieCollectionService.new(),
            OutOfBattleSquaddieAttributeSheetCollectionService.new()
        )
        manager.addOrUpdateAttributeSheet(attributeSheet)

        return { manager, attributeSheet }
    },
}
