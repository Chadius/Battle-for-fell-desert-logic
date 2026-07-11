import { beforeEach, describe, expect, it } from "vitest"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager.js"
import { SquaddieActionManager } from "../../squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../../squaddieActionCollection.js"
import { AttributeScore } from "../../../proficiency/attributeScore.js"
import {
    ProficiencyLevel,
    ProficiencyType,
    type TProficiencyLevel,
    type TProficiencyType,
} from "../../../proficiency/proficiencyLevel.js"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { SquaddieActionService } from "../../squaddieAction.js"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.js"
import { ActionRange } from "../../actionRange.js"
import { SquaddieActionForecastCalculator } from "../../calculate/forecast/squaddieActionForecastCalculator.js"
import { SquaddieAffiliation } from "../../../affiliation/affiliation.js"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup.js"

describe("forecasts on effects on yourself", () => {
    let inBattleSquaddieManager: InBattleSquaddieManager
    let squaddieActionManager: SquaddieActionManager

    beforeEach(() => {
        const outOfBattleSquaddieManagerResult =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "attributeSheet",
                attributeSheetOptions: {
                    attributeScores: {
                        [AttributeScore.BODY]: 1,
                        [AttributeScore.MIND]: 2,
                        [AttributeScore.SOUL]: 3,
                    },
                    maxHitPoints: 10,
                    distancePerAction: 2,
                    proficiencyLevels: new Map<
                        TProficiencyType,
                        TProficiencyLevel
                    >([
                        [
                            ProficiencyType.SKILL_BODY,
                            ProficiencyLevel.UNTRAINED,
                        ],
                        [ProficiencyType.SKILL_MIND, ProficiencyLevel.NOVICE],
                        [ProficiencyType.SKILL_SOUL, ProficiencyLevel.EXPERT],
                        [ProficiencyType.DEFEND_BODY, ProficiencyLevel.MASTER],
                        [
                            ProficiencyType.DEFEND_MIND,
                            ProficiencyLevel.LEGENDARY,
                        ],
                        [
                            ProficiencyType.DEFEND_SOUL,
                            ProficiencyLevel.UNTRAINED,
                        ],
                        [ProficiencyType.ARMOR, ProficiencyLevel.NOVICE],
                        [
                            ProficiencyType.WEAPON_NATURAL,
                            ProficiencyLevel.EXPERT,
                        ],
                        [
                            ProficiencyType.WEAPON_SIMPLE,
                            ProficiencyLevel.MASTER,
                        ],
                        [
                            ProficiencyType.WEAPON_MARTIAL,
                            ProficiencyLevel.LEGENDARY,
                        ],
                    ]),
                    rank: 1,
                },
            })
        const outOfBattleSquaddieManager =
            outOfBattleSquaddieManagerResult.manager

        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: "outOfBattleSquaddie",
                name: "outOfBattleSquaddie",
                affiliation: SquaddieAffiliation.PLAYER,
                attributeSheetId: "attributeSheet",
            })
        )

        inBattleSquaddieManager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            outOfBattleSquaddieManager
        )

        squaddieActionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )
    })

    it("will always succeed if the action always succeeds", () => {
        const hurtsSelf = SquaddieActionService.new({
            id: "hurtsSelf",
            name: "hurtsSelf",
            affiliationRelationship: {
                self: true,
                foe: false,
                friend: false,
            },
            attribute: AttributeScore.BODY,
            degreesOfSuccess: [DegreeOfSuccess.SUCCESS],
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
