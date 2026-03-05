import { beforeEach, describe, expect, it } from "vitest"
import { SquaddieActionResultCalculator } from "./squaddieActionResultCalculator"
import type { SquaddieActionResult } from "./squaddieActionResult"
import {
    SquaddieConditionDecaysAt,
    SquaddieConditionService,
    SquaddieConditionSource,
    SquaddieConditionType,
} from "../../../proficiency/squaddieCondition"
import {
    CoordinateMovePathMoveType,
    CoordinateMovePathService,
} from "../../../coordinateMap/path/path"
import { ApplyResultService } from "../../apply/applyResultService"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection"
import type { OutOfBattleSquaddieManager } from "../../../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { AttributeScore } from "../../../proficiency/attributeScore"
import { SquaddieAffiliation } from "../../../affiliation/affiliation"
import { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../../../coordinateMap/coordinateMapCollection"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup"

describe("Reversing SquaddieActionResults", () => {
    describe("validation", () => {
        it("throws error if result has both damage and healing", () => {
            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                damage: {
                    net: 5,
                    raw: 5,
                    absorbed: 0,
                    willKo: false,
                    type: undefined,
                },
                healing: {
                    net: 3,
                    raw: 3,
                },
            }

            expect(() =>
                SquaddieActionResultCalculator.reverseResult(result)
            ).toThrow(
                "[SquaddieActionResultCalculator.reverseResult]: Result cannot have both damage and healing"
            )
        })

        it("throws error if result has multiple condition effects", () => {
            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                conditionsAdded: [
                    {
                        type: SquaddieConditionType.ARMOR,
                        amount: { current: 1, base: 1 },
                        limit: {
                            duration: {
                                duration: 3,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                        },
                    },
                ],
                dispel: {
                    conditionTypes: {
                        all: false,
                        types: [SquaddieConditionType.ELUSIVE],
                    },
                    amount: undefined,
                },
            }

            expect(() =>
                SquaddieActionResultCalculator.reverseResult(result)
            ).toThrow(
                "[SquaddieActionResultCalculator.reverseResult]: Result cannot have multiple condition effects"
            )
        })

        it("throws error if conditionsAdded contains both hindering and helpful conditions", () => {
            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                conditionsAdded: [
                    {
                        type: SquaddieConditionType.ARMOR,
                        amount: { current: 1, base: 1 },
                        limit: {
                            duration: {
                                duration: 3,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                        },
                    },
                    {
                        type: SquaddieConditionType.SLOWED,
                        amount: { current: 1, base: 1 },
                        limit: {
                            duration: {
                                duration: 2,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                        },
                    },
                ],
            }

            expect(() =>
                SquaddieActionResultCalculator.reverseResult(result)
            ).toThrow(
                "[SquaddieActionResultCalculator.reverseResult]: conditionsAdded cannot contain both hindering and helpful conditions"
            )
        })
    })

    describe("action points", () => {
        it("reverses spent action points to restoration", () => {
            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                actionPoints: {
                    spent: 2,
                },
            }

            const reversed =
                SquaddieActionResultCalculator.reverseResult(result)

            expect(reversed.actionPoints).toEqual({
                spent: 0,
                restore: {
                    net: 2,
                    raw: 2,
                },
            })
        })

        it("reverses restored action points to spending", () => {
            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                actionPoints: {
                    spent: 0,
                    restore: {
                        net: 3,
                        raw: 3,
                    },
                },
            }

            const reversed =
                SquaddieActionResultCalculator.reverseResult(result)

            expect(reversed.actionPoints).toEqual({
                spent: 3,
                restore: undefined,
            })
        })

        it("handles both spent and restored action points", () => {
            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                actionPoints: {
                    spent: 1,
                    restore: {
                        net: 2,
                        raw: 2,
                    },
                },
            }

            const reversed =
                SquaddieActionResultCalculator.reverseResult(result)

            expect(reversed.actionPoints).toEqual({
                spent: 2,
                restore: {
                    net: 1,
                    raw: 1,
                },
            })
        })
    })

    describe("damage and healing", () => {
        it("reverses damage to healing", () => {
            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                damage: {
                    net: 5,
                    raw: 7,
                    absorbed: 2,
                    willKo: false,
                    type: undefined,
                },
            }

            const reversed =
                SquaddieActionResultCalculator.reverseResult(result)

            expect(reversed.healing).toEqual({
                net: 5,
                raw: 5,
            })
            expect(reversed.damage).toBeUndefined()
        })

        it("reverses healing to damage", () => {
            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                healing: {
                    net: 4,
                    raw: 6,
                },
            }

            const reversed =
                SquaddieActionResultCalculator.reverseResult(result)

            expect(reversed.damage).toEqual({
                net: 4,
                raw: 4,
                absorbed: 0,
                willKo: false,
                type: undefined,
            })
            expect(reversed.healing).toBeUndefined()
        })
    })

    describe("conditions", () => {
        it("reverses hindering conditionsAdded to treat", () => {
            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                conditionsAdded: [
                    {
                        type: SquaddieConditionType.SLOWED,
                        amount: { current: 1, base: 1 },
                        limit: {
                            duration: {
                                duration: 2,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                        },
                    },
                ],
            }

            const reversed =
                SquaddieActionResultCalculator.reverseResult(result)

            expect(reversed.treat).toEqual({
                conditionTypes: {
                    types: [SquaddieConditionType.SLOWED],
                    all: false,
                },
                amount: 1,
            })
            expect(reversed.dispel).toBeUndefined()
            expect(reversed.conditionsAdded).toBeUndefined()
        })

        it("reverses helpful conditionsAdded to dispel", () => {
            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                conditionsAdded: [
                    {
                        type: SquaddieConditionType.ARMOR,
                        amount: { current: 2, base: 2 },
                        limit: {
                            duration: {
                                duration: 3,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                        },
                    },
                    {
                        type: SquaddieConditionType.ELUSIVE,
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

            const reversed =
                SquaddieActionResultCalculator.reverseResult(result)

            expect(reversed.dispel?.conditionTypes.types).toContain(
                SquaddieConditionType.ARMOR
            )
            expect(reversed.dispel?.conditionTypes.types).toContain(
                SquaddieConditionType.ELUSIVE
            )
            expect(reversed.dispel?.conditionTypes.all).toBe(false)
            expect(reversed.dispel?.amount).toBe(2)
            expect(reversed.treat).toBeUndefined()
            expect(reversed.conditionsAdded).toBeUndefined()
        })

        it("reverses dispelled conditions to conditionsAdded", () => {
            const dispelledConditionsMap = new Map()
            dispelledConditionsMap.set(SquaddieConditionType.ARMOR, [
                {
                    amount: { current: 2, base: 2 },
                    limit: {
                        duration: {
                            duration: 3,
                            decaysAt: SquaddieConditionDecaysAt.TURN_END,
                        },
                    },
                },
            ])

            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                dispel: {
                    dispelledConditions: dispelledConditionsMap,
                    conditionTypes: {
                        types: [SquaddieConditionType.ARMOR],
                        all: false,
                    },
                    amount: undefined,
                },
            }

            const reversed =
                SquaddieActionResultCalculator.reverseResult(result)

            expect(reversed.conditionsAdded).toHaveLength(1)
            expect(reversed.conditionsAdded?.[0]).toEqual({
                type: SquaddieConditionType.ARMOR,
                amount: { current: 2, base: 2 },
                limit: {
                    duration: {
                        duration: 3,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                },
            })
            expect(reversed.dispel).toBeUndefined()
        })

        it("reverses treated conditions to conditionsAdded", () => {
            const treatedConditionsMap = new Map()
            treatedConditionsMap.set(SquaddieConditionType.SLOWED, [
                {
                    amount: { current: 1, base: 1 },
                    limit: {
                        duration: {
                            duration: 2,
                            decaysAt: SquaddieConditionDecaysAt.TURN_END,
                        },
                    },
                },
            ])

            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                treat: {
                    treatedConditions: treatedConditionsMap,
                    conditionTypes: {
                        types: [SquaddieConditionType.SLOWED],
                        all: false,
                    },
                    amount: undefined,
                },
            }

            const reversed =
                SquaddieActionResultCalculator.reverseResult(result)

            expect(reversed.conditionsAdded).toHaveLength(1)
            expect(reversed.conditionsAdded?.[0]).toEqual({
                type: SquaddieConditionType.SLOWED,
                amount: { current: 1, base: 1 },
                limit: {
                    duration: {
                        duration: 2,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                },
            })
            expect(reversed.treat).toBeUndefined()
        })

        it("properly reconstructs multiple conditions from dispel map", () => {
            const dispelledConditionsMap = new Map()
            dispelledConditionsMap.set(SquaddieConditionType.ARMOR, [
                {
                    amount: { current: 2, base: 2 },
                    limit: {
                        duration: {
                            duration: 3,
                            decaysAt: SquaddieConditionDecaysAt.TURN_END,
                        },
                    },
                },
                {
                    amount: { current: 1, base: 1 },
                    limit: {
                        duration: {
                            duration: 2,
                            decaysAt: SquaddieConditionDecaysAt.TURN_END,
                        },
                    },
                },
            ])
            dispelledConditionsMap.set(SquaddieConditionType.ELUSIVE, [
                {
                    amount: undefined,
                    limit: {
                        duration: {
                            duration: 1,
                            decaysAt: SquaddieConditionDecaysAt.TURN_END,
                        },
                    },
                },
            ])

            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                dispel: {
                    dispelledConditions: dispelledConditionsMap,
                    conditionTypes: {
                        types: [
                            SquaddieConditionType.ARMOR,
                            SquaddieConditionType.ELUSIVE,
                        ],
                        all: false,
                    },
                    amount: undefined,
                },
            }

            const reversed =
                SquaddieActionResultCalculator.reverseResult(result)

            expect(reversed.conditionsAdded).toHaveLength(3)
            expect(reversed.conditionsAdded).toContainEqual({
                type: SquaddieConditionType.ARMOR,
                amount: { current: 2, base: 2 },
                limit: {
                    duration: {
                        duration: 3,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                },
            })
            expect(reversed.conditionsAdded).toContainEqual({
                type: SquaddieConditionType.ARMOR,
                amount: { current: 1, base: 1 },
                limit: {
                    duration: {
                        duration: 2,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                },
            })
            expect(reversed.conditionsAdded).toContainEqual({
                type: SquaddieConditionType.ELUSIVE,
                amount: undefined,
                limit: {
                    duration: {
                        duration: 1,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                },
            })
        })
    })

    describe("movement", () => {
        it("reverses simple movement path", () => {
            const originalPath = CoordinateMovePathService.new({
                steps: [
                    {
                        row: 2,
                        col: 3,
                        moveType: CoordinateMovePathMoveType.START,
                        moveCost: 0,
                    },
                    {
                        row: 5,
                        col: 7,
                        moveType: CoordinateMovePathMoveType.END,
                        moveCost: 3,
                    },
                ],
            })

            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                movement: {
                    expectedPath: originalPath,
                },
            }

            const reversed =
                SquaddieActionResultCalculator.reverseResult(result)

            const reversedPath = reversed.movement?.expectedPath
            expect(reversedPath).toBeDefined()

            const reversedStart = CoordinateMovePathService.getStartCoordinate(
                reversedPath!
            )
            const reversedEnd = CoordinateMovePathService.getEndCoordinate(
                reversedPath!
            )

            expect(reversedStart.row).toBe(5)
            expect(reversedStart.col).toBe(7)
            expect(reversedEnd.row).toBe(2)
            expect(reversedEnd.col).toBe(3)
        })

        it("reverses multi-step movement path", () => {
            const originalPath = CoordinateMovePathService.new({
                steps: [
                    {
                        row: 1,
                        col: 1,
                        moveType: CoordinateMovePathMoveType.START,
                        moveCost: 0,
                    },
                    {
                        row: 2,
                        col: 2,
                        moveType: CoordinateMovePathMoveType.WALK,
                        moveCost: 1,
                    },
                    {
                        row: 3,
                        col: 3,
                        moveType: CoordinateMovePathMoveType.WALK,
                        moveCost: 1,
                    },
                    {
                        row: 4,
                        col: 4,
                        moveType: CoordinateMovePathMoveType.END,
                        moveCost: 1,
                    },
                ],
            })

            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                movement: {
                    expectedPath: originalPath,
                },
            }

            const reversed =
                SquaddieActionResultCalculator.reverseResult(result)

            const reversedPath = reversed.movement?.expectedPath
            expect(reversedPath).toBeDefined()

            const reversedStart = CoordinateMovePathService.getStartCoordinate(
                reversedPath!
            )
            const reversedEnd = CoordinateMovePathService.getEndCoordinate(
                reversedPath!
            )

            expect(reversedStart.row).toBe(4)
            expect(reversedStart.col).toBe(4)

            expect(reversedEnd.row).toBe(1)
            expect(reversedEnd.col).toBe(1)
        })
    })

    describe("combined effects", () => {
        it("reverses result with damage and action points", () => {
            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                damage: {
                    net: 3,
                    raw: 3,
                    absorbed: 0,
                    willKo: false,
                    type: undefined,
                },
                actionPoints: {
                    spent: 2,
                },
            }

            const reversed =
                SquaddieActionResultCalculator.reverseResult(result)

            expect(reversed.healing).toEqual({
                net: 3,
                raw: 3,
            })
            expect(reversed.actionPoints).toEqual({
                spent: 0,
                restore: {
                    net: 2,
                    raw: 2,
                },
            })
        })

        it("reverses result with healing and helpful conditions", () => {
            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                healing: {
                    net: 5,
                    raw: 5,
                },
                conditionsAdded: [
                    {
                        type: SquaddieConditionType.ARMOR,
                        amount: { current: 1, base: 1 },
                        limit: {
                            duration: {
                                duration: 3,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                        },
                    },
                ],
            }

            const reversed =
                SquaddieActionResultCalculator.reverseResult(result)

            expect(reversed.damage).toEqual({
                net: 5,
                raw: 5,
                absorbed: 0,
                willKo: false,
                type: undefined,
            })
            expect(reversed.dispel?.conditionTypes.types).toContain(
                SquaddieConditionType.ARMOR
            )
        })

        it("reverses result with all valid effect types", () => {
            const originalPath = CoordinateMovePathService.new({
                steps: [
                    {
                        row: 2,
                        col: 3,
                        moveType: CoordinateMovePathMoveType.START,
                        moveCost: 0,
                    },
                    {
                        row: 5,
                        col: 7,
                        moveType: CoordinateMovePathMoveType.END,
                        moveCost: 3,
                    },
                ],
            })

            const result: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                damage: {
                    net: 3,
                    raw: 3,
                    absorbed: 0,
                    willKo: false,
                    type: undefined,
                },
                actionPoints: {
                    spent: 2,
                },
                conditionsAdded: [
                    {
                        type: SquaddieConditionType.SLOWED,
                        amount: { current: 1, base: 1 },
                        limit: {
                            duration: {
                                duration: 2,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                        },
                    },
                ],
                movement: {
                    expectedPath: originalPath,
                },
            }

            const reversed =
                SquaddieActionResultCalculator.reverseResult(result)

            expect(reversed.healing).toBeDefined()
            expect(reversed.actionPoints?.restore).toBeDefined()
            expect(reversed.treat?.conditionTypes.types).toContain(
                SquaddieConditionType.SLOWED
            )
            expect(reversed.movement).toBeDefined()

            const reversedPath = reversed.movement?.expectedPath
            const reversedStart = CoordinateMovePathService.getStartCoordinate(
                reversedPath!
            )
            const reversedEnd = CoordinateMovePathService.getEndCoordinate(
                reversedPath!
            )

            expect(reversedStart.row).toBe(5)
            expect(reversedStart.col).toBe(7)
            expect(reversedEnd.row).toBe(2)
            expect(reversedEnd.col).toBe(3)
        })
    })

    describe("idempotence", () => {
        it("reversing a reversed result returns equivalent to original", () => {
            const original: SquaddieActionResult = {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
                damage: {
                    net: 5,
                    raw: 5,
                    absorbed: 0,
                    willKo: false,
                    type: undefined,
                },
                actionPoints: {
                    spent: 2,
                },
            }

            const reversed =
                SquaddieActionResultCalculator.reverseResult(original)
            const doubleReversed =
                SquaddieActionResultCalculator.reverseResult(reversed)

            expect(doubleReversed.damage).toEqual(original.damage)
            expect(doubleReversed.actionPoints).toEqual(original.actionPoints)
            expect(doubleReversed.healing).toBeUndefined()
        })
    })

    describe("integration with ApplyResultService", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
        let mapManager: CoordinateMapCollectionManager
        let inBattleSquaddieId: number
        let outOfBattleSquaddieId: string

        beforeEach(() => {
            const outOfBattleSquaddieManagerResult =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "soldier",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            attributeScores: {
                                [AttributeScore.BODY]: 5,
                                [AttributeScore.MIND]: 7,
                                [AttributeScore.SOUL]: 3,
                            },
                            rank: 3,
                            distancePerAction: 3,
                        },
                    }
                )
            outOfBattleSquaddieManager =
                outOfBattleSquaddieManagerResult.manager

            outOfBattleSquaddieId = "soldier"
            const outOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: outOfBattleSquaddieId,
                name: "Soldier",
                actionIds: [],
                attributeSheetId: "soldier",
                affiliation: SquaddieAffiliation.PLAYER,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(outOfBattleSquaddie)

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )
            ;({ inBattleSquaddieId } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId,
                }))

            let mapCollection = CoordinateMapCollectionService.new()
            const map = CoordinateMapService.new({
                id: "test-map",
                name: "test-map",
                movementProperties: [
                    "1 1 1 1 1 1 1 1 1 1 ",
                    " 1 1 1 1 1 1 1 1 1 1 ",
                    "1 1 1 1 1 1 1 1 1 1 ",
                    " 1 1 1 1 1 1 1 1 1 1 ",
                    "1 1 1 1 1 1 1 1 1 1 ",
                    " 1 1 1 1 1 1 1 1 1 1 ",
                    "1 1 1 1 1 1 1 1 1 1 ",
                    " 1 1 1 1 1 1 1 1 1 1 ",
                    "1 1 1 1 1 1 1 1 1 1 ",
                    " 1 1 1 1 1 1 1 1 1 1 ",
                ],
            })
            mapCollection = CoordinateMapCollectionService.addOrUpdate({
                collection: mapCollection,
                map,
            })
            mapManager = new CoordinateMapCollectionManager(mapCollection)
            mapManager.addSquaddie({
                mapId: "test-map",
                squaddieId: {
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                },
                coordinate: { row: 2, col: 3 },
            })
        })

        it("applying original then reversed result returns squaddie to original state - action points", () => {
            const originalActionPoints =
                inBattleSquaddieManager.getActionPoints({
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                })

            const result: SquaddieActionResult = {
                inBattleSquaddieId,
                outOfBattleSquaddieId,
                actionPoints: {
                    spent: 2,
                },
            }

            ApplyResultService.applyResultsToSquaddies({
                inBattleSquaddieManager,
                results: [result],
            })

            const afterApply = inBattleSquaddieManager.getActionPoints({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            })
            expect(afterApply.current).toBe(originalActionPoints.current - 2)

            const reversed =
                SquaddieActionResultCalculator.reverseResult(result)
            ApplyResultService.applyResultsToSquaddies({
                inBattleSquaddieManager,
                results: [reversed],
            })

            const finalActionPoints = inBattleSquaddieManager.getActionPoints({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            })
            expect(finalActionPoints.current).toBe(originalActionPoints.current)
        })

        it("applying original then reversed result returns squaddie to original state - health", () => {
            const originalHealth = inBattleSquaddieManager.getHitPoints({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            }).current

            const result: SquaddieActionResult = {
                inBattleSquaddieId,
                outOfBattleSquaddieId,
                damage: {
                    net: 3,
                    raw: 3,
                    absorbed: 0,
                    willKo: false,
                    type: undefined,
                },
            }

            ApplyResultService.applyResultsToSquaddies({
                inBattleSquaddieManager,
                results: [result],
            })

            const afterApply = inBattleSquaddieManager.getHitPoints({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            }).current
            expect(afterApply).toBe(originalHealth - 3)

            const reversed =
                SquaddieActionResultCalculator.reverseResult(result)
            ApplyResultService.applyResultsToSquaddies({
                inBattleSquaddieManager,
                results: [reversed],
            })

            const finalHealth = inBattleSquaddieManager.getHitPoints({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            }).current
            expect(finalHealth).toBe(originalHealth)
        })

        it("applying original then reversed result returns squaddie to original state - conditions", () => {
            const originalConditions =
                inBattleSquaddieManager.getSquaddieConditions({
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                }) || []

            const result: SquaddieActionResult = {
                inBattleSquaddieId,
                outOfBattleSquaddieId,
                conditionsAdded: [
                    SquaddieConditionService.new({
                        type: SquaddieConditionType.ARMOR,
                        amount: 2,
                        duration: {
                            duration: 3,
                            decaysAt: SquaddieConditionDecaysAt.TURN_END,
                        },
                        source: SquaddieConditionSource.PHYSICAL,
                    }),
                ],
            }

            ApplyResultService.applyResultsToSquaddies({
                inBattleSquaddieManager,
                results: [result],
            })

            const afterApply =
                inBattleSquaddieManager.getSquaddieConditions({
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                }) || []
            expect(afterApply.size).toBe(originalConditions.size + 1)

            const reversed =
                SquaddieActionResultCalculator.reverseResult(result)
            ApplyResultService.applyResultsToSquaddies({
                inBattleSquaddieManager,
                results: [reversed],
            })

            const finalConditions =
                inBattleSquaddieManager.getSquaddieConditions({
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                }) || []
            expect(finalConditions.size).toBe(originalConditions.size)
        })

        it("applying original then reversed result returns squaddie to original state - position", () => {
            const originalPosition = mapManager.getSquaddieCoordinate({
                mapId: "test-map",
                squaddieId: {
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                },
            })

            const movementPath = CoordinateMovePathService.new({
                steps: [
                    {
                        row: 2,
                        col: 3,
                        moveType: CoordinateMovePathMoveType.START,
                        moveCost: 0,
                    },
                    {
                        row: 5,
                        col: 7,
                        moveType: CoordinateMovePathMoveType.END,
                        moveCost: 5,
                    },
                ],
            })

            const result: SquaddieActionResult = {
                inBattleSquaddieId,
                outOfBattleSquaddieId,
                movement: {
                    expectedPath: movementPath,
                },
            }

            ApplyResultService.applyResultsToSquaddies({
                inBattleSquaddieManager,
                results: [result],
                map: {
                    mapId: "test-map",
                    manager: mapManager,
                },
            })

            const afterApply = mapManager.getSquaddieCoordinate({
                mapId: "test-map",
                squaddieId: {
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                },
            })
            expect(afterApply!.row).toBe(5)
            expect(afterApply!.col).toBe(7)

            const reversed =
                SquaddieActionResultCalculator.reverseResult(result)
            ApplyResultService.applyResultsToSquaddies({
                inBattleSquaddieManager,
                results: [reversed],
                map: {
                    mapId: "test-map",
                    manager: mapManager,
                },
            })

            const finalPosition = mapManager.getSquaddieCoordinate({
                mapId: "test-map",
                squaddieId: {
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                },
            })
            expect(finalPosition!.row).toBe(originalPosition!.row)
            expect(finalPosition!.col).toBe(originalPosition!.col)
        })

        it("applying original then reversed result returns squaddie to original state - all effects", () => {
            const originalActionPoints =
                inBattleSquaddieManager.getActionPoints({
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                })
            const originalHealth = inBattleSquaddieManager.getHitPoints({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            }).current
            const originalConditions =
                inBattleSquaddieManager.getSquaddieConditions({
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                }) || []
            const originalPosition = mapManager.getSquaddieCoordinate({
                mapId: "test-map",
                squaddieId: {
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                },
            })

            const movementPath = CoordinateMovePathService.new({
                steps: [
                    {
                        row: 2,
                        col: 3,
                        moveType: CoordinateMovePathMoveType.START,
                        moveCost: 0,
                    },
                    {
                        row: 4,
                        col: 5,
                        moveType: CoordinateMovePathMoveType.END,
                        moveCost: 3,
                    },
                ],
            })

            const result: SquaddieActionResult = {
                inBattleSquaddieId,
                outOfBattleSquaddieId,
                damage: {
                    net: 3,
                    raw: 3,
                    absorbed: 0,
                    willKo: false,
                    type: undefined,
                },
                actionPoints: {
                    spent: 2,
                },
                conditionsAdded: [
                    SquaddieConditionService.new({
                        type: SquaddieConditionType.SLOWED,
                        amount: 1,
                        duration: {
                            duration: 2,
                            decaysAt: SquaddieConditionDecaysAt.TURN_END,
                        },
                        source: SquaddieConditionSource.PHYSICAL,
                    }),
                ],
                movement: {
                    expectedPath: movementPath,
                },
            }

            ApplyResultService.applyResultsToSquaddies({
                inBattleSquaddieManager,
                results: [result],
                map: {
                    mapId: "test-map",
                    manager: mapManager,
                },
            })

            const afterApplyAP = inBattleSquaddieManager.getActionPoints({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            })
            const afterApplyHealth = inBattleSquaddieManager.getHitPoints({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            }).current
            const afterApplyConditions =
                inBattleSquaddieManager.getSquaddieConditions({
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                }) || []
            const afterApplyPosition = mapManager.getSquaddieCoordinate({
                mapId: "test-map",
                squaddieId: {
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                },
            })

            expect(afterApplyAP.current).not.toBe(originalActionPoints.current)
            expect(afterApplyHealth).not.toBe(originalHealth)
            expect(afterApplyConditions.size).not.toBe(originalConditions.size)
            expect(afterApplyPosition!.row).not.toBe(originalPosition!.row)

            const reversed =
                SquaddieActionResultCalculator.reverseResult(result)

            ApplyResultService.applyResultsToSquaddies({
                inBattleSquaddieManager,
                results: [reversed],
                map: {
                    mapId: "test-map",
                    manager: mapManager,
                },
            })

            const finalActionPoints = inBattleSquaddieManager.getActionPoints({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            })
            const finalHealth = inBattleSquaddieManager.getHitPoints({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            }).current
            const finalConditions =
                inBattleSquaddieManager.getSquaddieConditions({
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                }) || []
            const finalPosition = mapManager.getSquaddieCoordinate({
                mapId: "test-map",
                squaddieId: {
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                },
            })

            expect(finalActionPoints.current).toBe(originalActionPoints.current)
            expect(finalHealth).toBe(originalHealth)
            expect(finalConditions.size).toBe(originalConditions.size)
            expect(finalPosition!.row).toBe(originalPosition!.row)
            expect(finalPosition!.col).toBe(originalPosition!.col)
        })
    })
})
