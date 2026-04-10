import { beforeEach, describe, expect, it } from "vitest"
import {
    type SquaddieAction,
    SquaddieActionService,
} from "../../squaddieAction"
import { SquaddieActionManager } from "../../squaddieActionManager"
import { type OutOfBattleSquaddieAttributeSheet } from "../../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet"
import {
    type OutOfBattleSquaddie,
    OutOfBattleSquaddieService,
} from "../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager"
import {
    type InBattleSquaddieCollection,
    InBattleSquaddieCollectionService,
} from "../../../squaddie/inBattle/inBattleSquaddieCollection"
import { AttributeScore } from "../../../proficiency/attributeScore"
import {
    ProficiencyLevel,
    ProficiencyType,
} from "../../../proficiency/proficiencyLevel"
import { ActionRange } from "../../actionRange"
import { CoordinateGeneratorShape } from "../../../coordinateMap/shape"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess"
import { SquaddieActionCollectionService } from "../../squaddieActionCollection"
import { ApplyResultService } from "../../apply/applyResultService"
import {
    SquaddieConditionService,
    SquaddieConditionSource,
    SquaddieConditionType,
} from "../../../proficiency/squaddieCondition"
import { SquaddieActionResultCalculator } from "../../calculate/result/squaddieActionResultCalculator"
import type { SquaddieActionResult } from "../../calculate/result/squaddieActionResult"
import { SquaddieAffiliation } from "../../../affiliation/affiliation"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup"
import { OutOfBattleSquaddieManager } from "../../../squaddie/outOfBattle/outOfBattleSquaddieManager"

describe("Squaddie Actions against foes", () => {
    let longswordAction: SquaddieAction
    let lethalLongswordAction: SquaddieAction
    let longswordResults: SquaddieActionResult[]
    let lethalLongswordResults: SquaddieActionResult[]
    let actionManager: SquaddieActionManager

    let soldierAttributeSheet: OutOfBattleSquaddieAttributeSheet

    let actorOutOfBattleSquaddie: OutOfBattleSquaddie
    let actorOutOfBattleSquaddieId: string
    let actorInBattleSquaddieId: number

    let targetOutOfBattleSquaddie: OutOfBattleSquaddie
    let targetOutOfBattleSquaddieId: string
    let targetInBattleSquaddieId: number

    let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    let inBattleSquaddieManager: InBattleSquaddieManager
    let inBattleSquaddieCollection: InBattleSquaddieCollection

    beforeEach(() => {
        const outOfBattleSquaddieManagerResult =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "soldier",
                attributeSheetOptions: {
                    distancePerAction: 2,
                    maxHitPoints: 5,
                    attributeScores: {
                        [AttributeScore.BODY]: 5,
                        [AttributeScore.MIND]: 7,
                        [AttributeScore.SOUL]: 3,
                    },
                    proficiencyLevels: {
                        [ProficiencyType.DEFEND_BODY]: ProficiencyLevel.NOVICE,
                        [ProficiencyType.SKILL_BODY]: ProficiencyLevel.EXPERT,
                    },
                    rank: 3,
                },
            })
        outOfBattleSquaddieManager = outOfBattleSquaddieManagerResult.manager
        soldierAttributeSheet = outOfBattleSquaddieManagerResult.attributeSheet

        actorOutOfBattleSquaddieId = "soldier"
        actorOutOfBattleSquaddie = OutOfBattleSquaddieService.new({
            id: actorOutOfBattleSquaddieId,
            name: "Soldier",
            actionIds: ["longsword"],
            attributeSheetId: "soldier",
            affiliation: SquaddieAffiliation.PLAYER,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(actorOutOfBattleSquaddie)

        targetOutOfBattleSquaddieId = "enemy-soldier"
        targetOutOfBattleSquaddie = OutOfBattleSquaddieService.new({
            id: targetOutOfBattleSquaddieId,
            name: "Soldier",
            actionIds: ["longsword"],
            attributeSheetId: "soldier",
            affiliation: SquaddieAffiliation.ENEMY,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            targetOutOfBattleSquaddie
        )

        inBattleSquaddieCollection = InBattleSquaddieCollectionService.new()
        inBattleSquaddieManager = new InBattleSquaddieManager(
            inBattleSquaddieCollection,
            outOfBattleSquaddieManager
        )
        ;({ inBattleSquaddieId: actorInBattleSquaddieId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: actorOutOfBattleSquaddieId,
            }))
        ;({ inBattleSquaddieId: targetInBattleSquaddieId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
            }))

        longswordAction = SquaddieActionService.new({
            id: "longsword",
            name: "Longsword",
            proficiency: ProficiencyType.WEAPON_MARTIAL,
            targeting: {
                range: ActionRange.MELEE,
                shape: CoordinateGeneratorShape.BLOOM,
                affiliationRelationship: {
                    self: false,
                    friend: false,
                    foe: true,
                },
            },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: {
                        spent: 1,
                    },
                },
            },
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    damage: {
                        raw: 2,
                        targetProficiency: ProficiencyType.ARMOR,
                        attributeScoreType: AttributeScore.BODY,
                    },
                },
            },
        })
        actionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )
        actionManager.addOrUpdate(longswordAction)

        longswordResults = SquaddieActionResultCalculator.calculateResult({
            degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            managers: {
                inBattleSquaddieManager,
                squaddieActionManager: actionManager,
            },
            actor: {
                inBattleSquaddieId: actorInBattleSquaddieId,
                outOfBattleSquaddieId: actorOutOfBattleSquaddieId,
            },
            targets: [
                {
                    inBattleSquaddieId: targetInBattleSquaddieId,
                    outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
                },
            ],
            action: {
                id: longswordAction.id,
            },
        })

        lethalLongswordAction = SquaddieActionService.new({
            id: "lethalLongsword",
            name: "Lethal Longsword",
            proficiency: ProficiencyType.WEAPON_MARTIAL,
            targeting: {
                range: ActionRange.MELEE,
                shape: CoordinateGeneratorShape.BLOOM,
                affiliationRelationship: {
                    self: false,
                    friend: false,
                    foe: true,
                },
            },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: {
                        spent: 1,
                    },
                },
            },
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    damage: {
                        raw: 9001,
                        targetProficiency: ProficiencyType.ARMOR,
                        attributeScoreType: AttributeScore.BODY,
                    },
                },
            },
        })

        actionManager.addOrUpdate(lethalLongswordAction)
        lethalLongswordResults = SquaddieActionResultCalculator.calculateResult(
            {
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager: actionManager,
                },
                actor: {
                    inBattleSquaddieId: actorInBattleSquaddieId,
                    outOfBattleSquaddieId: actorOutOfBattleSquaddieId,
                },
                targets: [
                    {
                        inBattleSquaddieId: targetInBattleSquaddieId,
                        outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
                    },
                ],
                action: {
                    id: lethalLongswordAction.id,
                },
            }
        )
    })

    it("will have results for the actor and targets", () => {
        expect(longswordResults).toHaveLength(2)
    })

    it("will calculate the expected action point spend by the actor", () => {
        expect(longswordResults[0]).toEqual(
            expect.objectContaining({
                inBattleSquaddieId: actorInBattleSquaddieId,
                outOfBattleSquaddieId: actorOutOfBattleSquaddieId,
                actionPoints: {
                    spent: 1,
                },
            })
        )
    })

    it("will calculate damage against the target", () => {
        expect(longswordResults[1]).toEqual(
            expect.objectContaining({
                inBattleSquaddieId: targetInBattleSquaddieId,
                outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
                damage: expect.objectContaining({
                    net: longswordAction.effectOnTarget![
                        DegreeOfSuccess.SUCCESS
                    ].damage!.raw,
                    raw: longswordAction.effectOnTarget![
                        DegreeOfSuccess.SUCCESS
                    ].damage!.raw,
                    willKo: false,
                }),
            })
        )
    })

    it("knows if the damage will ko the target", () => {
        expect(lethalLongswordResults[1]).toEqual(
            expect.objectContaining({
                inBattleSquaddieId: targetInBattleSquaddieId,
                outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
                damage: expect.objectContaining({
                    net: soldierAttributeSheet.maxHitPoints,
                    raw: lethalLongswordAction.effectOnTarget![
                        DegreeOfSuccess.SUCCESS
                    ].damage!.raw,
                    willKo: true,
                }),
            })
        )
    })

    it("can apply the damage to the target", () => {
        ApplyResultService.applyResultsToSquaddies({
            inBattleSquaddieManager,
            results: longswordResults,
        })

        expect(
            inBattleSquaddieManager.getHitPoints({
                inBattleSquaddieId: targetInBattleSquaddieId,
                outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
            })
        ).toEqual(
            expect.objectContaining({
                current:
                    soldierAttributeSheet.maxHitPoints -
                    longswordAction.effectOnTarget![DegreeOfSuccess.SUCCESS]
                        .damage!.raw,
                max: soldierAttributeSheet.maxHitPoints,
            })
        )
    })

    it("will use absorb to reduce damage taken", () => {
        inBattleSquaddieManager.addConditionsToSquaddie({
            inBattleSquaddieId: targetInBattleSquaddieId,
            outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
            conditions: [
                SquaddieConditionService.new({
                    duration: undefined,
                    type: SquaddieConditionType.ABSORB,
                    amount: 1,
                    source: SquaddieConditionSource.PHYSICAL,
                }),
            ],
        })

        const longswordPartiallyAbsorbedResults =
            SquaddieActionResultCalculator.calculateResult({
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager: actionManager,
                },
                actor: {
                    inBattleSquaddieId: actorInBattleSquaddieId,
                    outOfBattleSquaddieId: actorOutOfBattleSquaddieId,
                },
                targets: [
                    {
                        inBattleSquaddieId: targetInBattleSquaddieId,
                        outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
                    },
                ],
                action: {
                    id: longswordAction.id,
                },
            })

        expect(longswordPartiallyAbsorbedResults[1]).toEqual(
            expect.objectContaining({
                inBattleSquaddieId: targetInBattleSquaddieId,
                outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
                damage: expect.objectContaining({
                    net:
                        longswordAction.effectOnTarget![DegreeOfSuccess.SUCCESS]
                            .damage!.raw - 1,
                    absorbed: 1,
                }),
            })
        )

        ApplyResultService.applyResultsToSquaddies({
            inBattleSquaddieManager,
            results: longswordPartiallyAbsorbedResults,
        })

        expect(
            inBattleSquaddieManager.getHitPoints({
                inBattleSquaddieId: targetInBattleSquaddieId,
                outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
            })
        ).toEqual(
            expect.objectContaining({
                current:
                    soldierAttributeSheet.maxHitPoints -
                    longswordAction.effectOnTarget![DegreeOfSuccess.SUCCESS]
                        .damage!.raw +
                    1,
                max: soldierAttributeSheet.maxHitPoints,
            })
        )

        expect(
            inBattleSquaddieManager.calculateConditionAmountForSquaddie({
                inBattleSquaddieId: targetInBattleSquaddieId,
                outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
                conditionType: SquaddieConditionType.ABSORB,
            })
        ).toEqual(0)
    })

    it("can use dispel to remove conditions", () => {
        inBattleSquaddieManager.addConditionsToSquaddie({
            inBattleSquaddieId: targetInBattleSquaddieId,
            outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
            conditions: [
                SquaddieConditionService.new({
                    type: SquaddieConditionType.ARMOR,
                    amount: 3,
                    duration: undefined,
                    source: SquaddieConditionSource.PHYSICAL,
                }),
                SquaddieConditionService.new({
                    type: SquaddieConditionType.ARMOR,
                    amount: -2,
                    duration: undefined,
                    source: SquaddieConditionSource.PHYSICAL,
                }),
                SquaddieConditionService.new({
                    type: SquaddieConditionType.ELUSIVE,
                    amount: undefined,
                    duration: undefined,
                    source: SquaddieConditionSource.PHYSICAL,
                }),
                SquaddieConditionService.new({
                    type: SquaddieConditionType.SLOWED,
                    amount: 1,
                    duration: undefined,
                    source: SquaddieConditionSource.PHYSICAL,
                }),
            ],
        })

        const dispelElusiveAction = SquaddieActionService.new({
            id: "dispelElusive",
            name: "Dispel Elusive",
            affiliationRelationship: {
                self: false,
                friend: false,
                foe: true,
            },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {},
            },
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    conditions: {
                        dispel: {
                            all: false,
                            types: [SquaddieConditionType.ELUSIVE],
                            amount: 1,
                        },
                    },
                },
            },
        })
        actionManager.addOrUpdate(dispelElusiveAction)

        const results = SquaddieActionResultCalculator.calculateResult({
            actor: {
                inBattleSquaddieId: actorInBattleSquaddieId,
                outOfBattleSquaddieId: actorOutOfBattleSquaddieId,
            },
            targets: [
                {
                    inBattleSquaddieId: targetInBattleSquaddieId,
                    outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
                },
            ],
            action: {
                id: dispelElusiveAction.id,
            },
            degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            managers: {
                inBattleSquaddieManager,
                squaddieActionManager: actionManager,
            },
        })

        expect(results[0].outOfBattleSquaddieId).toEqual(
            targetOutOfBattleSquaddieId
        )
        expect(
            results[0].dispel!.dispelledConditions!.get(
                SquaddieConditionType.ELUSIVE
            )
        ).toEqual([
            SquaddieConditionService.new({
                type: SquaddieConditionType.ELUSIVE,
                amount: undefined,
                duration: undefined,
                source: SquaddieConditionSource.PHYSICAL,
            }),
        ])

        ApplyResultService.applyResultsToSquaddies({
            inBattleSquaddieManager,
            results,
        })

        const conditions = inBattleSquaddieManager.getSquaddieConditions({
            inBattleSquaddieId: targetInBattleSquaddieId,
            outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
        })
        expect(conditions.has(SquaddieConditionType.ELUSIVE)).toBeFalsy()
        expect(conditions.get(SquaddieConditionType.ARMOR)).toHaveLength(2)
        expect(conditions.get(SquaddieConditionType.SLOWED)).toHaveLength(1)
    })
})
