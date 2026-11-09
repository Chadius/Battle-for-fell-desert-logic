import { beforeEach, describe, expect, it } from "vitest"
import type { MissionEngine } from "../missionEngine.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"
import {
    createTwoPlayerMission,
    TwoPlayerMissionActionIds,
} from "../../../testUtils/mission/twoPlayerMission.js"
import { useSelfTargetedAction } from "../../../testUtils/mission/useSelfTargetedAction.js"

const isActionValid = ({
    missionEngine,
    actor,
    actionId,
}: {
    missionEngine: MissionEngine
    actor: BattleSquaddieId
    actionId: string
}): boolean =>
    missionEngine
        .getSquaddieActionValidity(actor)
        .validActions.some((validAction) => validAction.actionId === actionId)

describe("MissionEngine.undoLastPlayerUndoableAction restores action limits", () => {
    let missionEngine: MissionEngine
    let playerId: BattleSquaddieId

    beforeEach(() => {
        ;({ missionEngine, player1Id: playerId } = createTwoPlayerMission())
    })

    describe.each([
        {
            limit: "a cooldown",
            actionId: TwoPlayerMissionActionIds.surge,
        },
        {
            limit: "a limit of one use per turn",
            actionId: TwoPlayerMissionActionIds.flourish,
        },
    ])("when an action with $limit is used", ({ actionId }) => {
        beforeEach(() => {
            useSelfTargetedAction({ missionEngine, actor: playerId, actionId })
        })

        it("cannot be used again", () => {
            expect(
                isActionValid({ missionEngine, actor: playerId, actionId })
            ).toBe(false)
        })

        describe("and the use is undone", () => {
            beforeEach(() => {
                missionEngine.undoLastPlayerUndoableAction()
            })

            it("can be used again", () => {
                expect(
                    isActionValid({ missionEngine, actor: playerId, actionId })
                ).toBe(true)
            })
        })
    })
})
