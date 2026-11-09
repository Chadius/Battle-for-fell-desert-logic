import { beforeEach, describe, expect, it } from "vitest"
import type { MissionEngine } from "../missionEngine.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"
import {
    createTwoPlayerMission,
    TwoPlayerMissionActionIds,
} from "../../../testUtils/mission/twoPlayerMission.js"

describe("MissionEngine.undoLastPlayerUndoableAction with a multi-target action", () => {
    const actionId = TwoPlayerMissionActionIds.groupMend
    let missionEngine: MissionEngine
    let player1Id: BattleSquaddieId
    let player2Id: BattleSquaddieId
    let stateBeforeAction: ReturnType<typeof getState>

    const getState = () => ({
        player1: missionEngine.getSquaddieInfo(player1Id),
        player2: missionEngine.getSquaddieInfo(player2Id),
        actionIsValid: missionEngine
            .getSquaddieActionValidity(player1Id)
            .validActions.some(
                (validAction) => validAction.actionId === actionId
            ),
        missionStatistics: missionEngine.getMissionStatistics(),
    })

    beforeEach(() => {
        ;({ missionEngine, player1Id, player2Id } = createTwoPlayerMission({
            startingDamage: 5,
        }))
        stateBeforeAction = getState()

        missionEngine.readyAction({
            actor: player1Id,
            targets: [player1Id, player2Id],
            action: { id: actionId },
        })
        missionEngine.useActionAndGetResults()
    })

    describe("when the action is undone once", () => {
        beforeEach(() => {
            missionEngine.undoLastPlayerUndoableAction()
        })

        it("returns every target, the actor and the statistics to how they were before the action", () => {
            expect(getState()).toEqual(stateBeforeAction)
        })

        it("leaves nothing else to undo", () => {
            expect(missionEngine.undoLastPlayerUndoableAction().success).toBe(
                false
            )
        })
    })
})
