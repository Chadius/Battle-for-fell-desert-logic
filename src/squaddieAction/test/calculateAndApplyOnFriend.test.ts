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
import {
    type OutOfBattleSquaddie,
    OutOfBattleSquaddieService,
} from "../../squaddie/outOfBattle/outOfBattleSquaddie.ts"
import { OutOfBattleSquaddieManager } from "../../squaddie/outOfBattle/outOfBattleSquaddieManager.ts"
import { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager.ts"
import {
    type InBattleSquaddieCollection,
    InBattleSquaddieCollectionService,
} from "../../squaddie/inBattle/inBattleSquaddieCollection.ts"
import { OutOfBattleSquaddieCollectionService } from "../../squaddie/outOfBattle/outOfBattleSquaddieCollection.ts"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection.ts"
import { AttributeScore } from "../../proficiency/attributeScore.ts"
import {
    ProficiencyLevel,
    ProficiencyType,
} from "../../proficiency/proficiencyLevel.ts"
import { SquaddieAffiliation } from "../../squaddie/outOfBattle/affiliation.ts"
import { ActionRange } from "../actionRange.ts"
import { CoordinateGeneratorShape } from "../../coordinateMap/shape.ts"
import { SquaddieActionCollectionService } from "../squaddieActionCollection.ts"
import { DegreeOfSuccess } from "../../degreesOfSuccess/degreeOfSuccess.ts"
import { SquaddieActionCalculator } from "../calculate/squaddieActionCalculator.ts"
import type { SquaddieActionResult } from "../calculate/squaddieActionResult.ts"
import { ApplyResultService } from "../apply/applyResultService.ts"

describe("Squaddie Actions on a friend", () => {
    let healingHerbAction: SquaddieAction
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

    const calculateHealingTargetResults = (): SquaddieActionResult[] => {
        return SquaddieActionCalculator.calculateResult({
            degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            inBattleSquaddieManager,
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
                id: healingHerbAction.id,
                manager: actionManager,
            },
        })
    }

    beforeEach(() => {
        outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
            OutOfBattleSquaddieCollectionService.new(),
            OutOfBattleSquaddieAttributeSheetCollectionService.new()
        )

        soldierAttributeSheet = OutOfBattleSquaddieAttributeSheetService.new({
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
        outOfBattleSquaddieManager.addOrUpdateAttributeSheet(
            soldierAttributeSheet
        )

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
            affiliation: SquaddieAffiliation.ALLY,
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

        healingHerbAction = SquaddieActionService.new({
            id: "healingHerb",
            name: "Healing Herb",
            proficiency: ProficiencyType.SKILL_BODY,
            targeting: {
                range: ActionRange.MELEE,
                shape: CoordinateGeneratorShape.BLOOM,
                affiliationRelationship: {
                    self: true,
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
                    healing: {
                        raw: 3,
                    },
                },
            },
        })
        actionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )
        actionManager.addOrUpdate(healingHerbAction)
        calculateHealingTargetResults()
    })

    it("will calculate 0 healing if the target is at full HP", () => {
        expect(calculateHealingTargetResults()[1]).toEqual(
            expect.objectContaining({
                inBattleSquaddieId: targetInBattleSquaddieId,
                outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
                healing: expect.objectContaining({
                    net: 0,
                    raw: healingHerbAction.effectOnTarget![
                        DegreeOfSuccess.SUCCESS
                    ].healing!.raw,
                }),
            })
        )
    })

    it("will calculate healing the target up to full HP", () => {
        inBattleSquaddieManager.dealDamageToSquaddie({
            inBattleSquaddieId: targetInBattleSquaddieId,
            outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
            damage: {
                amount: 2,
                type: AttributeScore.BODY,
            },
        })

        expect(calculateHealingTargetResults()[1]).toEqual(
            expect.objectContaining({
                inBattleSquaddieId: targetInBattleSquaddieId,
                outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
                healing: expect.objectContaining({
                    net: 2,
                    raw: healingHerbAction.effectOnTarget![
                        DegreeOfSuccess.SUCCESS
                    ].healing!.raw,
                }),
            })
        )
    })

    it("can apply the healing to the target", () => {
        inBattleSquaddieManager.dealDamageToSquaddie({
            inBattleSquaddieId: targetInBattleSquaddieId,
            outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
            damage: {
                amount: 4,
                type: AttributeScore.BODY,
            },
        })

        ApplyResultService.applyResultsToSquaddies({
            inBattleSquaddieManager,
            results: calculateHealingTargetResults(),
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
                    4 +
                    healingHerbAction.effectOnTarget![DegreeOfSuccess.SUCCESS]
                        .healing!.raw,
                max: soldierAttributeSheet.maxHitPoints,
            })
        )
    })
})
