import { describe, expect, it } from "vitest"
import { MissionTextSubstitutionToken } from "../textSubstitutionTokens.js"

describe("the catalog of tokens dialogue authors can use", () => {
    it("lists exactly the tokens the mission engine can substitute in dialogue text", () => {
        const expectedTokens = [
            "$$TURN_COUNT",
            "$$TIME_ELAPSED",
            "$$DAMAGE_DEALT_BY_PLAYER_TEAM",
            "$$DAMAGE_TAKEN_BY_PLAYER_TEAM",
            "$$DAMAGE_ABSORBED_BY_PLAYER_TEAM",
            "$$HEALING_RECEIVED_BY_PLAYER_TEAM",
            "$$CRITICAL_HITS_DEALT_BY_PLAYER_TEAM",
            "$$CRITICAL_HITS_TAKEN_BY_PLAYER_TEAM",
        ]

        expect([...MissionTextSubstitutionToken.AVAILABLE].sort()).toEqual(
            expectedTokens.sort()
        )
    })
})
