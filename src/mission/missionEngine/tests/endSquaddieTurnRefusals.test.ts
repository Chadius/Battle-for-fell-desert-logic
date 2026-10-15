import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"
import {
    createTwoPlayerMission,
    TwoPlayerMissionActionIds,
} from "../../../testUtils/mission/twoPlayerMission.js"

const END_TURN_REFUSAL = /cannot end this squaddie's turn/

const attemptToEndTurn = (
    missionEngine: MissionEngine,
    battleSquaddieId: BattleSquaddieId
) => {
    try {
        missionEngine.endSquaddieTurn(battleSquaddieId)
    } catch {
        return
    }
}

describe("MissionEngine.endSquaddieTurn refusals", () => {
    let missionEngine: MissionEngine
    let player1Id: BattleSquaddieId
    let player2Id: BattleSquaddieId

    beforeEach(() => {
        ;({ missionEngine, player1Id, player2Id } = createTwoPlayerMission())
    })

    describe("when another squaddie is mid-turn", () => {
        beforeEach(() => {
            missionEngine.readyAction({
                actor: player1Id,
                targets: [player1Id],
                action: { id: TwoPlayerMissionActionIds.jab },
            })
            missionEngine.useActionAndGetResults()
        })

        it("refuses to end this squaddie's turn", () => {
            expect(() => missionEngine.endSquaddieTurn(player2Id)).toThrow(
                END_TURN_REFUSAL
            )
        })

        describe("and this squaddie tries to end their turn", () => {
            beforeEach(() => {
                attemptToEndTurn(missionEngine, player2Id)
            })

            describe("and the other squaddie then ends their turn", () => {
                beforeEach(() => {
                    missionEngine.endSquaddieTurn(player1Id)
                })

                it("leaves this squaddie able to act", () => {
                    expect(
                        missionEngine.getSquaddiesWhoCanActThisPhase()
                    ).toEqual([player2Id])
                })
            })
        })
    })

    describe("when another squaddie has a readied action that was not used", () => {
        beforeEach(() => {
            missionEngine.readyAction({
                actor: player1Id,
                targets: [player1Id],
                action: { id: TwoPlayerMissionActionIds.jab },
            })
        })

        it("refuses to end this squaddie's turn", () => {
            expect(() => missionEngine.endSquaddieTurn(player2Id)).toThrow(
                END_TURN_REFUSAL
            )
        })

        describe("and this squaddie tries to end their turn", () => {
            beforeEach(() => {
                attemptToEndTurn(missionEngine, player2Id)
            })

            it("keeps the other squaddie's readied action", () => {
                expect(missionEngine.getReadiedAction()?.actor).toEqual(
                    player1Id
                )
            })
        })
    })
})
