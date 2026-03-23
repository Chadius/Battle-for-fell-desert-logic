export interface CampaignMission {
    id: string
    name: string
}

export const CampaignMissionService = {
    new: ({ id, name }: { id: string; name: string }): CampaignMission => ({
        id,
        name,
    }),
}
