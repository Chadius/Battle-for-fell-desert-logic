export interface OutOfBattleSquaddie {
    id: string
    name: string
    attributeSheetId: string
    actionIds: number[]
}

export const OutOfBattleSquaddieService = {
    new: ({
        id,
        name,
        attributeSheetId,
        actionIds,
    }: {
        id: string
        name: string
        attributeSheetId: string
        actionIds?: number[]
    }): OutOfBattleSquaddie => {
        return {
            id,
            name,
            actionIds: actionIds ?? [],
            attributeSheetId,
        }
    },
}
