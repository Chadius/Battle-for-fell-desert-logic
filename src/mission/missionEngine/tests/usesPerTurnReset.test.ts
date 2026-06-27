import { beforeEach, describe, expect, it } from "vitest"
import {
    MissionEngineTestHarness,
    MissionEngineTestHarnessIds,
} from "../../../testUtils/mission/missionEngineTestHarness"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId"

describe("usesPerTurnReset", () => {
    let harness: MissionEngineTestHarness
    let liniId: BattleSquaddieId
    const actionId = MissionEngineTestHarnessIds.lini.limitedBlastActionId

    beforeEach(() => {
        harness = new MissionEngineTestHarness()
        liniId = harness.getLiniSquaddieId()
    })

    describe("when Lini exhausts a limited action during her turn", () => {
        beforeEach(() => {
            harness.setDebugFlag("enemyAlwaysEndsTheirTurn", true)
            harness.advanceToPlayerTurn()
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

            it("the action is valid to use again", () => {
                const validity = harness.getSquaddieActionValidity(liniId)
                const found = validity.validActions.find(
                    (a) => a.actionId === actionId
                )
                expect(found).toBeDefined()
            })
        })
    })
})
