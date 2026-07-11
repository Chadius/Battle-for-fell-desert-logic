import { z } from "zod"
import { type TProficiencyType } from "../proficiency/proficiencyLevel.js"

export interface SquaddieItem {
    id: string
    name: string
    numberOfUses?: number
    passiveProficiencyBonuses: Map<TProficiencyType, number>
    actionIds: Set<string>
}

export const squaddieItemSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    numberOfUses: z.number().optional(),
    passiveProficiencyBonuses: z.record(z.string(), z.number()),
    actionIds: z.array(z.string()),
})

export type SerializedSquaddieItem = z.infer<typeof squaddieItemSchema>

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
    serialize: (item: SquaddieItem): SerializedSquaddieItem => {
        const passiveProficiencyBonuses: Record<string, number> = {}
        item.passiveProficiencyBonuses.forEach((value, key) => {
            passiveProficiencyBonuses[key] = value
        })
        return {
            id: item.id,
            name: item.name,
            numberOfUses: item.numberOfUses,
            passiveProficiencyBonuses,
            actionIds: Array.from(item.actionIds),
        }
    },
    deserialize: (data: unknown): SquaddieItem => {
        const result = squaddieItemSchema.safeParse(data)
        if (!result.success) {
            const details = result.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ")
            throw new Error(`[SquaddieItemService.deserialize]: ${details}`)
        }
        const serialized = result.data
        return {
            id: serialized.id,
            name: serialized.name,
            numberOfUses: serialized.numberOfUses,
            passiveProficiencyBonuses: new Map(
                Object.entries(serialized.passiveProficiencyBonuses) as [
                    TProficiencyType,
                    number,
                ][]
            ),
            actionIds: new Set(serialized.actionIds),
        }
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
