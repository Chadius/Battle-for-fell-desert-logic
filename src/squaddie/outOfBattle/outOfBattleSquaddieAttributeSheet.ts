import type {
    TProficiencyLevel,
    TProficiencyType,
} from "../../proficiency/proficiencyLevel.ts"

export interface OutOfBattleSquaddieAttributeSheet {
    id: string
    maxHitPoints: number
    movementPerAction: number
    proficiencyLevels: { [key in TProficiencyType]?: TProficiencyLevel }
}

export const OutOfBattleSquaddieAttributeSheetService = {
    new: ({
        id,
        maxHitPoints,
        movementPerAction,
        proficiencyLevels,
    }: Partial<OutOfBattleSquaddieAttributeSheet> & {
        id: string
    }): OutOfBattleSquaddieAttributeSheet => {
        return {
            id,
            maxHitPoints: maxHitPoints ?? 1,
            movementPerAction: movementPerAction ?? 1,
            proficiencyLevels: proficiencyLevels ?? {},
        }
    },
}
