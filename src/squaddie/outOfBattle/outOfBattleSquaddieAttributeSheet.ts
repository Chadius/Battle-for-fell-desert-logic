import type {
    TProficiencyLevel,
    TProficiencyType,
} from "../../proficiency/proficiencyLevel.ts"
import { type AttributeScoreType } from "../../proficiency/attributeScore.ts"

export interface OutOfBattleSquaddieAttributeSheet {
    id: string
    maxHitPoints: number
    movementPerAction: number
    proficiencyLevels: { [key in TProficiencyType]?: TProficiencyLevel }
    attributeScores: { [key in AttributeScoreType]: number }
    rank: number
}

export const OutOfBattleSquaddieAttributeSheetService = {
    new: ({
        id,
        maxHitPoints,
        movementPerAction,
        proficiencyLevels,
        rank,
        attributeScores,
    }: Partial<OutOfBattleSquaddieAttributeSheet> & {
        id: string
        attributeScores: { [key in AttributeScoreType]: number }
    }): OutOfBattleSquaddieAttributeSheet => {
        return {
            id,
            maxHitPoints: maxHitPoints ?? 1,
            movementPerAction: movementPerAction ?? 1,
            proficiencyLevels: proficiencyLevels ?? {},
            rank: rank ?? 0,
            attributeScores,
        }
    },
}
