import { describe, expect, it } from "vitest"
import {
    MissionObjectiveCriteriaService,
    MissionObjectiveCriteriaType,
} from "./missionObjectiveCriteria.js"

describe("ArmyLeaderDefeatedCriteria", () => {
    describe("creation", () => {
        it("creates a criteria of type ARMY_LEADER_DEFEATED", () => {
            const criteria =
                MissionObjectiveCriteriaService.newArmyLeaderDefeatedCriteria()

            expect(criteria.type).toBe(
                MissionObjectiveCriteriaType.ARMY_LEADER_DEFEATED
            )
        })
    })
})
