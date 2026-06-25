import { beforeEach, describe, expect, it } from "vitest"
import {
    type InBattleSquaddie,
    InBattleSquaddieService,
    type SerializedInBattleSquaddie,
} from "./inBattleSquaddie"
import { SquaddieActionService } from "../../squaddieAction/squaddieAction"
import { DegreeOfSuccess } from "../../degreesOfSuccess/degreeOfSuccess"
import {
    SquaddieConditionDecaysAt,
    SquaddieConditionService,
    SquaddieConditionSource,
    SquaddieConditionType,
} from "../../proficiency/squaddieCondition"
import {
    type OutOfBattleSquaddie,
    OutOfBattleSquaddieService,
} from "../outOfBattle/outOfBattleSquaddie"
import type { OutOfBattleSquaddieAttributeSheet } from "../outOfBattle/outOfBattleSquaddieAttributeSheet"
import { SquaddieAffiliation } from "../../affiliation/affiliation"
import { AttributeScore } from "../../proficiency/attributeScore"
import { OutOfBattleSquaddieTestSetup } from "../../testUtils/outOfBattleSquaddieTestSetup"

describe("InBattleSquaddie", () => {
    describe("ABSORB with duration — base amount restoration", () => {
        let attributeSheet: OutOfBattleSquaddieAttributeSheet
        let outOfBattleSquaddie: OutOfBattleSquaddie

        beforeEach(() => {
            attributeSheet =
                OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
                    id: "sheet",
                    maxHitPoints: 10,
                    attributeScores: {
                        [AttributeScore.BODY]: 5,
                        [AttributeScore.MIND]: 7,
                        [AttributeScore.SOUL]: 3,
                    },
                    items: { itemIds: [], maxCapacity: 0 },
                    distancePerAction: 2,
                    skipOverPits: false,
                    moveThroughWalls: false,
                    stopOnSquaddies: false,
                })
            outOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "squaddie-out",
                name: "Test Squaddie",
                actionIds: [],
                attributeSheetId: "sheet",
                affiliation: SquaddieAffiliation.NONE,
            })
        })

        it("timed ABSORB stays active when current drains to 0 and excess damage hits HP", () => {
            let squaddie: InBattleSquaddie = InBattleSquaddieService.new({
                id: 1,
                name: "Shield Bearer",
                outOfBattleSquaddie,
                attributeSheet,
            })
            const absorb = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                amount: { amount: 2 },
                duration: {
                    duration: 3,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                source: SquaddieConditionSource.PHYSICAL,
            })
            const addResult = InBattleSquaddieService.addConditionsToSquaddie({
                squaddie,
                conditions: [absorb],
            })
            squaddie = addResult.squaddie

            const dealResult = InBattleSquaddieService.dealDamageToSquaddie({
                squaddie,
                damage: { amount: 3 },
            })
            squaddie = dealResult.squaddie

            const absorbConditions = squaddie.conditions.get(
                SquaddieConditionType.ABSORB
            )
            expect(absorbConditions).toBeDefined()
            expect(absorbConditions![0].amount?.current).toBe(0)
            expect(dealResult.damage.net).toBe(1)
        })

        it("current restores to base after reduceConditionDurationsByOneRound ticks duration", () => {
            let squaddie: InBattleSquaddie = InBattleSquaddieService.new({
                id: 2,
                name: "Shield Bearer",
                outOfBattleSquaddie,
                attributeSheet,
            })
            const absorb = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                amount: { amount: 2 },
                duration: {
                    duration: 3,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                source: SquaddieConditionSource.PHYSICAL,
            })
            const addResult = InBattleSquaddieService.addConditionsToSquaddie({
                squaddie,
                conditions: [absorb],
            })
            squaddie = addResult.squaddie

            const dealResult = InBattleSquaddieService.dealDamageToSquaddie({
                squaddie,
                damage: { amount: 1 },
            })
            squaddie = dealResult.squaddie
            expect(
                squaddie.conditions.get(SquaddieConditionType.ABSORB)![0].amount
                    ?.current
            ).toBe(1)

            const decayResult =
                InBattleSquaddieService.reduceConditionDurationsByOneRound({
                    squaddie,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                })
            squaddie = decayResult.squaddie

            const absorbConditions = squaddie.conditions.get(
                SquaddieConditionType.ABSORB
            )
            expect(absorbConditions).toBeDefined()
            expect(absorbConditions![0].amount?.current).toBe(2)
            expect(absorbConditions![0].limit.duration?.duration).toBe(2)
        })

        it("dispelSquaddieConditions removes the ABSORB immediately regardless of amount", () => {
            let squaddie: InBattleSquaddie = InBattleSquaddieService.new({
                id: 3,
                name: "Shield Bearer",
                outOfBattleSquaddie,
                attributeSheet,
            })
            const absorb = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                amount: { amount: 2 },
                duration: {
                    duration: 3,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                source: SquaddieConditionSource.PHYSICAL,
            })
            const addResult = InBattleSquaddieService.addConditionsToSquaddie({
                squaddie,
                conditions: [absorb],
            })
            squaddie = addResult.squaddie

            const dispelResult =
                InBattleSquaddieService.dispelSquaddieConditions({
                    squaddie,
                    conditionTypes: {
                        types: [SquaddieConditionType.ABSORB],
                    },
                    amount: 999,
                })
            squaddie = dispelResult.squaddie

            expect(
                squaddie.conditions.get(SquaddieConditionType.ABSORB)
            ).toBeUndefined()
        })

        it("two ABSORB conditions with different durations — only the highest amount reduces damage", () => {
            let squaddie: InBattleSquaddie = InBattleSquaddieService.new({
                id: 5,
                name: "Multi-Shield Bearer",
                outOfBattleSquaddie,
                attributeSheet,
            })
            const absorb2 = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                amount: { amount: 2 },
                duration: {
                    duration: 5,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                source: SquaddieConditionSource.SPIRITUAL,
            })
            const absorb3 = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                amount: { amount: 3 },
                duration: {
                    duration: 10,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                source: SquaddieConditionSource.SPIRITUAL,
            })
            const addResult = InBattleSquaddieService.addConditionsToSquaddie({
                squaddie,
                conditions: [absorb2, absorb3],
            })
            squaddie = addResult.squaddie

            const dealResult = InBattleSquaddieService.dealDamageToSquaddie({
                squaddie,
                damage: { amount: 4 },
            })

            expect(dealResult.damage.absorbed).toBe(3)
            expect(dealResult.damage.net).toBe(1)
        })

        it("condition expires after 3 turn-end ticks even when current equals base", () => {
            let squaddie: InBattleSquaddie = InBattleSquaddieService.new({
                id: 4,
                name: "Shield Bearer",
                outOfBattleSquaddie,
                attributeSheet,
            })
            const absorb = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                amount: { amount: 2 },
                duration: {
                    duration: 3,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                source: SquaddieConditionSource.PHYSICAL,
            })
            const addResult = InBattleSquaddieService.addConditionsToSquaddie({
                squaddie,
                conditions: [absorb],
            })
            squaddie = addResult.squaddie

            for (let i = 0; i < 3; i++) {
                const result =
                    InBattleSquaddieService.reduceConditionDurationsByOneRound({
                        squaddie,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    })
                squaddie = result.squaddie
            }

            expect(
                squaddie.conditions.get(SquaddieConditionType.ABSORB)
            ).toBeUndefined()
        })
    })

    describe("serialization", () => {
        let attributeSheet: OutOfBattleSquaddieAttributeSheet
        let outOfBattleSquaddie: OutOfBattleSquaddie

        beforeEach(() => {
            attributeSheet =
                OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
                    id: "sheet",
                    maxHitPoints: 10,
                    attributeScores: {
                        [AttributeScore.BODY]: 5,
                        [AttributeScore.MIND]: 7,
                        [AttributeScore.SOUL]: 3,
                    },
                    items: { itemIds: [], maxCapacity: 0 },
                    distancePerAction: 2,
                    skipOverPits: false,
                    moveThroughWalls: false,
                    stopOnSquaddies: false,
                })
            outOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "squaddie-out",
                name: "Test Squaddie",
                actionIds: [],
                attributeSheetId: "sheet",
                affiliation: SquaddieAffiliation.NONE,
            })
        })

        it("round-trip serialization preserves all primitive fields", () => {
            const outOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "squaddie-out",
                name: "Test Squaddie",
                actionIds: ["action1", "action2"],
                attributeSheetId: "sheet",
                affiliation: SquaddieAffiliation.NONE,
            })

            const original: InBattleSquaddie = InBattleSquaddieService.new({
                id: 42,
                name: "Battle Squaddie",
                outOfBattleSquaddie,
                attributeSheet,
            })

            const serializable = InBattleSquaddieService.serialize(original)
            const restored = InBattleSquaddieService.deserialize(serializable)

            expect(restored.id).toEqual(original.id)
            expect(restored.outOfBattleSquaddieId).toEqual(
                original.outOfBattleSquaddieId
            )
            expect(restored.name).toEqual(original.name)
            expect(restored.hitPoints).toEqual(original.hitPoints)
            expect(restored.actionPoints).toEqual(original.actionPoints)
            expect(restored.actionIds).toEqual(original.actionIds)
            expect(restored.itemIdsUsed).toEqual(original.itemIdsUsed)
        })

        it("empty conditions Map serializes correctly", () => {
            const original: InBattleSquaddie = InBattleSquaddieService.new({
                id: 1,
                name: "Empty Conditions",
                outOfBattleSquaddie,
                attributeSheet,
            })

            const serializable = InBattleSquaddieService.serialize(original)

            expect(Object.keys(serializable.conditions)).toHaveLength(0)

            const restored = InBattleSquaddieService.deserialize(serializable)

            expect(restored.conditions.size).toEqual(0)
        })

        it("multiple condition types serialize correctly", () => {
            let squaddie: InBattleSquaddie = InBattleSquaddieService.new({
                id: 1,
                name: "Conditioned Squaddie",
                outOfBattleSquaddie,
                attributeSheet,
            })

            const absorbCondition = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                duration: {
                    duration: 3,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                amount: { amount: 5 },
                source: SquaddieConditionSource.PHYSICAL,
            })

            const armorCondition = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                duration: {
                    duration: 2,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                amount: { amount: 2 },
                source: SquaddieConditionSource.PHYSICAL,
            })

            const elusiveCondition = SquaddieConditionService.new({
                type: SquaddieConditionType.ELUSIVE,
                duration: {
                    duration: 1,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                amount: undefined,
                source: SquaddieConditionSource.PHYSICAL,
            })

            const addResult = InBattleSquaddieService.addConditionsToSquaddie({
                squaddie,
                conditions: [absorbCondition, armorCondition, elusiveCondition],
            })
            squaddie = addResult.squaddie

            const serializable = InBattleSquaddieService.serialize(squaddie)

            expect(Object.keys(serializable.conditions)).toContain(
                SquaddieConditionType.ABSORB
            )
            expect(Object.keys(serializable.conditions)).toContain(
                SquaddieConditionType.ARMOR
            )
            expect(Object.keys(serializable.conditions)).toContain(
                SquaddieConditionType.ELUSIVE
            )

            const restored = InBattleSquaddieService.deserialize(serializable)

            expect(restored.conditions.size).toEqual(3)
            expect(
                restored.conditions.get(SquaddieConditionType.ABSORB)
            ).toBeDefined()
            expect(
                restored.conditions.get(SquaddieConditionType.ARMOR)
            ).toBeDefined()
            expect(
                restored.conditions.get(SquaddieConditionType.ELUSIVE)
            ).toBeDefined()

            const restoredAbsorb = restored.conditions.get(
                SquaddieConditionType.ABSORB
            )![0]
            expect(restoredAbsorb.type).toEqual(SquaddieConditionType.ABSORB)
            expect(restoredAbsorb.amount).toEqual({ current: 5, base: 5 })
            expect(restoredAbsorb.limit.duration).toEqual({
                duration: 3,
                decaysAt: SquaddieConditionDecaysAt.TURN_END,
            })
        })

        it("serialize produces valid JSON-serializable object", () => {
            const outOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "squaddie-out",
                name: "Test Squaddie",
                actionIds: ["action1"],
                attributeSheetId: "sheet",
                affiliation: SquaddieAffiliation.NONE,
            })

            let squaddie: InBattleSquaddie = InBattleSquaddieService.new({
                id: 99,
                name: "JSON Test",
                outOfBattleSquaddie,
                attributeSheet,
            })

            const absorbCondition = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                duration: {
                    duration: 3,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                amount: { amount: 5 },
                source: SquaddieConditionSource.PHYSICAL,
            })
            const addResult = InBattleSquaddieService.addConditionsToSquaddie({
                squaddie,
                conditions: [absorbCondition],
            })
            squaddie = addResult.squaddie

            const serializable = InBattleSquaddieService.serialize(squaddie)

            const jsonString = JSON.stringify(serializable)
            const parsed: SerializedInBattleSquaddie = JSON.parse(jsonString)

            expect(parsed.id).toEqual(99)
            expect(parsed.name).toEqual("JSON Test")
            expect(
                parsed.conditions[SquaddieConditionType.ABSORB]
            ).toBeDefined()
        })

        it("modifications to serialized object do not affect original", () => {
            const outOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "squaddie-out",
                name: "Test Squaddie",
                actionIds: ["original-action"],
                attributeSheetId: "sheet",
                affiliation: SquaddieAffiliation.NONE,
            })

            const original: InBattleSquaddie = InBattleSquaddieService.new({
                id: 1,
                name: "Original",
                outOfBattleSquaddie,
                attributeSheet,
            })

            const serializable = InBattleSquaddieService.serialize(original)

            serializable.name = "Modified"
            serializable.actionIds.natural.push("new-action")
            serializable.itemIdsUsed.push("new-item")

            expect(original.name).toEqual("Original")
            expect(original.actionIds.natural).toEqual(["original-action"])
            expect(original.itemIdsUsed).toEqual([])
        })

        it("modifications to restored object do not affect serializable", () => {
            const outOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "squaddie-out",
                name: "Serialized",
                actionIds: ["action1"],
                attributeSheetId: "sheet",
                affiliation: SquaddieAffiliation.NONE,
            })
            const serializable = InBattleSquaddieService.serialize(
                InBattleSquaddieService.new({
                    id: 1,
                    name: "Serialized",
                    outOfBattleSquaddie,
                    attributeSheet,
                })
            )

            const restored = InBattleSquaddieService.deserialize(serializable)

            restored.name = "Modified"
            restored.actionIds.natural.push("new-action")
            restored.itemIdsUsed.push("new-item")

            expect(serializable.name).toEqual("Serialized")
            expect(serializable.actionIds.natural).toEqual(["action1"])
            expect(serializable.itemIdsUsed).toEqual([])
        })
    })

    describe("cross-source condition stacking", () => {
        let attributeSheet: OutOfBattleSquaddieAttributeSheet
        let outOfBattleSquaddie: OutOfBattleSquaddie

        beforeEach(() => {
            attributeSheet =
                OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
                    id: "sheet",
                    maxHitPoints: 10,
                    attributeScores: {
                        [AttributeScore.BODY]: 0,
                        [AttributeScore.MIND]: 0,
                        [AttributeScore.SOUL]: 0,
                    },
                    items: { itemIds: [], maxCapacity: 0 },
                    distancePerAction: 2,
                    skipOverPits: false,
                    moveThroughWalls: false,
                    stopOnSquaddies: false,
                })
            outOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "squaddie-out",
                name: "Test Squaddie",
                actionIds: [],
                attributeSheetId: "sheet",
                affiliation: SquaddieAffiliation.NONE,
            })
        })

        it("ABSORB from different sources stacks — cross-source sum absorbs all damage", () => {
            let squaddie: InBattleSquaddie = InBattleSquaddieService.new({
                id: 10,
                name: "Multi-Source Shield Bearer",
                outOfBattleSquaddie,
                attributeSheet,
            })
            const absorbElemental = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                amount: { amount: 3 },
                duration: {
                    duration: 5,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                source: SquaddieConditionSource.ELEMENTAL,
            })
            const absorbSpiritual = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                amount: { amount: 2 },
                duration: {
                    duration: 5,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                source: SquaddieConditionSource.SPIRITUAL,
            })
            const addResult = InBattleSquaddieService.addConditionsToSquaddie({
                squaddie,
                conditions: [absorbElemental, absorbSpiritual],
            })
            squaddie = addResult.squaddie

            const dealResult = InBattleSquaddieService.dealDamageToSquaddie({
                squaddie,
                damage: { amount: 4 },
            })

            expect(dealResult.damage.absorbed).toBe(4)
            expect(dealResult.damage.net).toBe(0)

            const absorbConditions = dealResult.squaddie.conditions.get(
                SquaddieConditionType.ABSORB
            )!
            const elementalAfter = absorbConditions.find(
                (c) => c.source === SquaddieConditionSource.ELEMENTAL
            )
            const spiritualAfter = absorbConditions.find(
                (c) => c.source === SquaddieConditionSource.SPIRITUAL
            )
            expect(elementalAfter).toEqual(
                expect.objectContaining({
                    amount: expect.objectContaining({ current: 0 }),
                })
            )
            expect(spiritualAfter).toEqual(
                expect.objectContaining({
                    amount: expect.objectContaining({ current: 1 }),
                })
            )
        })

        it("ABSORB from same source uses the max — does not stack", () => {
            let squaddie: InBattleSquaddie = InBattleSquaddieService.new({
                id: 11,
                name: "Same-Source Shield Bearer",
                outOfBattleSquaddie,
                attributeSheet,
            })
            const absorbElemental2 = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                amount: { amount: 2 },
                duration: {
                    duration: 5,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                source: SquaddieConditionSource.ELEMENTAL,
            })
            const absorbElemental3 = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                amount: { amount: 3 },
                duration: {
                    duration: 10,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                source: SquaddieConditionSource.ELEMENTAL,
            })
            const addResult = InBattleSquaddieService.addConditionsToSquaddie({
                squaddie,
                conditions: [absorbElemental2, absorbElemental3],
            })
            squaddie = addResult.squaddie

            const dealResult = InBattleSquaddieService.dealDamageToSquaddie({
                squaddie,
                damage: { amount: 4 },
            })

            expect(dealResult.damage.absorbed).toBe(3)
            expect(dealResult.damage.net).toBe(1)

            const absorbConditions = dealResult.squaddie.conditions.get(
                SquaddieConditionType.ABSORB
            )!
            const elemental2After = absorbConditions.find(
                (c) =>
                    c.source === SquaddieConditionSource.ELEMENTAL &&
                    c.limit.duration?.duration === 5
            )
            const elemental3After = absorbConditions.find(
                (c) =>
                    c.source === SquaddieConditionSource.ELEMENTAL &&
                    c.limit.duration?.duration === 10
            )
            expect(elemental2After).toEqual(
                expect.objectContaining({
                    amount: expect.objectContaining({ current: 2 }),
                })
            )
            expect(elemental3After).toEqual(
                expect.objectContaining({
                    amount: expect.objectContaining({ current: 0 }),
                })
            )
        })

        it("ARMOR from different sources both contribute to the effective amount", () => {
            let squaddie: InBattleSquaddie = InBattleSquaddieService.new({
                id: 12,
                name: "Multi-Source Armored",
                outOfBattleSquaddie,
                attributeSheet,
            })
            const armorItem = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                amount: { amount: 3 },
                duration: undefined,
                source: SquaddieConditionSource.ITEM,
            })
            const armorElemental = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                amount: { amount: 2 },
                duration: undefined,
                source: SquaddieConditionSource.ELEMENTAL,
            })
            const addResult = InBattleSquaddieService.addConditionsToSquaddie({
                squaddie,
                conditions: [armorItem, armorElemental],
            })
            squaddie = addResult.squaddie

            expect(
                InBattleSquaddieService.calculateConditionAmount({
                    squaddie,
                    conditionType: SquaddieConditionType.ARMOR,
                })
            ).toBe(5)
        })

        it("ARMOR from the same source uses only the maximum amount", () => {
            let squaddie: InBattleSquaddie = InBattleSquaddieService.new({
                id: 13,
                name: "Same-Source Armored",
                outOfBattleSquaddie,
                attributeSheet,
            })
            const armorElemental2 = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                amount: { amount: 2 },
                duration: undefined,
                source: SquaddieConditionSource.ELEMENTAL,
            })
            const armorElemental1 = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                amount: { amount: 1 },
                duration: undefined,
                source: SquaddieConditionSource.ELEMENTAL,
            })
            const addResult = InBattleSquaddieService.addConditionsToSquaddie({
                squaddie,
                conditions: [armorElemental2, armorElemental1],
            })
            squaddie = addResult.squaddie

            expect(
                InBattleSquaddieService.calculateConditionAmount({
                    squaddie,
                    conditionType: SquaddieConditionType.ARMOR,
                })
            ).toBe(2)
        })
    })

    describe("attackContributionThisTurn (Multiple Attack Penalty)", () => {
        let attributeSheet: OutOfBattleSquaddieAttributeSheet
        let outOfBattleSquaddie: OutOfBattleSquaddie
        let squaddie: InBattleSquaddie

        beforeEach(() => {
            attributeSheet =
                OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
                    id: "sheet-map",
                    maxHitPoints: 10,
                    attributeScores: {
                        [AttributeScore.BODY]: 0,
                        [AttributeScore.MIND]: 0,
                        [AttributeScore.SOUL]: 0,
                    },
                    items: { itemIds: [], maxCapacity: 0 },
                    distancePerAction: 2,
                    skipOverPits: false,
                    moveThroughWalls: false,
                    stopOnSquaddies: false,
                })
            outOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "squaddie-out-map",
                name: "Test Squaddie MAP",
                actionIds: [],
                attributeSheetId: "sheet-map",
                affiliation: SquaddieAffiliation.NONE,
            })
            squaddie = InBattleSquaddieService.new({
                id: 0,
                name: "Test",
                outOfBattleSquaddie,
                attributeSheet,
            })
        })

        it("new squaddie starts with attackContributionThisTurn 0", () => {
            expect(squaddie.attackContributionThisTurn).toBe(0)
        })

        it("incrementAttackContributionThisTurn clones and adds correctly", () => {
            const updated =
                InBattleSquaddieService.incrementAttackContributionThisTurn({
                    squaddie,
                    amount: 1,
                })
            expect(updated.attackContributionThisTurn).toBe(1)
            expect(squaddie.attackContributionThisTurn).toBe(0)
        })

        it("incrementAttackContributionThisTurn accumulates across multiple calls", () => {
            let current =
                InBattleSquaddieService.incrementAttackContributionThisTurn({
                    squaddie,
                    amount: 1,
                })
            current =
                InBattleSquaddieService.incrementAttackContributionThisTurn({
                    squaddie: current,
                    amount: 1,
                })
            expect(current.attackContributionThisTurn).toBe(2)
        })

        it("resetActionPoints does not change attackContributionThisTurn", () => {
            const withAttacks =
                InBattleSquaddieService.incrementAttackContributionThisTurn({
                    squaddie,
                    amount: 2,
                })
            expect(withAttacks.attackContributionThisTurn).toBe(2)

            const reset = InBattleSquaddieService.resetActionPoints({
                squaddie: withAttacks,
            })
            expect(reset.attackContributionThisTurn).toBe(2)
        })

        it("resetAttackContributionThisTurn resets attackContributionThisTurn to 0", () => {
            const withAttacks =
                InBattleSquaddieService.incrementAttackContributionThisTurn({
                    squaddie,
                    amount: 2,
                })
            expect(withAttacks.attackContributionThisTurn).toBe(2)

            const reset =
                InBattleSquaddieService.resetAttackContributionThisTurn({
                    squaddie: withAttacks,
                })
            expect(reset.attackContributionThisTurn).toBe(0)
        })
    })

    describe("amount decaysAt", () => {
        let attributeSheet: OutOfBattleSquaddieAttributeSheet
        let outOfBattleSquaddie: OutOfBattleSquaddie
        let squaddie: InBattleSquaddie

        beforeEach(() => {
            attributeSheet =
                OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
                    id: "sheet-amount-decay",
                    maxHitPoints: 10,
                    attributeScores: {
                        [AttributeScore.BODY]: 0,
                        [AttributeScore.MIND]: 0,
                        [AttributeScore.SOUL]: 0,
                    },
                    items: { itemIds: [], maxCapacity: 0 },
                    distancePerAction: 2,
                    skipOverPits: false,
                    moveThroughWalls: false,
                    stopOnSquaddies: false,
                })
            outOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "squaddie-amount-decay",
                name: "Amount Decay Test",
                actionIds: [],
                attributeSheetId: "sheet-amount-decay",
                affiliation: SquaddieAffiliation.NONE,
            })
            squaddie = InBattleSquaddieService.new({
                id: 99,
                name: "Amount Decay Test",
                outOfBattleSquaddie,
                attributeSheet,
            })
        })

        it("decrements amount.current by 1 per matching round", () => {
            const { squaddie: withCondition } =
                InBattleSquaddieService.addConditionsToSquaddie({
                    squaddie,
                    conditions: [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.ARMOR,
                            amount: {
                                amount: 3,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                            duration: undefined,
                            source: SquaddieConditionSource.PHYSICAL,
                        }),
                    ],
                })

            const { squaddie: afterDecay } =
                InBattleSquaddieService.reduceConditionDurationsByOneRound({
                    squaddie: withCondition,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                })

            const conditions = afterDecay.conditions.get(
                SquaddieConditionType.ARMOR
            )
            expect(conditions).toBeDefined()
            expect(conditions![0].amount?.current).toBe(2)
        })

        it("removes condition when amount.current reaches 0", () => {
            const { squaddie: withCondition } =
                InBattleSquaddieService.addConditionsToSquaddie({
                    squaddie,
                    conditions: [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.ARMOR,
                            amount: {
                                amount: 3,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                            duration: undefined,
                            source: SquaddieConditionSource.PHYSICAL,
                        }),
                    ],
                })

            let current = withCondition
            for (let i = 0; i < 3; i++) {
                const { squaddie: next } =
                    InBattleSquaddieService.reduceConditionDurationsByOneRound({
                        squaddie: current,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    })
                current = next
            }

            expect(
                current.conditions.get(SquaddieConditionType.ARMOR)
            ).toBeUndefined()
        })

        it("does not decrement when decaysAt does not match", () => {
            const { squaddie: withCondition } =
                InBattleSquaddieService.addConditionsToSquaddie({
                    squaddie,
                    conditions: [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.ARMOR,
                            amount: {
                                amount: 3,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                            duration: undefined,
                            source: SquaddieConditionSource.PHYSICAL,
                        }),
                    ],
                })

            const { squaddie: afterDecay } =
                InBattleSquaddieService.reduceConditionDurationsByOneRound({
                    squaddie: withCondition,
                    decaysAt: SquaddieConditionDecaysAt.TURN_START,
                })

            const conditions = afterDecay.conditions.get(
                SquaddieConditionType.ARMOR
            )
            expect(conditions![0].amount?.current).toBe(3)
        })

        it("does not decrement conditions without amount.decaysAt", () => {
            const { squaddie: withCondition } =
                InBattleSquaddieService.addConditionsToSquaddie({
                    squaddie,
                    conditions: [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.ARMOR,
                            amount: { amount: 3 },
                            duration: undefined,
                            source: SquaddieConditionSource.PHYSICAL,
                        }),
                    ],
                })

            const { squaddie: afterDecay } =
                InBattleSquaddieService.reduceConditionDurationsByOneRound({
                    squaddie: withCondition,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                })

            const conditions = afterDecay.conditions.get(
                SquaddieConditionType.ARMOR
            )
            expect(conditions![0].amount?.current).toBe(3)
        })

        it("amount decay and duration decay are independent; condition removed when amount hits 0 first", () => {
            const { squaddie: withCondition } =
                InBattleSquaddieService.addConditionsToSquaddie({
                    squaddie,
                    conditions: [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.ARMOR,
                            amount: {
                                amount: 2,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                            duration: {
                                duration: 5,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                            source: SquaddieConditionSource.PHYSICAL,
                        }),
                    ],
                })

            const { squaddie: afterOneTick } =
                InBattleSquaddieService.reduceConditionDurationsByOneRound({
                    squaddie: withCondition,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                })
            const conditionsAfterOne = afterOneTick.conditions.get(
                SquaddieConditionType.ARMOR
            )
            expect(conditionsAfterOne![0].limit.duration?.duration).toBe(4)
            expect(conditionsAfterOne![0].amount?.current).toBe(1)

            const { squaddie: afterTwoTicks } =
                InBattleSquaddieService.reduceConditionDurationsByOneRound({
                    squaddie: afterOneTick,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                })
            expect(
                afterTwoTicks.conditions.get(SquaddieConditionType.ARMOR)
            ).toBeUndefined()
        })
    })
})

describe("actionCooldowns", () => {
    let freshSquaddie: InBattleSquaddie

    beforeEach(() => {
        const attributeSheet =
            OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
                id: "sheet",
                maxHitPoints: 10,
                attributeScores: {
                    [AttributeScore.BODY]: 5,
                    [AttributeScore.MIND]: 5,
                    [AttributeScore.SOUL]: 5,
                },
                items: { itemIds: [], maxCapacity: 0 },
                distancePerAction: 2,
                skipOverPits: false,
                moveThroughWalls: false,
                stopOnSquaddies: false,
            })
        const outOfBattleSquaddie = OutOfBattleSquaddieService.new({
            id: "squaddie-out",
            name: "Test Squaddie",
            actionIds: [],
            attributeSheetId: "sheet",
            affiliation: SquaddieAffiliation.NONE,
        })
        freshSquaddie = InBattleSquaddieService.new({
            id: 1,
            name: "Test Squaddie",
            outOfBattleSquaddie,
            attributeSheet,
        })
    })

    describe("when a new InBattleSquaddie is created", () => {
        it("has an empty actionCooldowns map", () => {
            expect(freshSquaddie.actionCooldowns.size).toBe(0)
        })
    })

    describe("putActionOnCooldown", () => {
        describe("when called with an action that has cooldownTurns", () => {
            it("records the action in actionCooldowns with the specified turns remaining", () => {
                const actionWithCooldown = SquaddieActionService.new({
                    id: "freeze-blast",
                    name: "Freeze Blast",
                    cooldownTurns: 2,
                    effectOnActor: {
                        [DegreeOfSuccess.SUCCESS]: {
                            actionPoints: { spent: 1 },
                        },
                    },
                })

                const { squaddie } =
                    InBattleSquaddieService.putActionOnCooldown({
                        squaddie: freshSquaddie,
                        action: actionWithCooldown,
                    })

                expect(squaddie.actionCooldowns.get("freeze-blast")).toBe(2)
            })
        })
    })

    describe("serialization", () => {
        describe("when an InBattleSquaddie with actionCooldowns is serialized and deserialized", () => {
            it("preserves the actionCooldowns map", () => {
                const { squaddie: squaddieWithCooldown } =
                    InBattleSquaddieService.putActionOnCooldown({
                        squaddie: freshSquaddie,
                        action: SquaddieActionService.new({
                            id: "freeze-blast",
                            name: "Freeze Blast",
                            cooldownTurns: 2,
                            effectOnActor: {
                                [DegreeOfSuccess.SUCCESS]: {
                                    actionPoints: { spent: 1 },
                                },
                            },
                        }),
                    })

                const serialized =
                    InBattleSquaddieService.serialize(squaddieWithCooldown)
                const deserialized =
                    InBattleSquaddieService.deserialize(serialized)

                expect(deserialized.actionCooldowns.get("freeze-blast")).toBe(2)
            })
        })
    })
})
