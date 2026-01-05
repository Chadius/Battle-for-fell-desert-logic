import { describe, expect, it } from "vitest"
import {
    MissionAffiliationTurn,
    type MissionTurn,
    MissionTurnService,
} from "./missionTurn"

describe("MissionTurn", () => {
    describe("MissionTurnService.new", () => {
        it("creates a new MissionTurn with default values", () => {
            const missionTurn: MissionTurn = MissionTurnService.new()

            expect(missionTurn.turnCount).toBe(0)
            expect(missionTurn.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.TURN_START
            )
        })

        it("creates a new MissionTurn with custom turnCount", () => {
            const missionTurn: MissionTurn = MissionTurnService.new({
                turnCount: 5,
            })

            expect(missionTurn.turnCount).toBe(5)
            expect(missionTurn.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.TURN_START
            )
        })

        it("creates a new MissionTurn with custom missionAffiliationTurn", () => {
            const missionTurn: MissionTurn = MissionTurnService.new({
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            })

            expect(missionTurn.turnCount).toBe(0)
            expect(missionTurn.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.PLAYER_TURN
            )
        })

        it("creates a new MissionTurn with both custom values", () => {
            const missionTurn: MissionTurn = MissionTurnService.new({
                turnCount: 3,
                missionAffiliationTurn: MissionAffiliationTurn.ENEMY_TURN,
            })

            expect(missionTurn.turnCount).toBe(3)
            expect(missionTurn.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.ENEMY_TURN
            )
        })
    })
})
