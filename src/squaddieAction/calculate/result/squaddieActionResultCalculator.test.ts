import { beforeEach, describe, expect, it } from "vitest"
import { SquaddieActionResultCalculator } from "./squaddieActionResultCalculator"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess"
import { RollGenerator } from "../roll/rollGenerator"
import {
    type SquaddieAction,
    SquaddieActionService,
} from "../../squaddieAction"
import { SquaddieActionManager } from "../../squaddieActionManager"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie"
import type { OutOfBattleSquaddieManager } from "../../../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection"
import { AttributeScore } from "../../../proficiency/attributeScore"
import {
    ProficiencyLevel,
    ProficiencyType,
} from "../../../proficiency/proficiencyLevel"
import { ActionRange } from "../../actionRange"
import { CoordinateGeneratorShape } from "../../../coordinateMap/shape"
import { SquaddieActionCollectionService } from "../../squaddieActionCollection"
import { SquaddieIdConverterService } from "../../../squaddie/idConverterService"
import { SquaddieAffiliation } from "../../../affiliation/affiliation"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup"

describe("SquaddieActionResultCalculator", () => {
    describe("calculateDegreeOfSuccessForTargets", () => {
        describe("base calculations without max/min rolls", () => {
            it("returns SUCCESS when roll total + modifier is non-negative", () => {
                const actorRoll: [number, number] = [3, 4]
                const targetModifiers = new Map([["target1", -2]])

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                        }
                    )

                expect(result.get("target1")).toBe(DegreeOfSuccess.SUCCESS)
            })

            it("returns CRITICAL when roll total + modifier >= 6", () => {
                const actorRoll: [number, number] = [5, 4]
                const targetModifiers = new Map([["target1", -2]])

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                        }
                    )

                expect(result.get("target1")).toBe(DegreeOfSuccess.CRITICAL)
            })

            it("returns FAILURE when roll total + modifier is negative", () => {
                const actorRoll: [number, number] = [2, 2]
                const targetModifiers = new Map([["target1", -6]])

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                        }
                    )

                expect(result.get("target1")).toBe(DegreeOfSuccess.FAILURE)
            })

            it("returns BOTCH when roll total + modifier <= -6", () => {
                const actorRoll: [number, number] = [1, 2]
                const targetModifiers = new Map([["target1", -10]])

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                        }
                    )

                expect(result.get("target1")).toBe(DegreeOfSuccess.BOTCH)
            })
        })

        describe("max roll adjustments", () => {
            it("increases degree by 1 when actor rolls max (6, 6)", () => {
                const actorRoll: [number, number] = [6, 6]
                const targetModifiers = new Map([["target1", -10]])

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                        }
                    )

                expect(result.get("target1")).toBe(DegreeOfSuccess.CRITICAL)
            })
        })

        describe("min roll adjustments", () => {
            it("decreases degree by 1 when actor rolls min (1, 1)", () => {
                const actorRoll: [number, number] = [1, 1]
                const targetModifiers = new Map([["target1", 5]])

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                        }
                    )

                expect(result.get("target1")).toBe(DegreeOfSuccess.SUCCESS)
            })
        })

        describe("degree redistribution", () => {
            it("converts BOTCH to FAILURE when BOTCH not supported", () => {
                const actorRoll: [number, number] = [1, 2]
                const targetModifiers = new Map([["target1", -10]])
                const supportedDegrees = [
                    DegreeOfSuccess.CRITICAL,
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.FAILURE,
                ]

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                            supportedDegreesOfSuccess: supportedDegrees,
                        }
                    )

                expect(result.get("target1")).toBe(DegreeOfSuccess.FAILURE)
            })

            it("converts FAILURE to SUCCESS when FAILURE not supported", () => {
                const actorRoll: [number, number] = [2, 2]
                const targetModifiers = new Map([["target1", -6]])
                const supportedDegrees = [
                    DegreeOfSuccess.CRITICAL,
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.BOTCH,
                ]

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                            supportedDegreesOfSuccess: supportedDegrees,
                        }
                    )

                expect(result.get("target1")).toBe(DegreeOfSuccess.SUCCESS)
            })

            it("keeps BOTCH when BOTCH supported even if FAILURE not supported", () => {
                const actorRoll: [number, number] = [1, 2]
                const targetModifiers = new Map([["target1", -10]])
                const supportedDegrees = [
                    DegreeOfSuccess.CRITICAL,
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.BOTCH,
                ]

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                            supportedDegreesOfSuccess: supportedDegrees,
                        }
                    )

                expect(result.get("target1")).toBe(DegreeOfSuccess.BOTCH)
            })

            it("converts BOTCH to SUCCESS when both BOTCH and FAILURE not supported", () => {
                const actorRoll: [number, number] = [1, 2]
                const targetModifiers = new Map([["target1", -10]])
                const supportedDegrees = [
                    DegreeOfSuccess.CRITICAL,
                    DegreeOfSuccess.SUCCESS,
                ]

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                            supportedDegreesOfSuccess: supportedDegrees,
                        }
                    )

                expect(result.get("target1")).toBe(DegreeOfSuccess.SUCCESS)
            })

            it("converts CRITICAL to SUCCESS when CRITICAL not supported", () => {
                const actorRoll: [number, number] = [5, 4]
                const targetModifiers = new Map([["target1", -2]])
                const supportedDegrees = [
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.FAILURE,
                    DegreeOfSuccess.BOTCH,
                ]

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                            supportedDegreesOfSuccess: supportedDegrees,
                        }
                    )

                expect(result.get("target1")).toBe(DegreeOfSuccess.SUCCESS)
            })
        })

        describe("multiple targets", () => {
            it("calculates degree for each target independently", () => {
                const actorRoll: [number, number] = [4, 3]
                const targetModifiers = new Map([
                    ["weakTarget", 2],
                    ["normalTarget", -2],
                    ["strongTarget", -8],
                ])

                const result =
                    SquaddieActionResultCalculator.calculateDegreeOfSuccessForTargets(
                        {
                            actorRoll,
                            targetModifierDifferences: targetModifiers,
                        }
                    )

                expect(result.get("weakTarget")).toBe(DegreeOfSuccess.CRITICAL)
                expect(result.get("normalTarget")).toBe(DegreeOfSuccess.SUCCESS)
                expect(result.get("strongTarget")).toBe(DegreeOfSuccess.FAILURE)
            })
        })
    })

    describe("calculateActionResultsWithRolls", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
        let actionManager: SquaddieActionManager
        let actor: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }
        let target: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
        let rollGenerator: RollGenerator
        let testAction: SquaddieAction

        beforeEach(() => {
            const outOfBattleSquaddieManagerResult =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
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
                                [ProficiencyType.DEFEND_BODY]:
                                    ProficiencyLevel.NOVICE,
                                [ProficiencyType.SKILL_BODY]:
                                    ProficiencyLevel.EXPERT,
                            },
                            rank: 3,
                        },
                    }
                )
            outOfBattleSquaddieManager =
                outOfBattleSquaddieManagerResult.manager

            const actorSquaddie = OutOfBattleSquaddieService.new({
                id: "actor",
                name: "Actor",
                actionIds: ["test-action"],
                attributeSheetId: "soldier",
                affiliation: SquaddieAffiliation.PLAYER,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(actorSquaddie)

            const targetSquaddie = OutOfBattleSquaddieService.new({
                id: "target",
                name: "Target",
                actionIds: [],
                attributeSheetId: "soldier",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(targetSquaddie)

            const inBattleCollection = InBattleSquaddieCollectionService.new()
            inBattleSquaddieManager = new InBattleSquaddieManager(
                inBattleCollection,
                outOfBattleSquaddieManager
            )

            const { inBattleSquaddieId: actorId } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "actor",
                })
            actor = {
                inBattleSquaddieId: actorId,
                outOfBattleSquaddieId: "actor",
            }

            const { inBattleSquaddieId: targetId } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "target",
                })
            target = {
                inBattleSquaddieId: targetId,
                outOfBattleSquaddieId: "target",
            }

            testAction = SquaddieActionService.new({
                id: "test-action",
                name: "Test Action",
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
                        actionPoints: { spent: 1 },
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
            actionManager.addOrUpdate(testAction)
        })

        it("rolls 2d6 and returns the roll values", () => {
            rollGenerator = new RollGenerator([4, 5])

            const result =
                SquaddieActionResultCalculator.calculateActionResultsWithRolls({
                    actor,
                    targets: [target],
                    action: { id: testAction.id },
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager: actionManager,
                    },
                    rollGenerator,
                })

            expect(result.actorRoll).toEqual([4, 5])
        })

        it("calculates degree of success for each target", () => {
            rollGenerator = new RollGenerator([3, 4])

            const result =
                SquaddieActionResultCalculator.calculateActionResultsWithRolls({
                    actor,
                    targets: [target],
                    action: { id: testAction.id },
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager: actionManager,
                    },
                    rollGenerator,
                })

            const targetKey = SquaddieIdConverterService.squaddieIdToKey(target)
            expect(result.targetResults.has(targetKey)).toBe(true)
            expect(result.targetResults.get(targetKey)?.degreeOfSuccess).toBe(
                DegreeOfSuccess.SUCCESS
            )
        })

        it("generates action results for targets", () => {
            rollGenerator = new RollGenerator([3, 4])

            const result =
                SquaddieActionResultCalculator.calculateActionResultsWithRolls({
                    actor,
                    targets: [target],
                    action: { id: testAction.id },
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager: actionManager,
                    },
                    rollGenerator,
                })

            const targetKey = SquaddieIdConverterService.squaddieIdToKey(target)
            const targetResult = result.targetResults.get(targetKey)

            expect(targetResult?.squaddieActionResults).toBeDefined()
            expect(targetResult?.squaddieActionResults.length).toBeGreaterThan(
                0
            )
        })

        it("handles multiple targets independently", () => {
            rollGenerator = new RollGenerator([3, 4])

            const target2Squaddie = OutOfBattleSquaddieService.new({
                id: "target2",
                name: "Target 2",
                actionIds: [],
                attributeSheetId: "soldier",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(target2Squaddie)

            const { inBattleSquaddieId: target2Id } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "target2",
                })
            const target2 = {
                inBattleSquaddieId: target2Id,
                outOfBattleSquaddieId: "target2",
            }

            const result =
                SquaddieActionResultCalculator.calculateActionResultsWithRolls({
                    actor,
                    targets: [target, target2],
                    action: { id: testAction.id },
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager: actionManager,
                    },
                    rollGenerator,
                })

            expect(result.targetResults.size).toBe(2)

            const targetKey1 =
                SquaddieIdConverterService.squaddieIdToKey(target)
            const targetKey2 =
                SquaddieIdConverterService.squaddieIdToKey(target2)

            expect(result.targetResults.has(targetKey1)).toBe(true)
            expect(result.targetResults.has(targetKey2)).toBe(true)
        })

        describe("when actorRollsToHit is false", () => {
            let noRollAction: SquaddieAction

            beforeEach(() => {
                noRollAction = SquaddieActionService.new({
                    id: "no-roll-action",
                    name: "No Roll Action",
                    actorRollsToHit: false,
                    degreesOfSuccess: [DegreeOfSuccess.SUCCESS],
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
                                attributeScoreType: AttributeScore.BODY,
                            },
                        },
                    },
                })
                actionManager.addOrUpdate(noRollAction)
            })

            it("returns undefined for actorRoll", () => {
                rollGenerator = new RollGenerator([4, 5])

                const result =
                    SquaddieActionResultCalculator.calculateActionResultsWithRolls(
                        {
                            actor,
                            targets: [target],
                            action: { id: noRollAction.id },
                            managers: {
                                inBattleSquaddieManager,
                                squaddieActionManager: actionManager,
                            },
                            rollGenerator,
                        }
                    )

                expect(result.actorRoll).toBeUndefined()
            })

            it("assigns SUCCESS to all targets", () => {
                rollGenerator = new RollGenerator([4, 5])

                const result =
                    SquaddieActionResultCalculator.calculateActionResultsWithRolls(
                        {
                            actor,
                            targets: [target],
                            action: { id: noRollAction.id },
                            managers: {
                                inBattleSquaddieManager,
                                squaddieActionManager: actionManager,
                            },
                            rollGenerator,
                        }
                    )

                const targetKey =
                    SquaddieIdConverterService.squaddieIdToKey(target)
                expect(
                    result.targetResults.get(targetKey)?.degreeOfSuccess
                ).toBe(DegreeOfSuccess.SUCCESS)
            })

            it("still calculates action results with effects applied", () => {
                rollGenerator = new RollGenerator([4, 5])

                const result =
                    SquaddieActionResultCalculator.calculateActionResultsWithRolls(
                        {
                            actor,
                            targets: [target],
                            action: { id: noRollAction.id },
                            managers: {
                                inBattleSquaddieManager,
                                squaddieActionManager: actionManager,
                            },
                            rollGenerator,
                        }
                    )

                const targetKey =
                    SquaddieIdConverterService.squaddieIdToKey(target)
                const targetResult = result.targetResults.get(targetKey)
                expect(targetResult?.squaddieActionResults).toBeDefined()
                expect(
                    targetResult?.squaddieActionResults.length
                ).toBeGreaterThan(0)
            })

            it("does not consume the roll generator", () => {
                rollGenerator = new RollGenerator([4, 5])

                SquaddieActionResultCalculator.calculateActionResultsWithRolls({
                    actor,
                    targets: [target],
                    action: { id: noRollAction.id },
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager: actionManager,
                    },
                    rollGenerator,
                })

                const nextRoll = rollGenerator.roll(2)
                expect(nextRoll).toEqual([4, 5])
            })
        })
    })

    describe("calculateForecastedResults", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
        let actionManager: SquaddieActionManager
        let actor: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }
        let target: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
        let testAction: SquaddieAction

        beforeEach(() => {
            const outOfBattleSquaddieManagerResult =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
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
                                [ProficiencyType.DEFEND_BODY]:
                                    ProficiencyLevel.NOVICE,
                                [ProficiencyType.SKILL_BODY]:
                                    ProficiencyLevel.EXPERT,
                            },
                            rank: 3,
                        },
                    }
                )
            outOfBattleSquaddieManager =
                outOfBattleSquaddieManagerResult.manager

            const actorSquaddie = OutOfBattleSquaddieService.new({
                id: "actor",
                name: "Actor",
                actionIds: ["test-action"],
                attributeSheetId: "soldier",
                affiliation: SquaddieAffiliation.PLAYER,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(actorSquaddie)

            const targetSquaddie = OutOfBattleSquaddieService.new({
                id: "target",
                name: "Target",
                actionIds: [],
                attributeSheetId: "soldier",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(targetSquaddie)

            const inBattleCollection = InBattleSquaddieCollectionService.new()
            inBattleSquaddieManager = new InBattleSquaddieManager(
                inBattleCollection,
                outOfBattleSquaddieManager
            )

            const { inBattleSquaddieId: actorId } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "actor",
                })
            actor = {
                inBattleSquaddieId: actorId,
                outOfBattleSquaddieId: "actor",
            }

            const { inBattleSquaddieId: targetId } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "target",
                })
            target = {
                inBattleSquaddieId: targetId,
                outOfBattleSquaddieId: "target",
            }

            testAction = SquaddieActionService.new({
                id: "test-action",
                name: "Test Action",
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
                        actionPoints: { spent: 1 },
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
            actionManager.addOrUpdate(testAction)
        })

        it("returns forecasted results for each target/degree combo with non-zero chance", () => {
            const results =
                SquaddieActionResultCalculator.calculateForecastedResults({
                    actor,
                    targets: [target],
                    action: {
                        id: testAction.id,
                        manager: actionManager,
                    },
                    inBattleSquaddieManager,
                })

            expect(results.length).toBeGreaterThan(0)
            const successResult = results.find(
                (r) =>
                    r.degreeOfSuccess === DegreeOfSuccess.SUCCESS &&
                    r.battleSquaddieId.inBattleSquaddieId ===
                        target.inBattleSquaddieId
            )
            expect(successResult).toBeDefined()
        })

        it("includes correct chance out of 36 from forecast", () => {
            const results =
                SquaddieActionResultCalculator.calculateForecastedResults({
                    actor,
                    targets: [target],
                    action: {
                        id: testAction.id,
                        manager: actionManager,
                    },
                    inBattleSquaddieManager,
                })

            for (const result of results) {
                expect(result.chanceOutOf36).toBeGreaterThan(0)
                expect(result.chanceOutOf36).toBeLessThanOrEqual(36)
            }
        })

        it("excludes degrees with zero chance when action only supports SUCCESS", () => {
            const successOnlyAction = SquaddieActionService.new({
                id: "success-only-action",
                name: "Success Only Action",
                proficiency: ProficiencyType.WEAPON_MARTIAL,
                degreesOfSuccess: [DegreeOfSuccess.SUCCESS],
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
                        actionPoints: { spent: 1 },
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
            actionManager.addOrUpdate(successOnlyAction)

            const results =
                SquaddieActionResultCalculator.calculateForecastedResults({
                    actor,
                    targets: [target],
                    action: {
                        id: successOnlyAction.id,
                        manager: actionManager,
                    },
                    inBattleSquaddieManager,
                })

            expect(results.length).toBe(1)
            expect(results[0].degreeOfSuccess).toBe(DegreeOfSuccess.SUCCESS)
            expect(results[0].chanceOutOf36).toBe(36)

            const botchResult = results.find(
                (r) => r.degreeOfSuccess === DegreeOfSuccess.BOTCH
            )
            expect(botchResult).toBeUndefined()

            const criticalResult = results.find(
                (r) => r.degreeOfSuccess === DegreeOfSuccess.CRITICAL
            )
            expect(criticalResult).toBeUndefined()

            const failureResult = results.find(
                (r) => r.degreeOfSuccess === DegreeOfSuccess.FAILURE
            )
            expect(failureResult).toBeUndefined()
        })

        it("handles multiple targets", () => {
            const target2Squaddie = OutOfBattleSquaddieService.new({
                id: "target2",
                name: "Target 2",
                actionIds: [],
                attributeSheetId: "soldier",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(target2Squaddie)

            const { inBattleSquaddieId: target2Id } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "target2",
                })
            const target2 = {
                inBattleSquaddieId: target2Id,
                outOfBattleSquaddieId: "target2",
            }

            const results =
                SquaddieActionResultCalculator.calculateForecastedResults({
                    actor,
                    targets: [target, target2],
                    action: {
                        id: testAction.id,
                        manager: actionManager,
                    },
                    inBattleSquaddieManager,
                })

            const target1Results = results.filter(
                (r) =>
                    r.battleSquaddieId.inBattleSquaddieId ===
                    target.inBattleSquaddieId
            )
            const target2Results = results.filter(
                (r) =>
                    r.battleSquaddieId.inBattleSquaddieId ===
                    target2.inBattleSquaddieId
            )

            expect(target1Results.length).toBeGreaterThan(0)
            expect(target2Results.length).toBeGreaterThan(0)
        })
    })

    describe("serializeForecastedActionResult", () => {
        it("converts ForecastedActionResult to serializable format", () => {
            const forecastedResult = {
                battleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie-1",
                },
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                chanceOutOf36: 21,
                squaddieActionResults: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "squaddie-1",
                        damage: {
                            net: 2,
                            raw: 3,
                            absorbed: 1,
                            willKo: false,
                            type: undefined,
                        },
                    },
                ],
            }

            const serialized =
                SquaddieActionResultCalculator.serializeForecastedActionResult(
                    forecastedResult
                )

            expect(serialized.battleSquaddieId.inBattleSquaddieId).toBe(1)
            expect(serialized.battleSquaddieId.outOfBattleSquaddieId).toBe(
                "squaddie-1"
            )
            expect(serialized.degreeOfSuccess).toBe(DegreeOfSuccess.SUCCESS)
            expect(serialized.chanceOutOf36).toBe(21)
            expect(serialized.squaddieActionResults.length).toBe(1)
            expect(serialized.squaddieActionResults[0].damage?.net).toBe(2)
        })

        it("converts array of results with serialize", () => {
            const forecastedResults = [
                {
                    battleSquaddieId: {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "squaddie-1",
                    },
                    degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    chanceOutOf36: 21,
                    squaddieActionResults: [
                        {
                            inBattleSquaddieId: 1,
                            outOfBattleSquaddieId: "squaddie-1",
                        },
                    ],
                },
                {
                    battleSquaddieId: {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "squaddie-1",
                    },
                    degreeOfSuccess: DegreeOfSuccess.CRITICAL,
                    chanceOutOf36: 6,
                    squaddieActionResults: [
                        {
                            inBattleSquaddieId: 1,
                            outOfBattleSquaddieId: "squaddie-1",
                        },
                    ],
                },
            ]

            const serialized =
                SquaddieActionResultCalculator.deserializeSerializedForecastedActionResult(
                    forecastedResults
                )

            expect(serialized.length).toBe(2)
            expect(serialized[0].degreeOfSuccess).toBe(DegreeOfSuccess.SUCCESS)
            expect(serialized[1].degreeOfSuccess).toBe(DegreeOfSuccess.CRITICAL)
        })

        it("serializes result with no Maps to a plain JSON object", () => {
            const forecastedResult = {
                battleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie-1",
                },
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                chanceOutOf36: 21,
                squaddieActionResults: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "squaddie-1",
                        healing: { net: 3, raw: 5 },
                    },
                ],
            }

            const serialized =
                SquaddieActionResultCalculator.serializeForecastedActionResult(
                    forecastedResult
                )

            const jsonString = JSON.stringify(serialized)
            const parsed = JSON.parse(jsonString)

            expect(parsed.battleSquaddieId.inBattleSquaddieId).toBe(1)
            expect(parsed.squaddieActionResults[0].healing.net).toBe(3)
        })
    })

    describe("resolves actor degree to next available when effectOnActor has no entry for the rolled degree", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
        let actionManager: SquaddieActionManager
        let actor: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }
        let target: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }

        beforeEach(() => {
            const outOfBattleSquaddieManagerResult =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "soldier",
                        attributeSheetOptions: {
                            distancePerAction: 2,
                            maxHitPoints: 5,
                            attributeScores: {
                                [AttributeScore.BODY]: 5,
                                [AttributeScore.MIND]: 7,
                                [AttributeScore.SOUL]: 3,
                            },
                            proficiencyLevels: {},
                            rank: 1,
                        },
                    }
                )
            outOfBattleSquaddieManager =
                outOfBattleSquaddieManagerResult.manager

            const actorSquaddie = OutOfBattleSquaddieService.new({
                id: "actor",
                name: "Actor",
                actionIds: [],
                attributeSheetId: "soldier",
                affiliation: SquaddieAffiliation.PLAYER,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(actorSquaddie)

            const targetSquaddie = OutOfBattleSquaddieService.new({
                id: "target",
                name: "Target",
                actionIds: [],
                attributeSheetId: "soldier",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(targetSquaddie)

            const inBattleCollection = InBattleSquaddieCollectionService.new()
            inBattleSquaddieManager = new InBattleSquaddieManager(
                inBattleCollection,
                outOfBattleSquaddieManager
            )

            const { inBattleSquaddieId: actorId } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "actor",
                })
            actor = {
                inBattleSquaddieId: actorId,
                outOfBattleSquaddieId: "actor",
            }

            const { inBattleSquaddieId: targetId } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "target",
                })
            target = {
                inBattleSquaddieId: targetId,
                outOfBattleSquaddieId: "target",
            }

            actionManager = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )
        })

        it("FAILURE with no FAILURE effectOnActor falls back to SUCCESS — actor spends AP, target takes no damage", () => {
            const attackAction = SquaddieActionService.new({
                id: "attack-action",
                name: "Attack",
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
                        actionPoints: { spent: 1 },
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
            actionManager.addOrUpdate(attackAction)

            const results = SquaddieActionResultCalculator.calculateResult({
                actor,
                targets: [target],
                action: { id: attackAction.id },
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager: actionManager,
                },
                degreeOfSuccess: DegreeOfSuccess.FAILURE,
            })

            const actorResult = results.find(
                (r) =>
                    r.inBattleSquaddieId === actor.inBattleSquaddieId &&
                    r.outOfBattleSquaddieId === actor.outOfBattleSquaddieId
            )
            expect(actorResult).toBeDefined()
            expect(actorResult?.actionPoints?.spent).toBe(1)

            const targetResult = results.find(
                (r) =>
                    r.inBattleSquaddieId === target.inBattleSquaddieId &&
                    r.outOfBattleSquaddieId === target.outOfBattleSquaddieId
            )
            expect(targetResult).toBeUndefined()
        })

        it("CRITICAL with no CRITICAL effectOnActor falls back to SUCCESS", () => {
            const attackAction = SquaddieActionService.new({
                id: "crit-action",
                name: "Crit Attack",
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
                        actionPoints: { spent: 1 },
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
            actionManager.addOrUpdate(attackAction)

            const results = SquaddieActionResultCalculator.calculateResult({
                actor,
                targets: [target],
                action: { id: attackAction.id },
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager: actionManager,
                },
                degreeOfSuccess: DegreeOfSuccess.CRITICAL,
            })

            const actorResult = results.find(
                (r) =>
                    r.inBattleSquaddieId === actor.inBattleSquaddieId &&
                    r.outOfBattleSquaddieId === actor.outOfBattleSquaddieId
            )
            expect(actorResult).toBeDefined()
            expect(actorResult?.actionPoints?.spent).toBe(1)

            const targetResult = results.find(
                (r) =>
                    r.inBattleSquaddieId === target.inBattleSquaddieId &&
                    r.outOfBattleSquaddieId === target.outOfBattleSquaddieId
            )
            expect(targetResult).toBeUndefined()
        })

        it("BOTCH with FAILURE effectOnActor available falls back to FAILURE", () => {
            const attackAction = SquaddieActionService.new({
                id: "botch-action",
                name: "Botch Attack",
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
                        actionPoints: { spent: 1 },
                    },
                    [DegreeOfSuccess.FAILURE]: {
                        actionPoints: { spent: 2 },
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
            actionManager.addOrUpdate(attackAction)

            const results = SquaddieActionResultCalculator.calculateResult({
                actor,
                targets: [target],
                action: { id: attackAction.id },
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager: actionManager,
                },
                degreeOfSuccess: DegreeOfSuccess.BOTCH,
            })

            const actorResult = results.find(
                (r) =>
                    r.inBattleSquaddieId === actor.inBattleSquaddieId &&
                    r.outOfBattleSquaddieId === actor.outOfBattleSquaddieId
            )
            expect(actorResult).toBeDefined()
            expect(actorResult?.actionPoints?.spent).toBe(2)

            const targetResult = results.find(
                (r) =>
                    r.inBattleSquaddieId === target.inBattleSquaddieId &&
                    r.outOfBattleSquaddieId === target.outOfBattleSquaddieId
            )
            expect(targetResult).toBeUndefined()
        })

        it("BOTCH with no FAILURE effectOnActor falls back to SUCCESS", () => {
            const attackAction = SquaddieActionService.new({
                id: "botch-to-success-action",
                name: "Botch to Success",
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
                        actionPoints: { spent: 1 },
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
            actionManager.addOrUpdate(attackAction)

            const results = SquaddieActionResultCalculator.calculateResult({
                actor,
                targets: [target],
                action: { id: attackAction.id },
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager: actionManager,
                },
                degreeOfSuccess: DegreeOfSuccess.BOTCH,
            })

            const actorResult = results.find(
                (r) =>
                    r.inBattleSquaddieId === actor.inBattleSquaddieId &&
                    r.outOfBattleSquaddieId === actor.outOfBattleSquaddieId
            )
            expect(actorResult).toBeDefined()
            expect(actorResult?.actionPoints?.spent).toBe(1)

            const targetResult = results.find(
                (r) =>
                    r.inBattleSquaddieId === target.inBattleSquaddieId &&
                    r.outOfBattleSquaddieId === target.outOfBattleSquaddieId
            )
            expect(targetResult).toBeUndefined()
        })

        it("FAILURE with matching FAILURE effectOnActor uses FAILURE directly", () => {
            const attackAction = SquaddieActionService.new({
                id: "failure-action",
                name: "Failure Attack",
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
                        actionPoints: { spent: 1 },
                    },
                    [DegreeOfSuccess.FAILURE]: {
                        actionPoints: { spent: 2 },
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
                    [DegreeOfSuccess.FAILURE]: {
                        damage: {
                            raw: 1,
                            targetProficiency: ProficiencyType.ARMOR,
                            attributeScoreType: AttributeScore.BODY,
                        },
                    },
                },
            })
            actionManager.addOrUpdate(attackAction)

            const results = SquaddieActionResultCalculator.calculateResult({
                actor,
                targets: [target],
                action: { id: attackAction.id },
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager: actionManager,
                },
                degreeOfSuccess: DegreeOfSuccess.FAILURE,
            })

            const actorResult = results.find(
                (r) =>
                    r.inBattleSquaddieId === actor.inBattleSquaddieId &&
                    r.outOfBattleSquaddieId === actor.outOfBattleSquaddieId
            )
            expect(actorResult).toBeDefined()
            expect(actorResult?.actionPoints?.spent).toBe(2)

            const targetResult = results.find(
                (r) =>
                    r.inBattleSquaddieId === target.inBattleSquaddieId &&
                    r.outOfBattleSquaddieId === target.outOfBattleSquaddieId
            )
            expect(targetResult).toBeDefined()
        })
    })

    describe("Multiple Attack Penalty (MAP) in calculateActionResultsWithRolls", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
        let actionManager: SquaddieActionManager
        let actor: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }
        let target: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
        let weaponAction: SquaddieAction
        let nonWeaponAction: SquaddieAction

        beforeEach(() => {
            const outOfBattleSquaddieManagerResult =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "fighter",
                        attributeSheetOptions: {
                            distancePerAction: 2,
                            maxHitPoints: 10,
                            rank: 6,
                        },
                    }
                )
            outOfBattleSquaddieManager =
                outOfBattleSquaddieManagerResult.manager

            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "actor",
                    name: "Fighter",
                    actionIds: [],
                    attributeSheetId: "fighter",
                    affiliation: SquaddieAffiliation.PLAYER,
                })
            )
            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "target",
                    name: "Target",
                    actionIds: [],
                    attributeSheetId: "fighter",
                    affiliation: SquaddieAffiliation.ENEMY,
                })
            )

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )
            const actorCreated = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor",
            })
            actor = {
                inBattleSquaddieId: actorCreated.inBattleSquaddieId,
                outOfBattleSquaddieId: "actor",
            }
            const targetCreated = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "target",
            })
            target = {
                inBattleSquaddieId: targetCreated.inBattleSquaddieId,
                outOfBattleSquaddieId: "target",
            }

            actionManager = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )

            weaponAction = SquaddieActionService.new({
                id: "weapon-attack",
                name: "Weapon Attack",
                proficiency: ProficiencyType.WEAPON_MARTIAL,
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
            actionManager.addOrUpdate(weaponAction)

            nonWeaponAction = SquaddieActionService.new({
                id: "non-weapon",
                name: "Non-Weapon",
                proficiency: ProficiencyType.SKILL_BODY,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: 1,
                            targetProficiency: ProficiencyType.DEFEND_BODY,
                        },
                    },
                },
            })
            actionManager.addOrUpdate(nonWeaponAction)
        })

        it("first attack (count 0) has no MAP penalty", () => {
            const rollGenerator = new RollGenerator([3, 4])
            const targetKey = SquaddieIdConverterService.squaddieIdToKey(target)

            const result =
                SquaddieActionResultCalculator.calculateActionResultsWithRolls({
                    actor,
                    targets: [target],
                    action: { id: weaponAction.id },
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager: actionManager,
                    },
                    rollGenerator,
                })

            expect(result.targetResults.get(targetKey)?.degreeOfSuccess).toBe(
                DegreeOfSuccess.SUCCESS
            )
        })

        it("second attack (count 1) has MAP -3 penalty applied", () => {
            inBattleSquaddieManager.incrementAttackContributionThisTurn({
                ...actor,
                amount: 1,
            })

            const rollGenerator = new RollGenerator([3, 4])
            const targetKey = SquaddieIdConverterService.squaddieIdToKey(target)

            const result =
                SquaddieActionResultCalculator.calculateActionResultsWithRolls({
                    actor,
                    targets: [target],
                    action: { id: weaponAction.id },
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager: actionManager,
                    },
                    rollGenerator,
                })

            expect(result.targetResults.get(targetKey)?.degreeOfSuccess).toBe(
                DegreeOfSuccess.FAILURE
            )
        })

        it("third attack (count 2) has MAP -6 penalty applied", () => {
            inBattleSquaddieManager.incrementAttackContributionThisTurn({
                ...actor,
                amount: 2,
            })

            const rollGenerator = new RollGenerator([5, 6])
            const targetKey = SquaddieIdConverterService.squaddieIdToKey(target)

            const result =
                SquaddieActionResultCalculator.calculateActionResultsWithRolls({
                    actor,
                    targets: [target],
                    action: { id: weaponAction.id },
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager: actionManager,
                    },
                    rollGenerator,
                })

            expect(result.targetResults.get(targetKey)?.degreeOfSuccess).toBe(
                DegreeOfSuccess.FAILURE
            )
        })

        it("non-weapon action does not receive MAP penalty even with high attackContributionThisTurn", () => {
            inBattleSquaddieManager.incrementAttackContributionThisTurn({
                ...actor,
                amount: 5,
            })

            const rollGenerator = new RollGenerator([3, 4])
            const targetKey = SquaddieIdConverterService.squaddieIdToKey(target)

            const result =
                SquaddieActionResultCalculator.calculateActionResultsWithRolls({
                    actor,
                    targets: [target],
                    action: { id: nonWeaponAction.id },
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager: actionManager,
                    },
                    rollGenerator,
                })

            expect(result.targetResults.get(targetKey)?.degreeOfSuccess).toBe(
                DegreeOfSuccess.SUCCESS
            )
        })
    })
})
