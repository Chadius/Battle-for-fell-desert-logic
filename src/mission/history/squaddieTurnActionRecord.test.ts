import { beforeEach, describe, expect, it } from "vitest"
import {
    type SquaddieTurnActionRecord,
    SquaddieTurnActionRecordService,
} from "./squaddieTurnActionRecord"
import {
    type SquaddieAction,
    SquaddieActionService,
} from "../../squaddieAction/squaddieAction"
import {
    type SerializedSquaddieActionResult,
    type SquaddieActionResult,
} from "../../squaddieAction/calculate/result/squaddieActionResult"
import { AttributeScore } from "../../proficiency/attributeScore"
import {
    SquaddieConditionDecaysAt,
    SquaddieConditionType,
} from "../../proficiency/squaddieCondition"
import { SquaddieAffiliation } from "../../affiliation/affiliation"
import { DegreeOfSuccess } from "../../degreesOfSuccess/degreeOfSuccess"
import { SquaddieIdConverterService } from "../../squaddie/idConverterService"
import { CoordinateMovePathService } from "../../coordinateMap/path/path"

describe("SquaddieTurnActionRecordService", () => {
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
                results: [result],
            })

            expect(entry.action.id).toBe("action1")
            expect(entry.action.name).toBe("Attack")
            expect(entry.results).toHaveLength(1)
            expect(entry.results[0].inBattleSquaddieId).toBe(1)
            expect(entry.results[0].outOfBattleSquaddieId).toBe("squaddie1")
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
                results: [result],
            })

            expect(entry.results[0].actionPoints).toEqual({
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
                results: [result],
            })

            expect(entry.results[0].damage).toEqual({
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
                results: [result],
            })

            expect(entry.results[0].healing).toEqual({ net: 5, raw: 5 })
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
                        limit: {
                            duration: {
                                duration: 2,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                        },
                    },
                ],
            }

            const entry = SquaddieTurnActionRecordService.new({
                action,
                results: [result],
            })

            expect(entry.results[0].conditionsAdded).toHaveLength(1)
            expect(entry.results[0].conditionsAdded?.[0].type).toBe(
                SquaddieConditionType.HUSTLE
            )
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
                results: [result],
            })

            expect(entry.results[0].movement?.expectedPath.steps).toHaveLength(
                2
            )
            expect(entry.results[0].movement?.expectedPath.steps[0]).toEqual({
                row: 0,
                col: 0,
                moveType: "START",
                moveCost: 0,
            })
            expect(
                entry.results[0].movement?.expectedPath.movementInstruction
            ).toHaveLength(1)
        })

        it("throws error if action has no id", () => {
            const action = { name: "Attack" } as SquaddieAction
            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie1",
            }

            expect(() =>
                SquaddieTurnActionRecordService.new({
                    action,
                    results: [result],
                })
            ).toThrow("[ActionHistoryEntryService.new]: action must have id")
        })

        it("throws error if action has no name", () => {
            const action = { id: "action1" } as SquaddieAction
            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie1",
            }

            expect(() =>
                SquaddieTurnActionRecordService.new({
                    action,
                    results: [result],
                })
            ).toThrow("[ActionHistoryEntryService.new]: action must have id")
        })

        it("throws error if result has no squaddie IDs", () => {
            const action: SquaddieAction = {
                id: "action1",
                name: "Attack",
            } as SquaddieAction
            const result = {} as SquaddieActionResult

            expect(() =>
                SquaddieTurnActionRecordService.new({
                    action,
                    results: [result],
                })
            ).toThrow(
                "[ActionHistoryEntryService.new]: result must have squaddie IDs"
            )
        })
    })

    describe("createFromJSON", () => {
        it("deserializes valid data", () => {
            const data = {
                action: { id: "action1", name: "Attack" },
                results: [
                    {
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
                ],
            }

            const entry = SquaddieTurnActionRecordService.createFromJSON(data)

            expect(entry.action.id).toBe("action1")
            expect(entry.action.name).toBe("Attack")
            expect(entry.results).toHaveLength(1)
            expect(entry.results[0].damage?.net).toBe(10)
        })

        it("deserializes dispel with plain object", () => {
            const data = {
                action: { id: "action1", name: "Dispel" },
                results: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "squaddie1",
                        dispel: {
                            dispelledConditions: {
                                [SquaddieConditionType.SLOWED]: [
                                    {
                                        type: SquaddieConditionType.SLOWED,
                                        amount: undefined,
                                        limit: {
                                            duration: {
                                                duration: 0,
                                                decaysAt:
                                                    SquaddieConditionDecaysAt.TURN_END,
                                            },
                                        },
                                    },
                                ],
                            },
                            conditionTypes: {
                                types: [SquaddieConditionType.SLOWED],
                            },
                            amount: 1,
                        },
                    },
                ],
            }

            const entry = SquaddieTurnActionRecordService.createFromJSON(data)

            expect(entry.results[0].dispel?.dispelledConditions).toBeDefined()
            expect(
                entry.results[0].dispel?.dispelledConditions?.get(
                    SquaddieConditionType.SLOWED
                )
            ).toHaveLength(1)
        })

        it("throws error for invalid action data", () => {
            const data = {
                action: { id: undefined as any, name: "Attack" },
                results: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "squaddie1",
                    } as SerializedSquaddieActionResult,
                ],
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
                results: [{} as SerializedSquaddieActionResult],
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

            entry = SquaddieTurnActionRecordService.new({
                action,
                results: [result],
            })
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

        it("getResults returns cloned results", () => {
            const results = SquaddieTurnActionRecordService.getResults(entry)

            expect(results).toHaveLength(1)
            expect(results[0].inBattleSquaddieId).toBe(1)
            expect(results[0].damage?.net).toBe(10)
        })

        it("throws error when entry is undefined", () => {
            expect(() =>
                SquaddieTurnActionRecordService.getActionId(undefined as any)
            ).toThrow(
                "[ActionHistoryEntryService.getActionId]: entry must be defined"
            )
        })
    })

    describe("isPlayerAllowedToUndo", () => {
        let onlySuccessAndCriticalDegreeAction: SquaddieAction
        let actionThatCouldFail: SquaddieAction
        beforeEach(() => {
            onlySuccessAndCriticalDegreeAction = SquaddieActionService.new({
                id: "can only succeed",
                name: "can only succeed",
                degreesOfSuccess: [
                    DegreeOfSuccess.CRITICAL,
                    DegreeOfSuccess.SUCCESS,
                ],
                effectOnActor: {
                    SUCCESS: {},
                },
            })

            actionThatCouldFail = SquaddieActionService.new({
                id: "can only succeed",
                name: "can only succeed",
                degreesOfSuccess: [
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.FAILURE,
                ],
                effectOnActor: {
                    SUCCESS: {},
                },
            })
        })

        it("returns true when only the actor is targeted with an action that can only succeed or critical", () => {
            const squaddieAffiliations = new Map([
                [
                    SquaddieIdConverterService.squaddieIdToKey({
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "actor",
                    }),
                    SquaddieAffiliation.PLAYER,
                ],
            ])
            const entry = SquaddieTurnActionRecordService.new({
                action: { id: "move", name: "Move" } as SquaddieAction,
                results: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "actor",
                        movement: {
                            expectedPath: CoordinateMovePathService.new({
                                steps: [
                                    {
                                        row: 0,
                                        col: 0,
                                        moveType: "START",
                                        moveCost: 0,
                                    },
                                    {
                                        row: 1,
                                        col: 0,
                                        moveType: "END",
                                        moveCost: 1,
                                    },
                                ],
                            }),
                        },
                    },
                ],
            })

            expect(
                SquaddieTurnActionRecordService.isPlayerAllowedToUndo({
                    squaddieTurnActionRecord: entry,
                    squaddieAffiliations,
                    squaddieAction: onlySuccessAndCriticalDegreeAction,
                })
            ).toBe(true)
        })

        it("returns false when a non-friend target is included", () => {
            const squaddieAffiliations = new Map([
                [
                    SquaddieIdConverterService.squaddieIdToKey({
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "actor",
                    }),
                    SquaddieAffiliation.PLAYER,
                ],
                [
                    SquaddieIdConverterService.squaddieIdToKey({
                        inBattleSquaddieId: 2,
                        outOfBattleSquaddieId: "enemy",
                    }),
                    SquaddieAffiliation.ENEMY,
                ],
            ])
            const entry = SquaddieTurnActionRecordService.new({
                action: { id: "attack", name: "Attack" } as SquaddieAction,
                results: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "actor",
                        actionPoints: { spent: 1 },
                    },
                    {
                        inBattleSquaddieId: 2,
                        outOfBattleSquaddieId: "enemy",
                        damage: {
                            net: 3,
                            raw: 3,
                            absorbed: 0,
                            willKo: false,
                            type: undefined,
                        },
                    },
                ],
            })

            expect(
                SquaddieTurnActionRecordService.isPlayerAllowedToUndo({
                    squaddieTurnActionRecord: entry,
                    squaddieAffiliations,
                    squaddieAction: onlySuccessAndCriticalDegreeAction,
                })
            ).toBe(false)
        })

        it("returns true when all targets are friends with a success or critical only action", () => {
            const squaddieAffiliations = new Map([
                [
                    SquaddieIdConverterService.squaddieIdToKey({
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "actor",
                    }),
                    SquaddieAffiliation.PLAYER,
                ],
                [
                    SquaddieIdConverterService.squaddieIdToKey({
                        inBattleSquaddieId: 2,
                        outOfBattleSquaddieId: "friend",
                    }),
                    SquaddieAffiliation.ALLY,
                ],
            ])
            const entry = SquaddieTurnActionRecordService.new({
                action: { id: "heal", name: "Heal" } as SquaddieAction,
                results: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "actor",
                        actionPoints: { spent: 1 },
                    },
                    {
                        inBattleSquaddieId: 2,
                        outOfBattleSquaddieId: "friend",
                        healing: { net: 3, raw: 3 },
                    },
                ],
            })

            expect(
                SquaddieTurnActionRecordService.isPlayerAllowedToUndo({
                    squaddieTurnActionRecord: entry,
                    squaddieAffiliations,
                    squaddieAction: onlySuccessAndCriticalDegreeAction,
                })
            ).toBe(true)
        })

        it("returns false when the action has results besides success or critical", () => {
            const squaddieAffiliations = new Map([
                [
                    SquaddieIdConverterService.squaddieIdToKey({
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "actor",
                    }),
                    SquaddieAffiliation.PLAYER,
                ],
            ])
            const entry = SquaddieTurnActionRecordService.new({
                action: { id: "move", name: "Move" } as SquaddieAction,
                results: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "actor",
                        movement: {
                            expectedPath: {
                                steps: [
                                    {
                                        row: 0,
                                        col: 0,
                                        moveType: "START",
                                        moveCost: 0,
                                    },
                                    {
                                        row: 1,
                                        col: 0,
                                        moveType: "END",
                                        moveCost: 1,
                                    },
                                ],
                            },
                        },
                    },
                ],
            })

            expect(
                SquaddieTurnActionRecordService.isPlayerAllowedToUndo({
                    squaddieTurnActionRecord: entry,
                    squaddieAffiliations,
                    squaddieAction: actionThatCouldFail,
                })
            ).toBe(false)
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
                    amount: { current: 1, base: 1 },
                    limit: {
                        duration: {
                            duration: 0,
                            decaysAt: SquaddieConditionDecaysAt.TURN_END,
                        },
                    },
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
                        limit: {
                            duration: {
                                duration: 2,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                        },
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
                results: [result],
            })

            const serialized = SquaddieTurnActionRecordService.serialize(entry)
            const json = JSON.stringify(serialized)
            const parsed = JSON.parse(json)
            const deserialized =
                SquaddieTurnActionRecordService.createFromJSON(parsed)

            expect(deserialized.action.id).toBe("action1")
            expect(deserialized.results).toHaveLength(1)
            expect(deserialized.results[0].damage?.net).toBe(10)
            expect(deserialized.results[0].healing?.net).toBe(5)
            expect(deserialized.results[0].conditionsAdded).toHaveLength(1)
            expect(
                deserialized.results[0].dispel?.dispelledConditions?.get(
                    SquaddieConditionType.SLOWED
                )
            ).toHaveLength(1)
            expect(
                deserialized.results[0].movement?.expectedPath.steps
            ).toHaveLength(2)
        })
    })
})
