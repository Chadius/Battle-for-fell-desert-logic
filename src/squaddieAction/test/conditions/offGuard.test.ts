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
import { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../../../coordinateMap/coordinateMapCollection"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap"

describe("OFF_GUARD condition", () => {
    let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    let inBattleSquaddieManager: InBattleSquaddieManager
    let actionManager: SquaddieActionManager
    let actor: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }
    let target: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }

    const addOffGuardToTarget = () => {
        inBattleSquaddieManager.addConditionsToSquaddie({
            inBattleSquaddieId: target.inBattleSquaddieId,
            outOfBattleSquaddieId: target.outOfBattleSquaddieId,
            conditions: [
                SquaddieConditionService.new({
                    type: SquaddieConditionType.OFF_GUARD,
                    amount: 1,
                    duration: {
                        duration: 1,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                    source: SquaddieConditionSource.ELEMENTAL,
                }),
            ],
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

    describe("Acid Spit applies OFF_GUARD on a successful hit", () => {
        let acidSpitAction: SquaddieAction

        beforeEach(() => {
            acidSpitAction = SquaddieActionService.new({
                id: "acidSpit",
                name: "Acid Spit",
                proficiency: ProficiencyType.WEAPON_NATURAL,
                targeting: {
                    range: ActionRange.MEDIUM,
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
                        conditions: {
                            add: [
                                SquaddieConditionService.new({
                                    type: SquaddieConditionType.OFF_GUARD,
                                    amount: 1,
                                    duration: {
                                        duration: 1,
                                        decaysAt:
                                            SquaddieConditionDecaysAt.TURN_END,
                                    },
                                    source: SquaddieConditionSource.ELEMENTAL,
                                }),
                            ],
                        },
                    },
                },
            })
            actionManager.addOrUpdate(acidSpitAction)
        })

        it("applies OFF_GUARD to the target on a successful hit", () => {
            const results = SquaddieActionResultCalculator.calculateResult({
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager: actionManager,
                },
                actor,
                targets: [target],
                action: { id: acidSpitAction.id },
            })

            ApplyResultService.applyResultsToSquaddies({
                inBattleSquaddieManager,
                results,
            })

            const conditions = inBattleSquaddieManager.getSquaddieConditions({
                inBattleSquaddieId: target.inBattleSquaddieId,
                outOfBattleSquaddieId: target.outOfBattleSquaddieId,
            })
            expect(conditions.has(SquaddieConditionType.OFF_GUARD)).toBe(true)
            expect(conditions.get(SquaddieConditionType.OFF_GUARD)).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        amount: expect.objectContaining({ current: 1 }),
                    }),
                ])
            )
        })

        it("does not apply OFF_GUARD when the attack fails", () => {
            const results = SquaddieActionResultCalculator.calculateResult({
                degreeOfSuccess: DegreeOfSuccess.FAILURE,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager: actionManager,
                },
                actor,
                targets: [target],
                action: { id: acidSpitAction.id },
            })

            ApplyResultService.applyResultsToSquaddies({
                inBattleSquaddieManager,
                results,
            })

            const conditions = inBattleSquaddieManager.getSquaddieConditions({
                inBattleSquaddieId: target.inBattleSquaddieId,
                outOfBattleSquaddieId: target.outOfBattleSquaddieId,
            })
            expect(conditions.has(SquaddieConditionType.OFF_GUARD)).toBe(false)
        })
    })

    describe("Forecast reflects reduced ARMOR defense", () => {
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

        it("shows higher SUCCESS probability when target has OFF_GUARD", () => {
            const baselineForecast =
                SquaddieActionForecastCalculator.forecastChanceToHit({
                    inBattleSquaddieManager,
                    actor,
                    targets: [target],
                    action: { id: weaponAction.id, manager: actionManager },
                })

            addOffGuardToTarget()

            const offGuardForecast =
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
            const failureKey = SquaddieActionForecastCalculator.getForecastKey({
                ...target,
                degreeOfSuccess: DegreeOfSuccess.FAILURE,
            })

            expect(offGuardForecast.get(successKey)).toBeGreaterThan(
                baselineForecast.get(successKey) ?? 0
            )
            expect(offGuardForecast.get(failureKey)).toBeLessThan(
                baselineForecast.get(failureKey) ?? 36
            )
        })
    })

    describe("OFF_GUARD shifts attack outcomes", () => {
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

        it("changes from FAILURE to SUCCESS when target has OFF_GUARD", () => {
            expect(
                getDegreeOfSuccessForTarget([3, 2], inBattleSquaddieManager)
            ).toBe(DegreeOfSuccess.FAILURE)

            addOffGuardToTarget()
            expect(
                getDegreeOfSuccessForTarget([3, 2], inBattleSquaddieManager)
            ).toBe(DegreeOfSuccess.SUCCESS)
        })

        it("changes from SUCCESS to CRITICAL when target has OFF_GUARD", () => {
            expect(
                getDegreeOfSuccessForTarget([5, 6], inBattleSquaddieManager)
            ).toBe(DegreeOfSuccess.SUCCESS)

            addOffGuardToTarget()
            expect(
                getDegreeOfSuccessForTarget([5, 6], inBattleSquaddieManager)
            ).toBe(DegreeOfSuccess.CRITICAL)
        })
    })

    describe("Flanking shifts attack outcomes", () => {
        const MAP_ID = "flanking_test_map"
        let weaponAction: SquaddieAction
        let ally: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }
        let nonFlanker: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
        let coordinateMapCollectionManager: CoordinateMapCollectionManager

        const buildFlankingMap = () => {
            const map = CoordinateMapService.new({
                id: MAP_ID,
                name: "Flanking Map",
                movementProperties: ["1 1 1", "1 1 1"],
            })
            const manager = new CoordinateMapCollectionManager(
                CoordinateMapCollectionService.new()
            )
            manager.addOrUpdate({ map })
            manager.addSquaddie({
                mapId: MAP_ID,
                squaddieId: actor,
                coordinate: { row: 0, col: 0 },
            })
            manager.addSquaddie({
                mapId: MAP_ID,
                squaddieId: target,
                coordinate: { row: 0, col: 1 },
            })
            manager.addSquaddie({
                mapId: MAP_ID,
                squaddieId: ally,
                coordinate: { row: 0, col: 2 },
            })
            return manager
        }

        const getDegreeForActor = (
            actorId: {
                inBattleSquaddieId: number
                outOfBattleSquaddieId: string
            },
            rolls: number[],
            mapManager?: CoordinateMapCollectionManager
        ) => {
            const result =
                SquaddieActionResultCalculator.calculateActionResultsWithRolls({
                    actor: actorId,
                    targets: [target],
                    action: { id: weaponAction.id },
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager: actionManager,
                        coordinateMapCollectionManager: mapManager,
                    },
                    rollGenerator: new RollGenerator(rolls),
                    map: mapManager ? { mapId: MAP_ID } : undefined,
                })
            const targetKey = SquaddieIdConverterService.squaddieIdToKey(target)
            return result.targetResults.get(targetKey)?.degreeOfSuccess
        }

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

            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "ally",
                    name: "Ally",
                    actionIds: [],
                    attributeSheetId: "sheet",
                    affiliation: SquaddieAffiliation.ALLY,
                })
            )
            const { inBattleSquaddieId: allyId } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "ally",
                })
            ally = { inBattleSquaddieId: allyId, outOfBattleSquaddieId: "ally" }

            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "nonFlanker",
                    name: "Non Flanker",
                    actionIds: [],
                    attributeSheetId: "sheet",
                    affiliation: SquaddieAffiliation.PLAYER,
                })
            )
            const { inBattleSquaddieId: nonFlankerId } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "nonFlanker",
                })
            nonFlanker = {
                inBattleSquaddieId: nonFlankerId,
                outOfBattleSquaddieId: "nonFlanker",
            }

            coordinateMapCollectionManager = buildFlankingMap()
            coordinateMapCollectionManager.addSquaddie({
                mapId: MAP_ID,
                squaddieId: nonFlanker,
                coordinate: { row: 1, col: 0 },
            })
        })

        it("changes from FAILURE to SUCCESS when actor is flanking", () => {
            expect(getDegreeForActor(actor, [3, 2])).toBe(
                DegreeOfSuccess.FAILURE
            )

            expect(
                getDegreeForActor(actor, [3, 2], coordinateMapCollectionManager)
            ).toBe(DegreeOfSuccess.SUCCESS)
        })

        it("flanking does not stack with OFF_GUARD", () => {
            inBattleSquaddieManager.addConditionsToSquaddie({
                inBattleSquaddieId: target.inBattleSquaddieId,
                outOfBattleSquaddieId: target.outOfBattleSquaddieId,
                conditions: [
                    SquaddieConditionService.new({
                        type: SquaddieConditionType.OFF_GUARD,
                        amount: 1,
                        duration: {
                            duration: 1,
                            decaysAt: SquaddieConditionDecaysAt.TURN_END,
                        },
                        source: SquaddieConditionSource.ELEMENTAL,
                    }),
                ],
            })

            const forecastResults =
                SquaddieActionResultCalculator.calculateForecastedResults({
                    actor,
                    targets: [target],
                    action: { id: weaponAction.id, manager: actionManager },
                    inBattleSquaddieManager,
                    map: {
                        mapId: MAP_ID,
                        manager: coordinateMapCollectionManager,
                    },
                })

            const successResult = forecastResults.find(
                (r) =>
                    r.battleSquaddieId.inBattleSquaddieId ===
                        target.inBattleSquaddieId &&
                    r.degreeOfSuccess === DegreeOfSuccess.SUCCESS
            )
            expect(successResult?.modifierBreakdown?.targetDefensiveBonus).toBe(
                -1
            )
            expect(successResult?.modifierBreakdown?.isFlankingTarget).toBe(
                true
            )
        })

        it("non-flanking actor does not benefit", () => {
            expect(
                getDegreeForActor(
                    nonFlanker,
                    [3, 2],
                    coordinateMapCollectionManager
                )
            ).toBe(DegreeOfSuccess.FAILURE)
        })

        it("calculateForecastedResults exposes isFlankingTarget for the flanking actor", () => {
            const forecastResults =
                SquaddieActionResultCalculator.calculateForecastedResults({
                    actor,
                    targets: [target],
                    action: { id: weaponAction.id, manager: actionManager },
                    inBattleSquaddieManager,
                    map: {
                        mapId: MAP_ID,
                        manager: coordinateMapCollectionManager,
                    },
                })

            const anyResult = forecastResults.find(
                (r) =>
                    r.battleSquaddieId.inBattleSquaddieId ===
                    target.inBattleSquaddieId
            )
            expect(anyResult?.modifierBreakdown?.isFlankingTarget).toBe(true)
        })
    })

    describe("DEFEND_BODY attack is unaffected by OFF_GUARD", () => {
        let bodyAttackAction: SquaddieAction

        beforeEach(() => {
            bodyAttackAction = SquaddieActionService.new({
                id: "bodyAttack",
                name: "Body Attack",
                proficiency: ProficiencyType.SKILL_BODY,
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
                            targetProficiency: ProficiencyType.DEFEND_BODY,
                        },
                    },
                },
            })
            actionManager.addOrUpdate(bodyAttackAction)
        })

        it("produces the same outcome with or without OFF_GUARD on the target", () => {
            const resultWithout =
                SquaddieActionResultCalculator.calculateActionResultsWithRolls({
                    actor,
                    targets: [target],
                    action: { id: bodyAttackAction.id },
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager: actionManager,
                    },
                    rollGenerator: new RollGenerator([3, 2]),
                })
            const targetKey = SquaddieIdConverterService.squaddieIdToKey(target)
            const degreeWithout =
                resultWithout.targetResults.get(targetKey)?.degreeOfSuccess

            addOffGuardToTarget()

            const resultWith =
                SquaddieActionResultCalculator.calculateActionResultsWithRolls({
                    actor,
                    targets: [target],
                    action: { id: bodyAttackAction.id },
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager: actionManager,
                    },
                    rollGenerator: new RollGenerator([3, 2]),
                })
            const degreeWith =
                resultWith.targetResults.get(targetKey)?.degreeOfSuccess

            expect(degreeWithout).toBe(DegreeOfSuccess.FAILURE)
            expect(degreeWith).toBe(DegreeOfSuccess.FAILURE)
        })
    })
})
