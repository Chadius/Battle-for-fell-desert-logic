import { beforeEach, describe, expect, it } from "vitest"
import {
    type SquaddieAction,
    SquaddieActionService,
} from "../squaddieAction.ts"
import { SquaddieActionManager } from "../squaddieActionManager.ts"
import {
    type OutOfBattleSquaddieAttributeSheet,
    OutOfBattleSquaddieAttributeSheetService,
} from "../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet.ts"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection.ts"
import { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager.ts"
import {
    type InBattleSquaddieCollection,
    InBattleSquaddieCollectionService,
} from "../../squaddie/inBattle/inBattleSquaddieCollection.ts"
import { OutOfBattleSquaddieManager } from "../../squaddie/outOfBattle/outOfBattleSquaddieManager.ts"
import { OutOfBattleSquaddieCollectionService } from "../../squaddie/outOfBattle/outOfBattleSquaddieCollection.ts"
import { AttributeScore } from "../../proficiency/attributeScore.ts"
import {
    ProficiencyLevel,
    ProficiencyType,
} from "../../proficiency/proficiencyLevel.ts"
import {
    type OutOfBattleSquaddie,
    OutOfBattleSquaddieService,
} from "../../squaddie/outOfBattle/outOfBattleSquaddie.ts"
import { SquaddieAffiliation } from "../../squaddie/outOfBattle/affiliation.ts"
import { SquaddieActionCollectionService } from "../squaddieActionCollection.ts"
import { ActionRange } from "../actionRange.ts"
import { CoordinateGeneratorShape } from "../../coordinateMap/shape.ts"
import { SquaddieActionCalculator } from "../calculate/squaddieActionCalculator.ts"
import { DegreeOfSuccess } from "../../degreesOfSuccess/degreeOfSuccess.ts"
import { ApplyResultService } from "../apply/applyResultService.ts"
import {
    SquaddieConditionService,
    SquaddieConditionType,
} from "../../proficiency/squaddieCondition.ts"

describe("Squaddie resolves actions on themself", () => {
    let endTurnAction: SquaddieAction
    let raiseShieldAction: SquaddieAction
    let actionManager: SquaddieActionManager

    let attributeSheet: OutOfBattleSquaddieAttributeSheet
    let outOfBattleSquaddie: OutOfBattleSquaddie
    let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    let outOfBattleSquaddieId: string

    let inBattleSquaddieManager: InBattleSquaddieManager
    let inBattleSquaddieCollection: InBattleSquaddieCollection
    let inBattleSquaddieId: number

    beforeEach(() => {
        outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
            OutOfBattleSquaddieCollectionService.new(),
            OutOfBattleSquaddieAttributeSheetCollectionService.new()
        )
        attributeSheet = OutOfBattleSquaddieAttributeSheetService.new({
            id: "soldier",
            movementPerAction: 2,
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
        })
        outOfBattleSquaddieManager.addOrUpdateAttributeSheet(attributeSheet)

        outOfBattleSquaddieId = "soldier"
        outOfBattleSquaddie = OutOfBattleSquaddieService.new({
            id: outOfBattleSquaddieId,
            name: "Soldier",
            actionIds: ["endTurn"],
            attributeSheetId: "soldier",
            affiliation: SquaddieAffiliation.PLAYER,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(outOfBattleSquaddie)

        inBattleSquaddieCollection = InBattleSquaddieCollectionService.new()
        inBattleSquaddieManager = new InBattleSquaddieManager(
            inBattleSquaddieCollection,
            outOfBattleSquaddieManager
        )
        ;({ inBattleSquaddieId } = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId,
        }))

        actionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )
        endTurnAction = SquaddieActionService.new({
            id: "endTurn",
            name: "End Turn",
            proficiency: ProficiencyType.UNKNOWN,
            targeting: {
                range: ActionRange.SELF,
                shape: CoordinateGeneratorShape.BLOOM,
                affiliationRelationship: {
                    self: true,
                    friend: false,
                    foe: false,
                },
            },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: {
                        spent: "all",
                    },
                },
            },
        })
        actionManager.addOrUpdate(endTurnAction)
        raiseShieldAction = SquaddieActionService.new({
            id: "raiseShield",
            name: "Raise Shield",
            proficiency: ProficiencyType.UNKNOWN,
            targeting: {
                range: ActionRange.SELF,
                shape: CoordinateGeneratorShape.BLOOM,
                affiliationRelationship: {
                    self: true,
                    friend: false,
                    foe: false,
                },
            },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    conditions: {
                        add: [
                            SquaddieConditionService.new({
                                type: SquaddieConditionType.ARMOR,
                                amount: 1,
                                duration: 1,
                            }),
                            SquaddieConditionService.new({
                                type: SquaddieConditionType.ARMOR,
                                amount: 1,
                                duration: 1,
                            }),
                        ],
                    },
                },
            },
        })
        actionManager.addOrUpdate(raiseShieldAction)
    })

    it("will calculate removing all actions when squaddie uses End Turn without actually changing squaddie", () => {
        const startingActionPoints = inBattleSquaddieManager.getActionPoints({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
        }).current

        const results = SquaddieActionCalculator.calculateResult({
            degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            inBattleSquaddieManager,
            actor: {
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            },
            targets: [
                {
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                },
            ],
            action: {
                id: endTurnAction.id,
                manager: actionManager,
            },
        })

        expect(results).toHaveLength(1)
        expect(results[0]).toEqual(
            expect.objectContaining({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
                actionPoints: {
                    spent: 3,
                },
            })
        )

        expect(
            inBattleSquaddieManager.getActionPoints({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            }).current
        ).toEqual(startingActionPoints)
    })

    it("will apply removing all actions when squaddie uses End Turn without actually changing squaddie", () => {
        const results = SquaddieActionCalculator.calculateResult({
            degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            inBattleSquaddieManager,
            actor: {
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            },
            targets: [
                {
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                },
            ],
            action: {
                id: endTurnAction.id,
                manager: actionManager,
            },
        })

        ApplyResultService.applyResultsToSquaddies({
            inBattleSquaddieManager,
            results,
        })

        expect(
            inBattleSquaddieManager.getActionPoints({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            }).current
        ).toEqual(0)
    })

    it("can add conditions", () => {
        const results = SquaddieActionCalculator.calculateResult({
            degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            inBattleSquaddieManager,
            actor: {
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            },
            targets: [
                {
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                },
            ],
            action: {
                id: raiseShieldAction.id,
                manager: actionManager,
            },
        })

        expect(results[0]).toEqual({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
            conditionsAdded: [
                SquaddieConditionService.new({
                    type: SquaddieConditionType.ARMOR,
                    amount: 1,
                    duration: 1,
                }),
            ],
        })

        expect(
            inBattleSquaddieManager.calculateConditionAmountForSquaddie({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
                conditionType: SquaddieConditionType.ARMOR,
            })
        ).toEqual(0)

        ApplyResultService.applyResultsToSquaddies({
            inBattleSquaddieManager,
            results,
        })

        expect(
            inBattleSquaddieManager.calculateConditionAmountForSquaddie({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
                conditionType: SquaddieConditionType.ARMOR,
            })
        ).toEqual(1)
    })
})
