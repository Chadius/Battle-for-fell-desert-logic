import { beforeEach, describe, expect, it } from "vitest"
import { type MissionHistory, MissionHistoryService } from "./missionHistory"
import { MissionTurnHistoryEntryService } from "./missionTurnHistoryEntry"
import { SquaddieTurnRecordService } from "./squaddieTurnRecord"
import { SquaddieTurnActionRecordService } from "./squaddieTurnActionRecord"
import { MissionAffiliationTurn } from "../missionTurn"
import type { SquaddieAction } from "../../squaddieAction/squaddieAction"
import type { SquaddieActionResult } from "../../squaddieAction/calculate/result/squaddieActionResult"

describe("MissionHistoryService", () => {
    describe("new", () => {
        it("creates empty history", () => {
            const history = MissionHistoryService.new()

            expect(history.turns).toHaveLength(0)
        })

        it("creates history with turns", () => {
            const turn1 = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            })

            const history = MissionHistoryService.new({ turns: [turn1] })

            expect(history.turns).toHaveLength(1)
        })
    })

    describe("createFromJSON", () => {
        it("deserializes empty history", () => {
            const data = { turns: [] }

            const history = MissionHistoryService.createFromJSON(data)

            expect(history.turns).toHaveLength(0)
        })

        it("deserializes history with turns", () => {
            const data = {
                turns: [
                    {
                        turnNumber: 0,
                        missionAffiliationTurn:
                            MissionAffiliationTurn.PLAYER_TURN,
                        squaddieTurnRecords: [],
                    },
                ],
            }

            const history = MissionHistoryService.createFromJSON(data)

            expect(history.turns).toHaveLength(1)
        })
    })

    describe("addOrUpdateTurn", () => {
        let history: MissionHistory

        beforeEach(() => {
            history = MissionHistoryService.new()
        })

        it("adds turn to empty history", () => {
            const turn = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            })

            const updated = MissionHistoryService.addOrUpdateTurn({
                history,
                turnEntry: turn,
            })

            expect(updated.turns).toHaveLength(1)
            expect(updated.turns[0].turnNumber).toBe(0)
        })

        it("adds turn to existing history", () => {
            const turn0 = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            })

            history = MissionHistoryService.new({ turns: [turn0] })

            const turn1 = MissionTurnHistoryEntryService.new({
                turnNumber: 1,
                missionAffiliationTurn: MissionAffiliationTurn.ENEMY_TURN,
            })

            const updated = MissionHistoryService.addOrUpdateTurn({
                history,
                turnEntry: turn1,
            })

            expect(updated.turns).toHaveLength(2)
            expect(updated.turns[1].turnNumber).toBe(1)
        })

        it("updates existing turn", () => {
            const action1 = SquaddieTurnActionRecordService.new({
                action: { id: "action1", name: "Attack" } as SquaddieAction,
                results: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "squaddie1",
                    } as SquaddieActionResult,
                ],
            })

            const squaddie1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
                actions: [action1],
            })

            const turn0 = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieTurnRecords: [squaddie1],
            })

            history = MissionHistoryService.new({ turns: [turn0] })

            const action2 = SquaddieTurnActionRecordService.new({
                action: { id: "action2", name: "Move" } as SquaddieAction,
                results: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "squaddie1",
                    } as SquaddieActionResult,
                ],
            })

            const updatedSquaddie = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
                actions: [action1, action2],
            })

            const updatedTurn = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieTurnRecords: [updatedSquaddie],
            })

            const updated = MissionHistoryService.addOrUpdateTurn({
                history,
                turnEntry: updatedTurn,
            })

            expect(updated.turns).toHaveLength(1)
            expect(
                updated.turns[0].squaddieTurnRecords[0].actions
            ).toHaveLength(2)
        })

        it("returns new instance without modifying original", () => {
            const turn = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            })

            const updated = MissionHistoryService.addOrUpdateTurn({
                history,
                turnEntry: turn,
            })

            expect(history.turns).toHaveLength(0)
            expect(updated.turns).toHaveLength(1)
        })

        it("throws error when history is undefined", () => {
            const turn = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            })

            expect(() =>
                MissionHistoryService.addOrUpdateTurn({
                    history: undefined as any,
                    turnEntry: turn,
                })
            ).toThrow(
                "[MissionHistoryService.addOrUpdateTurn]: history must be defined"
            )
        })
    })

    describe("getTurn", () => {
        let history: MissionHistory

        beforeEach(() => {
            const turn0 = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            })

            const turn1 = MissionTurnHistoryEntryService.new({
                turnNumber: 1,
                missionAffiliationTurn: MissionAffiliationTurn.ENEMY_TURN,
            })

            history = MissionHistoryService.new({ turns: [turn0, turn1] })
        })

        it("finds turn by number", () => {
            const found = MissionHistoryService.getTurn({
                history,
                turnNumber: 0,
            })

            expect(found).toBeDefined()
            expect(found?.turnNumber).toBe(0)
        })

        it("returns undefined if turn not found", () => {
            const found = MissionHistoryService.getTurn({
                history,
                turnNumber: 999,
            })

            expect(found).toBeUndefined()
        })

        it("throws error when history is undefined", () => {
            expect(() =>
                MissionHistoryService.getTurn({
                    history: undefined as any,
                    turnNumber: 0,
                })
            ).toThrow(
                "[MissionHistoryService.getTurn]: history must be defined"
            )
        })
    })

    describe("getTotalActionCount", () => {
        it("returns 0 for empty history", () => {
            const history = MissionHistoryService.new()

            expect(MissionHistoryService.getTotalActionCount(history)).toBe(0)
        })

        it("returns 0 for history with no actions", () => {
            const turn0 = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            })

            const history = MissionHistoryService.new({ turns: [turn0] })

            expect(MissionHistoryService.getTotalActionCount(history)).toBe(0)
        })

        it("counts actions across multiple turns and squaddies", () => {
            const action1 = SquaddieTurnActionRecordService.new({
                action: { id: "action1", name: "Attack" } as SquaddieAction,
                results: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "squaddie1",
                    } as SquaddieActionResult,
                ],
            })

            const action2 = SquaddieTurnActionRecordService.new({
                action: { id: "action2", name: "Move" } as SquaddieAction,
                results: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "squaddie1",
                    } as SquaddieActionResult,
                ],
            })

            const squaddie1Turn0 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
                actions: [action1, action2],
            })

            const turn0 = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieTurnRecords: [squaddie1Turn0],
            })

            const action3 = SquaddieTurnActionRecordService.new({
                action: { id: "action3", name: "Attack" } as SquaddieAction,
                results: [
                    {
                        inBattleSquaddieId: 2,
                        outOfBattleSquaddieId: "squaddie2",
                    } as SquaddieActionResult,
                ],
            })

            const squaddie2Turn1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 2,
                    outOfBattleSquaddieId: "squaddie2",
                },
                actions: [action3],
            })

            const turn1 = MissionTurnHistoryEntryService.new({
                turnNumber: 1,
                missionAffiliationTurn: MissionAffiliationTurn.ENEMY_TURN,
                squaddieTurnRecords: [squaddie2Turn1],
            })

            const history = MissionHistoryService.new({
                turns: [turn0, turn1],
            })

            expect(MissionHistoryService.getTotalActionCount(history)).toBe(3)
        })
    })

    describe("getTurnCount", () => {
        it("returns 0 for empty history", () => {
            const history = MissionHistoryService.new()

            expect(MissionHistoryService.getTurnCount(history)).toBe(0)
        })

        it("returns number of turns", () => {
            const turn0 = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            })

            const turn1 = MissionTurnHistoryEntryService.new({
                turnNumber: 1,
                missionAffiliationTurn: MissionAffiliationTurn.ENEMY_TURN,
            })

            const history = MissionHistoryService.new({
                turns: [turn0, turn1],
            })

            expect(MissionHistoryService.getTurnCount(history)).toBe(2)
        })
    })

    describe("getActionsBySquaddieInTurn", () => {
        let history: MissionHistory

        beforeEach(() => {
            const action1 = SquaddieTurnActionRecordService.new({
                action: { id: "action1", name: "Attack" } as SquaddieAction,
                results: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "squaddie1",
                    } as SquaddieActionResult,
                ],
            })

            const action2 = SquaddieTurnActionRecordService.new({
                action: { id: "action2", name: "Move" } as SquaddieAction,
                results: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "squaddie1",
                    } as SquaddieActionResult,
                ],
            })

            const squaddie1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
                actions: [action1, action2],
            })

            const turn0 = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieTurnRecords: [squaddie1],
            })

            history = MissionHistoryService.new({ turns: [turn0] })
        })

        it("returns actions for squaddie in turn", () => {
            const actions = MissionHistoryService.getActionsBySquaddieInTurn({
                history,
                turnNumber: 0,
                squaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
            })

            expect(actions).toHaveLength(2)
            expect(actions?.[0].action.id).toBe("action1")
            expect(actions?.[1].action.id).toBe("action2")
        })

        it("returns undefined if turn not found", () => {
            const actions = MissionHistoryService.getActionsBySquaddieInTurn({
                history,
                turnNumber: 999,
                squaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
            })

            expect(actions).toBeUndefined()
        })

        it("returns undefined if squaddie not found in turn", () => {
            const actions = MissionHistoryService.getActionsBySquaddieInTurn({
                history,
                turnNumber: 0,
                squaddieId: {
                    inBattleSquaddieId: 999,
                    outOfBattleSquaddieId: "not-found",
                },
            })

            expect(actions).toBeUndefined()
        })
    })

    describe("getActionCountInTurn", () => {
        let history: MissionHistory

        beforeEach(() => {
            const action1 = SquaddieTurnActionRecordService.new({
                action: { id: "action1", name: "Attack" } as SquaddieAction,
                results: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "squaddie1",
                    } as SquaddieActionResult,
                ],
            })

            const squaddie1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
                actions: [action1],
            })

            const turn0 = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieTurnRecords: [squaddie1],
            })

            history = MissionHistoryService.new({ turns: [turn0] })
        })

        it("returns action count for turn", () => {
            const count = MissionHistoryService.getActionCountInTurn({
                history,
                turnNumber: 0,
            })

            expect(count).toBe(1)
        })

        it("returns undefined if turn not found", () => {
            const count = MissionHistoryService.getActionCountInTurn({
                history,
                turnNumber: 999,
            })

            expect(count).toBeUndefined()
        })
    })

    describe("JSON round-trip", () => {
        it("serializes and deserializes complete history", () => {
            const action1 = SquaddieTurnActionRecordService.new({
                action: { id: "action1", name: "Attack" } as SquaddieAction,
                results: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "squaddie1",
                        damage: {
                            net: 10,
                            raw: 12,
                            absorbed: 2,
                            willKo: false,
                        },
                    } as SquaddieActionResult,
                ],
            })

            const squaddie1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
                actions: [action1],
            })

            const turn0 = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieTurnRecords: [squaddie1],
            })

            const history = MissionHistoryService.new({ turns: [turn0] })

            const json = JSON.stringify(history)
            const parsed = JSON.parse(json)
            const deserialized = MissionHistoryService.createFromJSON(parsed)

            expect(deserialized.turns).toHaveLength(1)
            expect(deserialized.turns[0].turnNumber).toBe(0)
            expect(deserialized.turns[0].squaddieTurnRecords).toHaveLength(1)
            expect(
                deserialized.turns[0].squaddieTurnRecords[0].actions
            ).toHaveLength(1)
            expect(
                deserialized.turns[0].squaddieTurnRecords[0].actions[0]
                    .results[0].damage?.net
            ).toBe(10)
        })
    })
})
