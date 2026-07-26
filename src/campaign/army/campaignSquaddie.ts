import { z } from "zod"

export interface CampaignSquaddieInjury {
    duration: number
    permanent: boolean
}

export interface CampaignSquaddie {
    id: string
    outOfBattleAttributeSheetId: string
    outOfBattleSquaddieId: string
    name: string
    isLeader: boolean
    injury?: CampaignSquaddieInjury
    injuryHistory: string[]
}

const campaignSquaddieInjurySchema = z.object({
    duration: z.number().int().positive(),
    permanent: z.boolean(),
})

export const campaignSquaddieSchema = z.object({
    id: z.string().min(1),
    outOfBattleAttributeSheetId: z.string().min(1),
    outOfBattleSquaddieId: z.string().min(1),
    name: z.string().min(1),
    isLeader: z.boolean(),
    injury: campaignSquaddieInjurySchema.optional(),
    injuryHistory: z.array(z.string().min(1)),
})

export type SerializedCampaignSquaddie = z.infer<typeof campaignSquaddieSchema>

export const CampaignSquaddieService = {
    new: ({
        id,
        outOfBattleAttributeSheetId,
        outOfBattleSquaddieId,
        name,
        isLeader,
        injury,
        injuryHistory,
    }: {
        id: string
        outOfBattleAttributeSheetId: string
        outOfBattleSquaddieId: string
        name: string
        isLeader?: boolean
        injury?: CampaignSquaddieInjury
        injuryHistory?: string[]
    }): CampaignSquaddie => {
        const campaignSquaddie: CampaignSquaddie = {
            id,
            outOfBattleAttributeSheetId,
            outOfBattleSquaddieId,
            name,
            isLeader: isLeader ?? false,
            injury: cloneInjury(injury),
            injuryHistory: [...(injuryHistory ?? [])],
        }
        throwIfInvalid(campaignSquaddie, "new")
        return campaignSquaddie
    },
    clone: (original: CampaignSquaddie): CampaignSquaddie => clone(original),
    serialize: (
        campaignSquaddie: CampaignSquaddie
    ): SerializedCampaignSquaddie => {
        throwIfSquaddieIsUndefined(campaignSquaddie, "serialize")
        return {
            id: campaignSquaddie.id,
            outOfBattleAttributeSheetId:
                campaignSquaddie.outOfBattleAttributeSheetId,
            outOfBattleSquaddieId: campaignSquaddie.outOfBattleSquaddieId,
            name: campaignSquaddie.name,
            isLeader: campaignSquaddie.isLeader,
            injury: cloneInjury(campaignSquaddie.injury),
            injuryHistory: [...campaignSquaddie.injuryHistory],
        }
    },
    deserialize: (data: unknown): CampaignSquaddie => {
        const result = campaignSquaddieSchema.safeParse(data)
        if (!result.success) {
            const details = result.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ")
            throw new Error(`[CampaignSquaddieService.deserialize]: ${details}`)
        }
        const serialized = result.data
        return {
            id: serialized.id,
            outOfBattleAttributeSheetId: serialized.outOfBattleAttributeSheetId,
            outOfBattleSquaddieId: serialized.outOfBattleSquaddieId,
            name: serialized.name,
            isLeader: serialized.isLeader,
            injury: cloneInjury(serialized.injury),
            injuryHistory: [...serialized.injuryHistory],
        }
    },
}

const cloneInjury = (
    injury: CampaignSquaddieInjury | undefined
): CampaignSquaddieInjury | undefined =>
    injury == undefined ? undefined : { ...injury }

const clone = (original: CampaignSquaddie): CampaignSquaddie => ({
    ...original,
    injury: cloneInjury(original.injury),
    injuryHistory: [...original.injuryHistory],
})

const throwIfSquaddieIsUndefined = (
    campaignSquaddie: CampaignSquaddie,
    callName: string
) => {
    if (campaignSquaddie == undefined)
        throw new Error(
            `[CampaignSquaddieService.${callName}]: campaignSquaddie must be defined`
        )
}

const throwIfInvalid = (
    campaignSquaddie: CampaignSquaddie,
    callName: string
) => {
    const result = campaignSquaddieSchema.safeParse(campaignSquaddie)
    if (!result.success) {
        const details = result.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; ")
        throw new Error(`[CampaignSquaddieService.${callName}]: ${details}`)
    }
}
