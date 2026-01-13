import { beforeEach, describe, expect, it } from "vitest"
import {
    type MissionTurnHistoryEntry,
    MissionTurnHistoryEntryService,
} from "./missionTurnHistoryEntry"
import { SquaddieTurnRecordService } from "./squaddieTurnRecord"
import { SquaddieTurnActionRecordService } from "./squaddieTurnActionRecord"
import { MissionAffiliationTurn } from "../missionTurn"
import type { SquaddieAction } from "../../squaddieAction/squaddieAction"
import type { SquaddieActionResult } from "../../squaddieAction/calculate/result/squaddieActionResult"

describe("MissionTurnHistoryEntryService", () => {
    describe("new", () => {
        it("creates entry with turn number and phase", () => {
            const entry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            })

            expect(entry.turnNumber).toBe(0)
            expect(entry.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.PLAYER_TURN
            )
            expect(entry.squaddieTurnRecords).toHaveLength(0)
        })

        it("creates entry with squaddie entries", () => {
            const squaddieEntry = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
            })

            const entry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieEntries: [squaddieEntry],
            })

            expect(entry.squaddieTurnRecords).toHaveLength(1)
        })

        it("throws error if turn number is negative", () => {
            expect(() =>
                MissionTurnHistoryEntryService.new({
                    turnNumber: -1,
                    missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                })
            ).toThrow("turnNumber must be >= 0")
        })

        it("throws error if phase is undefined", () => {
            expect(() =>
                MissionTurnHistoryEntryService.new({
                    turnNumber: 0,
                    missionAffiliationTurn: undefined as any,
                })
            ).toThrow("missionAffiliationTurn must be defined")
        })
    })

    describe("createFromJSON", () => {
        it("deserializes entry with no squaddie entries", () => {
            const data = {
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieTurnRecords: [],
            }

            const entry = MissionTurnHistoryEntryService.createFromJSON(data)

            expect(entry.turnNumber).toBe(0)
            expect(entry.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.PLAYER_TURN
            )
            expect(entry.squaddieTurnRecords).toHaveLength(0)
        })

        it("deserializes entry with squaddie entries", () => {
            const data = {
                turnNumber: 1,
                missionAffiliationTurn: MissionAffiliationTurn.ENEMY_TURN,
                squaddieTurnRecords: [
                    {
                        actingBattleSquaddieId: "squaddie1+++1",
                        actions: [],
                    },
                ],
            }

            const entry = MissionTurnHistoryEntryService.createFromJSON(data)

            expect(entry.squaddieTurnRecords).toHaveLength(1)
        })
    })

    describe("addOrUpdateSquaddieEntry", () => {
        let entry: MissionTurnHistoryEntry

        beforeEach(() => {
            entry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            })
        })

        it("adds new squaddie entry to empty list", () => {
            const squaddieEntry = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
            })

            const updated =
                MissionTurnHistoryEntryService.addOrUpdateSquaddieEntry({
                    entry,
                    squaddieEntry,
                })

            expect(updated.squaddieTurnRecords).toHaveLength(1)
            expect(updated.squaddieTurnRecords[0].actingBattleSquaddieId).toBe(
                "squaddie1+++1"
            )
        })

        it("adds new squaddie entry to existing list", () => {
            const squaddie1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
            })

            entry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieEntries: [squaddie1],
            })

            const squaddie2 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 2,
                    outOfBattleSquaddieId: "squaddie2",
                },
            })

            const updated =
                MissionTurnHistoryEntryService.addOrUpdateSquaddieEntry({
                    entry,
                    squaddieEntry: squaddie2,
                })

            expect(updated.squaddieTurnRecords).toHaveLength(2)
            expect(updated.squaddieTurnRecords[1].actingBattleSquaddieId).toBe(
                "squaddie2+++2"
            )
        })

        it("updates existing squaddie entry", () => {
            const action1 = SquaddieTurnActionRecordService.new({
                action: { id: "action1", name: "Attack" } as SquaddieAction,
                result: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                } as SquaddieActionResult,
            })

            const squaddie1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
                actions: [action1],
            })

            entry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieEntries: [squaddie1],
            })

            const action2 = SquaddieTurnActionRecordService.new({
                action: { id: "action2", name: "Move" } as SquaddieAction,
                result: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                } as SquaddieActionResult,
            })

            const updatedSquaddie = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
                actions: [action1, action2],
            })

            const updated =
                MissionTurnHistoryEntryService.addOrUpdateSquaddieEntry({
                    entry,
                    squaddieEntry: updatedSquaddie,
                })

            expect(updated.squaddieTurnRecords).toHaveLength(1)
            expect(updated.squaddieTurnRecords[0].actions).toHaveLength(2)
        })

        it("returns new instance without modifying original", () => {
            const squaddieEntry = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
            })

            const updated =
                MissionTurnHistoryEntryService.addOrUpdateSquaddieEntry({
                    entry,
                    squaddieEntry,
                })

            expect(entry.squaddieTurnRecords).toHaveLength(0)
            expect(updated.squaddieTurnRecords).toHaveLength(1)
        })

        it("throws error when entry is undefined", () => {
            const squaddieEntry = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
            })

            expect(() =>
                MissionTurnHistoryEntryService.addOrUpdateSquaddieEntry({
                    entry: undefined as any,
                    squaddieEntry,
                })
            ).toThrow("entry must be defined")
        })
    })

    describe("getSquaddieTurnRecord", () => {
        let entry: MissionTurnHistoryEntry

        beforeEach(() => {
            const squaddie1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
            })

            const squaddie2 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 2,
                    outOfBattleSquaddieId: "squaddie2",
                },
            })

            entry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieEntries: [squaddie1, squaddie2],
            })
        })

        it("finds squaddie entry by ID", () => {
            const found = MissionTurnHistoryEntryService.getSquaddieTurnRecord({
                entry,
                squaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
            })

            expect(found).toBeDefined()
            expect(found?.actingBattleSquaddieId).toBe("squaddie1+++1")
        })

        it("returns undefined if squaddie not found", () => {
            const found = MissionTurnHistoryEntryService.getSquaddieTurnRecord({
                entry,
                squaddieId: {
                    inBattleSquaddieId: 999,
                    outOfBattleSquaddieId: "not-found",
                },
            })

            expect(found).toBeUndefined()
        })

        it("throws error when entry is undefined", () => {
            expect(() =>
                MissionTurnHistoryEntryService.getSquaddieTurnRecord({
                    entry: undefined as any,
                    squaddieId: {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "squaddie1",
                    },
                })
            ).toThrow("entry must be defined")
        })
    })

    describe("getTotalActionCount", () => {
        it("returns 0 for turn with no squaddie entries", () => {
            const entry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            })

            expect(
                MissionTurnHistoryEntryService.getTotalActionCount(entry)
            ).toBe(0)
        })

        it("returns 0 for turn with squaddie entries but no actions", () => {
            const squaddie1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
            })

            const entry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieEntries: [squaddie1],
            })

            expect(
                MissionTurnHistoryEntryService.getTotalActionCount(entry)
            ).toBe(0)
        })

        it("sums actions across multiple squaddies", () => {
            const action1 = SquaddieTurnActionRecordService.new({
                action: { id: "action1", name: "Attack" } as SquaddieAction,
                result: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                } as SquaddieActionResult,
            })

            const action2 = SquaddieTurnActionRecordService.new({
                action: { id: "action2", name: "Move" } as SquaddieAction,
                result: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                } as SquaddieActionResult,
            })

            const squaddie1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
                actions: [action1, action2],
            })

            const action3 = SquaddieTurnActionRecordService.new({
                action: { id: "action3", name: "Attack" } as SquaddieAction,
                result: {
                    inBattleSquaddieId: 2,
                    outOfBattleSquaddieId: "squaddie2",
                } as SquaddieActionResult,
            })

            const squaddie2 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 2,
                    outOfBattleSquaddieId: "squaddie2",
                },
                actions: [action3],
            })

            const entry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieEntries: [squaddie1, squaddie2],
            })

            expect(
                MissionTurnHistoryEntryService.getTotalActionCount(entry)
            ).toBe(3)
        })
    })

    describe("getters", () => {
        let entry: MissionTurnHistoryEntry

        beforeEach(() => {
            entry = MissionTurnHistoryEntryService.new({
                turnNumber: 5,
                missionAffiliationTurn: MissionAffiliationTurn.ENEMY_TURN,
            })
        })

        it("getTurnNumber returns turn number", () => {
            expect(MissionTurnHistoryEntryService.getTurnNumber(entry)).toBe(5)
        })

        it("missionAffiliationTurn returns affiliation turn", () => {
            expect(
                MissionTurnHistoryEntryService.getMissionAffiliationTurn(entry)
            ).toBe(MissionAffiliationTurn.ENEMY_TURN)
        })

        it("throws error when entry is undefined", () => {
            expect(() =>
                MissionTurnHistoryEntryService.getTurnNumber(undefined as any)
            ).toThrow("entry must be defined")
        })
    })

    describe("JSON round-trip", () => {
        it("serializes and deserializes complete entry", () => {
            const action1 = SquaddieTurnActionRecordService.new({
                action: { id: "action1", name: "Attack" } as SquaddieAction,
                result: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                    damage: { net: 10, raw: 12, absorbed: 2, willKo: false },
                } as SquaddieActionResult,
            })

            const squaddie1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
                actions: [action1],
            })

            const entry = MissionTurnHistoryEntryService.new({
                turnNumber: 3,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN_END,
                squaddieEntries: [squaddie1],
            })

            const json = JSON.stringify(entry)
            const parsed = JSON.parse(json)
            const deserialized =
                MissionTurnHistoryEntryService.createFromJSON(parsed)

            expect(deserialized.turnNumber).toBe(3)
            expect(deserialized.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.PLAYER_TURN_END
            )
            expect(deserialized.squaddieTurnRecords).toHaveLength(1)
            expect(deserialized.squaddieTurnRecords[0].actions).toHaveLength(1)
            expect(
                deserialized.squaddieTurnRecords[0].actions[0].result.damage
                    ?.net
            ).toBe(10)
        })
    })
})
