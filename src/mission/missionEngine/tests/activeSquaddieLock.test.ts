import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"
import {
    createTwoPlayerMission,
    TwoPlayerMissionActionIds,
} from "../../../testUtils/mission/twoPlayerMission.js"

const jabActionId = TwoPlayerMissionActionIds.jab
const waveActionId = TwoPlayerMissionActionIds.wave
const pokeActionId = TwoPlayerMissionActionIds.poke

describe("MissionEngine active squaddie lock", () => {
    let missionEngine: MissionEngine
    let player1Id: BattleSquaddieId
    let player2Id: BattleSquaddieId

    beforeEach(() => {
        ;({ missionEngine, player1Id, player2Id } = createTwoPlayerMission())
    })

    describe("when no squaddie in the phase has acted yet", () => {
        it("allows the first squaddie to ready an action", () => {
            const result = missionEngine.readyAction({
                actor: player1Id,
                targets: [player1Id],
                action: { id: jabActionId },
            })

            expect(result.isValid).toBe(true)
        })
    })

    describe("when another squaddie has already spent action points this phase", () => {
        beforeEach(() => {
            missionEngine.readyAction({
                actor: player1Id,
                targets: [player1Id],
                action: { id: jabActionId },
            })
            missionEngine.useActionAndGetResults()
        })

        it("rejects readying an action for a different squaddie", () => {
            const result = missionEngine.readyAction({
                actor: player2Id,
                targets: [player2Id],
                action: { id: jabActionId },
            })

            expect(result.isValid).toBe(false)
            expect(result.message).toMatch(/already started their turn/)
        })

        it("still allows the active squaddie to ready further actions", () => {
            const result = missionEngine.readyAction({
                actor: player1Id,
                targets: [player1Id],
                action: { id: jabActionId },
            })

            expect(result.isValid).toBe(true)
        })

        it("leaves the locked-out squaddie's action points untouched", () => {
            const info = missionEngine.getSquaddieInfo(player2Id)

            expect(info.currentActionPoints).toBe(info.maximumActionPoints)
        })

        describe("and the active squaddie ends their turn", () => {
            beforeEach(() => {
                missionEngine.endSquaddieTurn(player1Id)
            })

            it("allows a different squaddie to ready an action", () => {
                const result = missionEngine.readyAction({
                    actor: player2Id,
                    targets: [player2Id],
                    action: { id: jabActionId },
                })

                expect(result.isValid).toBe(true)
            })
        })

        describe("and undo restores the active squaddie's action points to full", () => {
            beforeEach(() => {
                missionEngine.undoLastPlayerUndoableAction()
            })

            it("allows a different squaddie to ready an action", () => {
                const result = missionEngine.readyAction({
                    actor: player2Id,
                    targets: [player2Id],
                    action: { id: jabActionId },
                })

                expect(result.isValid).toBe(true)
            })
        })

        describe("and the active squaddie takes a second action, then only the most recent is undone", () => {
            beforeEach(() => {
                missionEngine.readyAction({
                    actor: player1Id,
                    targets: [player1Id],
                    action: { id: jabActionId },
                })
                missionEngine.useActionAndGetResults()

                missionEngine.undoLastPlayerUndoableAction()
            })

            it("keeps the lock, rejecting a different squaddie", () => {
                const result = missionEngine.readyAction({
                    actor: player2Id,
                    targets: [player2Id],
                    action: { id: jabActionId },
                })

                expect(result.isValid).toBe(false)
                expect(result.message).toMatch(/already started their turn/)
            })
        })
    })

    describe("when another squaddie has taken a zero-action-point action this phase", () => {
        beforeEach(() => {
            missionEngine.readyAction({
                actor: player1Id,
                targets: [player1Id],
                action: { id: waveActionId },
            })
            missionEngine.useActionAndGetResults()
        })

        it("rejects readying an action for a different squaddie even though action points are untouched", () => {
            const result = missionEngine.readyAction({
                actor: player2Id,
                targets: [player2Id],
                action: { id: jabActionId },
            })

            expect(result.isValid).toBe(false)
            expect(result.message).toMatch(/already started their turn/)
        })

        describe("and the active squaddie ends their turn", () => {
            beforeEach(() => {
                missionEngine.endSquaddieTurn(player1Id)
            })

            it("allows a different squaddie to ready an action", () => {
                const result = missionEngine.readyAction({
                    actor: player2Id,
                    targets: [player2Id],
                    action: { id: jabActionId },
                })

                expect(result.isValid).toBe(true)
            })
        })

        describe("and undo removes the zero-action-point action", () => {
            beforeEach(() => {
                missionEngine.undoLastPlayerUndoableAction()
            })

            it("allows a different squaddie to ready an action", () => {
                const result = missionEngine.readyAction({
                    actor: player2Id,
                    targets: [player2Id],
                    action: { id: jabActionId },
                })

                expect(result.isValid).toBe(true)
            })
        })
    })

    describe("when the active squaddie's only action targeted a different squaddie", () => {
        beforeEach(() => {
            missionEngine.readyAction({
                actor: player1Id,
                targets: [player2Id],
                action: { id: pokeActionId },
            })
            missionEngine.useActionAndGetResults()
        })

        describe("and undo reverses it", () => {
            beforeEach(() => {
                missionEngine.undoLastPlayerUndoableAction()
            })

            it("allows a different squaddie to ready an action", () => {
                const result = missionEngine.readyAction({
                    actor: player2Id,
                    targets: [player2Id],
                    action: { id: jabActionId },
                })

                expect(result.isValid).toBe(true)
            })
        })
    })

    describe("when a squaddie has an action readied but not yet executed", () => {
        beforeEach(() => {
            missionEngine.readyAction({
                actor: player1Id,
                targets: [player1Id],
                action: { id: jabActionId },
            })
        })

        it("rejects readying an action for a different squaddie", () => {
            const result = missionEngine.readyAction({
                actor: player2Id,
                targets: [player2Id],
                action: { id: jabActionId },
            })

            expect(result.isValid).toBe(false)
            expect(result.message).toMatch(/readied action/)
        })

        describe("and the readied action is cancelled", () => {
            beforeEach(() => {
                missionEngine.cancelReadiedAction()
            })

            it("allows a different squaddie to ready an action", () => {
                const result = missionEngine.readyAction({
                    actor: player2Id,
                    targets: [player2Id],
                    action: { id: jabActionId },
                })

                expect(result.isValid).toBe(true)
            })
        })
    })
})
