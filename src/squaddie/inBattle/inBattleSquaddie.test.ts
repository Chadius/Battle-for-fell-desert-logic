import { beforeEach, describe, expect, it } from "vitest"
import {
    type InBattleSquaddie,
    InBattleSquaddieService,
    type SerializedInBattleSquaddie,
} from "./inBattleSquaddie"
import {
    SquaddieConditionDecaysAt,
    SquaddieConditionService,
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
                amount: 2,
                duration: {
                    duration: 3,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
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
                amount: 2,
                duration: {
                    duration: 3,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
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
                amount: 2,
                duration: {
                    duration: 3,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
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

        it("condition expires after 3 turn-end ticks even when current equals base", () => {
            let squaddie: InBattleSquaddie = InBattleSquaddieService.new({
                id: 4,
                name: "Shield Bearer",
                outOfBattleSquaddie,
                attributeSheet,
            })
            const absorb = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                amount: 2,
                duration: {
                    duration: 3,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
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
                amount: 5,
            })

            const armorCondition = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                duration: {
                    duration: 2,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                amount: 2,
            })

            const elusiveCondition = SquaddieConditionService.new({
                type: SquaddieConditionType.ELUSIVE,
                duration: {
                    duration: 1,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                amount: undefined,
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
                amount: 5,
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
            const serializable: SerializedInBattleSquaddie = {
                id: 1,
                outOfBattleSquaddieId: "squaddie-out",
                name: "Serialized",
                hitPoints: { max: 10, current: 10 },
                conditions: {},
                actionPoints: { current: 3 },
                actionIds: { natural: ["action1"] },
                itemIdsUsed: [],
            }

            const restored = InBattleSquaddieService.deserialize(serializable)

            restored.name = "Modified"
            restored.actionIds.natural.push("new-action")
            restored.itemIdsUsed.push("new-item")

            expect(serializable.name).toEqual("Serialized")
            expect(serializable.actionIds.natural).toEqual(["action1"])
            expect(serializable.itemIdsUsed).toEqual([])
        })
    })
})
