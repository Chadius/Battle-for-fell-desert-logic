import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"
import {
    createTwoPlayerMission,
    TwoPlayerMissionActionIds,
} from "../../../testUtils/mission/twoPlayerMission.js"
import { useSelfTargetedAction } from "../../../testUtils/mission/useSelfTargetedAction.js"

describe("MissionEngine.hasSquaddieActedThisTurn", () => {
    let missionEngine: MissionEngine
    let player1Id: BattleSquaddieId
    let player2Id: BattleSquaddieId

    beforeEach(() => {
        ;({ missionEngine, player1Id, player2Id } = createTwoPlayerMission())
    })

    describe("before the squaddie acts", () => {
        it("reports that the squaddie has not acted", () => {
            expect(missionEngine.hasSquaddieActedThisTurn(player1Id)).toBe(
                false
            )
        })
    })

    describe("after the squaddie uses an action", () => {
        beforeEach(() => {
            useSelfTargetedAction({
                missionEngine,
                actor: player1Id,
                actionId: TwoPlayerMissionActionIds.jab,
            })
        })

        it("reports that the squaddie has acted", () => {
            expect(missionEngine.hasSquaddieActedThisTurn(player1Id)).toBe(true)
        })

        it("reports that a squaddie who has not acted has not acted", () => {
            expect(missionEngine.hasSquaddieActedThisTurn(player2Id)).toBe(
                false
            )
        })

        describe("and that action is undone", () => {
            beforeEach(() => {
                missionEngine.undoLastPlayerUndoableAction()
            })

            it("reports that the squaddie has not acted", () => {
                expect(missionEngine.hasSquaddieActedThisTurn(player1Id)).toBe(
                    false
                )
            })
        })
    })

    describe("after the squaddie uses an action that costs no action points", () => {
        beforeEach(() => {
            useSelfTargetedAction({
                missionEngine,
                actor: player1Id,
                actionId: TwoPlayerMissionActionIds.wave,
            })
        })

        it("reports that the squaddie has acted", () => {
            expect(missionEngine.hasSquaddieActedThisTurn(player1Id)).toBe(true)
        })
    })

    describe("after the squaddie ends their turn", () => {
        beforeEach(() => {
            missionEngine.endSquaddieTurn(player1Id)
        })

        it("reports that the squaddie has acted", () => {
            expect(missionEngine.hasSquaddieActedThisTurn(player1Id)).toBe(true)
        })

        describe("and the next round begins", () => {
            beforeEach(() => {
                missionEngine.endSquaddieTurn(player2Id)
            })

            it("reports that the squaddie has not acted", () => {
                expect(missionEngine.hasSquaddieActedThisTurn(player1Id)).toBe(
                    false
                )
            })
        })
    })
})
