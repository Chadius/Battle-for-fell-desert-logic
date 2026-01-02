import { beforeEach, describe, expect, it } from "vitest"
import { SquaddieActionResultCalculator } from "./squaddieActionResultCalculator"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess"
import { RollGenerator } from "../roll/rollGenerator"
import {
    type SquaddieAction,
    SquaddieActionService,
} from "../../squaddieAction"
import { SquaddieActionManager } from "../../squaddieActionManager"
import { OutOfBattleSquaddieAttributeSheetService } from "../../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { OutOfBattleSquaddieManager } from "../../../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection"
import { OutOfBattleSquaddieCollectionService } from "../../../squaddie/outOfBattle/outOfBattleSquaddieCollection"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection"
import { AttributeScore } from "../../../proficiency/attributeScore"
import {
    ProficiencyLevel,
    ProficiencyType,
} from "../../../proficiency/proficiencyLevel"
import { SquaddieAffiliation } from "../../../squaddie/outOfBattle/affiliation"
import { ActionRange } from "../../actionRange"
import { CoordinateGeneratorShape } from "../../../coordinateMap/shape"
import { SquaddieActionCollectionService } from "../../squaddieActionCollection"
import { SquaddieIdConverterService } from "../../../squaddie/idConverterService"

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
            outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
                OutOfBattleSquaddieCollectionService.new(),
                OutOfBattleSquaddieAttributeSheetCollectionService.new()
            )

            const soldierSheet = OutOfBattleSquaddieAttributeSheetService.new({
                id: "soldier",
                movement: { distancePerAction: 2 },
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
            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(soldierSheet)

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
    })
})
