import type { TSquaddieAffiliation } from "./affiliation.ts"

export interface OutOfBattleSquaddie {
    id: string
    name: string
    attributeSheetId: string
    actionIds: string[]
    affiliation: TSquaddieAffiliation
}

export const OutOfBattleSquaddieService = {
    new: ({
        id,
        name,
        attributeSheetId,
        actionIds,
        affiliation,
    }: Omit<OutOfBattleSquaddie, "actionIds"> &
        Partial<OutOfBattleSquaddie>): OutOfBattleSquaddie => {
        return {
            id,
            name,
            actionIds: actionIds ?? [],
            attributeSheetId,
            affiliation,
        }
    },
}
