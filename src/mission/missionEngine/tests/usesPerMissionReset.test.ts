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

    const useLimitedMissionAction = () => {
        harness.readyAction({
            actor: liniId,
            targets: [liniId],
            action: { id: actionId },
        })
        harness.useActionAndGetResults()
    }

    describe("when Lini uses a mission-limited action through the real action pipeline until she reaches the mission-wide cap", () => {
        beforeEach(() => {
            useLimitedMissionAction()
            useLimitedMissionAction()
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
