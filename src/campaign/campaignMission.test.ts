import { describe, expect, it } from "vitest"
import { CampaignMissionService } from "./campaignMission.js"

describe("CampaignMission", () => {
    it("new() creates a mission with id and name", () => {
        const mission = CampaignMissionService.new({
            id: "mission-1",
            name: "First Mission",
        })

        expect(mission.id).toBe("mission-1")
        expect(mission.name).toBe("First Mission")
    })
})
