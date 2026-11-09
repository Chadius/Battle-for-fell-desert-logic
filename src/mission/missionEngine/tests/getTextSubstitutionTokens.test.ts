import { describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine.js"
import { MissionManager } from "../../missionManager.js"
import { MissionStateService } from "../../missionState.js"
import { MissionStatisticsService } from "../../missionStatistics.js"
import { MissionTextSubstitutionToken } from "../textSubstitutionTokens.js"

const buildEngine = (): MissionEngine =>
    new MissionEngine(
        new MissionManager({
            missionState: MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                turn: { turnCount: 3, missionAffiliationTurn: "TURN_START" },
                missionStatistics: MissionStatisticsService.new({
                    damageDealtByPlayerTeam: 5,
                    damageTakenByPlayerTeam: 4,
                    damageAbsorbedByPlayerTeam: 3,
                    healingReceivedByPlayerTeam: 2,
                    criticalHitsDealtByPlayerTeam: 1,
                    criticalHitsTakenByPlayerTeam: 6,
                }),
            }),
        })
    )

describe("MissionEngine.getTextSubstitutionTokens", () => {
    describe("during a mission", () => {
        it("reports the turn count and mission statistics as numbers", () => {
            expect(buildEngine().getTextSubstitutionTokens()).toEqual({
                TURN_COUNT: 3,
                DAMAGE_DEALT_BY_PLAYER_TEAM: 5,
                DAMAGE_TAKEN_BY_PLAYER_TEAM: 4,
                DAMAGE_ABSORBED_BY_PLAYER_TEAM: 3,
                HEALING_RECEIVED_BY_PLAYER_TEAM: 2,
                CRITICAL_HITS_DEALT_BY_PLAYER_TEAM: 1,
                CRITICAL_HITS_TAKEN_BY_PLAYER_TEAM: 6,
            })
        })
    })

    describe("when comparing against the token catalog", () => {
        it("gives a value for every token except the one the host supplies", () => {
            const tokens = Object.keys(
                buildEngine().getTextSubstitutionTokens()
            )

            expect(tokens.sort()).toEqual(
                MissionTextSubstitutionToken.AVAILABLE.filter(
                    (token) =>
                        token !== MissionTextSubstitutionToken.TIME_ELAPSED
                ).sort()
            )
        })
    })
})
