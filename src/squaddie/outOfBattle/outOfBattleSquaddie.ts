import { z } from "zod"
import {
    SquaddieAffiliation,
    type TSquaddieAffiliation,
} from "../../affiliation/affiliation.js"

export interface OutOfBattleSquaddie {
    id: string
    name: string
    attributeSheetId: string
    actionIds: string[]
    affiliation: TSquaddieAffiliation
}

export const outOfBattleSquaddieSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    attributeSheetId: z.string().min(1),
    actionIds: z.array(z.string()),
    affiliation: z.enum([
        SquaddieAffiliation.PLAYER,
        SquaddieAffiliation.ENEMY,
        SquaddieAffiliation.ALLY,
        SquaddieAffiliation.NONE,
    ]),
})

export type SerializedOutOfBattleSquaddie = z.infer<
    typeof outOfBattleSquaddieSchema
>

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
    clone: (original: OutOfBattleSquaddie): OutOfBattleSquaddie => {
        return {
            ...original,
        }
    },
    serialize: (
        squaddie: OutOfBattleSquaddie
    ): SerializedOutOfBattleSquaddie => {
        return {
            id: squaddie.id,
            name: squaddie.name,
            attributeSheetId: squaddie.attributeSheetId,
            actionIds: [...squaddie.actionIds],
            affiliation: squaddie.affiliation,
        }
    },
    deserialize: (data: unknown): OutOfBattleSquaddie => {
        const result = outOfBattleSquaddieSchema.safeParse(data)
        if (!result.success) {
            const details = result.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ")
            throw new Error(
                `[OutOfBattleSquaddieService.deserialize]: ${details}`
            )
        }
        const serialized = result.data
        return {
            id: serialized.id,
            name: serialized.name,
            attributeSheetId: serialized.attributeSheetId,
            actionIds: [...serialized.actionIds],
            affiliation: serialized.affiliation,
        }
    },
}
