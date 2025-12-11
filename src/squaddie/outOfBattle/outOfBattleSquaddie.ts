import type { TSquaddieAffiliation } from "./affiliation.ts"

// TODO add items to Out of Battle Squaddie
// TODO enforce limits when adding items

// TODO copy items to In Battle Squaddie upon creation
// TODO enforce limits when adding items to In Battle Squaddie

export interface OutOfBattleSquaddie {
    id: string
    name: string
    attributeSheetId: string
    actionIds: string[]
    affiliation: TSquaddieAffiliation
    itemIds: []
}

export const OutOfBattleSquaddieService = {
    new: ({
        id,
        name,
        attributeSheetId,
        actionIds,
        affiliation,
        itemIds,
    }: Omit<OutOfBattleSquaddie, "actionIds" | "itemIds"> &
        Partial<OutOfBattleSquaddie>): OutOfBattleSquaddie => {
        return {
            id,
            name,
            actionIds: actionIds ?? [],
            attributeSheetId,
            affiliation,
            itemIds: itemIds ?? [],
        }
    },
    clone: (original: OutOfBattleSquaddie): OutOfBattleSquaddie => {
        return {
            ...original,
            itemIds: [...original.itemIds],
        }
    },
    // TODO add item
}
