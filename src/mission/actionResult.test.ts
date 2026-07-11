import { describe, expect, it } from "vitest"
import {
    type ActionResult,
    ActionResultsService,
    type SerializedActionResults,
} from "./actionResult.js"
import { DegreeOfSuccess } from "../degreesOfSuccess/degreeOfSuccess.js"

describe("ActionResultService", () => {
    describe("serialize", () => {
        it("serializes ActionResults with multiple targets", () => {
            const actionResults: ActionResult = {
                actorRoll: [4, 5],
                targetResults: {
                    "target-1": {
                        degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                        squaddieActionResults: [
                            {
                                inBattleSquaddieId: 1,
                                outOfBattleSquaddieId: "target-1",
                                damage: {
                                    net: 6,
                                    raw: 6,
                                    absorbed: 0,
                                    willKo: false,
                                    type: undefined,
                                },
                            },
                        ],
                    },
                    "target-2": {
                        degreeOfSuccess: DegreeOfSuccess.CRITICAL,
                        squaddieActionResults: [
                            {
                                inBattleSquaddieId: 2,
                                outOfBattleSquaddieId: "target-2",
                                damage: {
                                    net: 12,
                                    raw: 12,
                                    absorbed: 0,
                                    willKo: true,
                                    type: undefined,
                                },
                            },
                        ],
                    },
                },
            }

            const serialized = ActionResultsService.serialize(actionResults)

            expect(serialized.actorRoll).toEqual([4, 5])
            expect(Object.keys(serialized.targetResults)).toHaveLength(2)
            expect(serialized.targetResults["target-1"].degreeOfSuccess).toBe(
                DegreeOfSuccess.SUCCESS
            )
            expect(serialized.targetResults["target-2"].degreeOfSuccess).toBe(
                DegreeOfSuccess.CRITICAL
            )
        })

        it("serializes ActionResults with empty targetResults", () => {
            const actionResults: ActionResult = {
                actorRoll: [1, 1],
                targetResults: {},
            }

            const serialized = ActionResultsService.serialize(actionResults)

            expect(serialized.actorRoll).toEqual([1, 1])
            expect(Object.keys(serialized.targetResults)).toHaveLength(0)
        })
    })

    describe("deserialize", () => {
        it("deserializes SerializedActionResults", () => {
            const serializable: SerializedActionResults = {
                actorRoll: [3, 3],
                targetResults: {
                    "enemy-1": {
                        degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                        squaddieActionResults: [
                            {
                                inBattleSquaddieId: 5,
                                outOfBattleSquaddieId: "enemy-1",
                                damage: {
                                    net: 4,
                                    raw: 4,
                                    absorbed: 0,
                                    willKo: false,
                                    type: undefined,
                                },
                            },
                        ],
                    },
                },
            }

            const deserialized = ActionResultsService.deserialize(serializable)

            expect(deserialized.actorRoll).toEqual([3, 3])
            expect(deserialized.targetResults["enemy-1"]).toBeDefined()
            expect(
                deserialized.targetResults["enemy-1"].squaddieActionResults[0]
                    .damage?.net
            ).toBe(4)
        })
    })

    describe("round-trip", () => {
        it("preserves data through serialize and deserialize", () => {
            const original: ActionResult = {
                actorRoll: [6, 5],
                targetResults: {
                    "target-a": {
                        degreeOfSuccess: DegreeOfSuccess.CRITICAL,
                        squaddieActionResults: [
                            {
                                inBattleSquaddieId: 1,
                                outOfBattleSquaddieId: "target-a",
                                damage: {
                                    net: 15,
                                    raw: 15,
                                    absorbed: 0,
                                    willKo: true,
                                    type: undefined,
                                },
                            },
                        ],
                    },
                    "target-b": {
                        degreeOfSuccess: DegreeOfSuccess.FAILURE,
                        squaddieActionResults: [
                            {
                                inBattleSquaddieId: 2,
                                outOfBattleSquaddieId: "target-b",
                            },
                        ],
                    },
                },
            }

            const serialized = ActionResultsService.serialize(original)
            const deserialized = ActionResultsService.deserialize(serialized)

            expect(deserialized.actorRoll).toEqual(original.actorRoll)
            expect(Object.keys(deserialized.targetResults)).toEqual(
                Object.keys(original.targetResults)
            )
            expect(deserialized.targetResults["target-a"].degreeOfSuccess).toBe(
                DegreeOfSuccess.CRITICAL
            )
            expect(deserialized.targetResults["target-b"].degreeOfSuccess).toBe(
                DegreeOfSuccess.FAILURE
            )
        })

        it("can be serialized to JSON and back", () => {
            const original: ActionResult = {
                actorRoll: [2, 4],
                targetResults: {
                    "enemy-1": {
                        degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                        squaddieActionResults: [
                            {
                                inBattleSquaddieId: 1,
                                outOfBattleSquaddieId: "enemy-1",
                                damage: {
                                    net: 5,
                                    raw: 5,
                                    absorbed: 0,
                                    willKo: false,
                                    type: undefined,
                                },
                            },
                        ],
                    },
                },
            }

            const serialized = ActionResultsService.serialize(original)
            const jsonString = JSON.stringify(serialized)
            const parsed = JSON.parse(jsonString) as SerializedActionResults
            const deserialized = ActionResultsService.deserialize(parsed)

            expect(deserialized.actorRoll).toEqual(original.actorRoll)
            expect(
                deserialized.targetResults["enemy-1"].squaddieActionResults[0]
                    .damage?.net
            ).toBe(5)
        })
    })
})
