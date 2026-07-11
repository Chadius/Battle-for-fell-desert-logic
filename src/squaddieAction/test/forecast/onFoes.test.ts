import { beforeEach, describe, expect, it } from "vitest"
import { SquaddieActionForecastCalculator } from "../../calculate/forecast/squaddieActionForecastCalculator.js"
import { SquaddieActionResultCalculator } from "../../calculate/result/squaddieActionResultCalculator.js"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager.js"
import type { OutOfBattleSquaddieManager } from "../../../squaddie/outOfBattle/outOfBattleSquaddieManager.js"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { SquaddieActionManager } from "../../squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../../squaddieActionCollection.js"
import {
    type SquaddieAction,
    SquaddieActionService,
} from "../../squaddieAction.js"
import {
    ProficiencyLevel,
    ProficiencyType,
    type TProficiencyLevel,
    type TProficiencyType,
} from "../../../proficiency/proficiencyLevel.js"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.js"
import { AttributeScore } from "../../../proficiency/attributeScore.js"
import {
    SquaddieConditionDecaysAt,
    SquaddieConditionService,
    SquaddieConditionSource,
    SquaddieConditionType,
} from "../../../proficiency/squaddieCondition.js"
import {
    SquaddieAffiliation,
    type TSquaddieAffiliation,
} from "../../../affiliation/affiliation.js"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup.js"

describe("SquaddieActionForecastCalculator - Actions on Foes", () => {
    let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    let inBattleSquaddieManager: InBattleSquaddieManager
    let action: SquaddieAction
    let squaddieActionManager: SquaddieActionManager

    beforeEach(() => {
        const outOfBattleSquaddieManagerResult =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet()
        outOfBattleSquaddieManager = outOfBattleSquaddieManagerResult.manager
        squaddieActionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )
    })

    describe("Get probability distribution from modifier difference", () => {
        it("calculates probabilities should add up to 36", () => {
            addSquaddieToManager({
                attributeSheetId: "actor_attribute_sheet",
                squaddieId: "actor_squaddie",
                name: "Actor",
                affiliation: SquaddieAffiliation.PLAYER,
                rank: 1,
                proficiencyType: ProficiencyType.SKILL_MIND,
                proficiencyLevel: ProficiencyLevel.NOVICE,
                attributeScores: {
                    [AttributeScore.BODY]: 0,
                    [AttributeScore.MIND]: 3,
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
                proficiencyLevel: ProficiencyLevel.NOVICE,
                attributeScores: {
                    [AttributeScore.BODY]: 0,
                    [AttributeScore.MIND]: 2 - 6,
                    [AttributeScore.SOUL]: 0,
                },
            })

            initializeManagers()

            const actorId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor_squaddie",
            })
            const targetId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "target_squaddie",
            })

            action = SquaddieActionService.new({
                id: "mind_action",
                name: "Mind Attack",
                proficiency: ProficiencyType.SKILL_MIND,
                degreesOfSuccess: [
                    DegreeOfSuccess.CRITICAL,
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.FAILURE,
                    DegreeOfSuccess.BOTCH,
                ],
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {},
                },
            })

            squaddieActionManager.addOrUpdate(action)

            const result = SquaddieActionForecastCalculator.forecastChanceToHit(
                {
                    inBattleSquaddieManager,
                    actor: actorId,
                    targets: [targetId],
                    action: {
                        id: "mind_action",
                        manager: squaddieActionManager,
                    },
                }
            )

            expect(result.size).toBe(4)

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
            const failureKey = SquaddieActionForecastCalculator.getForecastKey({
                ...targetId,
                degreeOfSuccess: DegreeOfSuccess.FAILURE,
            })
            const botchKey = SquaddieActionForecastCalculator.getForecastKey({
                ...targetId,
                degreeOfSuccess: DegreeOfSuccess.BOTCH,
            })

            expect(result.get(criticalKey)).toBe(33)
            expect(result.get(successKey)).toBe(2)
            expect(result.get(failureKey)).toBe(1)
            expect(result.get(botchKey)).toBe(0)

            const total =
                (result.get(criticalKey) ?? 0) +
                (result.get(successKey) ?? 0) +
                (result.get(failureKey) ?? 0) +
                (result.get(botchKey) ?? 0)
            expect(total).toBe(36)
        })
    })

    describe("Handle multiple targets", () => {
        it("calculates forecasts for 2 targets with different defensive bonuses", () => {
            addSquaddieToManager({
                attributeSheetId: "actor_attribute_sheet",
                squaddieId: "actor_squaddie",
                name: "Actor",
                affiliation: SquaddieAffiliation.PLAYER,
                rank: 1,
                proficiencyType: ProficiencyType.SKILL_MIND,
                proficiencyLevel: ProficiencyLevel.NOVICE,
                attributeScores: {
                    [AttributeScore.BODY]: 0,
                    [AttributeScore.MIND]: 3,
                    [AttributeScore.SOUL]: 0,
                },
            })

            addSquaddieToManager({
                attributeSheetId: "target1_attribute_sheet",
                squaddieId: "target1_squaddie",
                name: "Weak Target, cannot Botch",
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

            addSquaddieToManager({
                attributeSheetId: "target2_attribute_sheet",
                squaddieId: "target2_squaddie",
                name: "Strong Target, very hard to hit",
                affiliation: SquaddieAffiliation.ENEMY,
                rank: 3,
                proficiencyType: ProficiencyType.DEFEND_MIND,
                proficiencyLevel: ProficiencyLevel.MASTER,
                attributeScores: {
                    [AttributeScore.BODY]: 0,
                    [AttributeScore.MIND]: 4 - 6,
                    [AttributeScore.SOUL]: 0,
                },
            })

            initializeManagers()

            const actorId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor_squaddie",
            })
            const target1Id = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "target1_squaddie",
            })
            const target2Id = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "target2_squaddie",
            })

            action = SquaddieActionService.new({
                id: "mind_action",
                name: "Mind Attack",
                proficiency: ProficiencyType.SKILL_MIND,
                degreesOfSuccess: [
                    DegreeOfSuccess.CRITICAL,
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.FAILURE,
                    DegreeOfSuccess.BOTCH,
                ],
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {},
                },
            })

            squaddieActionManager.addOrUpdate(action)

            const result = SquaddieActionForecastCalculator.forecastChanceToHit(
                {
                    inBattleSquaddieManager,
                    actor: actorId,
                    targets: [target1Id, target2Id],
                    action: {
                        id: "mind_action",
                        manager: squaddieActionManager,
                    },
                }
            )

            expect(result.size).toBe(8)

            const target1CriticalKey =
                SquaddieActionForecastCalculator.getForecastKey({
                    ...target1Id,
                    degreeOfSuccess: DegreeOfSuccess.CRITICAL,
                })
            const target1SuccessKey =
                SquaddieActionForecastCalculator.getForecastKey({
                    ...target1Id,
                    degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                })

            const target2CriticalKey =
                SquaddieActionForecastCalculator.getForecastKey({
                    ...target2Id,
                    degreeOfSuccess: DegreeOfSuccess.CRITICAL,
                })
            const target2SuccessKey =
                SquaddieActionForecastCalculator.getForecastKey({
                    ...target2Id,
                    degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                })

            const target1Success = result.get(target1SuccessKey) ?? 0
            const target1Critical = result.get(target1CriticalKey) ?? 0
            const target1TotalHit = target1Critical + target1Success

            const target2Success = result.get(target2SuccessKey) ?? 0
            const target2Critical = result.get(target2CriticalKey) ?? 0
            const target2TotalHit = target2Critical + target2Success

            expect(target1TotalHit).toBeGreaterThan(target2TotalHit)
            expect(target1Critical).toBeGreaterThan(target2Critical)
        })
    })

    describe("Filter degrees based on action constraints", () => {
        it("only shows SUCCESS degree when action supports only SUCCESS", () => {
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

            initializeManagers()

            const actorId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor_squaddie",
            })
            const targetId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "target_squaddie",
            })

            action = SquaddieActionService.new({
                id: "mind_action",
                name: "Always Succeeds",
                proficiency: ProficiencyType.SKILL_MIND,
                degreesOfSuccess: [DegreeOfSuccess.SUCCESS],
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {},
                },
            })

            squaddieActionManager.addOrUpdate(action)

            const result = SquaddieActionForecastCalculator.forecastChanceToHit(
                {
                    inBattleSquaddieManager,
                    actor: actorId,
                    targets: [targetId],
                    action: {
                        id: "mind_action",
                        manager: squaddieActionManager,
                    },
                }
            )

            expect(result.size).toBe(1)
            const successKey = SquaddieActionForecastCalculator.getForecastKey({
                ...targetId,
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            })
            expect(result.get(successKey)).toBe(36)
        })

        it("adds critical chances to success when action cannot critically succeed", () => {
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

            initializeManagers()

            const actorId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor_squaddie",
            })
            const targetId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "target_squaddie",
            })

            action = SquaddieActionService.new({
                id: "mind_action",
                name: "Mind Attack cannot Critical",
                proficiency: ProficiencyType.SKILL_MIND,
                degreesOfSuccess: [
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.FAILURE,
                    DegreeOfSuccess.BOTCH,
                ],
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {},
                },
            })

            squaddieActionManager.addOrUpdate(action)

            const result = SquaddieActionForecastCalculator.forecastChanceToHit(
                {
                    inBattleSquaddieManager,
                    actor: actorId,
                    targets: [targetId],
                    action: {
                        id: "mind_action",
                        manager: squaddieActionManager,
                    },
                }
            )

            expect(result.size).toBe(3)
            const criticalKey = SquaddieActionForecastCalculator.getForecastKey(
                {
                    ...targetId,
                    degreeOfSuccess: DegreeOfSuccess.CRITICAL,
                }
            )
            expect(result.has(criticalKey)).toBe(false)

            const successKey = SquaddieActionForecastCalculator.getForecastKey({
                ...targetId,
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            })
            expect(result.get(successKey)).toBe(35)

            const failureKey = SquaddieActionForecastCalculator.getForecastKey({
                ...targetId,
                degreeOfSuccess: DegreeOfSuccess.FAILURE,
            })
            expect(result.get(failureKey)).toBe(1)

            const botchKey = SquaddieActionForecastCalculator.getForecastKey({
                ...targetId,
                degreeOfSuccess: DegreeOfSuccess.BOTCH,
            })
            expect(result.get(botchKey)).toBe(0)
        })

        it("adds botch chances to failure when action cannot botch", () => {
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
                name: "Target, will probably fail",
                affiliation: SquaddieAffiliation.ENEMY,
                rank: 3,
                proficiencyType: ProficiencyType.DEFEND_MIND,
                proficiencyLevel: ProficiencyLevel.MASTER,
                attributeScores: {
                    [AttributeScore.BODY]: 0,
                    [AttributeScore.MIND]: 4 - 6,
                    [AttributeScore.SOUL]: 0,
                },
            })

            initializeManagers()

            const actorId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor_squaddie",
            })
            const targetId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "target_squaddie",
            })

            action = SquaddieActionService.new({
                id: "mind_action",
                name: "Mind Attack cannot Botch",
                proficiency: ProficiencyType.SKILL_MIND,
                degreesOfSuccess: [
                    DegreeOfSuccess.CRITICAL,
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.FAILURE,
                ],
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {},
                },
            })

            squaddieActionManager.addOrUpdate(action)

            const resultWithoutBotch =
                SquaddieActionForecastCalculator.forecastChanceToHit({
                    inBattleSquaddieManager,
                    actor: actorId,
                    targets: [targetId],
                    action: {
                        id: "mind_action",
                        manager: squaddieActionManager,
                    },
                })

            expect(resultWithoutBotch.size).toBe(3)
            const botchKey = SquaddieActionForecastCalculator.getForecastKey({
                ...targetId,
                degreeOfSuccess: DegreeOfSuccess.BOTCH,
            })
            expect(resultWithoutBotch.has(botchKey)).toBe(false)

            const criticalKey = SquaddieActionForecastCalculator.getForecastKey(
                {
                    ...targetId,
                    degreeOfSuccess: DegreeOfSuccess.CRITICAL,
                }
            )
            expect(resultWithoutBotch.get(criticalKey)).toBe(1)

            const successKey = SquaddieActionForecastCalculator.getForecastKey({
                ...targetId,
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            })
            expect(resultWithoutBotch.get(successKey)).toBe(5)

            const failureKey = SquaddieActionForecastCalculator.getForecastKey({
                ...targetId,
                degreeOfSuccess: DegreeOfSuccess.FAILURE,
            })
            expect(resultWithoutBotch.get(failureKey)).toBe(30)
        })
    })

    describe("Verify proficiency type mapping", () => {
        it("uses DEFEND_MIND proficiency when action uses SKILL_MIND", () => {
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
                name: "Target is very resistant to Mind attacks",
                affiliation: SquaddieAffiliation.ENEMY,
                rank: 5,
                proficiencyType: ProficiencyType.DEFEND_MIND,
                proficiencyLevel: ProficiencyLevel.LEGENDARY,
                attributeScores: {
                    [AttributeScore.BODY]: 0,
                    [AttributeScore.MIND]: 11 - 6,
                    [AttributeScore.SOUL]: 0,
                },
            })

            initializeManagers()

            const actorId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor_squaddie",
            })
            const targetId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "target_squaddie",
            })

            action = SquaddieActionService.new({
                id: "mind_action",
                name: "Mind Attack will not succeed against the target",
                proficiency: ProficiencyType.SKILL_MIND,
                degreesOfSuccess: [
                    DegreeOfSuccess.CRITICAL,
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.FAILURE,
                    DegreeOfSuccess.BOTCH,
                ],
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {},
                },
            })

            squaddieActionManager.addOrUpdate(action)

            const resultCannotSucceed =
                SquaddieActionForecastCalculator.forecastChanceToHit({
                    inBattleSquaddieManager,
                    actor: actorId,
                    targets: [targetId],
                    action: {
                        id: "mind_action",
                        manager: squaddieActionManager,
                    },
                })

            expect(resultCannotSucceed.size).toBe(4)

            const criticalKey = SquaddieActionForecastCalculator.getForecastKey(
                {
                    ...targetId,
                    degreeOfSuccess: DegreeOfSuccess.CRITICAL,
                }
            )
            expect(resultCannotSucceed.get(criticalKey)).toBe(0)

            const successKey = SquaddieActionForecastCalculator.getForecastKey({
                ...targetId,
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            })
            expect(resultCannotSucceed.get(successKey)).toBe(0)

            const failureKey = SquaddieActionForecastCalculator.getForecastKey({
                ...targetId,
                degreeOfSuccess: DegreeOfSuccess.FAILURE,
            })
            expect(resultCannotSucceed.get(failureKey)).toBeGreaterThan(0)

            const botchKey = SquaddieActionForecastCalculator.getForecastKey({
                ...targetId,
                degreeOfSuccess: DegreeOfSuccess.BOTCH,
            })
            expect(resultCannotSucceed.get(botchKey)).toBeGreaterThan(0)
        })
    })

    describe("Handle ARMOR conditions for WEAPON proficiencies", () => {
        it("applies ARMOR condition when actor uses WEAPON proficiency", () => {
            addSquaddieToManager({
                attributeSheetId: "actor_attribute_sheet",
                squaddieId: "actor_squaddie",
                name: "Actor",
                affiliation: SquaddieAffiliation.PLAYER,
                rank: 1,
                proficiencyType: ProficiencyType.WEAPON_SIMPLE,
                proficiencyLevel: ProficiencyLevel.NOVICE,
                attributeScores: {
                    [AttributeScore.BODY]: 3,
                    [AttributeScore.MIND]: 0,
                    [AttributeScore.SOUL]: 0,
                },
            })

            addSquaddieToManager({
                attributeSheetId: "target_attribute_sheet",
                squaddieId: "target_squaddie",
                name: "Armored Target",
                affiliation: SquaddieAffiliation.ENEMY,
                rank: 0,
                proficiencyType: ProficiencyType.ARMOR,
                proficiencyLevel: ProficiencyLevel.UNTRAINED,
                attributeScores: {
                    [AttributeScore.BODY]: 0,
                    [AttributeScore.MIND]: 0 - 6,
                    [AttributeScore.SOUL]: 0,
                },
            })

            initializeManagers()

            const actorId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor_squaddie",
            })
            const targetId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "target_squaddie",
            })

            const armorCondition = SquaddieConditionService.new({
                type: SquaddieConditionType.ARMOR,
                duration: {
                    duration: 10,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                amount: { amount: 14 },
                source: SquaddieConditionSource.PHYSICAL,
            })
            inBattleSquaddieManager.addConditionsToSquaddie({
                inBattleSquaddieId: targetId.inBattleSquaddieId,
                outOfBattleSquaddieId: targetId.outOfBattleSquaddieId,
                conditions: [armorCondition],
            })

            action = SquaddieActionService.new({
                id: "weapon_action",
                name: "Weapon Attack",
                proficiency: ProficiencyType.WEAPON_SIMPLE,
                degreesOfSuccess: [
                    DegreeOfSuccess.CRITICAL,
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.FAILURE,
                    DegreeOfSuccess.BOTCH,
                ],
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {},
                },
            })

            squaddieActionManager.addOrUpdate(action)

            const resultCannotCriticalAndWillLikelyFail =
                SquaddieActionForecastCalculator.forecastChanceToHit({
                    inBattleSquaddieManager,
                    actor: actorId,
                    targets: [targetId],
                    action: {
                        id: "weapon_action",
                        manager: squaddieActionManager,
                    },
                })

            expect(resultCannotCriticalAndWillLikelyFail.size).toBe(4)

            const criticalKey = SquaddieActionForecastCalculator.getForecastKey(
                {
                    ...targetId,
                    degreeOfSuccess: DegreeOfSuccess.CRITICAL,
                }
            )
            expect(resultCannotCriticalAndWillLikelyFail.get(criticalKey)).toBe(
                0
            )

            const successKey = SquaddieActionForecastCalculator.getForecastKey({
                ...targetId,
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            })
            expect(resultCannotCriticalAndWillLikelyFail.get(successKey)).toBe(
                1
            )

            const failureKey = SquaddieActionForecastCalculator.getForecastKey({
                ...targetId,
                degreeOfSuccess: DegreeOfSuccess.FAILURE,
            })
            expect(resultCannotCriticalAndWillLikelyFail.get(failureKey)).toBe(
                0
            )

            const botchKey = SquaddieActionForecastCalculator.getForecastKey({
                ...targetId,
                degreeOfSuccess: DegreeOfSuccess.BOTCH,
            })
            expect(resultCannotCriticalAndWillLikelyFail.get(botchKey)).toBe(35)
        })
    })

    describe("Handle ABSORB conditions for target", () => {
        const setupActorAndTarget = () => {
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

            initializeManagers()

            const actorId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor_squaddie",
            })
            const targetId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "target_squaddie",
            })

            return { actorId, targetId }
        }

        const createGuaranteedSuccessAttack = (rawDamage: number) =>
            SquaddieActionService.new({
                id: "attack_action",
                name: "Attack",
                proficiency: ProficiencyType.SKILL_MIND,
                degreesOfSuccess: [DegreeOfSuccess.SUCCESS],
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {},
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: rawDamage,
                            targetProficiency: ProficiencyType.DEFEND_MIND,
                        },
                    },
                },
            })

        it("partially absorbs damage when ABSORB amount is less than raw damage", () => {
            const { actorId, targetId } = setupActorAndTarget()

            const absorbCondition = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                duration: {
                    duration: 10,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                amount: { amount: 1 },
                source: SquaddieConditionSource.PHYSICAL,
            })
            inBattleSquaddieManager.addConditionsToSquaddie({
                inBattleSquaddieId: targetId.inBattleSquaddieId,
                outOfBattleSquaddieId: targetId.outOfBattleSquaddieId,
                conditions: [absorbCondition],
            })

            action = createGuaranteedSuccessAttack(2)
            squaddieActionManager.addOrUpdate(action)

            const results =
                SquaddieActionResultCalculator.calculateForecastedResults({
                    actor: actorId,
                    targets: [targetId],
                    action: { id: action.id, manager: squaddieActionManager },
                    inBattleSquaddieManager,
                })

            const successResult = results.find(
                (r) => r.degreeOfSuccess === DegreeOfSuccess.SUCCESS
            )
            const targetActionResult =
                successResult?.squaddieActionResults.find(
                    (r) => r.inBattleSquaddieId === targetId.inBattleSquaddieId
                )
            expect(targetActionResult?.damage).toEqual(
                expect.objectContaining({ net: 1, absorbed: 1 })
            )
        })

        it("fully absorbs damage when ABSORB amount exceeds raw damage", () => {
            const { actorId, targetId } = setupActorAndTarget()

            const absorbCondition = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                duration: {
                    duration: 10,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                amount: { amount: 3 },
                source: SquaddieConditionSource.PHYSICAL,
            })
            inBattleSquaddieManager.addConditionsToSquaddie({
                inBattleSquaddieId: targetId.inBattleSquaddieId,
                outOfBattleSquaddieId: targetId.outOfBattleSquaddieId,
                conditions: [absorbCondition],
            })

            action = createGuaranteedSuccessAttack(2)
            squaddieActionManager.addOrUpdate(action)

            const results =
                SquaddieActionResultCalculator.calculateForecastedResults({
                    actor: actorId,
                    targets: [targetId],
                    action: { id: action.id, manager: squaddieActionManager },
                    inBattleSquaddieManager,
                })

            const successResult = results.find(
                (r) => r.degreeOfSuccess === DegreeOfSuccess.SUCCESS
            )
            const targetActionResult =
                successResult?.squaddieActionResults.find(
                    (r) => r.inBattleSquaddieId === targetId.inBattleSquaddieId
                )
            expect(targetActionResult?.damage).toEqual(
                expect.objectContaining({ net: 0, absorbed: 2 })
            )
        })

        it("ABSORB condition does not change the chance to hit", () => {
            const { actorId, targetId } = setupActorAndTarget()

            action = SquaddieActionService.new({
                id: "attack_action",
                name: "Attack",
                proficiency: ProficiencyType.SKILL_MIND,
                degreesOfSuccess: [
                    DegreeOfSuccess.CRITICAL,
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.FAILURE,
                    DegreeOfSuccess.BOTCH,
                ],
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {},
                },
            })
            squaddieActionManager.addOrUpdate(action)

            const chancesWithoutAbsorb =
                SquaddieActionForecastCalculator.forecastChanceToHit({
                    inBattleSquaddieManager,
                    actor: actorId,
                    targets: [targetId],
                    action: {
                        id: action.id,
                        manager: squaddieActionManager,
                    },
                })

            const absorbCondition = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                duration: {
                    duration: 10,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                amount: { amount: 1 },
                source: SquaddieConditionSource.PHYSICAL,
            })
            inBattleSquaddieManager.addConditionsToSquaddie({
                inBattleSquaddieId: targetId.inBattleSquaddieId,
                outOfBattleSquaddieId: targetId.outOfBattleSquaddieId,
                conditions: [absorbCondition],
            })

            const chancesWithAbsorb =
                SquaddieActionForecastCalculator.forecastChanceToHit({
                    inBattleSquaddieManager,
                    actor: actorId,
                    targets: [targetId],
                    action: {
                        id: action.id,
                        manager: squaddieActionManager,
                    },
                })

            expect(chancesWithAbsorb.size).toBe(chancesWithoutAbsorb.size)
            for (const [key, chance] of chancesWithoutAbsorb) {
                expect(chancesWithAbsorb.get(key)).toBe(chance)
            }
        })

        it("the highest ABSORB amount is used, not the sum of all ABSORB amounts", () => {
            const { actorId, targetId } = setupActorAndTarget()

            const absorbCondition1 = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                duration: {
                    duration: 5,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                amount: { amount: 2 },
                source: SquaddieConditionSource.ELEMENTAL,
            })
            const absorbCondition2 = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                duration: {
                    duration: 10,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                amount: { amount: 3 },
                source: SquaddieConditionSource.ELEMENTAL,
            })
            inBattleSquaddieManager.addConditionsToSquaddie({
                inBattleSquaddieId: targetId.inBattleSquaddieId,
                outOfBattleSquaddieId: targetId.outOfBattleSquaddieId,
                conditions: [absorbCondition1, absorbCondition2],
            })

            action = createGuaranteedSuccessAttack(4)
            squaddieActionManager.addOrUpdate(action)

            const results =
                SquaddieActionResultCalculator.calculateForecastedResults({
                    actor: actorId,
                    targets: [targetId],
                    action: { id: action.id, manager: squaddieActionManager },
                    inBattleSquaddieManager,
                })

            const successResult = results.find(
                (r) => r.degreeOfSuccess === DegreeOfSuccess.SUCCESS
            )
            const targetActionResult =
                successResult?.squaddieActionResults.find(
                    (r) => r.inBattleSquaddieId === targetId.inBattleSquaddieId
                )
            expect(targetActionResult?.damage).toEqual(
                expect.objectContaining({ net: 1, absorbed: 3 })
            )
        })

        it("ABSORB from different sources stacks — cross-source sum absorbs all damage", () => {
            const { actorId, targetId } = setupActorAndTarget()

            const absorbElemental = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                duration: {
                    duration: 5,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                amount: { amount: 2 },
                source: SquaddieConditionSource.ELEMENTAL,
            })
            const absorbSpiritual = SquaddieConditionService.new({
                type: SquaddieConditionType.ABSORB,
                duration: {
                    duration: 5,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                amount: { amount: 3 },
                source: SquaddieConditionSource.SPIRITUAL,
            })
            inBattleSquaddieManager.addConditionsToSquaddie({
                inBattleSquaddieId: targetId.inBattleSquaddieId,
                outOfBattleSquaddieId: targetId.outOfBattleSquaddieId,
                conditions: [absorbElemental, absorbSpiritual],
            })

            action = createGuaranteedSuccessAttack(4)
            squaddieActionManager.addOrUpdate(action)

            const results =
                SquaddieActionResultCalculator.calculateForecastedResults({
                    actor: actorId,
                    targets: [targetId],
                    action: { id: action.id, manager: squaddieActionManager },
                    inBattleSquaddieManager,
                })

            const successResult = results.find(
                (r) => r.degreeOfSuccess === DegreeOfSuccess.SUCCESS
            )
            const targetActionResult =
                successResult?.squaddieActionResults.find(
                    (r) => r.inBattleSquaddieId === targetId.inBattleSquaddieId
                )
            expect(targetActionResult?.damage).toEqual(
                expect.objectContaining({ net: 0, absorbed: 4 })
            )
        })
    })

    const createAttributeSheetWithProficiency = ({
        id,
        rank,
        proficiencyType,
        proficiencyLevel,
        attributeScores,
    }: {
        id: string
        rank: number
        proficiencyType: TProficiencyType
        proficiencyLevel: TProficiencyLevel
        attributeScores: {
            [AttributeScore.BODY]: number
            [AttributeScore.MIND]: number
            [AttributeScore.SOUL]: number
        }
    }) => {
        return OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
            id,
            attributeScores,
            proficiencyLevels: new Map<TProficiencyType, TProficiencyLevel>([
                [proficiencyType, proficiencyLevel],
            ]),
            rank,
        })
    }

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
        attributeScores: {
            [AttributeScore.BODY]: number
            [AttributeScore.MIND]: number
            [AttributeScore.SOUL]: number
        }
    }) => {
        const attributeSheet = createAttributeSheetWithProficiency({
            id: attributeSheetId,
            rank,
            proficiencyType,
            proficiencyLevel,
            attributeScores,
        })

        outOfBattleSquaddieManager.addOrUpdateAttributeSheet(attributeSheet)
        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: squaddieId,
                name,
                affiliation,
                attributeSheetId,
            })
        )
    }

    const initializeManagers = () => {
        inBattleSquaddieManager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            outOfBattleSquaddieManager
        )
    }
})
