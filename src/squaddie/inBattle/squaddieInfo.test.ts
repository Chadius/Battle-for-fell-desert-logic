import { describe, expect, it } from "vitest"
import { SquaddieInfoService } from "./squaddieInfo"
import { SquaddieAffiliation } from "../../affiliation/affiliation"
import {
    SquaddieConditionService,
    SquaddieConditionType,
} from "../../proficiency/squaddieCondition"

describe("SquaddieInfo", () => {
    describe("SquaddieInfoService", () => {
        describe("new", () => {
            it("creates a SquaddieInfo with all fields", () => {
                const info = SquaddieInfoService.new({
                    name: "Hero",
                    affiliation: SquaddieAffiliation.PLAYER,
                    currentHitPoints: 8,
                    maxHitPoints: 10,
                    currentActionPoints: 2,
                    conditions: new Map(),
                    maximumActionPoints: 3,
                    isDefeated: false,
                    canAct: true,
                    items: {
                        itemIds: ["sword", "shield"],
                        itemIdsUsed: ["potion"],
                    },
                })

                expect(info.name).toBe("Hero")
                expect(info.affiliation).toBe(SquaddieAffiliation.PLAYER)
                expect(info.currentHitPoints).toBe(8)
                expect(info.maxHitPoints).toBe(10)
                expect(info.currentActionPoints).toBe(2)
                expect(info.maximumActionPoints).toBe(3)
                expect(info.conditions).toEqual([])
                expect(info.isDefeated).toBe(false)
                expect(info.canAct).toBe(true)
                expect(info.items.itemIds).toEqual(["sword", "shield"])
                expect(info.items.itemIdsUsed).toEqual(["potion"])
            })

            it("flattens conditions map into array", () => {
                const armorCondition = SquaddieConditionService.new({
                    type: SquaddieConditionType.ARMOR,
                    amount: 2,
                    duration: 3,
                })

                const slowedCondition = SquaddieConditionService.new({
                    type: SquaddieConditionType.SLOWED,
                    amount: 1,
                    duration: 2,
                })

                const conditionsMap = new Map([
                    [SquaddieConditionType.ARMOR, [armorCondition]],
                    [SquaddieConditionType.SLOWED, [slowedCondition]],
                ])

                const info = SquaddieInfoService.new({
                    name: "Warrior",
                    affiliation: SquaddieAffiliation.ENEMY,
                    currentHitPoints: 5,
                    maxHitPoints: 10,
                    currentActionPoints: 1,
                    maximumActionPoints: 2,
                    conditions: conditionsMap,
                    isDefeated: false,
                    canAct: true,
                    items: { itemIds: [], itemIdsUsed: [] },
                })

                expect(info.conditions).toHaveLength(2)
                expect(info.conditions).toContainEqual(armorCondition)
                expect(info.conditions).toContainEqual(slowedCondition)
            })

            it("creates a defeated squaddie", () => {
                const info = SquaddieInfoService.new({
                    name: "Fallen",
                    affiliation: SquaddieAffiliation.ALLY,
                    currentHitPoints: 0,
                    maxHitPoints: 10,
                    currentActionPoints: 0,
                    maximumActionPoints: 3,
                    conditions: new Map(),
                    isDefeated: true,
                    canAct: false,
                    items: { itemIds: [], itemIdsUsed: [] },
                })

                expect(info.isDefeated).toBe(true)
                expect(info.currentHitPoints).toBe(0)
                expect(info.canAct).toBe(false)
            })

            it("can be serialized to JSON", () => {
                const armorCondition = SquaddieConditionService.new({
                    type: SquaddieConditionType.ARMOR,
                    amount: 3,
                    duration: 2,
                })

                const info = SquaddieInfoService.new({
                    name: "Knight",
                    affiliation: SquaddieAffiliation.PLAYER,
                    currentHitPoints: 15,
                    maxHitPoints: 20,
                    currentActionPoints: 3,
                    maximumActionPoints: 3,
                    conditions: new Map([
                        [SquaddieConditionType.ARMOR, [armorCondition]],
                    ]),
                    isDefeated: false,
                    canAct: true,
                    items: { itemIds: ["lance"], itemIdsUsed: [] },
                })

                const jsonString = JSON.stringify(info)
                const parsed = JSON.parse(jsonString)

                expect(parsed.name).toBe("Knight")
                expect(parsed.affiliation).toBe(SquaddieAffiliation.PLAYER)
                expect(parsed.currentHitPoints).toBe(15)
                expect(parsed.maxHitPoints).toBe(20)
                expect(parsed.currentActionPoints).toBe(3)
                expect(parsed.conditions).toHaveLength(1)
                expect(parsed.conditions[0].type).toBe(
                    SquaddieConditionType.ARMOR
                )
                expect(parsed.isDefeated).toBe(false)
                expect(parsed.canAct).toBe(true)
                expect(parsed.items.itemIds).toEqual(["lance"])
                expect(parsed.items.itemIdsUsed).toEqual([])
            })
        })
    })
})
