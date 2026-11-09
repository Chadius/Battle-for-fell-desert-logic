import { describe, expect, it } from "vitest"
import { MissionTextSubstitutionToken } from "../textSubstitutionTokens.js"

describe("the token codes logic supplies values for", () => {
    it("contains the turn count and the six player-team statistics", () => {
        const expectedTokens = [
            "TURN_COUNT",
            "DAMAGE_DEALT_BY_PLAYER_TEAM",
            "DAMAGE_TAKEN_BY_PLAYER_TEAM",
            "DAMAGE_ABSORBED_BY_PLAYER_TEAM",
            "HEALING_RECEIVED_BY_PLAYER_TEAM",
            "CRITICAL_HITS_DEALT_BY_PLAYER_TEAM",
            "CRITICAL_HITS_TAKEN_BY_PLAYER_TEAM",
        ]

        expect([...MissionTextSubstitutionToken.AVAILABLE].sort()).toEqual(
            expectedTokens.sort()
        )
    })
})
