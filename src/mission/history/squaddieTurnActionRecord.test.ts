import { beforeEach, describe, expect, it } from "vitest"
import {
    type SerializableSquaddieActionResult,
    type SquaddieTurnActionRecord,
    SquaddieTurnActionRecordService,
} from "./squaddieTurnActionRecord"
import type { SquaddieAction } from "../../squaddieAction/squaddieAction"
import type { SquaddieActionResult } from "../../squaddieAction/calculate/result/squaddieActionResult"
import { AttributeScore } from "../../proficiency/attributeScore"
import { SquaddieConditionType } from "../../proficiency/squaddieCondition"

describe("ActionHistoryEntryService", () => {
    describe("new", () => {
        it("creates entry with minimal action and result", () => {
            const action: SquaddieAction = {
                id: "action1",
                name: "Attack",
            } as SquaddieAction

            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie1",
            }

            const entry = SquaddieTurnActionRecordService.new({
                action,
                result,
            })

            expect(entry.action.id).toBe("action1")
            expect(entry.action.name).toBe("Attack")
            expect(entry.result.inBattleSquaddieId).toBe(1)
            expect(entry.result.outOfBattleSquaddieId).toBe("squaddie1")
        })

        it("creates entry with action points", () => {
            const action: SquaddieAction = {
                id: "action1",
                name: "Move",
            } as SquaddieAction

            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie1",
                actionPoints: {
                    spent: 2,
                    restore: { net: 1, raw: 1 },
                },
            }

            const entry = SquaddieTurnActionRecordService.new({
                action,
                result,
            })

            expect(entry.result.actionPoints).toEqual({
                spent: 2,
                restore: { net: 1, raw: 1 },
            })
        })

        it("creates entry with damage", () => {
            const action: SquaddieAction = {
                id: "action1",
                name: "Attack",
            } as SquaddieAction

            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie1",
                damage: {
                    net: 10,
                    raw: 12,
                    absorbed: 2,
                    willKo: false,
                    type: AttributeScore.BODY,
                },
            }

            const entry = SquaddieTurnActionRecordService.new({
                action,
                result,
            })

            expect(entry.result.damage).toEqual({
                net: 10,
                raw: 12,
                absorbed: 2,
                willKo: false,
                type: AttributeScore.BODY,
            })
        })

        it("creates entry with healing", () => {
            const action: SquaddieAction = {
                id: "action1",
                name: "Heal",
            } as SquaddieAction

            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie1",
                healing: { net: 5, raw: 5 },
            }

            const entry = SquaddieTurnActionRecordService.new({
                action,
                result,
            })

            expect(entry.result.healing).toEqual({ net: 5, raw: 5 })
        })

        it("creates entry with conditions added", () => {
            const action: SquaddieAction = {
                id: "action1",
                name: "Buff",
            } as SquaddieAction

            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie1",
                conditionsAdded: [
                    {
                        type: SquaddieConditionType.HUSTLE,
                        amount: undefined,
                        limit: { duration: 2 },
                    },
                ],
            }

            const entry = SquaddieTurnActionRecordService.new({
                action,
                result,
            })

            expect(entry.result.conditionsAdded).toHaveLength(1)
            expect(entry.result.conditionsAdded?.[0].type).toBe(
                SquaddieConditionType.HUSTLE
            )
        })

        it("converts Map to object for dispel.dispelledConditions", () => {
            const action: SquaddieAction = {
                id: "action1",
                name: "Dispel",
            } as SquaddieAction

            const dispelledMap = new Map()
            dispelledMap.set(SquaddieConditionType.SLOWED, [
                {
                    type: SquaddieConditionType.SLOWED,
                    amount: undefined,
                    limit: { duration: 0 },
                },
            ])
            dispelledMap.set(SquaddieConditionType.ARMOR, [
                {
                    type: SquaddieConditionType.SLOWED,
                    amount: undefined,
                    limit: { duration: 0 },
                },
            ])

            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie1",
                dispel: {
                    dispelledConditions: dispelledMap,
                    conditionTypes: {
                        types: [SquaddieConditionType.SLOWED],
                    },
                    amount: 1,
                },
            }

            const entry = SquaddieTurnActionRecordService.new({
                action,
                result,
            })

            expect(entry.result.dispel?.dispelledConditions).not.toBeInstanceOf(
                Map
            )
            expect(
                entry.result.dispel?.dispelledConditions?.[
                    SquaddieConditionType.SLOWED
                ]
            ).toHaveLength(1)
            expect(
                entry.result.dispel?.dispelledConditions?.[
                    SquaddieConditionType.ARMOR
                ]
            ).toHaveLength(1)
        })

        it("converts Map to object for treat.treatedConditions", () => {
            const action: SquaddieAction = {
                id: "action1",
                name: "Treat",
            } as SquaddieAction

            const treatedMap = new Map()
            treatedMap.set(SquaddieConditionType.ABSORB, [
                {
                    type: SquaddieConditionType.ABSORB,
                    amount: undefined,
                    limit: { duration: 1 },
                },
            ])

            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie1",
                treat: {
                    treatedConditions: treatedMap,
                    conditionTypes: { types: [SquaddieConditionType.ABSORB] },
                    amount: 1,
                },
            }

            const entry = SquaddieTurnActionRecordService.new({
                action,
                result,
            })

            expect(entry.result.treat?.treatedConditions).not.toBeInstanceOf(
                Map
            )
            expect(
                entry.result.treat?.treatedConditions?.[
                    SquaddieConditionType.ABSORB
                ]
            ).toHaveLength(1)
        })

        it("deep clones movement path", () => {
            const action: SquaddieAction = {
                id: "action1",
                name: "Move",
            } as SquaddieAction

            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie1",
                movement: {
                    expectedPath: {
                        steps: [
                            { row: 0, col: 0, moveType: "START", moveCost: 0 },
                            { row: 1, col: 0, moveType: "WALK", moveCost: 1 },
                        ],
                        movementInstruction: [
                            {
                                start: { row: 0, col: 0 },
                                end: { row: 1, col: 0 },
                                moveType: "WALK",
                            },
                        ],
                    },
                },
            }

            const entry = SquaddieTurnActionRecordService.new({
                action,
                result,
            })

            expect(entry.result.movement?.expectedPath.steps).toHaveLength(2)
            expect(entry.result.movement?.expectedPath.steps[0]).toEqual({
                row: 0,
                col: 0,
                moveType: "START",
                moveCost: 0,
            })
            expect(
                entry.result.movement?.expectedPath.movementInstruction
            ).toHaveLength(1)
        })

        it("throws error if action has no id", () => {
            const action = { name: "Attack" } as SquaddieAction
            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie1",
            }

            expect(() =>
                SquaddieTurnActionRecordService.new({ action, result })
            ).toThrow("[ActionHistoryEntryService.new]: action must have id")
        })

        it("throws error if action has no name", () => {
            const action = { id: "action1" } as SquaddieAction
            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie1",
            }

            expect(() =>
                SquaddieTurnActionRecordService.new({ action, result })
            ).toThrow("[ActionHistoryEntryService.new]: action must have id")
        })

        it("throws error if result has no squaddie IDs", () => {
            const action: SquaddieAction = {
                id: "action1",
                name: "Attack",
            } as SquaddieAction
            const result = {} as SquaddieActionResult

            expect(() =>
                SquaddieTurnActionRecordService.new({ action, result })
            ).toThrow(
                "[ActionHistoryEntryService.new]: result must have squaddie IDs"
            )
        })
    })

    describe("createFromJSON", () => {
        it("deserializes valid data", () => {
            const data = {
                action: { id: "action1", name: "Attack" },
                result: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                    damage: {
                        net: 10,
                        raw: 12,
                        absorbed: 2,
                        willKo: false,
                        type: AttributeScore.BODY,
                    },
                },
            }

            const entry = SquaddieTurnActionRecordService.createFromJSON(data)

            expect(entry.action.id).toBe("action1")
            expect(entry.action.name).toBe("Attack")
            expect(entry.result.damage?.net).toBe(10)
        })

        it("deserializes dispel with plain object", () => {
            const data = {
                action: { id: "action1", name: "Dispel" },
                result: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                    dispel: {
                        dispelledConditions: {
                            [SquaddieConditionType.SLOWED]: [
                                {
                                    type: SquaddieConditionType.SLOWED,
                                    amount: undefined,
                                    limit: { duration: 0 },
                                },
                            ],
                        },
                        conditionTypes: {
                            types: [SquaddieConditionType.SLOWED],
                        },
                        amount: 1,
                    },
                },
            }

            const entry = SquaddieTurnActionRecordService.createFromJSON(data)

            expect(entry.result.dispel?.dispelledConditions).toBeDefined()
            expect(
                entry.result.dispel?.dispelledConditions?.[
                    SquaddieConditionType.SLOWED
                ]
            ).toHaveLength(1)
        })

        it("throws error for invalid action data", () => {
            const data = {
                action: { id: undefined as any, name: "Attack" },
                result: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie1",
                } as SerializableSquaddieActionResult,
            }

            expect(() =>
                SquaddieTurnActionRecordService.createFromJSON(data)
            ).toThrow(
                "[ActionHistoryEntryService.createFromJSON]: action must have id and name"
            )
        })

        it("throws error for invalid result data", () => {
            const data = {
                action: { id: "action1", name: "Attack" },
                result: {} as SerializableSquaddieActionResult,
            }

            expect(() =>
                SquaddieTurnActionRecordService.createFromJSON(data)
            ).toThrow(
                "[ActionHistoryEntryService.createFromJSON]: result must have squaddie IDs"
            )
        })
    })

    describe("getters", () => {
        let entry: SquaddieTurnActionRecord

        beforeEach(() => {
            const action: SquaddieAction = {
                id: "action1",
                name: "Attack",
            } as SquaddieAction

            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie1",
                damage: {
                    type: AttributeScore.BODY,
                    net: 10,
                    raw: 12,
                    absorbed: 2,
                    willKo: false,
                },
            }

            entry = SquaddieTurnActionRecordService.new({ action, result })
        })

        it("getActionId returns action id", () => {
            expect(SquaddieTurnActionRecordService.getActionId(entry)).toBe(
                "action1"
            )
        })

        it("getActionName returns action name", () => {
            expect(SquaddieTurnActionRecordService.getActionName(entry)).toBe(
                "Attack"
            )
        })

        it("getResult returns cloned result", () => {
            const result = SquaddieTurnActionRecordService.getResult(entry)

            expect(result.inBattleSquaddieId).toBe(1)
            expect(result.damage?.net).toBe(10)
        })

        it("throws error when entry is undefined", () => {
            expect(() =>
                SquaddieTurnActionRecordService.getActionId(undefined as any)
            ).toThrow(
                "[ActionHistoryEntryService.getActionId]: entry must be defined"
            )
        })
    })

    describe("JSON round-trip", () => {
        it("serializes and deserializes complete entry", () => {
            const action: SquaddieAction = {
                id: "action1",
                name: "Complex Action",
            } as SquaddieAction

            const dispelledMap = new Map()
            dispelledMap.set(SquaddieConditionType.SLOWED, [
                {
                    type: SquaddieConditionType.SLOWED,
                    amount: undefined,
                    limit: { duration: 0 },
                },
            ])

            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie1",
                actionPoints: { spent: 3, restore: { net: 1, raw: 1 } },
                damage: {
                    net: 10,
                    raw: 12,
                    absorbed: 2,
                    willKo: false,
                    type: AttributeScore.BODY,
                },
                healing: { net: 5, raw: 5 },
                conditionsAdded: [
                    {
                        type: SquaddieConditionType.HUSTLE,
                        limit: { duration: 2 },
                        amount: undefined,
                    },
                ],
                dispel: {
                    dispelledConditions: dispelledMap,
                    conditionTypes: {
                        types: [SquaddieConditionType.SLOWED],
                    },
                    amount: 1,
                },
                movement: {
                    expectedPath: {
                        steps: [
                            { row: 0, col: 0, moveType: "START", moveCost: 0 },
                            { row: 1, col: 1, moveType: "WALK", moveCost: 1 },
                        ],
                    },
                },
            }

            const entry = SquaddieTurnActionRecordService.new({
                action,
                result,
            })

            const json = JSON.stringify(entry)
            const parsed = JSON.parse(json)
            const deserialized =
                SquaddieTurnActionRecordService.createFromJSON(parsed)

            expect(deserialized.action.id).toBe("action1")
            expect(deserialized.result.damage?.net).toBe(10)
            expect(deserialized.result.healing?.net).toBe(5)
            expect(deserialized.result.conditionsAdded).toHaveLength(1)
            expect(
                deserialized.result.dispel?.dispelledConditions?.[
                    SquaddieConditionType.SLOWED
                ]
            ).toHaveLength(1)
            expect(
                deserialized.result.movement?.expectedPath.steps
            ).toHaveLength(2)
        })
    })
})
