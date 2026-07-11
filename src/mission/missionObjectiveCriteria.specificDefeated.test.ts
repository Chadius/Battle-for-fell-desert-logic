import { describe, expect, it } from "vitest"
import {
    MissionObjectiveCriteriaService,
    MissionObjectiveCriteriaType,
} from "./missionObjectiveCriteria.js"
import { SquaddieIdConverterService } from "../squaddie/idConverterService.js"
import type { ActionResult } from "./actionResult.js"
import type { SquaddieActionResult } from "../squaddieAction/calculate/result/squaddieActionResult.js"
import { DegreeOfSuccess } from "../degreesOfSuccess/degreeOfSuccess.js"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../squaddie/inBattle/inBattleSquaddieCollection.js"
import { OutOfBattleSquaddieTestSetup } from "../testUtils/outOfBattleSquaddieTestSetup.js"

const buildManager = () => {
    const { manager: outOfBattleManager } =
        OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
            sheetId: "sheet",
            attributeSheetOptions: {
                maxHitPoints: 10,
                distancePerAction: 2,
                items: { maxCapacity: 0 },
            },
        })
    return new InBattleSquaddieManager(
        InBattleSquaddieCollectionService.new(),
        outOfBattleManager
    )
}

describe("SpecificSquaddiesDefeatedCriteria", () => {
    describe("creation", () => {
        it("creates criteria with only outOfBattleSquaddieIds", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                    { outOfBattleSquaddieIds: ["goblin"] }
                )

            expect(criteria.type).toBe(
                MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_DEFEATED
            )
            expect(criteria.outOfBattleSquaddieIds?.size).toBe(1)
            expect(criteria.battleSquaddieIds).toBeUndefined()
        })

        it("creates criteria with only battleSquaddieIds", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                    {
                        battleSquaddieIds: [
                            {
                                inBattleSquaddieId: 5,
                                outOfBattleSquaddieId: "goblin",
                            },
                        ],
                    }
                )

            expect(criteria.type).toBe(
                MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_DEFEATED
            )
            expect(criteria.battleSquaddieIds?.size).toBe(1)
            expect(criteria.outOfBattleSquaddieIds).toBeUndefined()
        })

        it("creates criteria with both fields", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                    {
                        battleSquaddieIds: [
                            {
                                inBattleSquaddieId: 5,
                                outOfBattleSquaddieId: "goblin",
                            },
                        ],
                        outOfBattleSquaddieIds: ["boss"],
                    }
                )

            expect(criteria.battleSquaddieIds?.size).toBe(1)
            expect(criteria.outOfBattleSquaddieIds?.size).toBe(1)
        })

        it("throws when no filters provided", () => {
            expect(() => {
                MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                    {}
                )
            }).toThrow(
                "[MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria]"
            )
        })

        it("throws when battleSquaddieIds is empty", () => {
            expect(() => {
                MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                    { battleSquaddieIds: [] }
                )
            }).toThrow()
        })

        it("throws when outOfBattleSquaddieIds is empty", () => {
            expect(() => {
                MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                    { outOfBattleSquaddieIds: [] }
                )
            }).toThrow()
        })

        it("stores battleSquaddieIds as key strings", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                    {
                        battleSquaddieIds: [
                            {
                                inBattleSquaddieId: 7,
                                outOfBattleSquaddieId: "boss",
                            },
                        ],
                    }
                )

            const expectedKey = SquaddieIdConverterService.squaddieIdToKey({
                inBattleSquaddieId: 7,
                outOfBattleSquaddieId: "boss",
            })
            expect(criteria.battleSquaddieIds?.has(expectedKey)).toBe(true)
        })
    })

    describe("validation for level editors", () => {
        it("returns valid when outOfBattleSquaddieIds is provided", () => {
            const result =
                MissionObjectiveCriteriaService.validateSpecificSquaddiesDefeatedCriteriaInput(
                    { outOfBattleSquaddieIds: ["goblin"] }
                )

            expect(result.isValid).toBe(true)
            expect(result.reason).toBeUndefined()
        })

        it("returns valid when battleSquaddieIds is provided", () => {
            const result =
                MissionObjectiveCriteriaService.validateSpecificSquaddiesDefeatedCriteriaInput(
                    {
                        battleSquaddieIds: [
                            {
                                inBattleSquaddieId: 0,
                                outOfBattleSquaddieId: "goblin",
                            },
                        ],
                    }
                )

            expect(result.isValid).toBe(true)
        })

        it("returns invalid with reason when no filters provided", () => {
            const result =
                MissionObjectiveCriteriaService.validateSpecificSquaddiesDefeatedCriteriaInput(
                    {}
                )

            expect(result.isValid).toBe(false)
            expect(result.reason).toBeTruthy()
        })

        it("returns invalid when both arrays are empty", () => {
            const result =
                MissionObjectiveCriteriaService.validateSpecificSquaddiesDefeatedCriteriaInput(
                    { battleSquaddieIds: [], outOfBattleSquaddieIds: [] }
                )

            expect(result.isValid).toBe(false)
            expect(result.reason).toBeTruthy()
        })
    })

    describe("serialization", () => {
        it("serializes and deserializes criteria with outOfBattleSquaddieIds", () => {
            const original =
                MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                    { outOfBattleSquaddieIds: ["boss"] }
                )

            const serialized =
                MissionObjectiveCriteriaService.serialize(original)
            expect(serialized.type).toBe(
                MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_DEFEATED
            )

            const restored =
                MissionObjectiveCriteriaService.createFromJSON(serialized)
            expect(restored.type).toBe(
                MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_DEFEATED
            )
            if (
                restored.type ===
                MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_DEFEATED
            ) {
                expect(restored.outOfBattleSquaddieIds?.has("boss")).toBe(true)
            }
        })

        it("serializes and deserializes criteria with battleSquaddieIds", () => {
            const original =
                MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                    {
                        battleSquaddieIds: [
                            {
                                inBattleSquaddieId: 3,
                                outOfBattleSquaddieId: "boss",
                            },
                        ],
                    }
                )

            const serialized =
                MissionObjectiveCriteriaService.serialize(original)
            const restored =
                MissionObjectiveCriteriaService.createFromJSON(serialized)

            if (
                restored.type ===
                MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_DEFEATED
            ) {
                const expectedKey = SquaddieIdConverterService.squaddieIdToKey({
                    inBattleSquaddieId: 3,
                    outOfBattleSquaddieId: "boss",
                })
                expect(restored.battleSquaddieIds?.has(expectedKey)).toBe(true)
            }
        })
    })

    describe("isSatisfied", () => {
        const manager = buildManager()

        const actorSquaddieKey = SquaddieIdConverterService.squaddieIdToKey({
            inBattleSquaddieId: 0,
            outOfBattleSquaddieId: "attacker",
        })
        const targetKey = SquaddieIdConverterService.squaddieIdToKey({
            inBattleSquaddieId: 1,
            outOfBattleSquaddieId: "goblin",
        })

        const makeActionResult = (
            squaddieActionResults: SquaddieActionResult[]
        ): ActionResult => ({
            actorSquaddieKey: actorSquaddieKey,
            targetResults: {
                [targetKey]: {
                    degreeOfSuccess: DegreeOfSuccess.CRITICAL,
                    squaddieActionResults,
                },
            },
        })

        it("returns false when no actionResult provided", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                    { outOfBattleSquaddieIds: ["goblin"] }
                )

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager)
            ).toBe(false)
        })

        it("returns false when actionResult has no KO", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                    { outOfBattleSquaddieIds: ["goblin"] }
                )

            const actionResult = makeActionResult([
                {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "goblin",
                    actionPoints: { spent: 1 },
                },
            ])

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager, {
                    actionResult,
                })
            ).toBe(false)
        })

        it("returns true when the matching squaddie is killed", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                    { outOfBattleSquaddieIds: ["goblin"] }
                )

            const actionResult = makeActionResult([
                {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "goblin",
                    damage: {
                        net: 10,
                        raw: 10,
                        absorbed: 0,
                        willKo: true,
                        type: undefined,
                    },
                },
            ])

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager, {
                    actionResult,
                })
            ).toBe(true)
        })

        it("returns false when the matching squaddie is injured but survives", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                    { outOfBattleSquaddieIds: ["goblin"] }
                )

            const actionResult = makeActionResult([
                {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "goblin",
                    damage: {
                        net: 3,
                        raw: 3,
                        absorbed: 0,
                        willKo: false,
                        type: undefined,
                    },
                },
            ])

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager, {
                    actionResult,
                })
            ).toBe(false)
        })

        it("does not count the actor as defeated even if they appear in results", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                    { outOfBattleSquaddieIds: ["attacker"] }
                )

            const actionResult: ActionResult = {
                actorSquaddieKey: actorSquaddieKey,
                targetResults: {
                    [actorSquaddieKey]: {
                        degreeOfSuccess: DegreeOfSuccess.CRITICAL,
                        squaddieActionResults: [
                            {
                                inBattleSquaddieId: 0,
                                outOfBattleSquaddieId: "attacker",
                                damage: {
                                    net: 10,
                                    raw: 10,
                                    absorbed: 0,
                                    willKo: true,
                                    type: undefined,
                                },
                            },
                        ],
                    },
                },
            }

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager, {
                    actionResult,
                })
            ).toBe(false)
        })

        it("matches by specific battleSquaddieId key", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                    {
                        battleSquaddieIds: [
                            {
                                inBattleSquaddieId: 1,
                                outOfBattleSquaddieId: "goblin",
                            },
                        ],
                    }
                )

            const actionResult = makeActionResult([
                {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "goblin",
                    damage: {
                        net: 10,
                        raw: 10,
                        absorbed: 0,
                        willKo: true,
                        type: undefined,
                    },
                },
            ])

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager, {
                    actionResult,
                })
            ).toBe(true)
        })

        it("does not fire for wrong battleSquaddieId even if same outOfBattleId", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                    {
                        battleSquaddieIds: [
                            {
                                inBattleSquaddieId: 99,
                                outOfBattleSquaddieId: "goblin",
                            },
                        ],
                    }
                )

            const actionResult = makeActionResult([
                {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "goblin",
                    damage: {
                        net: 10,
                        raw: 10,
                        absorbed: 0,
                        willKo: true,
                        type: undefined,
                    },
                },
            ])

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager, {
                    actionResult,
                })
            ).toBe(false)
        })

        it("returns false when outOfBattleSquaddieId does not match", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                    { outOfBattleSquaddieIds: ["boss"] }
                )

            const actionResult = makeActionResult([
                {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "goblin",
                    damage: {
                        net: 10,
                        raw: 10,
                        absorbed: 0,
                        willKo: true,
                        type: undefined,
                    },
                },
            ])

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager, {
                    actionResult,
                })
            ).toBe(false)
        })

        it("fires when any one of multiple targets is KO'd and matches", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                    { outOfBattleSquaddieIds: ["goblin"] }
                )

            const survivorKey = SquaddieIdConverterService.squaddieIdToKey({
                inBattleSquaddieId: 2,
                outOfBattleSquaddieId: "survivor",
            })

            const actionResult: ActionResult = {
                actorSquaddieKey: actorSquaddieKey,
                targetResults: {
                    [targetKey]: {
                        degreeOfSuccess: DegreeOfSuccess.CRITICAL,
                        squaddieActionResults: [
                            {
                                inBattleSquaddieId: 1,
                                outOfBattleSquaddieId: "goblin",
                                damage: {
                                    net: 10,
                                    raw: 10,
                                    absorbed: 0,
                                    willKo: true,
                                    type: undefined,
                                },
                            },
                        ],
                    },
                    [survivorKey]: {
                        degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                        squaddieActionResults: [
                            {
                                inBattleSquaddieId: 2,
                                outOfBattleSquaddieId: "survivor",
                                damage: {
                                    net: 1,
                                    raw: 1,
                                    absorbed: 0,
                                    willKo: false,
                                    type: undefined,
                                },
                            },
                        ],
                    },
                },
            }

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager, {
                    actionResult,
                })
            ).toBe(true)
        })
    })
})
