import { beforeEach, describe, expect, it } from "vitest"
import {
    type SquaddieTurnRecord,
    SquaddieTurnRecordService,
} from "./squaddieTurnRecord"
import {
    type SquaddieTurnActionRecord,
    SquaddieTurnActionRecordService,
} from "./squaddieTurnActionRecord"
import type { SquaddieAction } from "../../squaddieAction/squaddieAction"
import type { SquaddieActionResult } from "../../squaddieAction/calculate/result/squaddieActionResult"

describe("SquaddieTurnRecordService", () => {
    describe("new", () => {
        it("creates a record with squaddie ID and empty actions", () => {
            const squaddieTurnRecord = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
            })

            expect(squaddieTurnRecord.actingBattleSquaddieId).toBe(
                "squaddie1+++1"
            )
            expect(squaddieTurnRecord.actions).toHaveLength(0)
        })

        it("creates a record with squaddie ID and initial actions", () => {
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

            const squaddieTurnRecord = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
                actions: [action1, action2],
            })

            expect(squaddieTurnRecord.actions).toHaveLength(2)
            expect(squaddieTurnRecord.actions[0].action.id).toBe("action1")
            expect(squaddieTurnRecord.actions[1].action.id).toBe("action2")
        })

        it("throws error if squaddie ID is invalid", () => {
            expect(() =>
                SquaddieTurnRecordService.new({
                    actingBattleSquaddieId: {
                        inBattleSquaddieId: undefined as any,
                        outOfBattleSquaddieId: "squaddie1",
                    },
                })
            ).toThrow(
                "[SquaddieTurnRecordService.new]: squaddie ID must be valid"
            )
        })

        it("throws error if out of battle squaddie ID is empty", () => {
            expect(() =>
                SquaddieTurnRecordService.new({
                    actingBattleSquaddieId: {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "",
                    },
                })
            ).toThrow(
                "[SquaddieTurnRecordService.new]: squaddie ID must be valid"
            )
        })
    })

    describe("createFromJSON", () => {
        it("deserializes entry with no actions", () => {
            const data = {
                actingBattleSquaddieId: "squaddie1+++1",
                actions: [],
            }

            const entry = SquaddieTurnRecordService.createFromJSON(data)

            expect(entry.actingBattleSquaddieId).toBe("squaddie1+++1")
            expect(entry.actions).toHaveLength(0)
        })

        it("deserializes entry with actions", () => {
            const data = {
                actingBattleSquaddieId: "squaddie1+++1",
                actions: [
                    {
                        action: { id: "action1", name: "Attack" },
                        results: [
                            {
                                inBattleSquaddieId: 1,
                                outOfBattleSquaddieId: "squaddie1",
                            },
                        ],
                    },
                ],
            }

            const entry = SquaddieTurnRecordService.createFromJSON(data)

            expect(entry.actions).toHaveLength(1)
            expect(entry.actions[0].action.id).toBe("action1")
        })

        it("throws error for invalid squaddie ID", () => {
            const data = {
                actingBattleSquaddieId: "",
                actions: [],
            }

            expect(() =>
                SquaddieTurnRecordService.createFromJSON(data)
            ).toThrow("actingBattleSquaddieId must be defined")
        })
    })

    describe("addAction", () => {
        let entry: SquaddieTurnRecord
        let newAction: SquaddieTurnActionRecord

        beforeEach(() => {
            entry = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
            })

            newAction = SquaddieTurnActionRecordService.new({
                action: { id: "action1", name: "Attack" } as SquaddieAction,
                results: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "squaddie1",
                    } as SquaddieActionResult,
                ],
            })
        })

        it("adds action to empty actions list", () => {
            const updated = SquaddieTurnRecordService.addAction({
                squaddieTurnRecord: entry,
                action: newAction,
            })

            expect(updated.actions).toHaveLength(1)
            expect(updated.actions[0].action.id).toBe("action1")
        })

        it("adds action to existing actions list", () => {
            const action1 = SquaddieTurnActionRecordService.new({
                action: { id: "action1", name: "Attack" } as SquaddieAction,
                results: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "squaddie1",
                    } as SquaddieActionResult,
                ],
            })

            entry = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
                actions: [action1],
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

            const updated = SquaddieTurnRecordService.addAction({
                squaddieTurnRecord: entry,
                action: action2,
            })

            expect(updated.actions).toHaveLength(2)
            expect(updated.actions[1].action.id).toBe("action2")
        })

        it("returns new instance without modifying original", () => {
            const updated = SquaddieTurnRecordService.addAction({
                squaddieTurnRecord: entry,
                action: newAction,
            })

            expect(entry.actions).toHaveLength(0)
            expect(updated.actions).toHaveLength(1)
        })

        it("throws error when entry is undefined", () => {
            expect(() =>
                SquaddieTurnRecordService.addAction({
                    squaddieTurnRecord: undefined as any,
                    action: newAction,
                })
            ).toThrow(
                "[SquaddieTurnRecordService.addAction]: entry must be defined"
            )
        })
    })

    describe("getters", () => {
        let entry: SquaddieTurnRecord

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

            entry = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
                actions: [action1, action2],
            })
        })

        it("getActions returns cloned actions", () => {
            const actions = SquaddieTurnRecordService.getActions(entry)

            expect(actions).toHaveLength(2)
            expect(actions[0].action.id).toBe("action1")
            expect(actions[1].action.id).toBe("action2")
        })

        it("getActionCount returns number of actions", () => {
            expect(SquaddieTurnRecordService.getActionCount(entry)).toBe(2)
        })

        it("getActionCount returns 0 for empty actions", () => {
            const emptyEntry = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
            })

            expect(SquaddieTurnRecordService.getActionCount(emptyEntry)).toBe(0)
        })

        it("getActingBattleSquaddieId returns cloned squaddie ID", () => {
            const squaddieId =
                SquaddieTurnRecordService.getActingBattleSquaddieId(entry)

            expect(squaddieId.inBattleSquaddieId).toBe(1)
            expect(squaddieId.outOfBattleSquaddieId).toBe("squaddie1")
        })

        it("throws error when entry is undefined", () => {
            expect(() =>
                SquaddieTurnRecordService.getActions(undefined as any)
            ).toThrow(
                "[SquaddieTurnRecordService.getActions]: entry must be defined"
            )
        })
    })

    describe("JSON round-trip", () => {
        it("serializes and deserializes entry with actions", () => {
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

            const action2 = SquaddieTurnActionRecordService.new({
                action: { id: "action2", name: "Heal" } as SquaddieAction,
                results: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "squaddie1",
                        healing: { net: 5, raw: 5 },
                    } as SquaddieActionResult,
                ],
            })

            const entry = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                },
                actions: [action1, action2],
            })

            const json = JSON.stringify(entry)
            const parsed = JSON.parse(json)
            const deserialized =
                SquaddieTurnRecordService.createFromJSON(parsed)

            expect(deserialized.actingBattleSquaddieId).toBe("squaddie1+++1")
            expect(deserialized.actions).toHaveLength(2)
            expect(deserialized.actions[0].action.id).toBe("action1")
            expect(deserialized.actions[0].results[0].damage?.net).toBe(10)
            expect(deserialized.actions[1].action.id).toBe("action2")
            expect(deserialized.actions[1].results[0].healing?.net).toBe(5)
        })
    })
})
