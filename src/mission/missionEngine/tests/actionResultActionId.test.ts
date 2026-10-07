import { beforeEach, describe, expect, it } from "vitest"
import {
    MissionEngineTestHarness,
    MissionEngineTestHarnessIds,
} from "../../../testUtils/mission/missionEngineTestHarness.js"
import { SquaddieActionService } from "../../../squaddieAction/squaddieAction.js"
import type { ActionResult } from "../../actionResult.js"

describe("MissionEngine — ActionResult names the action it came from", () => {
    describe("when a squaddie uses a readied action", () => {
        let actionResult: ActionResult

        beforeEach(() => {
            const harness = new MissionEngineTestHarness()
            harness.placeSlitherDemonAdjacentToLini()
            harness.advanceToPlayerTurn()
            harness.readyAction({
                actor: harness.getLiniSquaddieId(),
                targets: [harness.getSlitherDemonSquaddieId()],
                action: {
                    id: MissionEngineTestHarnessIds.lini.scimitarActionId,
                },
            })
            actionResult = harness.useActionAndGetResults()
        })

        it("records the readied action's id", () => {
            expect(actionResult.actionId).toBe(
                MissionEngineTestHarnessIds.lini.scimitarActionId
            )
        })
    })

    describe("when a squaddie ends their turn", () => {
        let actionResult: ActionResult

        beforeEach(() => {
            const harness = new MissionEngineTestHarness()
            harness.advanceToPlayerTurn()
            actionResult = harness.endSquaddieTurn(harness.getLiniSquaddieId())
        })

        it("records the end-turn action's id", () => {
            expect(actionResult.actionId).toBe(
                SquaddieActionService.defaultEndTurn().id
            )
        })
    })
})
