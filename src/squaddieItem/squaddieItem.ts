import type { TProficiencyType } from "../proficiency/proficiencyLevel"

export interface SquaddieItem {
    id: string
    name: string
    numberOfUses?: number
    passiveProficiencyBonuses: Map<TProficiencyType, number>
    actionIds: Set<string>
}

export const SquaddieItemService = {
    new: ({
        id,
        name,
        numberOfUses,
        passiveProficiencyBonuses,
        actionIds,
    }: {
        id: string
        name: string
        numberOfUses?: number
        passiveProficiencyBonuses?: { [t in TProficiencyType]?: number }
        actionIds?: string[]
    }): SquaddieItem => {
        const passiveProficiencyBonusEntries: [TProficiencyType, number][] =
            Object.entries(passiveProficiencyBonuses ?? {}).map(
                ([str, amount]) => {
                    return [str as TProficiencyType, amount]
                }
            )

        return {
            id,
            name,
            numberOfUses,
            passiveProficiencyBonuses: new Map(passiveProficiencyBonusEntries),
            actionIds: new Set(actionIds ?? []),
        }
    },
    getPassiveProficiencyBonuses: (
        squaddieItem: SquaddieItem
    ): Map<TProficiencyType, number> => {
        throwIfItemIsUndefined(squaddieItem, "getPassiveProficiencyBonuses")
        return new Map(squaddieItem.passiveProficiencyBonuses)
    },
}

const throwIfItemIsUndefined = (
    squaddieItem: SquaddieItem,
    callName: string
) => {
    if (squaddieItem == undefined)
        throw new Error(
            `[SquaddieItemService.${callName}]: squaddieItem must be defined`
        )
}
