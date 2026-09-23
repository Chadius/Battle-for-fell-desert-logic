import { z } from "zod"
import type { BattleSquaddieId } from "../squaddie/inBattle/battleSquaddieId.js"

export interface DeployedCampaignSquaddie {
    campaignSquaddieId: string
    battleSquaddieId: BattleSquaddieId
}

export const deployedCampaignSquaddieSchema = z.object({
    campaignSquaddieId: z.string().min(1),
    battleSquaddieId: z.object({
        inBattleSquaddieId: z.number(),
        outOfBattleSquaddieId: z.string().min(1),
    }),
})

export type SerializedDeployedCampaignSquaddie = z.infer<
    typeof deployedCampaignSquaddieSchema
>

export const DeployedCampaignSquaddieService = {
    clone: (
        deployedCampaignSquaddie: DeployedCampaignSquaddie
    ): DeployedCampaignSquaddie => ({
        campaignSquaddieId: deployedCampaignSquaddie.campaignSquaddieId,
        battleSquaddieId: { ...deployedCampaignSquaddie.battleSquaddieId },
    }),
}
