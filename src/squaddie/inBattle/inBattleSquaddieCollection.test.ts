import { beforeEach, describe, expect, it } from "vitest"
import {
    InBattleSquaddieCollectionService,
    type SerializedInBattleSquaddieCollection,
} from "./inBattleSquaddieCollection"
import {
    type OutOfBattleSquaddie,
    OutOfBattleSquaddieService,
} from "../outOfBattle/outOfBattleSquaddie"
import type { OutOfBattleSquaddieAttributeSheet } from "../outOfBattle/outOfBattleSquaddieAttributeSheet"
import { SquaddieAffiliation } from "../../affiliation/affiliation"
import { AttributeScore } from "../../proficiency/attributeScore"
import {
    SquaddieConditionService,
    SquaddieConditionType,
} from "../../proficiency/squaddieCondition"
import { OutOfBattleSquaddieTestSetup } from "../../testUtils/outOfBattleSquaddieTestSetup"

describe("InBattleSquaddieCollection", () => {
    describe("serialization", () => {
        let attributeSheet: OutOfBattleSquaddieAttributeSheet
        let outOfBattleSquaddie: OutOfBattleSquaddie
        let outOfBattleSquaddie2: OutOfBattleSquaddie

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
                id: "squaddie-1",
                name: "Test Squaddie 1",
                actionIds: ["action1"],
                attributeSheetId: "sheet",
                affiliation: SquaddieAffiliation.PLAYER,
            })
            outOfBattleSquaddie2 = OutOfBattleSquaddieService.new({
                id: "squaddie-2",
                name: "Test Squaddie 2",
                actionIds: ["action2"],
                attributeSheetId: "sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
        })

        it("round-trip serialization preserves empty collection", () => {
            const collection = InBattleSquaddieCollectionService.new()

            const serializable =
                InBattleSquaddieCollectionService.serialize(collection)
            const restored =
                InBattleSquaddieCollectionService.deserialize(serializable)

            expect(restored.byOutOfBattleSquaddieId.size).toEqual(0)
        })

        it("round-trip serialization preserves collection with one squaddie", () => {
            let collection = InBattleSquaddieCollectionService.new()
            const { collection: updatedCollection, inBattleId } =
                InBattleSquaddieCollectionService.createNewSquaddie({
                    collection,
                    outOfBattleSquaddie,
                    attributeSheet,
                })
            collection = updatedCollection

            const serializable =
                InBattleSquaddieCollectionService.serialize(collection)
            const restored =
                InBattleSquaddieCollectionService.deserialize(serializable)

            expect(restored.byOutOfBattleSquaddieId.size).toEqual(1)
            const restoredSquaddie =
                InBattleSquaddieCollectionService.getSquaddie({
                    collection: restored,
                    id: inBattleId,
                    outOfBattleSquaddieId: outOfBattleSquaddie.id,
                })
            expect(restoredSquaddie).toBeDefined()
            expect(restoredSquaddie!.name).toEqual("Test Squaddie 1")
        })

        it("round-trip serialization preserves collection with multiple squaddies", () => {
            let collection = InBattleSquaddieCollectionService.new()

            const { collection: c1, inBattleId: id1 } =
                InBattleSquaddieCollectionService.createNewSquaddie({
                    collection,
                    outOfBattleSquaddie,
                    attributeSheet,
                })
            collection = c1

            const { collection: c2, inBattleId: id2 } =
                InBattleSquaddieCollectionService.createNewSquaddie({
                    collection,
                    outOfBattleSquaddie: outOfBattleSquaddie2,
                    attributeSheet,
                })
            collection = c2

            const serializable =
                InBattleSquaddieCollectionService.serialize(collection)
            const restored =
                InBattleSquaddieCollectionService.deserialize(serializable)

            expect(restored.byOutOfBattleSquaddieId.size).toEqual(2)

            const restoredSquaddie1 =
                InBattleSquaddieCollectionService.getSquaddie({
                    collection: restored,
                    id: id1,
                    outOfBattleSquaddieId: outOfBattleSquaddie.id,
                })
            expect(restoredSquaddie1).toBeDefined()
            expect(restoredSquaddie1!.name).toEqual("Test Squaddie 1")

            const restoredSquaddie2 =
                InBattleSquaddieCollectionService.getSquaddie({
                    collection: restored,
                    id: id2,
                    outOfBattleSquaddieId: outOfBattleSquaddie2.id,
                })
            expect(restoredSquaddie2).toBeDefined()
            expect(restoredSquaddie2!.name).toEqual("Test Squaddie 2")
        })

        it("round-trip serialization preserves squaddie conditions", () => {
            let collection = InBattleSquaddieCollectionService.new()
            const { collection: c1, inBattleId } =
                InBattleSquaddieCollectionService.createNewSquaddie({
                    collection,
                    outOfBattleSquaddie,
                    attributeSheet,
                })
            collection = c1

            const absorb = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                amount: 5,
                duration: 3,
            })

            const inBattleSquaddie =
                InBattleSquaddieCollectionService.getSquaddie({
                    collection,
                    id: inBattleId,
                    outOfBattleSquaddieId: outOfBattleSquaddie.id,
                })!

            const { collection: c2 } =
                InBattleSquaddieCollectionService.addConditionsToSquaddie({
                    collection,
                    inBattleSquaddie,
                    outOfBattleSquaddie,
                    conditions: [absorb],
                    commitChanges: true,
                })
            collection = c2

            const serializable =
                InBattleSquaddieCollectionService.serialize(collection)
            const restored =
                InBattleSquaddieCollectionService.deserialize(serializable)

            const restoredSquaddie =
                InBattleSquaddieCollectionService.getSquaddie({
                    collection: restored,
                    id: inBattleId,
                    outOfBattleSquaddieId: outOfBattleSquaddie.id,
                })!

            expect(restoredSquaddie.conditions.size).toEqual(1)
            expect(
                restoredSquaddie.conditions.get(SquaddieConditionType.ABSORB)
            ).toBeDefined()
            const restoredAbsorb = restoredSquaddie.conditions.get(
                SquaddieConditionType.ABSORB
            )![0]
            expect(restoredAbsorb.amount).toEqual(5)
            expect(restoredAbsorb.limit.duration).toEqual(3)
        })

        it("serialize produces valid JSON-serializable object", () => {
            let collection = InBattleSquaddieCollectionService.new()
            const { collection: c1 } =
                InBattleSquaddieCollectionService.createNewSquaddie({
                    collection,
                    outOfBattleSquaddie,
                    attributeSheet,
                })
            collection = c1

            const serializable =
                InBattleSquaddieCollectionService.serialize(collection)

            const jsonString = JSON.stringify(serializable)
            const parsed: SerializedInBattleSquaddieCollection =
                JSON.parse(jsonString)

            expect(parsed.byOutOfBattleSquaddieId).toBeDefined()
            expect(parsed.byOutOfBattleSquaddieId["squaddie-1"]).toBeDefined()
            expect(parsed.byOutOfBattleSquaddieId["squaddie-1"]).toHaveLength(1)
        })

        describe("updateFromSerialized", () => {
            it("adds new squaddies from serializable data", () => {
                let collection = InBattleSquaddieCollectionService.new()
                const { collection: c1 } =
                    InBattleSquaddieCollectionService.createNewSquaddie({
                        collection,
                        outOfBattleSquaddie,
                        attributeSheet,
                    })
                collection = c1

                const newSerialized: SerializedInBattleSquaddieCollection = {
                    byOutOfBattleSquaddieId: {
                        "squaddie-2": [
                            {
                                id: 0,
                                outOfBattleSquaddieId: "squaddie-2",
                                name: "New Squaddie",
                                hitPoints: { max: 10, current: 8 },
                                conditions: {},
                                actionPoints: { current: 3 },
                                actionIds: { natural: ["action2"] },
                                itemIdsUsed: [],
                            },
                        ],
                    },
                }

                const updated =
                    InBattleSquaddieCollectionService.updateFromSerializedCollection(
                        {
                            collection,
                            serializable: newSerialized,
                        }
                    )

                expect(updated.byOutOfBattleSquaddieId.size).toEqual(2)
                const newSquaddie =
                    InBattleSquaddieCollectionService.getSquaddie({
                        collection: updated,
                        id: 0,
                        outOfBattleSquaddieId: "squaddie-2",
                    })
                expect(newSquaddie).toBeDefined()
                expect(newSquaddie!.name).toEqual("New Squaddie")
                expect(newSquaddie!.hitPoints.current).toEqual(8)
            })

            it("updates existing squaddies from serializable data", () => {
                let collection = InBattleSquaddieCollectionService.new()
                const { collection: c1, inBattleId } =
                    InBattleSquaddieCollectionService.createNewSquaddie({
                        collection,
                        outOfBattleSquaddie,
                        attributeSheet,
                    })
                collection = c1

                const originalSquaddie =
                    InBattleSquaddieCollectionService.getSquaddie({
                        collection,
                        id: inBattleId,
                        outOfBattleSquaddieId: outOfBattleSquaddie.id,
                    })!
                expect(originalSquaddie.hitPoints.current).toEqual(10)

                const updateSerialized: SerializedInBattleSquaddieCollection = {
                    byOutOfBattleSquaddieId: {
                        "squaddie-1": [
                            {
                                id: inBattleId,
                                outOfBattleSquaddieId: "squaddie-1",
                                name: "Updated Name",
                                hitPoints: { max: 10, current: 5 },
                                conditions: {},
                                actionPoints: { current: 1 },
                                actionIds: { natural: ["action1"] },
                                itemIdsUsed: ["item1"],
                            },
                        ],
                    },
                }

                const updated =
                    InBattleSquaddieCollectionService.updateFromSerializedCollection(
                        {
                            collection,
                            serializable: updateSerialized,
                        }
                    )

                const updatedSquaddie =
                    InBattleSquaddieCollectionService.getSquaddie({
                        collection: updated,
                        id: inBattleId,
                        outOfBattleSquaddieId: outOfBattleSquaddie.id,
                    })!

                expect(updatedSquaddie.name).toEqual("Updated Name")
                expect(updatedSquaddie.hitPoints.current).toEqual(5)
                expect(updatedSquaddie.actionPoints.current).toEqual(1)
                expect(updatedSquaddie.itemIdsUsed).toEqual(["item1"])
            })
        })
    })
})
