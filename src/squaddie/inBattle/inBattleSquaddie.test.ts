import { beforeEach, describe, expect, it } from "vitest"
import {
    type InBattleSquaddie,
    InBattleSquaddieService,
    type SerializedInBattleSquaddie,
} from "./inBattleSquaddie"
import {
    SquaddieConditionService,
    SquaddieConditionType,
} from "../../proficiency/squaddieCondition"
import {
    type OutOfBattleSquaddie,
    OutOfBattleSquaddieService,
} from "../outOfBattle/outOfBattleSquaddie"
import {
    type OutOfBattleSquaddieAttributeSheet,
    OutOfBattleSquaddieAttributeSheetService,
} from "../outOfBattle/outOfBattleSquaddieAttributeSheet"
import { SquaddieAffiliation } from "../../affiliation/affiliation"
import { AttributeScore } from "../../proficiency/attributeScore"

describe("InBattleSquaddie", () => {
    describe("serialization", () => {
        let attributeSheet: OutOfBattleSquaddieAttributeSheet
        let outOfBattleSquaddie: OutOfBattleSquaddie

        beforeEach(() => {
            attributeSheet = OutOfBattleSquaddieAttributeSheetService.new({
                id: "sheet",
                maxHitPoints: 10,
                attributeScores: {
                    [AttributeScore.BODY]: 5,
                    [AttributeScore.MIND]: 7,
                    [AttributeScore.SOUL]: 3,
                },
                items: { itemIds: [], maxCapacity: 0 },
                movement: {
                    distancePerAction: 2,
                    skipOverPits: false,
                    moveThroughWalls: false,
                    stopOnSquaddies: false,
                },
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
                duration: 3,
                amount: 5,
            })

            const armorCondition = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                duration: 2,
                amount: 2,
            })

            const elusiveCondition = SquaddieConditionService.new({
                type: SquaddieConditionType.ELUSIVE,
                duration: 1,
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
            expect(restoredAbsorb.amount).toEqual(5)
            expect(restoredAbsorb.limit.duration).toEqual(3)
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
                duration: 3,
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
