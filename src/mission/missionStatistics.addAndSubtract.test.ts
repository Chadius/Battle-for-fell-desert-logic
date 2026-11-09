import { describe, expect, it } from "vitest"
import { MissionStatisticsService } from "./missionStatistics.js"

const total = MissionStatisticsService.new({
    damageDealtByPlayerTeam: 10,
    damageTakenByPlayerTeam: 8,
    damageAbsorbedByPlayerTeam: 6,
    healingReceivedByPlayerTeam: 4,
    criticalHitsDealtByPlayerTeam: 2,
    criticalHitsTakenByPlayerTeam: 1,
})

const change = MissionStatisticsService.new({
    damageDealtByPlayerTeam: 3,
    damageTakenByPlayerTeam: 2,
    damageAbsorbedByPlayerTeam: 1,
    healingReceivedByPlayerTeam: 2,
    criticalHitsDealtByPlayerTeam: 1,
    criticalHitsTakenByPlayerTeam: 1,
})

describe("MissionStatisticsService.add and subtract", () => {
    it("adds every field of the change", () => {
        expect(MissionStatisticsService.add(total, change)).toEqual({
            damageDealtByPlayerTeam: 13,
            damageTakenByPlayerTeam: 10,
            damageAbsorbedByPlayerTeam: 7,
            healingReceivedByPlayerTeam: 6,
            criticalHitsDealtByPlayerTeam: 3,
            criticalHitsTakenByPlayerTeam: 2,
        })
    })

    it("subtracting a change undoes adding it", () => {
        expect(
            MissionStatisticsService.subtract(
                MissionStatisticsService.add(total, change),
                change
            )
        ).toEqual(total)
    })
})
