import { describe, expect, it } from "vitest"
import {
    type OutOfBattleSquaddieAttributeSheet,
    OutOfBattleSquaddieAttributeSheetService,
} from "./outOfBattleSquaddieAttributeSheet"
import { AttributeScore } from "../../proficiency/attributeScore"
import {
    ProficiencyLevel,
    ProficiencyType,
} from "../../proficiency/proficiencyLevel"

describe("OutOfBattleSquaddieAttributeSheet", () => {
    const createLini = () =>
        OutOfBattleSquaddieAttributeSheetService.new({
            id: "lini",
            maxHitPoints: 5,
            movement: {
                movementPointsPerAction: 3,
                skipOverPits: false,
                moveThroughWalls: false,
                stopOnSquaddies: false,
                reduceMoveCosts: false,
            },
            proficiencyLevels: {
                [ProficiencyType.WEAPON_MARTIAL]: ProficiencyLevel.EXPERT,
                [ProficiencyType.ARMOR]: ProficiencyLevel.NOVICE,
            },
            attributeScores: {
                [AttributeScore.BODY]: 2,
                [AttributeScore.MIND]: 0,
                [AttributeScore.SOUL]: 1,
            },
            rank: 1,
            items: { maxCapacity: 3, itemIds: ["scimitar", "healingPotion"] },
            sneakAttackDamage: 2,
        })

    describe("serialization", () => {
        it("serializes to a plain object", () => {
            const sheet = createLini()
            const serialized =
                OutOfBattleSquaddieAttributeSheetService.serialize(sheet)

            expect(serialized).toEqual({
                id: "lini",
                maxHitPoints: 5,
                movement: {
                    movementPointsPerAction: 3,
                    skipOverPits: false,
                    moveThroughWalls: false,
                    stopOnSquaddies: false,
                    reduceMoveCosts: false,
                },
                proficiencyLevels: {
                    WEAPON_MARTIAL: "EXPERT",
                    ARMOR: "NOVICE",
                },
                attributeScores: { BODY: 2, MIND: 0, SOUL: 1 },
                rank: 1,
                items: {
                    maxCapacity: 3,
                    itemIds: ["scimitar", "healingPotion"],
                },
                sneakAttackDamage: 2,
            })
        })

        it("deserializes from a plain object", () => {
            const sheet = createLini()
            const serialized =
                OutOfBattleSquaddieAttributeSheetService.serialize(sheet)
            const restored =
                OutOfBattleSquaddieAttributeSheetService.deserialize(serialized)

            expect(restored.id).toBe("lini")
            expect(restored.maxHitPoints).toBe(5)
            expect(restored.rank).toBe(1)
            expect(restored.sneakAttackDamage).toBe(2)
            expect(
                restored.proficiencyLevels.get(ProficiencyType.WEAPON_MARTIAL)
            ).toBe(ProficiencyLevel.EXPERT)
            expect(restored.proficiencyLevels.get(ProficiencyType.ARMOR)).toBe(
                ProficiencyLevel.NOVICE
            )
            expect(restored.attributeScores[AttributeScore.BODY]).toBe(2)
            expect(restored.items.itemIds).toEqual([
                "scimitar",
                "healingPotion",
            ])
        })

        it("round-trips a sheet with no proficiency levels and no sneak attack", () => {
            const sheet = OutOfBattleSquaddieAttributeSheetService.new({
                id: "goblin",
                attributeScores: {
                    [AttributeScore.BODY]: 0,
                    [AttributeScore.MIND]: 0,
                    [AttributeScore.SOUL]: 0,
                },
                movement: {},
            })
            const restored =
                OutOfBattleSquaddieAttributeSheetService.deserialize(
                    OutOfBattleSquaddieAttributeSheetService.serialize(sheet)
                )

            expect(restored.id).toBe("goblin")
            expect(restored.sneakAttackDamage).toBeUndefined()
            expect(restored.proficiencyLevels.size).toBe(0)
        })

        it("round-trips movement with squaddieMovementSpecialTraversalInfo", () => {
            const base = OutOfBattleSquaddieAttributeSheetService.new({
                id: "flyer",
                attributeScores: {
                    [AttributeScore.BODY]: 1,
                    [AttributeScore.MIND]: 1,
                    [AttributeScore.SOUL]: 1,
                },
                movement: { skipOverPits: true },
            })
            const sheet: OutOfBattleSquaddieAttributeSheet = {
                ...base,
                movement: {
                    ...base.movement,
                    squaddieMovementSpecialTraversalInfo: {
                        minimumRange: 1,
                        maximumRange: 3,
                    },
                },
            }
            const restored =
                OutOfBattleSquaddieAttributeSheetService.deserialize(
                    OutOfBattleSquaddieAttributeSheetService.serialize(sheet)
                )

            expect(restored.movement.skipOverPits).toBe(true)
            expect(
                restored.movement.squaddieMovementSpecialTraversalInfo
                    ?.minimumRange
            ).toBe(1)
            expect(
                restored.movement.squaddieMovementSpecialTraversalInfo
                    ?.maximumRange
            ).toBe(3)
        })

        it("throws on invalid data", () => {
            expect(() =>
                OutOfBattleSquaddieAttributeSheetService.deserialize({
                    id: "",
                    maxHitPoints: 5,
                })
            ).toThrow("[OutOfBattleSquaddieAttributeSheetService.deserialize]")
        })
    })
})
