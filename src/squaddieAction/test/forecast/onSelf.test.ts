import { beforeEach, describe, expect, it } from "vitest"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager.ts"
import { OutOfBattleSquaddieManager } from "../../../squaddie/outOfBattle/outOfBattleSquaddieManager.ts"
import {
    type OutOfBattleSquaddieAttributeSheetCollection,
    OutOfBattleSquaddieAttributeSheetCollectionService,
} from "../../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection.ts"
import { SquaddieActionManager } from "../../squaddieActionManager.ts"
import { SquaddieActionCollectionService } from "../../squaddieActionCollection.ts"
import { OutOfBattleSquaddieAttributeSheetService } from "../../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet.ts"
import { AttributeScore } from "../../../proficiency/attributeScore.ts"
import {
    ProficiencyLevel,
    ProficiencyType,
    type TProficiencyLevel,
    type TProficiencyType,
} from "../../../proficiency/proficiencyLevel.ts"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie.ts"
import { SquaddieAffiliation } from "../../../squaddie/outOfBattle/affiliation.ts"
import { OutOfBattleSquaddieCollectionService } from "../../../squaddie/outOfBattle/outOfBattleSquaddieCollection.ts"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection.ts"
import { SquaddieActionService } from "../../squaddieAction.ts"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.ts"
import { ActionRange } from "../../actionRange.ts"
import { SquaddieActionForecastCalculator } from "../../calculate/forecast/squaddieActionForecastCalculator.ts"

describe("forecasts on effects on yourself", () => {
    let inBattleSquaddieManager: InBattleSquaddieManager
    let outOfBattleSquaddieAttributeSheetCollection: OutOfBattleSquaddieAttributeSheetCollection
    let squaddieActionManager: SquaddieActionManager

    beforeEach(() => {
        let attributeSheet = OutOfBattleSquaddieAttributeSheetService.new({
            id: "attributeSheet",
            attributeScores: {
                [AttributeScore.BODY]: 1,
                [AttributeScore.MIND]: 2,
                [AttributeScore.SOUL]: 3,
            },
            maxHitPoints: 10,
            movement: {
                distancePerAction: 2,
            },
            proficiencyLevels: new Map<TProficiencyType, TProficiencyLevel>([
                [ProficiencyType.SKILL_BODY, ProficiencyLevel.UNTRAINED],
                [ProficiencyType.SKILL_MIND, ProficiencyLevel.NOVICE],
                [ProficiencyType.SKILL_SOUL, ProficiencyLevel.EXPERT],
                [ProficiencyType.DEFEND_BODY, ProficiencyLevel.MASTER],
                [ProficiencyType.DEFEND_MIND, ProficiencyLevel.LEGENDARY],
                [ProficiencyType.DEFEND_SOUL, ProficiencyLevel.UNTRAINED],
                [ProficiencyType.ARMOR, ProficiencyLevel.NOVICE],
                [ProficiencyType.WEAPON_NATURAL, ProficiencyLevel.EXPERT],
                [ProficiencyType.WEAPON_SIMPLE, ProficiencyLevel.MASTER],
                [ProficiencyType.WEAPON_MARTIAL, ProficiencyLevel.LEGENDARY],
            ]),
            rank: 1,
        })
        outOfBattleSquaddieAttributeSheetCollection =
            OutOfBattleSquaddieAttributeSheetCollectionService.new()
        outOfBattleSquaddieAttributeSheetCollection =
            OutOfBattleSquaddieAttributeSheetCollectionService.addOrUpdateAttributeSheet(
                {
                    collection: outOfBattleSquaddieAttributeSheetCollection,
                    attributeSheet,
                }
            )

        let outOfBattleSquaddieCollection =
            OutOfBattleSquaddieCollectionService.new()
        outOfBattleSquaddieCollection =
            OutOfBattleSquaddieCollectionService.addOrUpdateOutOfBattleSquaddie(
                {
                    collection: outOfBattleSquaddieCollection,
                    outOfBattleSquaddie: OutOfBattleSquaddieService.new({
                        id: "outOfBattleSquaddie",
                        name: "outOfBattleSquaddie",
                        affiliation: SquaddieAffiliation.PLAYER,
                        attributeSheetId: "attributeSheet",
                    }),
                }
            )

        inBattleSquaddieManager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            new OutOfBattleSquaddieManager(
                outOfBattleSquaddieCollection,
                outOfBattleSquaddieAttributeSheetCollection
            )
        )

        squaddieActionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )
    })

    it("will not apply any defensive bonus", () => {
        const hurtsSelf = SquaddieActionService.new({
            id: "hurtsSelf",
            name: "hurtsSelf",
            affiliationRelationship: {
                self: true,
                foe: false,
                friend: false,
            },
            attribute: AttributeScore.BODY,
            degreesOfSuccess: [
                DegreeOfSuccess.SUCCESS,
                DegreeOfSuccess.FAILURE,
            ],
            range: ActionRange.SELF,
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    damage: {
                        raw: 2,
                        attributeScoreType: AttributeScore.BODY,
                        targetProficiency: ProficiencyType.WEAPON_SIMPLE,
                    },
                    actionPoints: {
                        spent: 1,
                    },
                },
            },
        })
        squaddieActionManager.addOrUpdate(hurtsSelf)

        const squaddieId = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "outOfBattleSquaddie",
        })

        const chanceToHitOutOf36: Map<string, number> =
            SquaddieActionForecastCalculator.forecastChanceToHit({
                inBattleSquaddieManager,
                actor: squaddieId,
                targets: [squaddieId],
                action: {
                    id: "hurtsSelf",
                    manager: squaddieActionManager,
                },
            })
        const forecastKey = SquaddieActionForecastCalculator.getForecastKey({
            ...squaddieId,
            degreeOfSuccess: DegreeOfSuccess.SUCCESS,
        })
        expect(chanceToHitOutOf36.size).toBe(1)
        expect(chanceToHitOutOf36.get(forecastKey)).toBe(36)
    })
})
