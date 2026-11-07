export interface CampaignMission {
    id: string
}

export const CampaignMissionService = {
    new: ({ id }: { id: string }): CampaignMission => ({
        id,
    }),
}
