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
}

export const OutOfBattleSquaddieAttributeSheetService = {
    new: ({
        id,
        maxHitPoints,
        movement,
        proficiencyLevels,
        rank,
        attributeScores,
    }: Partial<Omit<OutOfBattleSquaddieAttributeSheet, "movement">> & {
        id: string
        attributeScores: { [key in AttributeScoreType]: number }
        movement: Partial<OutOfBattleSquaddieAttributeSheet["movement"]>
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
        }
    },
}
