import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"
import { DEFAULT_MOVE_ACTION_ID } from "../../../squaddieAction/squaddieAction.js"
import type { OffsetCoordinate } from "../../../coordinateMap/offsetCoordinate.js"
import { createTwoPlayerMission } from "../../../testUtils/mission/twoPlayerMission.js"

const moveTo = ({
    missionEngine,
    actor,
    destination,
}: {
    missionEngine: MissionEngine
    actor: BattleSquaddieId
    destination: OffsetCoordinate
}) => {
    missionEngine.readyAction({
        actor,
        targets: [actor],
        action: {
            id: DEFAULT_MOVE_ACTION_ID,
            decisions: { targetDestination: destination },
        },
    })
    missionEngine.useActionAndGetResults()
}

describe("undoLastPlayerUndoableAction after a squaddie moves twice", () => {
    const player2StartingPosition = { row: 0, col: 1 }
    const oneHexEastOfPlayer2 = { row: 0, col: 2 }
    const twoHexesEastOfPlayer2 = { row: 0, col: 3 }

    let missionEngine: MissionEngine
    let player2Id: BattleSquaddieId

    beforeEach(() => {
        ;({ missionEngine, player2Id } = createTwoPlayerMission())
        moveTo({
            missionEngine,
            actor: player2Id,
            destination: oneHexEastOfPlayer2,
        })
        moveTo({
            missionEngine,
            actor: player2Id,
            destination: twoHexesEastOfPlayer2,
        })
    })

    describe("when one move is undone", () => {
        beforeEach(() => {
            missionEngine.undoLastPlayerUndoableAction()
        })

        it("returns the squaddie to where the first move ended", () => {
            expect(missionEngine.getSquaddiePosition(player2Id)).toMatchObject(
                oneHexEastOfPlayer2
            )
        })
    })

    describe("when both moves are undone", () => {
        beforeEach(() => {
            missionEngine.undoLastPlayerUndoableAction()
            missionEngine.undoLastPlayerUndoableAction()
        })

        it("returns the squaddie to where they started", () => {
            expect(missionEngine.getSquaddiePosition(player2Id)).toMatchObject(
                player2StartingPosition
            )
        })
    })
})
