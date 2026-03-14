import { beforeEach, describe, expect, it } from "vitest"
import { SquaddieActionService } from "./squaddieAction"
import {
    DegreeOfSuccess,
    type TDegreeOfSuccess,
} from "../degreesOfSuccess/degreeOfSuccess"
import {
    ProficiencyLevel,
    ProficiencyType,
    type TProficiencyLevel,
    type TProficiencyType,
} from "../proficiency/proficiencyLevel"
import { SquaddieActionForecastCalculator } from "./calculate/forecast/squaddieActionForecastCalculator"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../squaddie/inBattle/inBattleSquaddieCollection"
import { SquaddieActionManager } from "./squaddieActionManager"
import { SquaddieActionCollectionService } from "./squaddieActionCollection"
import { OutOfBattleSquaddieTestSetup } from "../testUtils/outOfBattleSquaddieTestSetup"
import {
    AttributeScore,
    type AttributeScoreType,
} from "../proficiency/attributeScore"
import {
    SquaddieAffiliation,
    type TSquaddieAffiliation,
} from "../affiliation/affiliation"
import type { OutOfBattleSquaddieManager } from "../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { OutOfBattleSquaddieService } from "../squaddie/outOfBattle/outOfBattleSquaddie"

describe("SquaddieActionService", () => {
    describe("degreesOfSuccess derivation from effectOnTarget", () => {
        it("derives degreesOfSuccess from effectOnTarget keys when only SUCCESS is defined", () => {
            const action = SquaddieActionService.new({
                id: "scimitar",
                name: "Scimitar",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: 2,
                            targetProficiency: ProficiencyType.ARMOR,
                        },
                    },
                },
            })

            expect(action.degreesOfSuccess).toEqual([DegreeOfSuccess.SUCCESS])
        })

        it("derives degreesOfSuccess from effectOnTarget keys when SUCCESS and FAILURE are defined", () => {
            const action = SquaddieActionService.new({
                id: "risky-attack",
                name: "Risky Attack",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: 3,
                            targetProficiency: ProficiencyType.ARMOR,
                        },
                    },
                    [DegreeOfSuccess.FAILURE]: {},
                },
            })

            const degrees = action.degreesOfSuccess as TDegreeOfSuccess[]
            expect(degrees).toContain(DegreeOfSuccess.SUCCESS)
            expect(degrees).toContain(DegreeOfSuccess.FAILURE)
            expect(degrees).not.toContain(DegreeOfSuccess.CRITICAL)
            expect(degrees).not.toContain(DegreeOfSuccess.BOTCH)
        })

        it("derives all 4 degreesOfSuccess when all 4 are defined in effectOnTarget", () => {
            const action = SquaddieActionService.new({
                id: "full-attack",
                name: "Full Attack",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.CRITICAL]: {
                        damage: {
                            raw: 4,
                            targetProficiency: ProficiencyType.ARMOR,
                        },
                    },
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: 2,
                            targetProficiency: ProficiencyType.ARMOR,
                        },
                    },
                    [DegreeOfSuccess.FAILURE]: {},
                    [DegreeOfSuccess.BOTCH]: {},
                },
            })

            expect(action.degreesOfSuccess).toContain(DegreeOfSuccess.CRITICAL)
            expect(action.degreesOfSuccess).toContain(DegreeOfSuccess.SUCCESS)
            expect(action.degreesOfSuccess).toContain(DegreeOfSuccess.FAILURE)
            expect(action.degreesOfSuccess).toContain(DegreeOfSuccess.BOTCH)
        })

        it("explicit degreesOfSuccess overrides derivation from effectOnTarget", () => {
            const action = SquaddieActionService.new({
                id: "override-action",
                name: "Override Action",
                degreesOfSuccess: [
                    DegreeOfSuccess.CRITICAL,
                    DegreeOfSuccess.SUCCESS,
                ],
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: 2,
                            targetProficiency: ProficiencyType.ARMOR,
                        },
                    },
                },
            })

            expect(action.degreesOfSuccess).toEqual([
                DegreeOfSuccess.CRITICAL,
                DegreeOfSuccess.SUCCESS,
            ])
        })

        it("defaults to [SUCCESS] when no effectOnTarget is defined (actor-only actions)", () => {
            const action = SquaddieActionService.new({
                id: "actor-only",
                name: "Actor Only",
                actorRollsToHit: false,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: "all" },
                    },
                },
            })

            expect(action.degreesOfSuccess).toEqual([DegreeOfSuccess.SUCCESS])
        })
    })

    describe("forecast folds CRITICAL into SUCCESS when effectOnTarget only defines SUCCESS", () => {
        let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
        let inBattleSquaddieManager: InBattleSquaddieManager
        let squaddieActionManager: SquaddieActionManager

        const createAttributeSheetWithProficiency = ({
            attributeSheetId,
            rank,
            proficiencyType,
            proficiencyLevel,
            attributeScores,
        }: {
            attributeSheetId: string
            rank: number
            proficiencyType: TProficiencyType
            proficiencyLevel: TProficiencyLevel
            attributeScores: Partial<Record<AttributeScoreType, number>>
        }) =>
            OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
                id: attributeSheetId,
                attributeScores,
                proficiencyLevels: new Map<TProficiencyType, TProficiencyLevel>(
                    [[proficiencyType, proficiencyLevel]]
                ),
                rank,
            })

        const addSquaddieToManager = ({
            attributeSheetId,
            squaddieId,
            name,
            affiliation,
            rank,
            proficiencyType,
            proficiencyLevel,
            attributeScores,
        }: {
            attributeSheetId: string
            squaddieId: string
            name: string
            affiliation: TSquaddieAffiliation
            rank: number
            proficiencyType: TProficiencyType
            proficiencyLevel: TProficiencyLevel
            attributeScores: Partial<Record<AttributeScoreType, number>>
        }) => {
            const sheet = createAttributeSheetWithProficiency({
                attributeSheetId,
                rank,
                proficiencyType,
                proficiencyLevel,
                attributeScores,
            })
            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(sheet)
            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: squaddieId,
                    name,
                    affiliation,
                    attributeSheetId,
                })
            )
        }

        beforeEach(() => {
            const setup =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet()
            outOfBattleSquaddieManager = setup.manager
            squaddieActionManager = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )
        })

        it("CRITICAL chances fold into SUCCESS when effectOnTarget only has SUCCESS", () => {
            addSquaddieToManager({
                attributeSheetId: "actor_attribute_sheet",
                squaddieId: "actor_squaddie",
                name: "Actor",
                affiliation: SquaddieAffiliation.PLAYER,
                rank: 0,
                proficiencyType: ProficiencyType.SKILL_MIND,
                proficiencyLevel: ProficiencyLevel.UNTRAINED,
                attributeScores: {
                    [AttributeScore.BODY]: 0,
                    [AttributeScore.MIND]: 0,
                    [AttributeScore.SOUL]: 0,
                },
            })

            addSquaddieToManager({
                attributeSheetId: "target_attribute_sheet",
                squaddieId: "target_squaddie",
                name: "Target",
                affiliation: SquaddieAffiliation.ENEMY,
                rank: 0,
                proficiencyType: ProficiencyType.DEFEND_MIND,
                proficiencyLevel: ProficiencyLevel.UNTRAINED,
                attributeScores: {
                    [AttributeScore.BODY]: 0,
                    [AttributeScore.MIND]: -6,
                    [AttributeScore.SOUL]: 0,
                },
            })

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            const actorId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor_squaddie",
            })
            const targetId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "target_squaddie",
            })

            const successOnlyAction = SquaddieActionService.new({
                id: "success-only-action",
                name: "Success Only",
                proficiency: ProficiencyType.SKILL_MIND,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 1 },
                    },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: 2,
                            targetProficiency: ProficiencyType.ARMOR,
                        },
                    },
                },
            })

            squaddieActionManager.addOrUpdate(successOnlyAction)

            const result = SquaddieActionForecastCalculator.forecastChanceToHit(
                {
                    inBattleSquaddieManager,
                    actor: actorId,
                    targets: [targetId],
                    action: {
                        id: successOnlyAction.id,
                        manager: squaddieActionManager,
                    },
                }
            )

            const criticalKey = SquaddieActionForecastCalculator.getForecastKey(
                {
                    ...targetId,
                    degreeOfSuccess: DegreeOfSuccess.CRITICAL,
                }
            )
            const successKey = SquaddieActionForecastCalculator.getForecastKey({
                ...targetId,
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            })

            expect(result.has(criticalKey)).toBe(false)
            expect(result.get(successKey)).toBe(36)
            expect(result.size).toBe(1)
        })
    })
})
