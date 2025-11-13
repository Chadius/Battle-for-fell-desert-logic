import type {
    TProficiencyLevel,
    TProficiencyType,
} from "../../proficiency/proficiencyLevel.ts"

export interface OutOfBattleSquaddieAttributeSheet {
    id: string
    maxHitPoints: number
    movementPerAction: number
    proficiencyLevels: { [key in TProficiencyType]?: TProficiencyLevel }
    rank: number
}

export const OutOfBattleSquaddieAttributeSheetService = {
    new: ({
        id,
        maxHitPoints,
        movementPerAction,
        proficiencyLevels,
        rank,
    }: Partial<OutOfBattleSquaddieAttributeSheet> & {
        id: string
    }): OutOfBattleSquaddieAttributeSheet => {
        return {
            id,
            maxHitPoints: maxHitPoints ?? 1,
            movementPerAction: movementPerAction ?? 1,
            proficiencyLevels: proficiencyLevels ?? {},
            rank: rank ?? 0,
        }
    },
}
