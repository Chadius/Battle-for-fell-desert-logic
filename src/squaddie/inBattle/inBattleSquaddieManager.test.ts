import { beforeEach, describe, expect, it } from "vitest"
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
import {
    ProficiencyLevel,
    ProficiencyLevelConst,
    ProficiencyType,
    type TProficiencyType,
} from "../../proficiency/proficiencyLevel.ts"
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
import { SquaddieAffiliation } from "../outOfBattle/affiliation.ts"
import { SquaddieItemManager } from "../../squaddieItem/squaddieItemManager.ts"
import { SquaddieItemCollectionService } from "../../squaddieItem/squaddieItemCollection.ts"
import { SquaddieItemService } from "../../squaddieItem/squaddieItem.ts"

describe("In Battle Squaddie Manager", () => {
    let attributeSheet: OutOfBattleSquaddieAttributeSheet
    let outOfBattleSquaddie0: OutOfBattleSquaddie
    let outOfBattleSquaddie1: OutOfBattleSquaddie

    let inBattleSquaddieCollection: InBattleSquaddieCollection
    let manager: InBattleSquaddieManager

    beforeEach(() => {
        let outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
            OutOfBattleSquaddieCollectionService.new(),
            OutOfBattleSquaddieAttributeSheetCollectionService.new()
        )
        attributeSheet = OutOfBattleSquaddieAttributeSheetService.new({
            id: "test sheet",
            movement: {
                distancePerAction: 2,
                skipOverPits: true,
            },
            maxHitPoints: 5,
            attributeScores: {
                [AttributeScore.BODY]: 5,
                [AttributeScore.MIND]: 7,
                [AttributeScore.SOUL]: 3,
            },
            proficiencyLevels: {
                [ProficiencyType.DEFEND_BODY]: ProficiencyLevel.NOVICE,
                [ProficiencyType.SKILL_BODY]: ProficiencyLevel.EXPERT,
                [ProficiencyType.ARMOR]: ProficiencyLevel.NOVICE,
            },
            rank: 3,
            items: {
                itemIds: ["plateMail", "healScroll"],
                maxCapacity: 3,
            },
        })
        outOfBattleSquaddieManager.addOrUpdateAttributeSheet(attributeSheet)

        outOfBattleSquaddie0 = OutOfBattleSquaddieService.new({
            id: "squaddie0",
            name: "Squaddie0",
            actionIds: ["endTurn", "longsword", "prayer"],
            attributeSheetId: "test sheet",
            affiliation: SquaddieAffiliation.NONE,
        })

        outOfBattleSquaddie1 = OutOfBattleSquaddieService.new({
            id: "squaddie1",
            name: "Squaddie1",
            actionIds: ["endTurn", "hide", "fireball"],
            attributeSheetId: "test sheet",
            affiliation: SquaddieAffiliation.NONE,
        })

        outOfBattleSquaddieManager.addOrUpdateSquaddie(outOfBattleSquaddie0)
        outOfBattleSquaddieManager.addOrUpdateSquaddie(outOfBattleSquaddie1)

        inBattleSquaddieCollection = InBattleSquaddieCollectionService.new()
        manager = new InBattleSquaddieManager(
            inBattleSquaddieCollection,
            outOfBattleSquaddieManager
        )
    })

    describe("Adding squaddies", () => {
        it("can create and store a new InBattleSquaddie based on an existing Out of Battle Squaddie", () => {
            expect(
                manager.doesSquaddieExist({
                    outOfBattleSquaddieId: outOfBattleSquaddie0.id,
                    inBattleSquaddieId: 0,
                })
            ).toBeFalsy()

            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })
            expect(inBattleSquaddie00Id).toEqual(
                expect.objectContaining({
                    inBattleSquaddieId: 0,
                    outOfBattleSquaddieId: outOfBattleSquaddie0.id,
                })
            )
            expect(
                manager.doesSquaddieExist({
                    outOfBattleSquaddieId: outOfBattleSquaddie0.id,
                    inBattleSquaddieId: 0,
                })
            ).toBeTruthy()
            expect(
                manager.doesSquaddieExist({
                    outOfBattleSquaddieId: outOfBattleSquaddie0.id,
                    inBattleSquaddieId: 1,
                })
            ).toBeFalsy()
            expect(manager.getSquaddie(inBattleSquaddie00Id!)).toEqual(
                expect.objectContaining({
                    inBattleSquaddie:
                        InBattleSquaddieCollectionService.getSquaddie({
                            collection: manager.inBattleSquaddieCollection!,
                            id: inBattleSquaddie00Id!.inBattleSquaddieId,
                            outOfBattleSquaddieId:
                                inBattleSquaddie00Id!.outOfBattleSquaddieId,
                        }),
                    outOfBattleSquaddie: outOfBattleSquaddie0,
                    attributeSheet,
                })
            )
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

        it("can add multiple modifiers even if the durations are the same", () => {
            const armorNegative2Forever = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                duration: undefined,
                amount: -2,
            })
            const armorPositive1Forever = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                duration: undefined,
                amount: 1,
            })

            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            manager.addConditionsToSquaddie({
                inBattleSquaddieId: inBattleSquaddie00Id!.inBattleSquaddieId,
                outOfBattleSquaddieId:
                    inBattleSquaddie00Id!.outOfBattleSquaddieId,
                conditions: [armorNegative2Forever, armorPositive1Forever],
            })

            const armorConditions = manager.getSquaddieConditions(
                inBattleSquaddie00Id!
            )

            expect(armorConditions).toEqual(
                expect.objectContaining({
                    [SquaddieConditionType.ARMOR]: expect.arrayContaining([
                        armorPositive1Forever,
                        armorNegative2Forever,
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
            let inBattleSquaddie00Id: {
                inBattleSquaddieId: number
                outOfBattleSquaddieId: string
            }

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

            describe("can dispel helpful condition", () => {
                beforeEach(() => {
                    manager.addConditionsToSquaddie({
                        inBattleSquaddieId:
                            inBattleSquaddie00Id!.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            inBattleSquaddie00Id!.outOfBattleSquaddieId,
                        conditions: [
                            elusive2,
                            armorNegative2ShortDuration,
                            absorbForever,
                            absorbShortDuration,
                        ],
                    })
                })

                it("can dispel a named condition", () => {
                    expect(
                        manager.previewDispelConditions({
                            inBattleSquaddieId:
                                inBattleSquaddie00Id.inBattleSquaddieId,
                            outOfBattleSquaddieId:
                                inBattleSquaddie00Id.outOfBattleSquaddieId,
                            conditionTypes: {
                                types: [SquaddieConditionType.ELUSIVE],
                            },
                            amount: undefined,
                        }).dispelledConditions
                    ).toEqual({
                        [SquaddieConditionType.ELUSIVE]: [elusive2],
                    })

                    expect(
                        manager.getSquaddieConditions({
                            inBattleSquaddieId:
                                inBattleSquaddie00Id.inBattleSquaddieId,
                            outOfBattleSquaddieId:
                                inBattleSquaddie00Id.outOfBattleSquaddieId,
                        })[SquaddieConditionType.ELUSIVE]
                    ).toHaveLength(1)
                })

                it("can dispel all helpful conditions", () => {
                    expect(
                        manager.previewDispelConditions({
                            inBattleSquaddieId:
                                inBattleSquaddie00Id.inBattleSquaddieId,
                            outOfBattleSquaddieId:
                                inBattleSquaddie00Id.outOfBattleSquaddieId,
                            conditionTypes: { all: true },
                            amount: 4,
                        }).dispelledConditions
                    ).toEqual({
                        [SquaddieConditionType.ELUSIVE]: [elusive2],
                        [SquaddieConditionType.ABSORB]: [
                            SquaddieConditionService.new({
                                type: SquaddieConditionType.ABSORB,
                                duration: absorbForever.limit.duration,
                                amount: 0,
                            }),
                            SquaddieConditionService.new({
                                type: SquaddieConditionType.ABSORB,
                                duration: absorbShortDuration.limit.duration,
                                amount: absorbShortDuration.amount! - 4,
                            }),
                        ],
                    })

                    manager.dispelConditions({
                        inBattleSquaddieId:
                            inBattleSquaddie00Id.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            inBattleSquaddie00Id.outOfBattleSquaddieId,
                        conditionTypes: { all: true },
                        amount: 4,
                    })

                    expect(
                        manager.getSquaddieConditions({
                            inBattleSquaddieId:
                                inBattleSquaddie00Id.inBattleSquaddieId,
                            outOfBattleSquaddieId:
                                inBattleSquaddie00Id.outOfBattleSquaddieId,
                        })[SquaddieConditionType.ELUSIVE]
                    ).toBeUndefined()

                    expect(
                        manager.getSquaddieConditions({
                            inBattleSquaddieId:
                                inBattleSquaddie00Id.inBattleSquaddieId,
                            outOfBattleSquaddieId:
                                inBattleSquaddie00Id.outOfBattleSquaddieId,
                        })[SquaddieConditionType.ARMOR]
                    ).toHaveLength(1)

                    expect(
                        manager.getSquaddieConditions({
                            inBattleSquaddieId:
                                inBattleSquaddie00Id.inBattleSquaddieId,
                            outOfBattleSquaddieId:
                                inBattleSquaddie00Id.outOfBattleSquaddieId,
                        })[SquaddieConditionType.ABSORB]
                    ).toHaveLength(1)
                })

                it("can dispel multiple conditions", () => {
                    manager.dispelConditions({
                        inBattleSquaddieId:
                            inBattleSquaddie00Id.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            inBattleSquaddie00Id.outOfBattleSquaddieId,
                        conditionTypes: {
                            types: [
                                SquaddieConditionType.ABSORB,
                                SquaddieConditionType.ARMOR,
                            ],
                        },
                        amount: 4,
                    })

                    expect(
                        manager.getSquaddieConditions({
                            inBattleSquaddieId:
                                inBattleSquaddie00Id.inBattleSquaddieId,
                            outOfBattleSquaddieId:
                                inBattleSquaddie00Id.outOfBattleSquaddieId,
                        })[SquaddieConditionType.ABSORB]
                    ).toEqual(
                        expect.arrayContaining([
                            SquaddieConditionService.new({
                                type: SquaddieConditionType.ABSORB,
                                duration: absorbShortDuration.limit.duration,
                                amount: 3,
                            }),
                        ])
                    )

                    expect(
                        manager.getSquaddieConditions({
                            inBattleSquaddieId:
                                inBattleSquaddie00Id.inBattleSquaddieId,
                            outOfBattleSquaddieId:
                                inBattleSquaddie00Id.outOfBattleSquaddieId,
                        })[SquaddieConditionType.ELUSIVE]
                    ).toHaveLength(1)

                    expect(
                        manager.getSquaddieConditions({
                            inBattleSquaddieId:
                                inBattleSquaddie00Id.inBattleSquaddieId,
                            outOfBattleSquaddieId:
                                inBattleSquaddie00Id.outOfBattleSquaddieId,
                        })[SquaddieConditionType.ARMOR]
                    ).toEqual([armorNegative2ShortDuration])
                })
            })

            describe("can treat hindering condition", () => {
                let slowed1Condition: SquaddieCondition

                beforeEach(() => {
                    slowed1Condition = SquaddieConditionService.new({
                        type: SquaddieConditionType.SLOWED,
                        duration: 1,
                        amount: 1,
                    })
                    manager.addConditionsToSquaddie({
                        inBattleSquaddieId:
                            inBattleSquaddie00Id!.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            inBattleSquaddie00Id!.outOfBattleSquaddieId,
                        conditions: [
                            elusive2,
                            armorNegative3ShortDuration,
                            slowed1Condition,
                        ],
                    })
                })

                it("can treat a named condition", () => {
                    expect(
                        manager.previewTreatConditions({
                            inBattleSquaddieId:
                                inBattleSquaddie00Id.inBattleSquaddieId,
                            outOfBattleSquaddieId:
                                inBattleSquaddie00Id.outOfBattleSquaddieId,
                            conditionTypes: {
                                types: [SquaddieConditionType.SLOWED],
                            },
                            amount: 1,
                        }).treatedConditions
                    ).toEqual({
                        [SquaddieConditionType.SLOWED]: [
                            SquaddieConditionService.new({
                                type: SquaddieConditionType.SLOWED,
                                amount: 0,
                                duration: slowed1Condition.limit.duration,
                            }),
                        ],
                    })

                    expect(
                        manager.getSquaddieConditions({
                            inBattleSquaddieId:
                                inBattleSquaddie00Id.inBattleSquaddieId,
                            outOfBattleSquaddieId:
                                inBattleSquaddie00Id.outOfBattleSquaddieId,
                        })[SquaddieConditionType.SLOWED]
                    ).toHaveLength(1)

                    manager.treatConditions({
                        inBattleSquaddieId:
                            inBattleSquaddie00Id.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            inBattleSquaddie00Id.outOfBattleSquaddieId,
                        conditionTypes: {
                            types: [SquaddieConditionType.SLOWED],
                        },
                        amount: 1,
                    })

                    expect(
                        manager.getSquaddieConditions({
                            inBattleSquaddieId:
                                inBattleSquaddie00Id.inBattleSquaddieId,
                            outOfBattleSquaddieId:
                                inBattleSquaddie00Id.outOfBattleSquaddieId,
                        })[SquaddieConditionType.SLOWED]
                    ).toBeUndefined()

                    expect(
                        manager.getSquaddieConditions({
                            inBattleSquaddieId:
                                inBattleSquaddie00Id.inBattleSquaddieId,
                            outOfBattleSquaddieId:
                                inBattleSquaddie00Id.outOfBattleSquaddieId,
                        })[SquaddieConditionType.ARMOR]
                    ).toHaveLength(1)
                })

                it("can treat multiple named conditions", () => {
                    manager.treatConditions({
                        inBattleSquaddieId:
                            inBattleSquaddie00Id.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            inBattleSquaddie00Id.outOfBattleSquaddieId,
                        conditionTypes: {
                            types: [
                                SquaddieConditionType.SLOWED,
                                SquaddieConditionType.ARMOR,
                            ],
                        },
                        amount: 2,
                    })

                    expect(
                        manager.getSquaddieConditions({
                            inBattleSquaddieId:
                                inBattleSquaddie00Id.inBattleSquaddieId,
                            outOfBattleSquaddieId:
                                inBattleSquaddie00Id.outOfBattleSquaddieId,
                        })[SquaddieConditionType.ARMOR]
                    ).toEqual(
                        expect.arrayContaining([
                            SquaddieConditionService.new({
                                type: SquaddieConditionType.ARMOR,
                                duration:
                                    armorNegative3ShortDuration.limit.duration,
                                amount: -1,
                            }),
                        ])
                    )

                    expect(
                        manager.getSquaddieConditions({
                            inBattleSquaddieId:
                                inBattleSquaddie00Id.inBattleSquaddieId,
                            outOfBattleSquaddieId:
                                inBattleSquaddie00Id.outOfBattleSquaddieId,
                        })[SquaddieConditionType.ELUSIVE]
                    ).toHaveLength(1)
                })

                it("can treat all hindering conditions", () => {
                    expect(
                        manager.previewTreatConditions({
                            inBattleSquaddieId:
                                inBattleSquaddie00Id.inBattleSquaddieId,
                            outOfBattleSquaddieId:
                                inBattleSquaddie00Id.outOfBattleSquaddieId,
                            conditionTypes: { all: true },
                            amount: 2,
                        }).treatedConditions
                    ).toEqual({
                        [SquaddieConditionType.SLOWED]: [
                            SquaddieConditionService.new({
                                type: SquaddieConditionType.SLOWED,
                                duration: slowed1Condition.limit.duration,
                                amount: 0,
                            }),
                        ],
                        [SquaddieConditionType.ARMOR]: [
                            SquaddieConditionService.new({
                                type: SquaddieConditionType.ARMOR,
                                duration:
                                    armorNegative3ShortDuration.limit.duration,
                                amount: armorNegative3ShortDuration.amount! + 2,
                            }),
                        ],
                    })

                    manager.treatConditions({
                        inBattleSquaddieId:
                            inBattleSquaddie00Id.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            inBattleSquaddie00Id.outOfBattleSquaddieId,
                        conditionTypes: { all: true },
                        amount: 2,
                    })

                    expect(
                        manager.getSquaddieConditions({
                            inBattleSquaddieId:
                                inBattleSquaddie00Id.inBattleSquaddieId,
                            outOfBattleSquaddieId:
                                inBattleSquaddie00Id.outOfBattleSquaddieId,
                        })[SquaddieConditionType.SLOWED]
                    ).toBeUndefined()

                    expect(
                        manager.getSquaddieConditions({
                            inBattleSquaddieId:
                                inBattleSquaddie00Id.inBattleSquaddieId,
                            outOfBattleSquaddieId:
                                inBattleSquaddie00Id.outOfBattleSquaddieId,
                        })[SquaddieConditionType.ARMOR]
                    ).toHaveLength(1)

                    expect(
                        manager.getSquaddieConditions({
                            inBattleSquaddieId:
                                inBattleSquaddie00Id.inBattleSquaddieId,
                            outOfBattleSquaddieId:
                                inBattleSquaddie00Id.outOfBattleSquaddieId,
                        })[SquaddieConditionType.ELUSIVE]
                    ).toHaveLength(1)
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
                        raw: attributeSheet.maxHitPoints * 2,
                        attributeScoreType: AttributeScore.BODY,
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
                    raw: attributeSheet.maxHitPoints * 2,
                    attributeScoreType: AttributeScore.BODY,
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
                    current: 3,
                })
            )

            manager.spendActionPoints({
                ...inBattleSquaddie00Id!,
                actionPoints: 1,
            })

            expect(manager.getActionPoints(inBattleSquaddie00Id!)).toEqual(
                expect.objectContaining({
                    current: 2,
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
                    current: 3,
                })
            )
        })
    })

    describe("Proficiency level and rank", () => {
        it("can get the proficiency levels", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })
            expect(
                manager.getProficiencyLevel({
                    ...inBattleSquaddie00Id!,
                    type: ProficiencyType.DEFEND_BODY,
                })
            ).toEqual(ProficiencyLevel.NOVICE)

            expect(
                manager.getProficiencyLevel({
                    ...inBattleSquaddie00Id!,
                    type: ProficiencyType.SKILL_BODY,
                })
            ).toEqual(ProficiencyLevel.EXPERT)

            expect(
                manager.getProficiencyLevel({
                    ...inBattleSquaddie00Id!,
                    type: ProficiencyType.SKILL_SOUL,
                })
            ).toEqual(ProficiencyLevel.UNTRAINED)
        })
        it("can get the rank", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })
            expect(
                manager.getRank({
                    ...inBattleSquaddie00Id!,
                })
            ).toEqual(3)
        })
        it("can get the attribute scores", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })
            expect(
                manager.getAttributeScore({
                    ...inBattleSquaddie00Id!,
                    type: AttributeScore.BODY,
                })
            ).toEqual(5)
            expect(
                manager.getAttributeScore({
                    ...inBattleSquaddie00Id!,
                    type: AttributeScore.MIND,
                })
            ).toEqual(7)
            expect(
                manager.getAttributeScore({
                    ...inBattleSquaddie00Id!,
                    type: AttributeScore.SOUL,
                })
            ).toEqual(3)
        })
        it("calculate the total bonus for a given proficiency type", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })
            expect(
                manager.getProficiencyBonus({
                    ...inBattleSquaddie00Id!,
                    type: ProficiencyType.DEFEND_BODY,
                }).total
            ).toEqual(
                attributeSheet.rank +
                    attributeSheet.attributeScores[AttributeScore.BODY] +
                    ProficiencyLevelConst.bonusByProficiencyLevel[
                        ProficiencyLevel.NOVICE
                    ]
            )

            expect(
                manager.getProficiencyBonus({
                    ...inBattleSquaddie00Id!,
                    type: ProficiencyType.ARMOR,
                }).total
            ).toEqual(
                attributeSheet.rank +
                    ProficiencyLevelConst.bonusByProficiencyLevel[
                        ProficiencyLevel.NOVICE
                    ]
            )
        })
    })

    describe("items", () => {
        let itemManager: SquaddieItemManager
        let inBattleSquaddie00Id:
            | {
                  inBattleSquaddieId: number
                  outOfBattleSquaddieId: string
              }
            | undefined = undefined

        beforeEach(() => {
            itemManager = new SquaddieItemManager(
                SquaddieItemCollectionService.new()
            )
            itemManager.addOrUpdate(
                SquaddieItemService.new({
                    id: "plateMail",
                    name: "Plate Mail",
                    numberOfUses: undefined,
                    passiveProficiencyBonuses: {
                        [ProficiencyType.ARMOR]: 2,
                    },
                    actionIds: [],
                })
            )
            itemManager.addOrUpdate(
                SquaddieItemService.new({
                    id: "healScroll",
                    name: "Heal Scroll",
                    numberOfUses: 2,
                    actionIds: [],
                })
            )
            itemManager.addOrUpdate(
                SquaddieItemService.new({
                    id: "dynamite",
                    name: "Dynamite Stick",
                    numberOfUses: 1,
                    actionIds: ["dynamiteExplosion"],
                })
            )

            manager.setSquaddieItemManager(itemManager)

            inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })
        })
        it("knows what items are available", () => {
            expect(
                manager.getAllSquaddieItemIds({
                    ...inBattleSquaddie00Id!,
                })
            ).toEqual(["plateMail", "healScroll"])
        })
        it("can consume items and will not see it as available", () => {
            expect(
                manager.getConsumableItems({
                    ...inBattleSquaddie00Id!,
                })
            ).toEqual(
                new Map<string, { numberOfUses: number }>([
                    ["healScroll", { numberOfUses: 2 }],
                ])
            )
            manager.useItem({
                ...inBattleSquaddie00Id!,
                itemId: "healScroll",
            })
            expect(
                manager.getConsumableItems({
                    ...inBattleSquaddie00Id!,
                })
            ).toEqual(
                new Map<string, { numberOfUses: number }>([
                    ["healScroll", { numberOfUses: 1 }],
                ])
            )
            manager.useItem({
                ...inBattleSquaddie00Id!,
                itemId: "healScroll",
            })
            expect(
                manager.getConsumableItems({
                    ...inBattleSquaddie00Id!,
                })
            ).toEqual(
                new Map<string, { numberOfUses: number }>([
                    ["healScroll", { numberOfUses: 0 }],
                ])
            )
        })
        it("knows which items are providing passive bonuses", () => {
            expect(
                manager.getPassiveItemIds({
                    ...inBattleSquaddie00Id!,
                })
            ).toEqual(
                new Map<
                    string,
                    { passiveProficiencyBonuses: Map<TProficiencyType, number> }
                >([
                    [
                        "plateMail",
                        {
                            passiveProficiencyBonuses: new Map<
                                TProficiencyType,
                                number
                            >([[ProficiencyType.ARMOR, 2]]),
                        },
                    ],
                ])
            )
        })
        it("can add passive item bonuses with conditions", () => {
            const armorPositive1LongDuration = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                duration: 10,
                amount: 1,
            })
            manager.addConditionsToSquaddie({
                inBattleSquaddieId: inBattleSquaddie00Id!.inBattleSquaddieId,
                outOfBattleSquaddieId:
                    inBattleSquaddie00Id!.outOfBattleSquaddieId,
                conditions: [armorPositive1LongDuration],
            })
            expect(
                manager.getProficiencyBonus({
                    ...inBattleSquaddie00Id!,
                    type: ProficiencyType.ARMOR,
                }).total
            ).toEqual(
                attributeSheet.rank +
                    ProficiencyLevelConst.bonusByProficiencyLevel[
                        ProficiencyLevel.NOVICE
                    ] +
                    2 +
                    armorPositive1LongDuration.amount!
            )
        })
    })

    it("Can get Movement Info", () => {
        const inBattleSquaddie00Id = manager.createNewSquaddie({
            outOfBattleSquaddieId: outOfBattleSquaddie0.id,
        })
        const movementInfo = manager.getSquaddieMovementInfo({
            ...inBattleSquaddie00Id,
        })
        const actions = manager.getActionPoints({ ...inBattleSquaddie00Id })
        expect(movementInfo).toEqual({
            maximumMovementCost:
                attributeSheet.movement.distancePerAction * actions.current,
            movementPerAction: attributeSheet.movement.distancePerAction,
            totalActionPoints: actions.current,
            skipOverPits: attributeSheet.movement.skipOverPits,
            moveThroughWalls: attributeSheet.movement.moveThroughWalls,
            stopOnSquaddies: attributeSheet.movement.stopOnSquaddies,
        })
    })

    it("Can calculate action points for movement", () => {
        const inBattleSquaddie00Id = manager.createNewSquaddie({
            outOfBattleSquaddieId: outOfBattleSquaddie0.id,
        })

        const spendExactAmountRequired =
            manager.calculateActionPointsForMovement({
                ...inBattleSquaddie00Id,
                movementCost: 4,
            })
        expect(spendExactAmountRequired).toBe(2)

        const actionPoints2 = manager.calculateActionPointsForMovement({
            ...inBattleSquaddie00Id,
            movementCost: 5,
        })
        expect(actionPoints2).toBe(3)

        const spendAtLeast1ForMovement =
            manager.calculateActionPointsForMovement({
                ...inBattleSquaddie00Id,
                movementCost: 1,
            })
        expect(spendAtLeast1ForMovement).toBe(1)

        const noActionPointsSpent = manager.calculateActionPointsForMovement({
            ...inBattleSquaddie00Id,
            movementCost: 0,
        })
        expect(noActionPointsSpent).toBe(0)
    })
})
