import { beforeEach, describe, expect, it } from "vitest"
import {
    type OutOfBattleSquaddieAttributeSheet,
    OutOfBattleSquaddieAttributeSheetService,
} from "../outOfBattle/outOfBattleSquaddieAttributeSheet.js"
import {
    type OutOfBattleSquaddie,
    OutOfBattleSquaddieService,
} from "../outOfBattle/outOfBattleSquaddie.js"
import {
    ProficiencyLevel,
    ProficiencyLevelConst,
    ProficiencyType,
    type TProficiencyType,
} from "../../proficiency/proficiencyLevel.js"
import {
    type InBattleSquaddieCollection,
    InBattleSquaddieCollectionService,
    type SerializedInBattleSquaddieCollection,
} from "./inBattleSquaddieCollection.js"
import { InBattleSquaddieManager } from "./inBattleSquaddieManager.js"
import { AttributeScore } from "../../proficiency/attributeScore.js"
import {
    type SquaddieCondition,
    SquaddieConditionDecaysAt,
    SquaddieConditionService,
    SquaddieConditionSource,
    SquaddieConditionType,
} from "../../proficiency/squaddieCondition.js"
import { SquaddieItemManager } from "../../squaddieItem/squaddieItemManager.js"
import { SquaddieItemCollectionService } from "../../squaddieItem/squaddieItemCollection.js"
import { SquaddieItemService } from "../../squaddieItem/squaddieItem.js"
import { SquaddieAffiliation } from "../../affiliation/affiliation.js"
import { OutOfBattleSquaddieTestSetup } from "../../testUtils/outOfBattleSquaddieTestSetup.js"
import {
    InBattleSquaddieService,
    type SerializedInBattleSquaddie,
} from "./inBattleSquaddie.js"

describe("In Battle Squaddie Manager", () => {
    let attributeSheet: OutOfBattleSquaddieAttributeSheet
    let outOfBattleSquaddie0: OutOfBattleSquaddie
    let outOfBattleSquaddie1: OutOfBattleSquaddie

    let inBattleSquaddieCollection: InBattleSquaddieCollection
    let manager: InBattleSquaddieManager

    beforeEach(() => {
        const outOfBattleSquaddieManagerResult =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "test sheet",
                attributeSheetOptions: {
                    distancePerAction: 2,
                    skipOverPits: true,
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
                },
            })
        const outOfBattleSquaddieManager =
            outOfBattleSquaddieManagerResult.manager
        attributeSheet = outOfBattleSquaddieManagerResult.attributeSheet

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

    describe("GetSquaddiesOfAffiliation", () => {
        beforeEach(() => {
            manager.outOfBattleSquaddieManager!.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "player",
                    name: "Player",
                    actionIds: [],
                    attributeSheetId: "test sheet",
                    affiliation: SquaddieAffiliation.PLAYER,
                })
            )
            manager.outOfBattleSquaddieManager!.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "ally",
                    name: "Ally",
                    actionIds: [],
                    attributeSheetId: "test sheet",
                    affiliation: SquaddieAffiliation.ALLY,
                })
            )
            manager.outOfBattleSquaddieManager!.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "enemy",
                    name: "Enemy",
                    actionIds: [],
                    attributeSheetId: "test sheet",
                    affiliation: SquaddieAffiliation.ENEMY,
                })
            )
            manager.outOfBattleSquaddieManager!.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "none",
                    name: "None",
                    actionIds: [],
                    attributeSheetId: "test sheet",
                    affiliation: SquaddieAffiliation.NONE,
                })
            )

            manager.createNewSquaddie({
                outOfBattleSquaddieId: "player",
            })
            manager.createNewSquaddie({
                outOfBattleSquaddieId: "player",
            })
            manager.createNewSquaddie({
                outOfBattleSquaddieId: "ally",
            })
            manager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy",
            })
            manager.createNewSquaddie({
                outOfBattleSquaddieId: "none",
            })
            manager.createNewSquaddie({
                outOfBattleSquaddieId: "none",
            })
            manager.createNewSquaddie({
                outOfBattleSquaddieId: "none",
            })
        })

        it("can get all player squaddies", () => {
            const squaddieIds = manager.getAllSquaddiesOfAffiliation(
                SquaddieAffiliation.PLAYER
            )
            expect(squaddieIds).toHaveLength(2)
            expect(squaddieIds[0].inBattleSquaddieId).not.toEqual(
                squaddieIds[1].inBattleSquaddieId
            )
        })

        it("can get all ally squaddies", () => {
            const squaddieIds = manager.getAllSquaddiesOfAffiliation(
                SquaddieAffiliation.ALLY
            )
            expect(squaddieIds).toHaveLength(1)
        })

        it("can get all enemy squaddies", () => {
            const squaddieIds = manager.getAllSquaddiesOfAffiliation(
                SquaddieAffiliation.ENEMY
            )
            expect(squaddieIds).toHaveLength(1)
        })

        it("can get all squaddies without affiliation", () => {
            const squaddieIds = manager.getAllSquaddiesOfAffiliation(
                SquaddieAffiliation.NONE
            )
            expect(squaddieIds).toHaveLength(3)
            expect(squaddieIds[0].inBattleSquaddieId).not.toEqual(
                squaddieIds[1].inBattleSquaddieId
            )
            expect(squaddieIds[0].inBattleSquaddieId).not.toEqual(
                squaddieIds[2].inBattleSquaddieId
            )
            expect(squaddieIds[1].inBattleSquaddieId).not.toEqual(
                squaddieIds[2].inBattleSquaddieId
            )
        })

        it("can get all squaddies across all affiliations", () => {
            const allSquaddieIds = manager.getAllSquaddies()
            expect(allSquaddieIds).toHaveLength(7)

            const compositeKeys = allSquaddieIds.map(
                (s) => `${s.outOfBattleSquaddieId}-${s.inBattleSquaddieId}`
            )
            const uniqueCompositeKeys = new Set(compositeKeys)
            expect(uniqueCompositeKeys.size).toBe(7)
        })

        it("returns empty array when no squaddies exist", () => {
            const emptyManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                manager["outOfBattleSquaddieManager"]
            )
            const allSquaddieIds = emptyManager.getAllSquaddies()
            expect(allSquaddieIds).toHaveLength(0)
        })
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
                            battleSquaddieId: inBattleSquaddie00Id!,
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
                    amount: { amount: 1 },
                    source: SquaddieConditionSource.PHYSICAL,
                })

                absorb5 = SquaddieConditionService.new({
                    type: SquaddieConditionType.ABSORB,
                    duration: undefined,
                    amount: { amount: 5 },
                    source: SquaddieConditionSource.PHYSICAL,
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
                duration: {
                    duration: 1,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                amount: { amount: 4 },
                source: SquaddieConditionSource.PHYSICAL,
            })
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            expect(
                manager.getSquaddieConditions(inBattleSquaddie00Id!)
            ).toEqual(new Map())

            const preview = manager.previewAddConditionsToSquaddie({
                inBattleSquaddieId: inBattleSquaddie00Id!.inBattleSquaddieId,
                outOfBattleSquaddieId:
                    inBattleSquaddie00Id!.outOfBattleSquaddieId,
                conditions: [absorb],
            })
            expect(preview.newConditions).toEqual([absorb])
            expect(preview.netEffect.get(SquaddieConditionType.ABSORB)).toEqual(
                [
                    expect.objectContaining({
                        amount: absorb.amount,
                        limit: absorb.limit,
                    }),
                ]
            )

            expect(
                manager.getSquaddieConditions(inBattleSquaddie00Id!)
            ).toEqual(new Map())

            manager.addConditionsToSquaddie({
                inBattleSquaddieId: inBattleSquaddie00Id!.inBattleSquaddieId,
                outOfBattleSquaddieId:
                    inBattleSquaddie00Id!.outOfBattleSquaddieId,
                conditions: [absorb],
            })

            expect(
                manager
                    .getSquaddieConditions(inBattleSquaddie00Id!)
                    .get(SquaddieConditionType.ABSORB)
            ).toEqual([
                expect.objectContaining({
                    amount: absorb.amount,
                    limit: absorb.limit,
                }),
            ])
        })

        it("can add multiple modifiers of the same type but only the greatest positive and negative effects count", () => {
            const armorNegative2ShortDuration = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                duration: {
                    duration: 1,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                amount: { amount: -2 },
                source: SquaddieConditionSource.PHYSICAL,
            })
            const armorNegative2LongDuration = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                duration: {
                    duration: 2,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                amount: { amount: -2 },
                source: SquaddieConditionSource.PHYSICAL,
            })
            const armorPositive1ShortDuration = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                duration: {
                    duration: 1,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                amount: { amount: 1 },
                source: SquaddieConditionSource.PHYSICAL,
            })
            const armorPositive1LongDuration = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                duration: {
                    duration: 10,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                amount: { amount: 1 },
                source: SquaddieConditionSource.PHYSICAL,
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

            expect(armorConditions.get(SquaddieConditionType.ARMOR)).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        amount: armorNegative2LongDuration.amount,
                        limit: armorNegative2LongDuration.limit,
                    }),
                    expect.objectContaining({
                        amount: armorPositive1LongDuration.amount,
                        limit: armorPositive1LongDuration.limit,
                    }),
                ])
            )
            expect(
                armorConditions.get(SquaddieConditionType.ARMOR)
            ).toHaveLength(2)
        })

        it("can add multiple modifiers even if the durations are the same", () => {
            const armorNegative2Forever = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                duration: undefined,
                amount: { amount: -2 },
                source: SquaddieConditionSource.PHYSICAL,
            })
            const armorPositive1Forever = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                duration: undefined,
                amount: { amount: 1 },
                source: SquaddieConditionSource.PHYSICAL,
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

            expect(armorConditions.get(SquaddieConditionType.ARMOR)).toEqual(
                expect.arrayContaining([
                    armorPositive1Forever,
                    armorNegative2Forever,
                ])
            )
            expect(
                armorConditions.get(SquaddieConditionType.ARMOR)
            ).toHaveLength(2)
        })

        it("can add binary attribute modifiers", () => {
            const elusive2 = SquaddieConditionService.new({
                type: SquaddieConditionType.ELUSIVE,
                duration: {
                    duration: 2,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                amount: undefined,
                source: SquaddieConditionSource.PHYSICAL,
            })
            const elusive5 = SquaddieConditionService.new({
                type: SquaddieConditionType.ELUSIVE,
                duration: {
                    duration: 5,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                amount: undefined,
                source: SquaddieConditionSource.PHYSICAL,
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

            expect(
                elusiveConditions.get(SquaddieConditionType.ELUSIVE)
            ).toEqual([
                expect.objectContaining({
                    limit: elusive5.limit,
                }),
            ])
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
                    duration: {
                        duration: 2,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                    amount: undefined,
                    source: SquaddieConditionSource.PHYSICAL,
                })
                armorNegative2ShortDuration = SquaddieConditionService.new({
                    type: SquaddieConditionType.ARMOR,
                    duration: {
                        duration: 1,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                    amount: { amount: -2 },
                    source: SquaddieConditionSource.PHYSICAL,
                })
                armorNegative3ShortDuration = SquaddieConditionService.new({
                    type: SquaddieConditionType.ARMOR,
                    duration: {
                        duration: 1,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                    amount: { amount: -3 },
                    source: SquaddieConditionSource.PHYSICAL,
                })
                absorbForever = SquaddieConditionService.new({
                    type: SquaddieConditionType.ABSORB,
                    duration: undefined,
                    amount: { amount: 4 },
                    source: SquaddieConditionSource.PHYSICAL,
                })
                absorbShortDuration = SquaddieConditionService.new({
                    type: SquaddieConditionType.ABSORB,
                    duration: {
                        duration: 1,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                    amount: { amount: 7 },
                    source: SquaddieConditionSource.PHYSICAL,
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
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                })

                const conditions = manager.getSquaddieConditions(
                    inBattleSquaddie00Id!
                )

                expect(conditions.size).toBe(2)
                expect(conditions.get(SquaddieConditionType.ELUSIVE)).toEqual([
                    expect.objectContaining({
                        limit: {
                            duration: {
                                duration: 1,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                        },
                    }),
                ])
                expect(conditions.get(SquaddieConditionType.ABSORB)).toEqual([
                    expect.objectContaining({
                        limit: absorbForever.limit,
                    }),
                ])
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
                        manager
                            .previewDispelConditions({
                                inBattleSquaddieId:
                                    inBattleSquaddie00Id.inBattleSquaddieId,
                                outOfBattleSquaddieId:
                                    inBattleSquaddie00Id.outOfBattleSquaddieId,
                                conditionTypes: {
                                    types: [SquaddieConditionType.ELUSIVE],
                                },
                                amount: undefined,
                            })
                            .dispelledConditions.get(
                                SquaddieConditionType.ELUSIVE
                            )
                    ).toEqual([elusive2])

                    expect(
                        manager
                            .getSquaddieConditions({
                                inBattleSquaddieId:
                                    inBattleSquaddie00Id.inBattleSquaddieId,
                                outOfBattleSquaddieId:
                                    inBattleSquaddie00Id.outOfBattleSquaddieId,
                            })
                            .get(SquaddieConditionType.ELUSIVE)
                    ).toHaveLength(1)
                })

                it("can dispel all helpful conditions", () => {
                    let dispelledConditions = manager.previewDispelConditions({
                        inBattleSquaddieId:
                            inBattleSquaddie00Id.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            inBattleSquaddie00Id.outOfBattleSquaddieId,
                        conditionTypes: { all: true },
                        amount: 4,
                    }).dispelledConditions
                    expect(dispelledConditions.size).toBe(2)
                    expect(
                        dispelledConditions.get(SquaddieConditionType.ABSORB)
                    ).toEqual([
                        expect.objectContaining({
                            amount: expect.objectContaining({ current: 0 }),
                            limit: { duration: absorbForever.limit.duration },
                        }),
                        expect.objectContaining({
                            amount: expect.objectContaining({
                                current:
                                    absorbShortDuration.amount!.current - 4,
                            }),
                            limit: {
                                duration: absorbShortDuration.limit.duration,
                            },
                        }),
                    ])
                    expect(
                        dispelledConditions.get(SquaddieConditionType.ELUSIVE)
                    ).toEqual([elusive2])

                    manager.dispelConditions({
                        inBattleSquaddieId:
                            inBattleSquaddie00Id.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            inBattleSquaddie00Id.outOfBattleSquaddieId,
                        conditionTypes: { all: true },
                        amount: 4,
                    })

                    expect(
                        manager
                            .getSquaddieConditions({
                                inBattleSquaddieId:
                                    inBattleSquaddie00Id.inBattleSquaddieId,
                                outOfBattleSquaddieId:
                                    inBattleSquaddie00Id.outOfBattleSquaddieId,
                            })
                            .get(SquaddieConditionType.ELUSIVE)
                    ).toBeUndefined()

                    expect(
                        manager
                            .getSquaddieConditions({
                                inBattleSquaddieId:
                                    inBattleSquaddie00Id.inBattleSquaddieId,
                                outOfBattleSquaddieId:
                                    inBattleSquaddie00Id.outOfBattleSquaddieId,
                            })
                            .get(SquaddieConditionType.ARMOR)
                    ).toHaveLength(1)

                    expect(
                        manager
                            .getSquaddieConditions({
                                inBattleSquaddieId:
                                    inBattleSquaddie00Id.inBattleSquaddieId,
                                outOfBattleSquaddieId:
                                    inBattleSquaddie00Id.outOfBattleSquaddieId,
                            })
                            .get(SquaddieConditionType.ABSORB)
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
                        manager
                            .getSquaddieConditions({
                                inBattleSquaddieId:
                                    inBattleSquaddie00Id.inBattleSquaddieId,
                                outOfBattleSquaddieId:
                                    inBattleSquaddie00Id.outOfBattleSquaddieId,
                            })
                            .get(SquaddieConditionType.ABSORB)
                    ).toEqual(
                        expect.arrayContaining([
                            expect.objectContaining({
                                amount: expect.objectContaining({ current: 3 }),
                            }),
                        ])
                    )

                    expect(
                        manager
                            .getSquaddieConditions({
                                inBattleSquaddieId:
                                    inBattleSquaddie00Id.inBattleSquaddieId,
                                outOfBattleSquaddieId:
                                    inBattleSquaddie00Id.outOfBattleSquaddieId,
                            })
                            .get(SquaddieConditionType.ELUSIVE)
                    ).toHaveLength(1)

                    expect(
                        manager
                            .getSquaddieConditions({
                                inBattleSquaddieId:
                                    inBattleSquaddie00Id.inBattleSquaddieId,
                                outOfBattleSquaddieId:
                                    inBattleSquaddie00Id.outOfBattleSquaddieId,
                            })
                            .get(SquaddieConditionType.ARMOR)
                    ).toEqual([armorNegative2ShortDuration])
                })
            })

            describe("can treat hindering condition", () => {
                let slowed1Condition: SquaddieCondition

                beforeEach(() => {
                    slowed1Condition = SquaddieConditionService.new({
                        type: SquaddieConditionType.SLOWED,
                        duration: {
                            duration: 1,
                            decaysAt: SquaddieConditionDecaysAt.TURN_END,
                        },
                        amount: { amount: 1 },
                        source: SquaddieConditionSource.PHYSICAL,
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
                        manager
                            .previewTreatConditions({
                                inBattleSquaddieId:
                                    inBattleSquaddie00Id.inBattleSquaddieId,
                                outOfBattleSquaddieId:
                                    inBattleSquaddie00Id.outOfBattleSquaddieId,
                                conditionTypes: {
                                    types: [SquaddieConditionType.SLOWED],
                                },
                                amount: 1,
                            })
                            .treatedConditions.get(SquaddieConditionType.SLOWED)
                    ).toEqual([
                        expect.objectContaining({
                            amount: expect.objectContaining({ current: 0 }),
                        }),
                    ])

                    expect(
                        manager
                            .getSquaddieConditions({
                                inBattleSquaddieId:
                                    inBattleSquaddie00Id.inBattleSquaddieId,
                                outOfBattleSquaddieId:
                                    inBattleSquaddie00Id.outOfBattleSquaddieId,
                            })
                            .get(SquaddieConditionType.SLOWED)
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
                        manager
                            .getSquaddieConditions({
                                inBattleSquaddieId:
                                    inBattleSquaddie00Id.inBattleSquaddieId,
                                outOfBattleSquaddieId:
                                    inBattleSquaddie00Id.outOfBattleSquaddieId,
                            })
                            .get(SquaddieConditionType.SLOWED)
                    ).toBeUndefined()

                    expect(
                        manager
                            .getSquaddieConditions({
                                inBattleSquaddieId:
                                    inBattleSquaddie00Id.inBattleSquaddieId,
                                outOfBattleSquaddieId:
                                    inBattleSquaddie00Id.outOfBattleSquaddieId,
                            })
                            .get(SquaddieConditionType.ARMOR)
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
                        manager
                            .getSquaddieConditions({
                                inBattleSquaddieId:
                                    inBattleSquaddie00Id.inBattleSquaddieId,
                                outOfBattleSquaddieId:
                                    inBattleSquaddie00Id.outOfBattleSquaddieId,
                            })
                            .get(SquaddieConditionType.ARMOR)
                    ).toEqual(
                        expect.arrayContaining([
                            expect.objectContaining({
                                amount: expect.objectContaining({
                                    current: -1,
                                }),
                            }),
                        ])
                    )

                    expect(
                        manager
                            .getSquaddieConditions({
                                inBattleSquaddieId:
                                    inBattleSquaddie00Id.inBattleSquaddieId,
                                outOfBattleSquaddieId:
                                    inBattleSquaddie00Id.outOfBattleSquaddieId,
                            })
                            .get(SquaddieConditionType.ELUSIVE)
                    ).toHaveLength(1)
                })

                it("can treat all hindering conditions", () => {
                    let treatedConditions = manager.previewTreatConditions({
                        inBattleSquaddieId:
                            inBattleSquaddie00Id.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            inBattleSquaddie00Id.outOfBattleSquaddieId,
                        conditionTypes: { all: true },
                        amount: 2,
                    }).treatedConditions
                    expect(treatedConditions.size).toBe(2)
                    expect(
                        treatedConditions.get(SquaddieConditionType.SLOWED)
                    ).toEqual([
                        expect.objectContaining({
                            amount: expect.objectContaining({ current: 0 }),
                        }),
                    ])
                    expect(
                        treatedConditions.get(SquaddieConditionType.ARMOR)
                    ).toEqual([
                        expect.objectContaining({
                            amount: expect.objectContaining({
                                current:
                                    armorNegative3ShortDuration.amount!
                                        .current + 2,
                            }),
                        }),
                    ])

                    manager.treatConditions({
                        inBattleSquaddieId:
                            inBattleSquaddie00Id.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            inBattleSquaddie00Id.outOfBattleSquaddieId,
                        conditionTypes: { all: true },
                        amount: 2,
                    })

                    expect(
                        manager
                            .getSquaddieConditions({
                                inBattleSquaddieId:
                                    inBattleSquaddie00Id.inBattleSquaddieId,
                                outOfBattleSquaddieId:
                                    inBattleSquaddie00Id.outOfBattleSquaddieId,
                            })
                            .get(SquaddieConditionType.SLOWED)
                    ).toBeUndefined()

                    expect(
                        manager
                            .getSquaddieConditions({
                                inBattleSquaddieId:
                                    inBattleSquaddie00Id.inBattleSquaddieId,
                                outOfBattleSquaddieId:
                                    inBattleSquaddie00Id.outOfBattleSquaddieId,
                            })
                            .get(SquaddieConditionType.ARMOR)
                    ).toHaveLength(1)

                    expect(
                        manager
                            .getSquaddieConditions({
                                inBattleSquaddieId:
                                    inBattleSquaddie00Id.inBattleSquaddieId,
                                outOfBattleSquaddieId:
                                    inBattleSquaddie00Id.outOfBattleSquaddieId,
                            })
                            .get(SquaddieConditionType.ELUSIVE)
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

        describe("getMaximumActionPoints", () => {
            it("returns 3 when squaddie has no SLOWED condition", () => {
                const inBattleSquaddie00Id = manager.createNewSquaddie({
                    outOfBattleSquaddieId: outOfBattleSquaddie0.id,
                })

                expect(
                    manager.getMaximumActionPoints(inBattleSquaddie00Id!)
                ).toBe(3)
            })

            it("returns 2 when squaddie has SLOWED 1", () => {
                const inBattleSquaddie00Id = manager.createNewSquaddie({
                    outOfBattleSquaddieId: outOfBattleSquaddie0.id,
                })

                const slowedCondition = SquaddieConditionService.new({
                    type: SquaddieConditionType.SLOWED,
                    amount: { amount: 1 },
                    duration: {
                        duration: 2,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                    source: SquaddieConditionSource.PHYSICAL,
                })

                manager.addConditionsToSquaddie({
                    ...inBattleSquaddie00Id!,
                    conditions: [slowedCondition],
                })

                expect(
                    manager.getMaximumActionPoints(inBattleSquaddie00Id!)
                ).toBe(2)
            })

            it("returns 0 when squaddie has SLOWED 3", () => {
                const inBattleSquaddie00Id = manager.createNewSquaddie({
                    outOfBattleSquaddieId: outOfBattleSquaddie0.id,
                })

                const slowedCondition = SquaddieConditionService.new({
                    type: SquaddieConditionType.SLOWED,
                    amount: { amount: 3 },
                    duration: {
                        duration: 2,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                    source: SquaddieConditionSource.PHYSICAL,
                })

                manager.addConditionsToSquaddie({
                    ...inBattleSquaddie00Id!,
                    conditions: [slowedCondition],
                })

                expect(
                    manager.getMaximumActionPoints(inBattleSquaddie00Id!)
                ).toBe(0)
            })

            it("applies the maximum SLOWED from the same source", () => {
                const inBattleSquaddie00Id = manager.createNewSquaddie({
                    outOfBattleSquaddieId: outOfBattleSquaddie0.id,
                })

                const slowedCondition1 = SquaddieConditionService.new({
                    type: SquaddieConditionType.SLOWED,
                    amount: { amount: 1 },
                    duration: {
                        duration: 2,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                    source: SquaddieConditionSource.PHYSICAL,
                })

                const slowedCondition2 = SquaddieConditionService.new({
                    type: SquaddieConditionType.SLOWED,
                    amount: { amount: 1 },
                    duration: {
                        duration: 3,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                    source: SquaddieConditionSource.PHYSICAL,
                })

                manager.addConditionsToSquaddie({
                    ...inBattleSquaddie00Id!,
                    conditions: [slowedCondition1, slowedCondition2],
                })

                expect(
                    manager.getMaximumActionPoints(inBattleSquaddie00Id!)
                ).toBe(2)
            })
        })

        describe("cross-source SLOWED conditions", () => {
            it("SLOWED from different sources stack — reducing action points by the sum", () => {
                const inBattleSquaddie00Id = manager.createNewSquaddie({
                    outOfBattleSquaddieId: outOfBattleSquaddie0.id,
                })

                const slowedPhysical = SquaddieConditionService.new({
                    type: SquaddieConditionType.SLOWED,
                    amount: { amount: 1 },
                    duration: {
                        duration: 2,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                    source: SquaddieConditionSource.PHYSICAL,
                })
                const slowedElemental = SquaddieConditionService.new({
                    type: SquaddieConditionType.SLOWED,
                    amount: { amount: 1 },
                    duration: {
                        duration: 2,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                    source: SquaddieConditionSource.ELEMENTAL,
                })

                manager.addConditionsToSquaddie({
                    ...inBattleSquaddie00Id!,
                    conditions: [slowedPhysical, slowedElemental],
                })

                expect(
                    manager.getMaximumActionPoints(inBattleSquaddie00Id!)
                ).toBe(1)
            })

            it("SLOWED from the same source uses only the maximum — does not stack", () => {
                const inBattleSquaddie00Id = manager.createNewSquaddie({
                    outOfBattleSquaddieId: outOfBattleSquaddie0.id,
                })

                const slowedPhysical2 = SquaddieConditionService.new({
                    type: SquaddieConditionType.SLOWED,
                    amount: { amount: 2 },
                    duration: {
                        duration: 5,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                    source: SquaddieConditionSource.PHYSICAL,
                })
                const slowedPhysical1 = SquaddieConditionService.new({
                    type: SquaddieConditionType.SLOWED,
                    amount: { amount: 1 },
                    duration: {
                        duration: 5,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                    source: SquaddieConditionSource.PHYSICAL,
                })

                manager.addConditionsToSquaddie({
                    ...inBattleSquaddie00Id!,
                    conditions: [slowedPhysical2, slowedPhysical1],
                })

                expect(
                    manager.getMaximumActionPoints(inBattleSquaddie00Id!)
                ).toBe(1)
            })
        })

        describe("resetActionPoints respects SLOWED condition", () => {
            it("resets to 2 when squaddie has SLOWED 1", () => {
                const inBattleSquaddie00Id = manager.createNewSquaddie({
                    outOfBattleSquaddieId: outOfBattleSquaddie0.id,
                })

                const slowedCondition = SquaddieConditionService.new({
                    type: SquaddieConditionType.SLOWED,
                    amount: { amount: 1 },
                    duration: {
                        duration: 2,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                    source: SquaddieConditionSource.PHYSICAL,
                })

                manager.addConditionsToSquaddie({
                    ...inBattleSquaddie00Id!,
                    conditions: [slowedCondition],
                })

                manager.spendActionPoints({
                    ...inBattleSquaddie00Id!,
                    actionPoints: 2,
                })

                manager.resetActionPoints(inBattleSquaddie00Id!)

                expect(manager.getActionPoints(inBattleSquaddie00Id!)).toEqual(
                    expect.objectContaining({
                        current: 2,
                    })
                )
            })

            it("resets to 0 when squaddie has SLOWED 3 or more", () => {
                const inBattleSquaddie00Id = manager.createNewSquaddie({
                    outOfBattleSquaddieId: outOfBattleSquaddie0.id,
                })

                const slowedCondition = SquaddieConditionService.new({
                    type: SquaddieConditionType.SLOWED,
                    amount: { amount: 3 },
                    duration: {
                        duration: 2,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                    source: SquaddieConditionSource.PHYSICAL,
                })

                manager.addConditionsToSquaddie({
                    ...inBattleSquaddie00Id!,
                    conditions: [slowedCondition],
                })

                manager.resetActionPoints(inBattleSquaddie00Id!)

                expect(manager.getActionPoints(inBattleSquaddie00Id!)).toEqual(
                    expect.objectContaining({
                        current: 0,
                    })
                )
            })
        })

        describe("restoreActionPoints", () => {
            it("can restore action points up to maximum", () => {
                const id = manager.createNewSquaddie({
                    outOfBattleSquaddieId: outOfBattleSquaddie0.id,
                })

                manager.spendActionPoints({ ...id!, actionPoints: 2 })
                manager.restoreActionPoints({ ...id!, actionPoints: 1 })

                expect(manager.getActionPoints(id!)).toEqual(
                    expect.objectContaining({ current: 2 })
                )
            })

            it("cannot restore beyond maximum action points", () => {
                const id = manager.createNewSquaddie({
                    outOfBattleSquaddieId: outOfBattleSquaddie0.id,
                })

                manager.spendActionPoints({ ...id!, actionPoints: 1 })
                manager.restoreActionPoints({ ...id!, actionPoints: 5 })

                expect(manager.getActionPoints(id!)).toEqual(
                    expect.objectContaining({ current: 3 })
                )
            })

            it("respects SLOWED condition when restoring", () => {
                const id = manager.createNewSquaddie({
                    outOfBattleSquaddieId: outOfBattleSquaddie0.id,
                })

                const slowedCondition = SquaddieConditionService.new({
                    type: SquaddieConditionType.SLOWED,
                    amount: { amount: 1 },
                    duration: {
                        duration: 2,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                    source: SquaddieConditionSource.PHYSICAL,
                })

                manager.addConditionsToSquaddie({
                    ...id!,
                    conditions: [slowedCondition],
                })

                manager.spendActionPoints({ ...id!, actionPoints: 2 })
                manager.restoreActionPoints({ ...id!, actionPoints: 5 })

                expect(manager.getActionPoints(id!)).toEqual(
                    expect.objectContaining({ current: 2 })
                )
            })

            it("previewRestoreActionPoints shows restoration without applying", () => {
                const id = manager.createNewSquaddie({
                    outOfBattleSquaddieId: outOfBattleSquaddie0.id,
                })

                manager.spendActionPoints({ ...id!, actionPoints: 2 })
                const preview = manager.previewRestoreActionPoints({
                    ...id!,
                    actionPoints: 1,
                })

                expect(preview.restored).toBe(1)
                expect(manager.getActionPoints(id!)).toEqual(
                    expect.objectContaining({ current: 1 })
                )
            })
        })
    })

    describe("canSquaddieAct", () => {
        it("returns true when squaddie has action points and HP", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            expect(
                manager.canSquaddieAct({
                    battleSquaddieId: inBattleSquaddie00Id!,
                })
            ).toBe(true)
        })

        it("returns false when squaddie has spent all action points", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            manager.spendActionPoints({
                ...inBattleSquaddie00Id!,
                actionPoints: 3,
            })

            expect(
                manager.canSquaddieAct({
                    battleSquaddieId: inBattleSquaddie00Id!,
                })
            ).toBe(false)
        })

        it("can accept an override for action points", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            expect(
                manager.canSquaddieAct({
                    battleSquaddieId: inBattleSquaddie00Id!,
                    actionPoints: { current: 0 },
                })
            ).toBe(false)
        })

        it("returns false when squaddie is at 0 hit points", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            manager.dealDamageToSquaddie({
                ...inBattleSquaddie00Id!,
                damage: {
                    amount: 5,
                    type: AttributeScore.BODY,
                },
            })

            expect(
                manager.canSquaddieAct({
                    battleSquaddieId: inBattleSquaddie00Id!,
                })
            ).toBe(false)
        })
    })

    describe("isSquaddieDefeated", () => {
        it("returns false when squaddie has hit points", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            expect(manager.isSquaddieDefeated(inBattleSquaddie00Id!)).toBe(
                false
            )
        })

        it("returns true when squaddie is at 0 hit points", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            manager.dealDamageToSquaddie({
                ...inBattleSquaddie00Id!,
                damage: {
                    amount: 5,
                    type: AttributeScore.BODY,
                },
            })

            expect(manager.isSquaddieDefeated(inBattleSquaddie00Id!)).toBe(true)
        })

        it("returns true when squaddie is below 0 hit points", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            manager.dealDamageToSquaddie({
                ...inBattleSquaddie00Id!,
                damage: {
                    amount: 10,
                    type: AttributeScore.BODY,
                },
            })

            expect(manager.isSquaddieDefeated(inBattleSquaddie00Id!)).toBe(true)
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
                    ProficiencyLevelConst.bonusByProficiencyLevel.get(
                        ProficiencyLevel.NOVICE
                    )!
            )

            expect(
                manager.getProficiencyBonus({
                    ...inBattleSquaddie00Id!,
                    type: ProficiencyType.ARMOR,
                }).total
            ).toEqual(
                attributeSheet.rank +
                    ProficiencyLevelConst.bonusByProficiencyLevel.get(
                        ProficiencyLevel.NOVICE
                    )!
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
        it("passes through a consumable item's glossaryTermIds", () => {
            itemManager.addOrUpdate(
                SquaddieItemService.new({
                    id: "healScroll",
                    name: "Heal Scroll",
                    numberOfUses: 2,
                    actionIds: [],
                    glossaryTermIds: ["item.healScroll"],
                })
            )

            expect(
                manager.getConsumableItems({
                    ...inBattleSquaddie00Id!,
                })
            ).toEqual(
                new Map<
                    string,
                    { numberOfUses: number; glossaryTermIds?: string[] }
                >([
                    [
                        "healScroll",
                        {
                            numberOfUses: 2,
                            glossaryTermIds: ["item.healScroll"],
                        },
                    ],
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
                duration: {
                    duration: 10,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                amount: { amount: 1 },
                source: SquaddieConditionSource.PHYSICAL,
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
                    ProficiencyLevelConst.bonusByProficiencyLevel.get(
                        ProficiencyLevel.NOVICE
                    )! +
                    2 +
                    armorPositive1LongDuration.amount!.current
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
                attributeSheet.movement.movementPointsPerAction *
                actions.current,
            movementPointsPerAction:
                attributeSheet.movement.movementPointsPerAction,
            totalActionPoints: actions.current,
            skipOverPits: attributeSheet.movement.skipOverPits,
            moveThroughWalls: attributeSheet.movement.moveThroughWalls,
            stopOnSquaddies: attributeSheet.movement.stopOnSquaddies,
            reduceMoveCosts: attributeSheet.movement.reduceMoveCosts,
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

    describe("serialization", () => {
        it("serialize returns a serializable representation", () => {
            manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            const serializable = manager.serialize()

            expect(serializable.byOutOfBattleSquaddieId).toBeDefined()
            expect(
                serializable.byOutOfBattleSquaddieId[outOfBattleSquaddie0.id]
            ).toHaveLength(1)
        })

        it("addFromJson replaces the collection", () => {
            manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            let attributeSheet: OutOfBattleSquaddieAttributeSheet =
                OutOfBattleSquaddieAttributeSheetService.new({
                    id: "attributeSheet",
                    maxHitPoints: 5,
                    attributeScores: {
                        [AttributeScore.BODY]: 0,
                        [AttributeScore.MIND]: 0,
                        [AttributeScore.SOUL]: 0,
                    },
                    rank: 1,
                    items: {
                        maxCapacity: 3,
                        itemIds: [],
                    },
                    movement: {},
                })

            let inBattleSquaddie = InBattleSquaddieService.new({
                id: 0,
                outOfBattleSquaddie: outOfBattleSquaddie1,
                name: "Loaded Squaddie",
                attributeSheet,
            })
            inBattleSquaddie = InBattleSquaddieService.dealDamageToSquaddie({
                squaddie: inBattleSquaddie,
                damage: {
                    amount: 2,
                    type: AttributeScore.BODY,
                },
            }).squaddie
            inBattleSquaddie = InBattleSquaddieService.spendActionPoints({
                squaddie: inBattleSquaddie,
                actionPoints: 1,
            }).squaddie

            let serializedInBattleSquaddie: SerializedInBattleSquaddie =
                InBattleSquaddieService.serialize(inBattleSquaddie)

            const newSerialized: SerializedInBattleSquaddieCollection = {
                byOutOfBattleSquaddieId: {
                    [outOfBattleSquaddie1.id]: [serializedInBattleSquaddie],
                },
            }

            manager.addFromJson(newSerialized)

            expect(
                manager.doesSquaddieExist({
                    outOfBattleSquaddieId: outOfBattleSquaddie0.id,
                    inBattleSquaddieId: 0,
                })
            ).toBe(false)

            expect(
                manager.doesSquaddieExist({
                    outOfBattleSquaddieId: outOfBattleSquaddie1.id,
                    inBattleSquaddieId: 0,
                })
            ).toBe(true)

            const hitPoints = manager.getHitPoints({
                outOfBattleSquaddieId: outOfBattleSquaddie1.id,
                inBattleSquaddieId: 0,
            })
            expect(hitPoints.current).toBe(3)
        })

        it("updateFromJson updates existing squaddies and adds new ones", () => {
            const id0 = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            let attributeSheet: OutOfBattleSquaddieAttributeSheet =
                OutOfBattleSquaddieAttributeSheetService.new({
                    id: "attributeSheet",
                    maxHitPoints: 5,
                    attributeScores: {
                        [AttributeScore.BODY]: 0,
                        [AttributeScore.MIND]: 0,
                        [AttributeScore.SOUL]: 0,
                    },
                    rank: 1,
                    items: {
                        maxCapacity: 3,
                        itemIds: [],
                    },
                    movement: {},
                })

            let inBattleSquaddie0 = InBattleSquaddieService.new({
                id: 0,
                outOfBattleSquaddie: outOfBattleSquaddie0,
                name: "Updated Name",
                attributeSheet,
            })
            inBattleSquaddie0 = InBattleSquaddieService.dealDamageToSquaddie({
                squaddie: inBattleSquaddie0,
                damage: {
                    amount: 3,
                    type: AttributeScore.BODY,
                },
            }).squaddie
            inBattleSquaddie0 = InBattleSquaddieService.spendActionPoints({
                squaddie: inBattleSquaddie0,
                actionPoints: 2,
            }).squaddie
            const item1 = SquaddieItemService.new({
                id: "item1",
                name: "Item 1",
            })
            inBattleSquaddie0 = InBattleSquaddieService.useItem({
                squaddie: inBattleSquaddie0,
                item: item1,
            })

            let inBattleSquaddie1 = InBattleSquaddieService.new({
                id: 0,
                outOfBattleSquaddie: outOfBattleSquaddie0,
                name: "New Squaddie",
                attributeSheet,
            })

            const updateSerialized: SerializedInBattleSquaddieCollection = {
                byOutOfBattleSquaddieId: {
                    [outOfBattleSquaddie0.id]: [
                        InBattleSquaddieService.serialize(inBattleSquaddie0),
                    ],
                    [outOfBattleSquaddie1.id]: [
                        InBattleSquaddieService.serialize(inBattleSquaddie1),
                    ],
                },
            }

            manager.updateFromJson(updateSerialized)

            const updatedHitPoints = manager.getHitPoints({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
                inBattleSquaddieId: id0.inBattleSquaddieId,
            })
            expect(updatedHitPoints.current).toBe(2)

            const updatedActionPoints = manager.getActionPoints({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
                inBattleSquaddieId: id0.inBattleSquaddieId,
            })
            expect(updatedActionPoints.current).toBe(1)

            expect(
                manager.doesSquaddieExist({
                    outOfBattleSquaddieId: outOfBattleSquaddie1.id,
                    inBattleSquaddieId: 0,
                })
            ).toBe(true)
        })

        it("throws error when serializing undefined collection", () => {
            const emptyManager = new InBattleSquaddieManager(
                undefined,
                manager.outOfBattleSquaddieManager
            )

            expect(() => emptyManager.serialize()).toThrow(
                /inBattleSquaddieCollection must be defined/
            )
        })

        it("throws error when updating undefined collection", () => {
            const emptyManager = new InBattleSquaddieManager(
                undefined,
                manager.outOfBattleSquaddieManager
            )

            expect(() =>
                emptyManager.updateFromJson({
                    byOutOfBattleSquaddieId: {},
                })
            ).toThrow(/inBattleSquaddieCollection must be defined/)
        })
    })

    describe("getSquaddieInfo", () => {
        it("returns squaddie info with all fields", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            const info = manager.getSquaddieInfo(inBattleSquaddie00Id)

            expect(info.name).toBe("Squaddie0")
            expect(info.affiliation).toBe(SquaddieAffiliation.NONE)
            expect(info.currentHitPoints).toBe(attributeSheet.maxHitPoints)
            expect(info.maxHitPoints).toBe(attributeSheet.maxHitPoints)
            expect(info.currentActionPoints).toBe(3)
            expect(info.conditions).toEqual([])
            expect(info.isDefeated).toBe(false)
            expect(info.canAct).toBe(true)
            expect(info.items.itemIds).toEqual(["plateMail", "healScroll"])
            expect(info.items.itemIdsUsed).toEqual([])
        })

        it("reflects damage taken", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            manager.dealDamageToSquaddie({
                ...inBattleSquaddie00Id,
                damage: { amount: 3, type: undefined },
            })

            const info = manager.getSquaddieInfo(inBattleSquaddie00Id)

            expect(info.currentHitPoints).toBe(attributeSheet.maxHitPoints - 3)
            expect(info.isDefeated).toBe(false)
            expect(info.canAct).toBe(true)
        })

        it("reflects spent action points", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            manager.spendActionPoints({
                ...inBattleSquaddie00Id,
                actionPoints: 2,
            })

            const info = manager.getSquaddieInfo(inBattleSquaddie00Id)

            expect(info.currentActionPoints).toBe(1)
            expect(info.canAct).toBe(true)
        })

        it("canAct is false when all action points are spent", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            manager.spendActionPoints({
                ...inBattleSquaddie00Id,
                actionPoints: 3,
            })

            const info = manager.getSquaddieInfo(inBattleSquaddie00Id)

            expect(info.currentActionPoints).toBe(0)
            expect(info.canAct).toBe(false)
        })

        it("includes conditions", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            const armorCondition = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                amount: { amount: 2 },
                duration: {
                    duration: 3,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                source: SquaddieConditionSource.PHYSICAL,
            })

            manager.addConditionsToSquaddie({
                ...inBattleSquaddie00Id,
                conditions: [armorCondition],
            })

            const info = manager.getSquaddieInfo(inBattleSquaddie00Id)

            expect(info.conditions).toHaveLength(1)
            expect(info.conditions[0].type).toBe(SquaddieConditionType.ARMOR)
            expect(info.conditions[0].amount).toEqual({ current: 2, base: 2 })
        })

        it("shows defeated squaddie", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            manager.dealDamageToSquaddie({
                ...inBattleSquaddie00Id,
                damage: { amount: 100, type: undefined },
            })

            const info = manager.getSquaddieInfo(inBattleSquaddie00Id)

            expect(info.currentHitPoints).toBeLessThanOrEqual(0)
            expect(info.isDefeated).toBe(true)
            expect(info.canAct).toBe(false)
        })

        it("includes used items", () => {
            const itemManager = new SquaddieItemManager(
                SquaddieItemCollectionService.new()
            )
            itemManager.addOrUpdate(
                SquaddieItemService.new({
                    id: "healScroll",
                    name: "Heal Scroll",
                    numberOfUses: 2,
                    actionIds: [],
                })
            )
            manager.setSquaddieItemManager(itemManager)

            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            manager.useItem({
                ...inBattleSquaddie00Id,
                itemId: "healScroll",
            })

            const info = manager.getSquaddieInfo(inBattleSquaddie00Id)

            expect(info.items.itemIds).toEqual(["plateMail", "healScroll"])
            expect(info.items.itemIdsUsed).toEqual(["healScroll"])
        })

        it("can be serialized to JSON", () => {
            const inBattleSquaddie00Id = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            const info = manager.getSquaddieInfo(inBattleSquaddie00Id)
            const jsonString = JSON.stringify(info)
            const parsed = JSON.parse(jsonString)

            expect(parsed.name).toBe("Squaddie0")
            expect(parsed.affiliation).toBe(SquaddieAffiliation.NONE)
            expect(parsed.currentHitPoints).toBe(attributeSheet.maxHitPoints)
            expect(parsed.canAct).toBe(true)
            expect(parsed.items.itemIds).toEqual(["plateMail", "healScroll"])
            expect(parsed.items.itemIdsUsed).toEqual([])
        })
    })

    describe("getBattleSquaddieIdsByOutOfBattleSquaddieId", () => {
        it("returns BattleSquaddieIds for a given outOfBattleSquaddieId", () => {
            const battleId = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            const results = manager.getBattleSquaddieIdsByOutOfBattleSquaddieId(
                outOfBattleSquaddie0.id
            )

            expect(results).toHaveLength(1)
            expect(results[0]).toEqual(battleId)
        })

        it("returns multiple BattleSquaddieIds when multiple instances exist", () => {
            const first = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })
            const second = manager.createNewSquaddie({
                outOfBattleSquaddieId: outOfBattleSquaddie0.id,
            })

            const results = manager.getBattleSquaddieIdsByOutOfBattleSquaddieId(
                outOfBattleSquaddie0.id
            )

            expect(results).toHaveLength(2)
            expect(results).toContainEqual(first)
            expect(results).toContainEqual(second)
        })

        it("returns empty array when no squaddies exist for that outOfBattleSquaddieId", () => {
            const results =
                manager.getBattleSquaddieIdsByOutOfBattleSquaddieId(
                    "does-not-exist"
                )

            expect(results).toEqual([])
        })
    })
})
