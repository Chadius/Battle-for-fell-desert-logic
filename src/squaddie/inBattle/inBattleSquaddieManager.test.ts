import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    type MockInstance,
    vi,
} from "vitest"
import { OutOfBattleSquaddieCollectionService } from "../outOfBattle/outOfBattleSquaddieCollection.ts"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../outOfBattle/outOfBattleSquaddieAttributeSheetCollection.ts"
import {
    type OutOfBattleSquaddieAttributeSheet,
    OutOfBattleSquaddieAttributeSheetService,
} from "../outOfBattle/outOfBattleSquaddieAttributeSheet.ts"
import {
    type OutOfBattleSquaddie,
    OutOfBattleSquaddieService,
} from "../outOfBattle/outOfBattleSquaddie.ts"
import { OutOfBattleSquaddieManager } from "../outOfBattle/outOfBattleSquaddieManager.ts"
import { ProficiencyType } from "../../proficiency/proficiencyLevel.ts"
import {
    type InBattleSquaddieCollection,
    InBattleSquaddieCollectionService,
} from "./inBattleSquaddieCollection.ts"
import { InBattleSquaddieManager } from "./inBattleSquaddieManager.ts"
import { AttributeScore } from "../../proficiency/attributeScore.ts"
import {
    type SquaddieCondition,
    SquaddieConditionService,
    SquaddieConditionType,
} from "../../proficiency/squaddieCondition.ts"

describe("In Battle Squaddie Manager", () => {
    let attributeSheet: OutOfBattleSquaddieAttributeSheet
    let outOfBattleSquaddie0: OutOfBattleSquaddie
    let outOfBattleSquaddie1: OutOfBattleSquaddie
    let outOfBattleSquaddieManagerSpy: MockInstance

    let inBattleSquaddieCollection: InBattleSquaddieCollection
    let manager: InBattleSquaddieManager

    beforeEach(() => {
        let outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
            OutOfBattleSquaddieCollectionService.new(),
            OutOfBattleSquaddieAttributeSheetCollectionService.new()
        )
        attributeSheet = OutOfBattleSquaddieAttributeSheetService.new({
            id: "test sheet",
            movementPerAction: 2,
            maxHitPoints: 5,
            proficiencyLevels: {
                [ProficiencyType.DEFEND_BODY]: 3,
                [ProficiencyType.SKILL_BODY]: 4,
            },
        })
        outOfBattleSquaddie0 = OutOfBattleSquaddieService.new({
            id: "squaddie0",
            name: "Squaddie0",
            actionIds: [0, 2, 3],
            attributeSheetId: "test sheet",
        })

        outOfBattleSquaddie1 = OutOfBattleSquaddieService.new({
            id: "squaddie1",
            name: "Squaddie1",
            actionIds: [0, 4, 5],
            attributeSheetId: "test sheet",
        })

        outOfBattleSquaddieManagerSpy = vi
            .spyOn(outOfBattleSquaddieManager, "getSquaddie")
            .mockImplementation((squaddieId: string) => {
                switch (squaddieId) {
                    case outOfBattleSquaddie0.id:
                        return {
                            squaddie: outOfBattleSquaddie0,
                            attributeSheet,
                        }
                    case outOfBattleSquaddie1.id:
                        return {
                            squaddie: outOfBattleSquaddie1,
                            attributeSheet,
                        }
                    default:
                        return undefined
                }
            })

        inBattleSquaddieCollection = InBattleSquaddieCollectionService.new()
        manager = new InBattleSquaddieManager(
            inBattleSquaddieCollection,
            outOfBattleSquaddieManager
        )
    })

    afterEach(() => {
        if (outOfBattleSquaddieManagerSpy)
            outOfBattleSquaddieManagerSpy.mockRestore()
    })

    describe("Adding squaddies", () => {
        it("can create and store a new InBattleSquaddie based on an existing Out of Battle Squaddie", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })
            expect(inBattleSquaddie00Id).toEqual(
                expect.objectContaining({
                    inBattleSquaddieId: 0,
                    outOfBattleSquaddieId: outOfBattleSquaddie0.id,
                })
            )
            expect(manager.getSquaddie(inBattleSquaddie00Id!)).toEqual(
                expect.objectContaining({
                    inBattleSquaddie:
                        InBattleSquaddieCollectionService.getSquaddie({
                            collection: manager.inBattleSquaddieCollection,
                            id: inBattleSquaddie00Id!.inBattleSquaddieId,
                            outOfBattleSquaddieId:
                                inBattleSquaddie00Id!.outOfBattleSquaddieId,
                        }),
                    outOfBattleSquaddie: outOfBattleSquaddie0,
                    attributeSheet,
                })
            )
            expect(outOfBattleSquaddieManagerSpy).toBeCalled()
        })

        it("can store multiple squaddies with the same out of battle id", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })
            const inBattleSquaddie01Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })
            expect(inBattleSquaddie00Id?.outOfBattleSquaddieId).toEqual(
                inBattleSquaddie01Id?.outOfBattleSquaddieId
            )
            expect(inBattleSquaddie00Id?.inBattleSquaddieId).not.toEqual(
                inBattleSquaddie01Id?.inBattleSquaddieId
            )
        })
    })

    describe("Dealing damage to squaddies", () => {
        it("will take damage and report the total amount", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            expect(
                manager.getHitPoints({
                    inBattleSquaddieId:
                        inBattleSquaddie00Id!.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        inBattleSquaddie00Id!.outOfBattleSquaddieId,
                })
            ).toEqual(
                expect.objectContaining({
                    current: attributeSheet.maxHitPoints,
                    max: attributeSheet.maxHitPoints,
                })
            )
            expect(
                manager.previewDamageToSquaddie({
                    inBattleSquaddieId:
                        inBattleSquaddie00Id!.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        inBattleSquaddie00Id!.outOfBattleSquaddieId,
                    damage: {
                        amount: 4,
                        type: AttributeScore.BODY,
                    },
                })
            ).toEqual(
                expect.objectContaining({
                    net: 4,
                    willKo: false,
                })
            )

            expect(
                manager.getHitPoints({
                    inBattleSquaddieId:
                        inBattleSquaddie00Id!.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        inBattleSquaddie00Id!.outOfBattleSquaddieId,
                })
            ).toEqual(
                expect.objectContaining({
                    current: attributeSheet.maxHitPoints,
                    max: attributeSheet.maxHitPoints,
                })
            )

            manager.dealDamageToSquaddie({
                inBattleSquaddieId: inBattleSquaddie00Id!.inBattleSquaddieId,
                outOfBattleSquaddieId:
                    inBattleSquaddie00Id!.outOfBattleSquaddieId,
                damage: {
                    amount: 4,
                    type: AttributeScore.BODY,
                },
            })

            expect(
                manager.getHitPoints({
                    inBattleSquaddieId:
                        inBattleSquaddie00Id!.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        inBattleSquaddie00Id!.outOfBattleSquaddieId,
                })
            ).toEqual(
                expect.objectContaining({
                    current: attributeSheet.maxHitPoints - 4,
                    max: attributeSheet.maxHitPoints,
                })
            )
        })
        it("will knows when the squaddie took too much damage and is KO", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            expect(
                manager.previewDamageToSquaddie({
                    inBattleSquaddieId:
                        inBattleSquaddie00Id!.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        inBattleSquaddie00Id!.outOfBattleSquaddieId,
                    damage: {
                        amount: attributeSheet.maxHitPoints * 2,
                        type: AttributeScore.BODY,
                    },
                })
            ).toEqual(
                expect.objectContaining({
                    net: attributeSheet.maxHitPoints,
                    willKo: true,
                })
            )
        })
        describe("reduce damage with ABSORB condition", () => {
            let inBattleSquaddie00Id:
                | { inBattleSquaddieId: number; outOfBattleSquaddieId: string }
                | undefined
            let absorb1: SquaddieCondition
            let absorb5: SquaddieCondition
            beforeEach(() => {
                inBattleSquaddie00Id = manager.createNewSquaddie({
                    outOfBattleSquaddieId: outOfBattleSquaddie0.id,
                })

                absorb1 = SquaddieConditionService.new({
                    type: SquaddieConditionType.ABSORB,
                    duration: undefined,
                    amount: 1,
                })

                absorb5 = SquaddieConditionService.new({
                    type: SquaddieConditionType.ABSORB,
                    duration: undefined,
                    amount: 5,
                })
            })

            it("can report if damage is reduced", () => {
                manager.addConditionsToSquaddie({
                    inBattleSquaddieId:
                        inBattleSquaddie00Id!.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        inBattleSquaddie00Id!.outOfBattleSquaddieId,
                    conditions: [absorb1],
                })

                expect(
                    manager.previewDamageToSquaddie({
                        inBattleSquaddieId:
                            inBattleSquaddie00Id!.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            inBattleSquaddie00Id!.outOfBattleSquaddieId,
                        damage: {
                            amount: 3,
                            type: AttributeScore.BODY,
                        },
                    })
                ).toEqual(
                    expect.objectContaining({
                        net: 2,
                        raw: 3,
                        willKo: false,
                    })
                )
            })

            it("ABSORB value will be reduced when damage is reduced", () => {
                manager.addConditionsToSquaddie({
                    inBattleSquaddieId:
                        inBattleSquaddie00Id!.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        inBattleSquaddie00Id!.outOfBattleSquaddieId,
                    conditions: [absorb5],
                })

                expect(
                    manager.previewDamageToSquaddie({
                        inBattleSquaddieId:
                            inBattleSquaddie00Id!.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            inBattleSquaddie00Id!.outOfBattleSquaddieId,
                        damage: {
                            amount: 3,
                            type: AttributeScore.BODY,
                        },
                    })
                ).toEqual(
                    expect.objectContaining({
                        net: 0,
                        raw: 3,
                        willKo: false,
                    })
                )

                manager.dealDamageToSquaddie({
                    inBattleSquaddieId:
                        inBattleSquaddie00Id!.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        inBattleSquaddie00Id!.outOfBattleSquaddieId,
                    damage: {
                        amount: 3,
                        type: AttributeScore.BODY,
                    },
                })

                expect(
                    manager.calculateConditionAmountForSquaddie({
                        inBattleSquaddieId:
                            inBattleSquaddie00Id!.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            inBattleSquaddie00Id!.outOfBattleSquaddieId,
                        conditionType: SquaddieConditionType.ABSORB,
                    })
                ).toEqual(2)
            })
        })
    })

    describe("Conditions", () => {
        it("can predict what will happen when a modifier is added to a squaddie", () => {
            const absorb = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                duration: 1,
                amount: 4,
            })
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            expect(
                manager.getSquaddieConditions(inBattleSquaddie00Id!)
            ).toEqual({})

            expect(
                manager.previewAddConditionsToSquaddie({
                    inBattleSquaddieId:
                        inBattleSquaddie00Id!.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        inBattleSquaddie00Id!.outOfBattleSquaddieId,
                    conditions: [absorb],
                })
            ).toEqual(
                expect.objectContaining({
                    newConditions: [absorb],
                    netEffect: expect.objectContaining({
                        [SquaddieConditionType.ABSORB]: [
                            expect.objectContaining({
                                amount: absorb.amount,
                                limit: absorb.limit,
                            }),
                        ],
                    }),
                })
            )

            expect(
                manager.getSquaddieConditions(inBattleSquaddie00Id!)
            ).toEqual({})

            manager.addConditionsToSquaddie({
                inBattleSquaddieId: inBattleSquaddie00Id!.inBattleSquaddieId,
                outOfBattleSquaddieId:
                    inBattleSquaddie00Id!.outOfBattleSquaddieId,
                conditions: [absorb],
            })

            expect(
                manager.getSquaddieConditions(inBattleSquaddie00Id!)
            ).toEqual(
                expect.objectContaining({
                    [SquaddieConditionType.ABSORB]: [
                        expect.objectContaining({
                            amount: absorb.amount,
                            limit: absorb.limit,
                        }),
                    ],
                })
            )
        })

        it("can add multiple modifiers of the same type but only the greatest positive and negative effects count", () => {
            const armorNegative2ShortDuration = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                duration: 1,
                amount: -2,
            })
            const armorNegative2LongDuration = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                duration: 2,
                amount: -2,
            })
            const armorPositive1ShortDuration = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                duration: 1,
                amount: 1,
            })
            const armorPositive1LongDuration = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                duration: 10,
                amount: 1,
            })

            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            manager.addConditionsToSquaddie({
                inBattleSquaddieId: inBattleSquaddie00Id!.inBattleSquaddieId,
                outOfBattleSquaddieId:
                    inBattleSquaddie00Id!.outOfBattleSquaddieId,
                conditions: [
                    armorPositive1ShortDuration,
                    armorPositive1LongDuration,
                    armorNegative2ShortDuration,
                    armorNegative2LongDuration,
                ],
            })

            const armorConditions = manager.getSquaddieConditions(
                inBattleSquaddie00Id!
            )

            expect(armorConditions).toEqual(
                expect.objectContaining({
                    [SquaddieConditionType.ARMOR]: expect.arrayContaining([
                        expect.objectContaining({
                            amount: armorNegative2LongDuration.amount,
                            limit: armorNegative2LongDuration.limit,
                        }),
                        expect.objectContaining({
                            amount: armorPositive1LongDuration.amount,
                            limit: armorPositive1LongDuration.limit,
                        }),
                    ]),
                })
            )
            expect(armorConditions[SquaddieConditionType.ARMOR]).toHaveLength(2)
        })

        it("can add binary attribute modifiers", () => {
            const elusive2 = SquaddieConditionService.new({
                type: SquaddieConditionType.ELUSIVE,
                duration: 2,
                amount: undefined,
            })
            const elusive5 = SquaddieConditionService.new({
                type: SquaddieConditionType.ELUSIVE,
                duration: 5,
                amount: undefined,
            })

            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            manager.addConditionsToSquaddie({
                inBattleSquaddieId: inBattleSquaddie00Id!.inBattleSquaddieId,
                outOfBattleSquaddieId:
                    inBattleSquaddie00Id!.outOfBattleSquaddieId,
                conditions: [elusive2, elusive5],
            })

            const elusiveConditions = manager.getSquaddieConditions(
                inBattleSquaddie00Id!
            )

            expect(elusiveConditions).toEqual(
                expect.objectContaining({
                    [SquaddieConditionType.ELUSIVE]: [
                        expect.objectContaining({
                            limit: elusive5.limit,
                        }),
                    ],
                })
            )
        })

        describe("reducing and removing conditions", () => {
            let elusive2: SquaddieCondition
            let armorNegative2ShortDuration: SquaddieCondition
            let armorNegative3ShortDuration: SquaddieCondition
            let absorbForever: SquaddieCondition
            let absorbShortDuration: SquaddieCondition
            let inBattleSquaddie00Id

            beforeEach(() => {
                elusive2 = SquaddieConditionService.new({
                    type: SquaddieConditionType.ELUSIVE,
                    duration: 2,
                    amount: undefined,
                })
                armorNegative2ShortDuration = SquaddieConditionService.new({
                    type: SquaddieConditionType.ARMOR,
                    duration: 1,
                    amount: -2,
                })
                armorNegative3ShortDuration = SquaddieConditionService.new({
                    type: SquaddieConditionType.ARMOR,
                    duration: 1,
                    amount: -3,
                })
                absorbForever = SquaddieConditionService.new({
                    type: SquaddieConditionType.ABSORB,
                    duration: undefined,
                    amount: 4,
                })
                absorbShortDuration = SquaddieConditionService.new({
                    type: SquaddieConditionType.ABSORB,
                    duration: 1,
                    amount: 7,
                })

                inBattleSquaddie00Id = manager.createNewSquaddie({
                    outOfBattleSquaddieId: outOfBattleSquaddie0.id,
                })
            })

            it("can reduce duration of attribute modifiers and remove expired ones", () => {
                manager.addConditionsToSquaddie({
                    inBattleSquaddieId:
                        inBattleSquaddie00Id!.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        inBattleSquaddie00Id!.outOfBattleSquaddieId,
                    conditions: [
                        elusive2,
                        armorNegative2ShortDuration,
                        armorNegative3ShortDuration,
                        absorbForever,
                        absorbShortDuration,
                    ],
                })

                manager.reduceConditionDurationsByOneRound({
                    inBattleSquaddieId:
                        inBattleSquaddie00Id!.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        inBattleSquaddie00Id!.outOfBattleSquaddieId,
                })

                const conditions = manager.getSquaddieConditions(
                    inBattleSquaddie00Id!
                )

                expect(Object.keys(conditions)).toHaveLength(2)
                expect(conditions).toEqual(
                    expect.objectContaining({
                        [SquaddieConditionType.ELUSIVE]: [
                            expect.objectContaining({
                                limit: {
                                    ...elusive2.limit,
                                    duration: 1,
                                },
                            }),
                        ],
                        [SquaddieConditionType.ABSORB]: [
                            expect.objectContaining({
                                limit: absorbForever.limit,
                            }),
                        ],
                    })
                )
            })

            describe("can reduce and remove conditions by amount", () => {
                it("will remove conditions when they reach 0 amount", () => {
                    manager.addConditionsToSquaddie({
                        inBattleSquaddieId:
                            inBattleSquaddie00Id!.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            inBattleSquaddie00Id!.outOfBattleSquaddieId,
                        conditions: [absorbForever, absorbShortDuration],
                    })

                    manager.reduceConditionByAmount({
                        inBattleSquaddieId:
                            inBattleSquaddie00Id!.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            inBattleSquaddie00Id!.outOfBattleSquaddieId,
                        conditionType: SquaddieConditionType.ABSORB,
                        amount: 4,
                    })

                    const conditions = manager.getSquaddieConditions(
                        inBattleSquaddie00Id!
                    )

                    expect(conditions).toEqual(
                        expect.objectContaining({
                            [SquaddieConditionType.ABSORB]: [
                                expect.objectContaining({
                                    limit: absorbShortDuration.limit,
                                    amount: 3,
                                }),
                            ],
                        })
                    )
                })

                it("will ignore binary conditions since they do not have an amount", () => {
                    manager.addConditionsToSquaddie({
                        inBattleSquaddieId:
                            inBattleSquaddie00Id!.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            inBattleSquaddie00Id!.outOfBattleSquaddieId,
                        conditions: [elusive2],
                    })

                    manager.reduceConditionByAmount({
                        inBattleSquaddieId:
                            inBattleSquaddie00Id!.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            inBattleSquaddie00Id!.outOfBattleSquaddieId,
                        conditionType: SquaddieConditionType.ELUSIVE,
                    })

                    const conditions = manager.getSquaddieConditions(
                        inBattleSquaddie00Id!
                    )

                    expect(conditions).toEqual(
                        expect.objectContaining({
                            [SquaddieConditionType.ELUSIVE]: [
                                expect.objectContaining({
                                    limit: elusive2.limit,
                                }),
                            ],
                        })
                    )
                })

                it("will reduce negative durations by bringing them closer to 0", () => {
                    manager.addConditionsToSquaddie({
                        inBattleSquaddieId:
                            inBattleSquaddie00Id!.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            inBattleSquaddie00Id!.outOfBattleSquaddieId,
                        conditions: [armorNegative3ShortDuration],
                    })

                    manager.reduceConditionByAmount({
                        inBattleSquaddieId:
                            inBattleSquaddie00Id!.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            inBattleSquaddie00Id!.outOfBattleSquaddieId,
                        conditionType: SquaddieConditionType.ARMOR,
                        amount: 1,
                    })

                    const conditions = manager.getSquaddieConditions(
                        inBattleSquaddie00Id!
                    )

                    expect(conditions).toEqual(
                        expect.objectContaining({
                            [SquaddieConditionType.ARMOR]:
                                expect.arrayContaining([
                                    expect.objectContaining({
                                        limit: armorNegative3ShortDuration.limit,
                                        amount: -2,
                                    }),
                                ]),
                        })
                    )
                })
            })
        })
    })

    describe("Healing damage to squaddies", () => {
        it("will receive healing and report the total amount", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            expect(
                manager.getHitPoints({
                    inBattleSquaddieId:
                        inBattleSquaddie00Id!.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        inBattleSquaddie00Id!.outOfBattleSquaddieId,
                })
            ).toEqual(
                expect.objectContaining({
                    current: attributeSheet.maxHitPoints,
                    max: attributeSheet.maxHitPoints,
                })
            )

            manager.dealDamageToSquaddie({
                inBattleSquaddieId: inBattleSquaddie00Id!.inBattleSquaddieId,
                outOfBattleSquaddieId:
                    inBattleSquaddie00Id!.outOfBattleSquaddieId,
                damage: {
                    amount: 4,
                    type: AttributeScore.BODY,
                },
            })

            expect(
                manager.previewHealingToSquaddie({
                    inBattleSquaddieId:
                        inBattleSquaddie00Id!.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        inBattleSquaddie00Id!.outOfBattleSquaddieId,
                    healing: {
                        amount: attributeSheet.maxHitPoints * 2,
                        type: AttributeScore.BODY,
                    },
                })
            ).toEqual(
                expect.objectContaining({
                    net: 4,
                })
            )

            expect(
                manager.getHitPoints({
                    inBattleSquaddieId:
                        inBattleSquaddie00Id!.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        inBattleSquaddie00Id!.outOfBattleSquaddieId,
                })
            ).toEqual(
                expect.objectContaining({
                    current: attributeSheet.maxHitPoints - 4,
                    max: attributeSheet.maxHitPoints,
                })
            )

            manager.giveHealingToSquaddie({
                inBattleSquaddieId: inBattleSquaddie00Id!.inBattleSquaddieId,
                outOfBattleSquaddieId:
                    inBattleSquaddie00Id!.outOfBattleSquaddieId,
                healing: {
                    amount: attributeSheet.maxHitPoints * 2,
                    type: AttributeScore.BODY,
                },
            })

            expect(
                manager.getHitPoints({
                    inBattleSquaddieId:
                        inBattleSquaddie00Id!.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        inBattleSquaddie00Id!.outOfBattleSquaddieId,
                })
            ).toEqual(
                expect.objectContaining({
                    current: attributeSheet.maxHitPoints,
                    max: attributeSheet.maxHitPoints,
                })
            )
        })
    })

    describe("Managing action points", () => {
        it("can count and remove action points", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            expect(manager.getActionPoints(inBattleSquaddie00Id!)).toEqual(
                expect.objectContaining({
                    normal: 3,
                })
            )

            manager.spendActionPoints({
                ...inBattleSquaddie00Id!,
                actionPoints: 1,
            })

            expect(manager.getActionPoints(inBattleSquaddie00Id!)).toEqual(
                expect.objectContaining({
                    normal: 2,
                })
            )
        })

        it("can reset action points", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            manager.spendActionPoints({
                ...inBattleSquaddie00Id!,
                actionPoints: 3,
            })

            manager.resetActionPoints(inBattleSquaddie00Id!)

            expect(manager.getActionPoints(inBattleSquaddie00Id!)).toEqual(
                expect.objectContaining({
                    normal: 3,
                })
            )
        })
    })
})
