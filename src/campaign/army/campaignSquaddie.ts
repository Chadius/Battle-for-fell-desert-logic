import { z } from "zod"

export interface CampaignSquaddieInjury {
    duration?: number
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

const campaignSquaddieInjurySchema = z.strictObject({
    duration: z.number().int().positive().optional(),
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
    }): CampaignSquaddie =>
        validatedCampaignSquaddie(
            {
                id,
                outOfBattleAttributeSheetId,
                outOfBattleSquaddieId,
                name,
                isLeader: isLeader ?? false,
                injury,
                injuryHistory: injuryHistory ?? [],
            },
            "new"
        ),
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
    deserialize: (data: unknown): CampaignSquaddie =>
        validatedCampaignSquaddie(data, "deserialize"),
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

const validatedCampaignSquaddie = (
    data: unknown,
    callName: string
): CampaignSquaddie => {
    const parseResult = campaignSquaddieSchema.safeParse(data)
    if (!parseResult.success) {
        const details = parseResult.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; ")
        throw new Error(`[CampaignSquaddieService.${callName}]: ${details}`)
    }
    return parseResult.data
}
