import { describe, expect, it } from "vitest"
import {
    MissionObjectiveCriteriaService,
    MissionObjectiveCriteriaType,
} from "./missionObjectiveCriteria"
import { SquaddieIdConverterService } from "../squaddie/idConverterService"
import type { ActionResult } from "./actionResult"
import type { SquaddieActionResult } from "../squaddieAction/calculate/result/squaddieActionResult"
import { DegreeOfSuccess } from "../degreesOfSuccess/degreeOfSuccess"
import {
    SquaddieConditionDecaysAt,
    SquaddieConditionSource,
    SquaddieConditionType,
} from "../proficiency/squaddieCondition"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../squaddie/inBattle/inBattleSquaddieCollection"
import { OutOfBattleSquaddieTestSetup } from "../testUtils/outOfBattleSquaddieTestSetup"
import { SquaddieAffiliation } from "../affiliation/affiliation"
import { OutOfBattleSquaddieService } from "../squaddie/outOfBattle/outOfBattleSquaddie"

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

describe("SpecificSquaddiesInjuredCriteria", () => {
    describe("creation", () => {
        it("creates criteria with only battleSquaddieIds", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria(
                    {
                        battleSquaddieIds: [
                            {
                                inBattleSquaddieId: 1,
                                outOfBattleSquaddieId: "lini",
                            },
                        ],
                    }
                )

            expect(criteria.type).toBe(
                MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_INJURED
            )
            expect(criteria.battleSquaddieIds?.size).toBe(1)
            expect(criteria.outOfBattleSquaddieIds).toBeUndefined()
        })

        it("creates criteria with only outOfBattleSquaddieIds", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria(
                    {
                        outOfBattleSquaddieIds: ["lini", "goblin"],
                    }
                )

            expect(criteria.type).toBe(
                MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_INJURED
            )
            expect(criteria.outOfBattleSquaddieIds?.size).toBe(2)
            expect(criteria.battleSquaddieIds).toBeUndefined()
        })

        it("creates criteria with both fields", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria(
                    {
                        battleSquaddieIds: [
                            {
                                inBattleSquaddieId: 0,
                                outOfBattleSquaddieId: "lini",
                            },
                        ],
                        outOfBattleSquaddieIds: ["goblin"],
                    }
                )

            expect(criteria.battleSquaddieIds?.size).toBe(1)
            expect(criteria.outOfBattleSquaddieIds?.size).toBe(1)
        })

        it("throws when no filters provided", () => {
            expect(() => {
                MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria(
                    {}
                )
            }).toThrow(
                "[MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria]"
            )
        })

        it("throws when battleSquaddieIds is empty", () => {
            expect(() => {
                MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria(
                    {
                        battleSquaddieIds: [],
                    }
                )
            }).toThrow()
        })

        it("throws when outOfBattleSquaddieIds is empty", () => {
            expect(() => {
                MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria(
                    {
                        outOfBattleSquaddieIds: [],
                    }
                )
            }).toThrow()
        })

        it("stores battleSquaddieIds as key strings", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria(
                    {
                        battleSquaddieIds: [
                            {
                                inBattleSquaddieId: 3,
                                outOfBattleSquaddieId: "lini",
                            },
                        ],
                    }
                )

            const expectedKey = SquaddieIdConverterService.squaddieIdToKey({
                inBattleSquaddieId: 3,
                outOfBattleSquaddieId: "lini",
            })
            expect(criteria.battleSquaddieIds?.has(expectedKey)).toBe(true)
        })
    })

    describe("validation for level editors", () => {
        it("returns valid when battleSquaddieIds is provided", () => {
            const result =
                MissionObjectiveCriteriaService.validateSpecificSquaddiesInjuredCriteriaInput(
                    {
                        battleSquaddieIds: [
                            {
                                inBattleSquaddieId: 0,
                                outOfBattleSquaddieId: "lini",
                            },
                        ],
                    }
                )

            expect(result.isValid).toBe(true)
            expect(result.reason).toBeUndefined()
        })

        it("returns valid when outOfBattleSquaddieIds is provided", () => {
            const result =
                MissionObjectiveCriteriaService.validateSpecificSquaddiesInjuredCriteriaInput(
                    { outOfBattleSquaddieIds: ["lini"] }
                )

            expect(result.isValid).toBe(true)
        })

        it("returns invalid with reason when no filters provided", () => {
            const result =
                MissionObjectiveCriteriaService.validateSpecificSquaddiesInjuredCriteriaInput(
                    {}
                )

            expect(result.isValid).toBe(false)
            expect(result.reason).toBeTruthy()
        })

        it("returns invalid when both arrays are empty", () => {
            const result =
                MissionObjectiveCriteriaService.validateSpecificSquaddiesInjuredCriteriaInput(
                    {
                        battleSquaddieIds: [],
                        outOfBattleSquaddieIds: [],
                    }
                )

            expect(result.isValid).toBe(false)
            expect(result.reason).toBeTruthy()
        })
    })

    describe("serialization", () => {
        it("serializes and deserializes criteria with outOfBattleSquaddieIds", () => {
            const original =
                MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria(
                    {
                        outOfBattleSquaddieIds: ["lini"],
                    }
                )

            const serialized =
                MissionObjectiveCriteriaService.serialize(original)
            expect(serialized.type).toBe(
                MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_INJURED
            )

            const restored =
                MissionObjectiveCriteriaService.createFromJSON(serialized)
            expect(restored.type).toBe(
                MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_INJURED
            )
            if (
                restored.type ===
                MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_INJURED
            ) {
                expect(restored.outOfBattleSquaddieIds?.has("lini")).toBe(true)
            }
        })

        it("serializes and deserializes criteria with battleSquaddieIds", () => {
            const original =
                MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria(
                    {
                        battleSquaddieIds: [
                            {
                                inBattleSquaddieId: 2,
                                outOfBattleSquaddieId: "lini",
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
                MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_INJURED
            ) {
                const expectedKey = SquaddieIdConverterService.squaddieIdToKey({
                    inBattleSquaddieId: 2,
                    outOfBattleSquaddieId: "lini",
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
            outOfBattleSquaddieId: "lini",
        })

        const makeActionResult = (
            squaddieActionResults: SquaddieActionResult[]
        ): ActionResult => ({
            actorSquaddieKey: actorSquaddieKey,
            targetResults: {
                [targetKey]: {
                    degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    squaddieActionResults,
                },
            },
        })

        it("returns false when no actionResult provided", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria(
                    {
                        outOfBattleSquaddieIds: ["lini"],
                    }
                )

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager)
            ).toBe(false)
        })

        it("returns false when actionResult has no matching injury", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria(
                    {
                        outOfBattleSquaddieIds: ["lini"],
                    }
                )

            const actionResult = makeActionResult([
                {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "lini",
                    actionPoints: { spent: 1 },
                },
            ])

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager, {
                    actionResult,
                })
            ).toBe(false)
        })

        it("returns true when matching squaddie takes HP damage but is not killed", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria(
                    {
                        outOfBattleSquaddieIds: ["lini"],
                    }
                )

            const actionResult = makeActionResult([
                {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "lini",
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
            ).toBe(true)
        })

        it("returns false when matching squaddie is killed", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria(
                    {
                        outOfBattleSquaddieIds: ["lini"],
                    }
                )

            const actionResult = makeActionResult([
                {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "lini",
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

        it("returns true when matching squaddie receives a hurtful condition", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria(
                    {
                        outOfBattleSquaddieIds: ["lini"],
                    }
                )

            const actionResult = makeActionResult([
                {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "lini",
                    conditionsAdded: [
                        {
                            type: SquaddieConditionType.SLOWED,
                            source: SquaddieConditionSource.PHYSICAL,
                            amount: {
                                current: 1,
                                base: 1,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                            limit: {
                                duration: {
                                    duration: 2,
                                    decaysAt:
                                        SquaddieConditionDecaysAt.TURN_END,
                                },
                            },
                        },
                    ],
                },
            ])

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager, {
                    actionResult,
                })
            ).toBe(true)
        })

        it("does not count the actor as injured even if they appear in results", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria(
                    {
                        outOfBattleSquaddieIds: ["attacker"],
                    }
                )

            const actionResult: ActionResult = {
                actorSquaddieKey: actorSquaddieKey,
                targetResults: {
                    [actorSquaddieKey]: {
                        degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                        squaddieActionResults: [
                            {
                                inBattleSquaddieId: 0,
                                outOfBattleSquaddieId: "attacker",
                                damage: {
                                    net: 2,
                                    raw: 2,
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
            ).toBe(false)
        })

        it("matches by specific battleSquaddieId key", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria(
                    {
                        battleSquaddieIds: [
                            {
                                inBattleSquaddieId: 1,
                                outOfBattleSquaddieId: "lini",
                            },
                        ],
                    }
                )

            const actionResult = makeActionResult([
                {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "lini",
                    damage: {
                        net: 2,
                        raw: 2,
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
            ).toBe(true)
        })

        it("does not fire for a different battleSquaddieId even if same outOfBattleSquaddieId", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria(
                    {
                        battleSquaddieIds: [
                            {
                                inBattleSquaddieId: 99,
                                outOfBattleSquaddieId: "lini",
                            },
                        ],
                    }
                )

            const actionResult = makeActionResult([
                {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "lini",
                    damage: {
                        net: 2,
                        raw: 2,
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

        it("helpful conditions like ARMOR do not count as hurtful", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria(
                    {
                        outOfBattleSquaddieIds: ["lini"],
                    }
                )

            const actionResult = makeActionResult([
                {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "lini",
                    conditionsAdded: [
                        {
                            type: SquaddieConditionType.ARMOR,
                            source: SquaddieConditionSource.PHYSICAL,
                            amount: {
                                current: 2,
                                base: 2,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                            limit: {
                                duration: {
                                    duration: 2,
                                    decaysAt:
                                        SquaddieConditionDecaysAt.TURN_END,
                                },
                            },
                        },
                    ],
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
                MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria(
                    {
                        outOfBattleSquaddieIds: ["goblin"],
                    }
                )

            const actionResult = makeActionResult([
                {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "lini",
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

        it("fires when any one of multiple targets is injured and matches", () => {
            const criteria =
                MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria(
                    {
                        outOfBattleSquaddieIds: ["lini"],
                    }
                )

            const goblinKey = SquaddieIdConverterService.squaddieIdToKey({
                inBattleSquaddieId: 2,
                outOfBattleSquaddieId: "goblin",
            })

            const actionResult: ActionResult = {
                actorSquaddieKey: actorSquaddieKey,
                targetResults: {
                    [targetKey]: {
                        degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                        squaddieActionResults: [
                            {
                                inBattleSquaddieId: 1,
                                outOfBattleSquaddieId: "lini",
                                damage: {
                                    net: 2,
                                    raw: 2,
                                    absorbed: 0,
                                    willKo: false,
                                    type: undefined,
                                },
                            },
                        ],
                    },
                    [goblinKey]: {
                        degreeOfSuccess: DegreeOfSuccess.FAILURE,
                        squaddieActionResults: [
                            {
                                inBattleSquaddieId: 2,
                                outOfBattleSquaddieId: "goblin",
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

    describe("AllSquaddiesDefeated criteria still works unchanged", () => {
        it("returns true when matching affiliations are defeated", () => {
            const { manager: outOfBattleManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "sheet2",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            distancePerAction: 2,
                            items: { maxCapacity: 0 },
                        },
                    }
                )

            const manager2 = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleManager
            )

            manager2.outOfBattleSquaddieManager!.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "enemy1",
                    name: "Enemy 1",
                    actionIds: [],
                    attributeSheetId: "sheet2",
                    affiliation: SquaddieAffiliation.ENEMY,
                })
            )

            const enemy1Id = manager2.createNewSquaddie({
                outOfBattleSquaddieId: "enemy1",
            })
            manager2.dealDamageToSquaddie({
                ...enemy1Id,
                damage: { amount: 100, type: undefined },
            })

            const criteria =
                MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {
                        affiliations: [SquaddieAffiliation.ENEMY],
                    }
                )

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager2)
            ).toBe(true)
        })
    })
})
