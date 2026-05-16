import { beforeEach, describe, expect, it } from "vitest"
import {
    type SquaddieAction,
    SquaddieActionService,
} from "../../squaddieAction"
import { SquaddieActionManager } from "../../squaddieActionManager"
import { SquaddieActionCollectionService } from "../../squaddieActionCollection"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { SquaddieAffiliation } from "../../../affiliation/affiliation"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup"
import type { OutOfBattleSquaddieManager } from "../../../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { ProficiencyType } from "../../../proficiency/proficiencyLevel"
import { ActionRange } from "../../actionRange"
import { CoordinateGeneratorShape } from "../../../coordinateMap/shape"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess"
import {
    SquaddieConditionDecaysAt,
    SquaddieConditionService,
    SquaddieConditionSource,
    SquaddieConditionType,
} from "../../../proficiency/squaddieCondition"
import { SquaddieActionResultCalculator } from "../../calculate/result/squaddieActionResultCalculator"
import { ApplyResultService } from "../../apply/applyResultService"
import { SquaddieActionForecastCalculator } from "../../calculate/forecast/squaddieActionForecastCalculator"
import { RollGenerator } from "../../calculate/roll/rollGenerator"
import { SquaddieIdConverterService } from "../../../squaddie/idConverterService"

describe("FRIGHTENED condition", () => {
    let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    let inBattleSquaddieManager: InBattleSquaddieManager
    let actionManager: SquaddieActionManager
    let actor: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }
    let target: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }

    const makeFrightened = (amount: number, duration: number = 1) =>
        SquaddieConditionService.new({
            type: SquaddieConditionType.FRIGHTENED,
            amount: { amount },
            duration: {
                duration,
                decaysAt: SquaddieConditionDecaysAt.TURN_END,
            },
            source: SquaddieConditionSource.SPIRITUAL,
        })

    const addFrightenedToActor = (amount: number = 1) => {
        inBattleSquaddieManager.addConditionsToSquaddie({
            inBattleSquaddieId: actor.inBattleSquaddieId,
            outOfBattleSquaddieId: actor.outOfBattleSquaddieId,
            conditions: [makeFrightened(amount)],
        })
    }

    const addFrightenedToTarget = (amount: number = 1) => {
        inBattleSquaddieManager.addConditionsToSquaddie({
            inBattleSquaddieId: target.inBattleSquaddieId,
            outOfBattleSquaddieId: target.outOfBattleSquaddieId,
            conditions: [makeFrightened(amount)],
        })
    }

    beforeEach(() => {
        const result =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "sheet",
                attributeSheetOptions: { rank: 0 },
            })
        outOfBattleSquaddieManager = result.manager

        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: "actor",
                name: "Actor",
                actionIds: [],
                attributeSheetId: "sheet",
                affiliation: SquaddieAffiliation.PLAYER,
            })
        )
        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: "target",
                name: "Target",
                actionIds: [],
                attributeSheetId: "sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
        )

        inBattleSquaddieManager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            outOfBattleSquaddieManager
        )

        const { inBattleSquaddieId: actorId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor",
            })
        actor = { inBattleSquaddieId: actorId, outOfBattleSquaddieId: "actor" }

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

    describe("Intimidating Glare applies FRIGHTENED on a hit", () => {
        let intimidatingGlareAction: SquaddieAction

        beforeEach(() => {
            intimidatingGlareAction = SquaddieActionService.new({
                id: "intimidatingGlare",
                name: "Intimidating Glare",
                proficiency: ProficiencyType.SKILL_MIND,
                targeting: {
                    range: ActionRange.SHORT,
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
                    [DegreeOfSuccess.CRITICAL]: {
                        actionPoints: { spent: 1 },
                    },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.CRITICAL]: {
                        conditions: {
                            add: [makeFrightened(2, 2)],
                        },
                    },
                    [DegreeOfSuccess.SUCCESS]: {
                        conditions: {
                            add: [makeFrightened(1, 1)],
                        },
                    },
                    [DegreeOfSuccess.FAILURE]: {},
                },
            })
            actionManager.addOrUpdate(intimidatingGlareAction)
        })

        it("applies FRIGHTENED amount 1 duration 1 to the target on SUCCESS", () => {
            const results = SquaddieActionResultCalculator.calculateResult({
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager: actionManager,
                },
                actor,
                targets: [target],
                action: { id: intimidatingGlareAction.id },
            })

            ApplyResultService.applyResultsToSquaddies({
                inBattleSquaddieManager,
                results,
            })

            const conditions = inBattleSquaddieManager.getSquaddieConditions({
                inBattleSquaddieId: target.inBattleSquaddieId,
                outOfBattleSquaddieId: target.outOfBattleSquaddieId,
            })
            expect(conditions.has(SquaddieConditionType.FRIGHTENED)).toBe(true)
            expect(conditions.get(SquaddieConditionType.FRIGHTENED)).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        amount: expect.objectContaining({ current: 1 }),
                        limit: {
                            duration: {
                                duration: 1,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                        },
                    }),
                ])
            )
        })

        it("applies FRIGHTENED amount 2 duration 2 to the target on CRITICAL", () => {
            const results = SquaddieActionResultCalculator.calculateResult({
                degreeOfSuccess: DegreeOfSuccess.CRITICAL,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager: actionManager,
                },
                actor,
                targets: [target],
                action: { id: intimidatingGlareAction.id },
            })

            ApplyResultService.applyResultsToSquaddies({
                inBattleSquaddieManager,
                results,
            })

            const conditions = inBattleSquaddieManager.getSquaddieConditions({
                inBattleSquaddieId: target.inBattleSquaddieId,
                outOfBattleSquaddieId: target.outOfBattleSquaddieId,
            })
            expect(conditions.has(SquaddieConditionType.FRIGHTENED)).toBe(true)
            expect(conditions.get(SquaddieConditionType.FRIGHTENED)).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        amount: expect.objectContaining({ current: 2 }),
                        limit: {
                            duration: {
                                duration: 2,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                        },
                    }),
                ])
            )
        })

        it("does not apply FRIGHTENED when the attack fails", () => {
            const results = SquaddieActionResultCalculator.calculateResult({
                degreeOfSuccess: DegreeOfSuccess.FAILURE,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager: actionManager,
                },
                actor,
                targets: [target],
                action: { id: intimidatingGlareAction.id },
            })

            ApplyResultService.applyResultsToSquaddies({
                inBattleSquaddieManager,
                results,
            })

            const conditions = inBattleSquaddieManager.getSquaddieConditions({
                inBattleSquaddieId: target.inBattleSquaddieId,
                outOfBattleSquaddieId: target.outOfBattleSquaddieId,
            })
            expect(conditions.has(SquaddieConditionType.FRIGHTENED)).toBe(false)
        })
    })

    describe("FRIGHTENED penalizes attack rolls for the frightened squaddie", () => {
        let weaponAction: SquaddieAction

        beforeEach(() => {
            weaponAction = SquaddieActionService.new({
                id: "weaponAttack",
                name: "Weapon Attack",
                proficiency: ProficiencyType.WEAPON_NATURAL,
                degreesOfSuccess: [
                    DegreeOfSuccess.CRITICAL,
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.FAILURE,
                    DegreeOfSuccess.BOTCH,
                ],
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 1 },
                    },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: 1,
                            targetProficiency: ProficiencyType.ARMOR,
                        },
                    },
                },
            })
            actionManager.addOrUpdate(weaponAction)
        })

        const getDegreeOfSuccessForTarget = (
            rolls: number[],
            ibsManager: InBattleSquaddieManager
        ) => {
            const result =
                SquaddieActionResultCalculator.calculateActionResultsWithRolls({
                    actor,
                    targets: [target],
                    action: { id: weaponAction.id },
                    managers: {
                        inBattleSquaddieManager: ibsManager,
                        squaddieActionManager: actionManager,
                    },
                    rollGenerator: new RollGenerator(rolls),
                })
            const targetKey = SquaddieIdConverterService.squaddieIdToKey(target)
            return result.targetResults.get(targetKey)?.degreeOfSuccess
        }

        it("changes from SUCCESS to FAILURE when actor has FRIGHTENED", () => {
            expect(
                getDegreeOfSuccessForTarget([3, 3], inBattleSquaddieManager)
            ).toBe(DegreeOfSuccess.SUCCESS)

            addFrightenedToActor()

            expect(
                getDegreeOfSuccessForTarget([3, 3], inBattleSquaddieManager)
            ).toBe(DegreeOfSuccess.FAILURE)
        })

        it("lowers SUCCESS probability in the forecast when actor has FRIGHTENED", () => {
            const baselineForecast =
                SquaddieActionForecastCalculator.forecastChanceToHit({
                    inBattleSquaddieManager,
                    actor,
                    targets: [target],
                    action: { id: weaponAction.id, manager: actionManager },
                })

            addFrightenedToActor()

            const frightenedForecast =
                SquaddieActionForecastCalculator.forecastChanceToHit({
                    inBattleSquaddieManager,
                    actor,
                    targets: [target],
                    action: { id: weaponAction.id, manager: actionManager },
                })

            const successKey = SquaddieActionForecastCalculator.getForecastKey({
                ...target,
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            })

            expect(frightenedForecast.get(successKey)).toBeLessThan(
                baselineForecast.get(successKey) ?? 36
            )
        })

        it("shows actorFrightenedPenalty in modifier breakdown", () => {
            addFrightenedToActor()

            const results =
                SquaddieActionResultCalculator.calculateForecastedResults({
                    actor,
                    targets: [target],
                    action: {
                        id: weaponAction.id,
                        manager: actionManager,
                    },
                    inBattleSquaddieManager,
                })

            const successResult = results.find(
                (r) => r.degreeOfSuccess === DegreeOfSuccess.SUCCESS
            )
            expect(
                successResult?.modifierBreakdown?.actorFrightenedPenalty
            ).toBe(1)
        })
    })

    describe("FRIGHTENED penalizes defense rolls for the frightened squaddie", () => {
        let weaponAction: SquaddieAction

        beforeEach(() => {
            weaponAction = SquaddieActionService.new({
                id: "weaponAttack",
                name: "Weapon Attack",
                proficiency: ProficiencyType.WEAPON_NATURAL,
                degreesOfSuccess: [
                    DegreeOfSuccess.CRITICAL,
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.FAILURE,
                    DegreeOfSuccess.BOTCH,
                ],
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 1 },
                    },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: 1,
                            targetProficiency: ProficiencyType.ARMOR,
                        },
                    },
                },
            })
            actionManager.addOrUpdate(weaponAction)
        })

        const getDegreeOfSuccessForTarget = (
            rolls: number[],
            ibsManager: InBattleSquaddieManager
        ) => {
            const result =
                SquaddieActionResultCalculator.calculateActionResultsWithRolls({
                    actor,
                    targets: [target],
                    action: { id: weaponAction.id },
                    managers: {
                        inBattleSquaddieManager: ibsManager,
                        squaddieActionManager: actionManager,
                    },
                    rollGenerator: new RollGenerator(rolls),
                })
            const targetKey = SquaddieIdConverterService.squaddieIdToKey(target)
            return result.targetResults.get(targetKey)?.degreeOfSuccess
        }

        it("changes from FAILURE to SUCCESS when target has FRIGHTENED", () => {
            expect(
                getDegreeOfSuccessForTarget([3, 2], inBattleSquaddieManager)
            ).toBe(DegreeOfSuccess.FAILURE)

            addFrightenedToTarget()

            expect(
                getDegreeOfSuccessForTarget([3, 2], inBattleSquaddieManager)
            ).toBe(DegreeOfSuccess.SUCCESS)
        })

        it("changes from SUCCESS to CRITICAL when target has FRIGHTENED", () => {
            expect(
                getDegreeOfSuccessForTarget([5, 6], inBattleSquaddieManager)
            ).toBe(DegreeOfSuccess.SUCCESS)

            addFrightenedToTarget()

            expect(
                getDegreeOfSuccessForTarget([5, 6], inBattleSquaddieManager)
            ).toBe(DegreeOfSuccess.CRITICAL)
        })

        it("shows higher SUCCESS probability in the forecast when target has FRIGHTENED", () => {
            const baselineForecast =
                SquaddieActionForecastCalculator.forecastChanceToHit({
                    inBattleSquaddieManager,
                    actor,
                    targets: [target],
                    action: { id: weaponAction.id, manager: actionManager },
                })

            addFrightenedToTarget()

            const frightenedForecast =
                SquaddieActionForecastCalculator.forecastChanceToHit({
                    inBattleSquaddieManager,
                    actor,
                    targets: [target],
                    action: { id: weaponAction.id, manager: actionManager },
                })

            const successKey = SquaddieActionForecastCalculator.getForecastKey({
                ...target,
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            })

            expect(frightenedForecast.get(successKey)).toBeGreaterThan(
                baselineForecast.get(successKey) ?? 0
            )
        })

        it("shows targetFrightenedPenalty in modifier breakdown", () => {
            addFrightenedToTarget()

            const results =
                SquaddieActionResultCalculator.calculateForecastedResults({
                    actor,
                    targets: [target],
                    action: {
                        id: weaponAction.id,
                        manager: actionManager,
                    },
                    inBattleSquaddieManager,
                })

            const successResult = results.find(
                (r) => r.degreeOfSuccess === DegreeOfSuccess.SUCCESS
            )
            expect(
                successResult?.modifierBreakdown?.targetFrightenedPenalty
            ).toBe(1)
        })
    })
})
