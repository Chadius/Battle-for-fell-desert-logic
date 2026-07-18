import { beforeEach, describe, expect, it } from "vitest"
import {
    MissionEngineTestHarness,
    MissionEngineTestHarnessIds,
} from "../../../testUtils/mission/missionEngineTestHarness.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"

describe("usesPerMissionReset", () => {
    let harness: MissionEngineTestHarness
    let liniId: BattleSquaddieId
    const actionId = MissionEngineTestHarnessIds.lini.limitedMissionActionId

    beforeEach(() => {
        harness = new MissionEngineTestHarness()
        liniId = harness.getLiniSquaddieId()
        harness.setDebugFlag("enemyAlwaysEndsTheirTurn", true)
        harness.advanceToPlayerTurn()
    })

    describe("when Lini exhausts a mission-limited action across two separate turns", () => {
        beforeEach(() => {
            harness.recordActionUse(liniId, actionId)
            harness.endSquaddieTurn(liniId)
            harness.recordActionUse(liniId, actionId)
        })

        it("the action is invalid for the rest of the turn", () => {
            const validity = harness.getSquaddieActionValidity(liniId)
            const found = validity.invalidActions.find(
                (a) => a.actionId === actionId
            )
            expect(found).toBeDefined()
        })

        describe("when the next player turn begins", () => {
            beforeEach(() => {
                harness.endSquaddieTurn(liniId)
            })

            it("the action stays invalid, since the mission-wide limit doesn't reset on turn boundaries", () => {
                const validity = harness.getSquaddieActionValidity(liniId)
                const found = validity.validActions.find(
                    (a) => a.actionId === actionId
                )
                expect(found).toBeUndefined()
            })
        })
    })
})
