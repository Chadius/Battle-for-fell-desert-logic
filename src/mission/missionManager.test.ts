import { beforeEach, describe, expect, it, vi } from "vitest"
import { MissionManager } from "./missionManager"
import { type MissionState, MissionStateService } from "./missionState"
import { MissionObjectiveService } from "./missionObjective"
import { MissionObjectiveRewardService } from "./missionObjectiveReward"
import { MissionObjectiveCriteriaService } from "./missionObjectiveCriteria"
import { SquaddieAffiliation } from "../affiliation/affiliation"
import {
    type BattleSquaddieId,
    InBattleSquaddieManager,
} from "../squaddie/inBattle/inBattleSquaddieManager"
import { OutOfBattleSquaddieService } from "../squaddie/outOfBattle/outOfBattleSquaddie"
import { InBattleSquaddieCollectionService } from "../squaddie/inBattle/inBattleSquaddieCollection"
import { AttributeScore } from "../proficiency/attributeScore"
import { OutOfBattleSquaddieTestSetup } from "../testUtils/outOfBattleSquaddieTestSetup"
import { SquaddieActionManager } from "../squaddieAction/squaddieActionManager"
import { SquaddieActionCollectionService } from "../squaddieAction/squaddieActionCollection"
import {
    MovementEffectType,
    SquaddieActionService,
} from "../squaddieAction/squaddieAction"
import {
    ProficiencyLevel,
    ProficiencyType,
} from "../proficiency/proficiencyLevel"
import { CoordinateMapCollectionManager } from "../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../coordinateMap/coordinateMapCollection"
import {
    CoordinateMapService,
    type SerializedCoordinateMap,
} from "../coordinateMap/coordinateMap"
import { RollGenerator } from "../squaddieAction/calculate/roll/rollGenerator"
import { ActionRange } from "../squaddieAction/actionRange"
import { CoordinateGeneratorShape } from "../coordinateMap/shape"
import {
    MissionAffiliationTurn,
    MissionTurnService,
    type TMissionAffiliationTurn,
} from "./missionTurn"
import type { OutOfBattleSquaddieManager } from "../squaddie/outOfBattle/outOfBattleSquaddieManager"

describe("MissionManager", () => {
    describe("constructor", () => {
        it("creates a new MissionManager with no parameters", () => {
            const manager = new MissionManager()

            expect(manager.missionState).toBeUndefined()
            expect(manager.inBattleSquaddieManager).toBeUndefined()
            expect(manager.coordinateMapCollectionManager).toBeUndefined()
            expect(manager.squaddieActionManager).toBeUndefined()
        })

        it("creates a new MissionManager with state", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
            })

            const manager = new MissionManager({ missionState: missionState })

            expect(manager.missionState).toBe(missionState)
        })

        it("creates a new MissionManager with all dependencies", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
            })
            const inBattleSquaddieManager = {} as any
            const coordinateMapCollectionManager = {} as any
            const squaddieActionManager = {} as any

            const manager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
                coordinateMapCollectionManager: coordinateMapCollectionManager,
                squaddieActionManager: squaddieActionManager,
            })

            expect(manager.missionState).toBe(missionState)
            expect(manager.inBattleSquaddieManager).toBe(
                inBattleSquaddieManager
            )
            expect(manager.coordinateMapCollectionManager).toBe(
                coordinateMapCollectionManager
            )
            expect(manager.squaddieActionManager).toBe(squaddieActionManager)
        })
    })

    describe("hasMissionEnded", () => {
        it("returns false when no objectives have MISSION_ENDS or MISSION_FAILURE reward", () => {
            const objective = MissionObjectiveService.new({
                id: "obj-1",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["d1"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [objective],
            })

            const manager = new MissionManager({ missionState: missionState })

            expect(manager.hasMissionEnded()).toBe(false)
        })

        it("returns false when objective has MISSION_ENDS but not yet rewarded", () => {
            const objective = MissionObjectiveService.new({
                id: "obj-1",
                rewards: [
                    MissionObjectiveRewardService.newMissionEndsReward(),
                    MissionObjectiveRewardService.newMissionFailureReward(),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [objective],
            })

            const manager = new MissionManager({ missionState: missionState })

            expect(manager.hasMissionEnded()).toBe(false)
        })

        it("returns true when objective has MISSION_ENDS and is rewarded", () => {
            const objective = MissionObjectiveService.new({
                id: "obj-1",
                rewards: [MissionObjectiveRewardService.newMissionEndsReward()],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            const rewardedObjective =
                MissionObjectiveService.markRewardAsGiven(objective)

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [rewardedObjective],
            })

            const manager = new MissionManager({ missionState: missionState })

            expect(manager.hasMissionEnded()).toBe(true)
        })

        it("returns true when objective has MISSION_FAILURE and is rewarded", () => {
            const objective = MissionObjectiveService.new({
                id: "obj-1",
                rewards: [
                    MissionObjectiveRewardService.newMissionFailureReward(),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            const rewardedObjective =
                MissionObjectiveService.markRewardAsGiven(objective)

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [rewardedObjective],
            })

            const manager = new MissionManager({ missionState: missionState })

            expect(manager.hasMissionEnded()).toBe(true)
        })

        it("throws when state is undefined", () => {
            const manager = new MissionManager({})

            expect(() => manager.hasMissionEnded()).toThrow(
                "[MissionManager.hasMissionEnded]: state must be defined"
            )
        })
    })

    describe("calculateCompletedButNotRewardedMissionObjectives", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let enemySquaddieId: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }

        beforeEach(() => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "test sheet",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            distancePerAction: 1,
                            items: { maxCapacity: 0 },
                        },
                    }
                )

            const enemyOutOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "enemy-1",
                name: "Enemy",
                affiliation: SquaddieAffiliation.ENEMY,
                attributeSheetId: "test sheet",
            })

            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                enemyOutOfBattleSquaddie
            )

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            enemySquaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy-1",
            })
        })

        it("returns empty array when no objectives completed", () => {
            const objective = MissionObjectiveService.new({
                id: "obj-1",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["d1"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [objective],
            })

            const manager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
            })

            const results =
                manager.calculateCompletedButNotRewardedMissionObjectives()

            expect(results).toHaveLength(0)
        })

        it("returns completed objectives that have not been rewarded", () => {
            const objective = MissionObjectiveService.new({
                id: "obj-1",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["d1"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [objective],
            })

            const manager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
            })

            inBattleSquaddieManager.dealDamageToSquaddie({
                inBattleSquaddieId: enemySquaddieId.inBattleSquaddieId,
                outOfBattleSquaddieId: enemySquaddieId.outOfBattleSquaddieId,
                damage: {
                    amount: 999,
                    type: AttributeScore.BODY,
                },
            })

            const results =
                manager.calculateCompletedButNotRewardedMissionObjectives()

            expect(results).toHaveLength(1)
            expect(results[0].id).toBe("obj-1")
        })

        it("excludes objectives that have been rewarded", () => {
            const objective = MissionObjectiveService.new({
                id: "obj-1",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["d1"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            const rewardedObjective =
                MissionObjectiveService.markRewardAsGiven(objective)

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [rewardedObjective],
            })

            const manager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
            })

            inBattleSquaddieManager.dealDamageToSquaddie({
                inBattleSquaddieId: enemySquaddieId.inBattleSquaddieId,
                outOfBattleSquaddieId: enemySquaddieId.outOfBattleSquaddieId,
                damage: {
                    amount: 999,
                    type: AttributeScore.BODY,
                },
            })

            const results =
                manager.calculateCompletedButNotRewardedMissionObjectives()

            expect(results).toHaveLength(0)
        })

        it("throws when state is undefined", () => {
            const manager = new MissionManager({})

            expect(() =>
                manager.calculateCompletedButNotRewardedMissionObjectives()
            ).toThrow(
                "[MissionManager.calculateCompletedButNotRewardedMissionObjectives]: state must be defined"
            )
        })

        it("throws when inBattleSquaddieManager is undefined", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
            })

            const manager = new MissionManager({ missionState: missionState })

            expect(() =>
                manager.calculateCompletedButNotRewardedMissionObjectives()
            ).toThrow(
                "[MissionManager.calculateCompletedButNotRewardedMissionObjectives]: inBattleSquaddieManager must be defined"
            )
        })
    })

    describe("setMissionObjectiveAsRewarded", () => {
        it("marks objective as rewarded by id", () => {
            const objective = MissionObjectiveService.new({
                id: "obj-1",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["d1"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [objective],
            })

            const manager = new MissionManager({ missionState: missionState })

            expect(manager.missionState!.objectives[0].hasGivenReward).toBe(
                false
            )

            manager.setMissionObjectiveAsRewarded("obj-1")

            expect(manager.missionState!.objectives[0].hasGivenReward).toBe(
                true
            )
        })

        it("does not affect other objectives", () => {
            const objective1 = MissionObjectiveService.new({
                id: "obj-1",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["d1"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            const objective2 = MissionObjectiveService.new({
                id: "obj-2",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["d2"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ALLY],
                        }
                    ),
                ],
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [objective1, objective2],
            })

            const manager = new MissionManager({ missionState: missionState })

            manager.setMissionObjectiveAsRewarded("obj-1")

            expect(manager.missionState!.objectives[0].hasGivenReward).toBe(
                true
            )
            expect(manager.missionState!.objectives[1].hasGivenReward).toBe(
                false
            )
        })

        it("state is updated immutably", () => {
            const objective = MissionObjectiveService.new({
                id: "obj-1",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["d1"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [objective],
            })

            const manager = new MissionManager({ missionState: missionState })
            const originalState = manager.missionState

            manager.setMissionObjectiveAsRewarded("obj-1")

            expect(manager.missionState).not.toBe(originalState)
            expect(manager.missionState!.objectives).not.toBe(
                originalState!.objectives
            )
        })

        it("handles non-existent objective id gracefully", () => {
            const objective = MissionObjectiveService.new({
                id: "obj-1",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["d1"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [objective],
            })

            const manager = new MissionManager({ missionState: missionState })

            expect(() => {
                manager.setMissionObjectiveAsRewarded("non-existent")
            }).not.toThrow()

            expect(manager.missionState!.objectives[0].hasGivenReward).toBe(
                false
            )
        })

        it("throws when state is undefined", () => {
            const manager = new MissionManager({})

            expect(() =>
                manager.setMissionObjectiveAsRewarded("obj-1")
            ).toThrow(
                "[MissionManager.setMissionObjectiveAsRewarded]: state must be defined"
            )
        })
    })

    describe("useActionAndGetResults", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let squaddieActionManager: SquaddieActionManager
        let coordinateMapCollectionManager: CoordinateMapCollectionManager
        let actorSquaddieId: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
        let targetSquaddieId: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
        let deterministicRollGenerator: RollGenerator

        beforeEach(() => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "actor_sheet",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            items: { maxCapacity: 0 },
                        },
                    }
                )

            const targetAttributeSheet =
                OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
                    id: "target_sheet",
                    maxHitPoints: 10,
                    items: { maxCapacity: 0 },
                })
            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(
                targetAttributeSheet
            )

            const actorOutOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "actor",
                name: "Actor",
                affiliation: SquaddieAffiliation.PLAYER,
                attributeSheetId: "actor_sheet",
            })

            const targetOutOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "target",
                name: "Target",
                affiliation: SquaddieAffiliation.ENEMY,
                attributeSheetId: "target_sheet",
            })

            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                actorOutOfBattleSquaddie
            )
            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                targetOutOfBattleSquaddie
            )

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            actorSquaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor",
            })

            targetSquaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "target",
            })

            const attackAction = SquaddieActionService.new({
                id: "attack",
                name: "Attack",
                targeting: {
                    range: ActionRange.MELEE,
                    shape: CoordinateGeneratorShape.BLOOM,
                    affiliationRelationship: {
                        self: false,
                        foe: true,
                        friend: false,
                    },
                },
                effectOnActor: {
                    SUCCESS: {},
                },
                effectOnTarget: {
                    SUCCESS: {
                        damage: {
                            raw: 2,
                            targetProficiency: ProficiencyType.SKILL_BODY,
                        },
                    },
                },
            })

            squaddieActionManager = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )
            squaddieActionManager.addOrUpdate(attackAction)

            const map = CoordinateMapService.new({
                id: "test_map",
                name: "test map",
                movementProperties: ["1 1 1 "],
            })

            coordinateMapCollectionManager = new CoordinateMapCollectionManager(
                CoordinateMapCollectionService.new()
            )
            coordinateMapCollectionManager.addOrUpdate({ map })

            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: actorSquaddieId,
                coordinate: { row: 0, col: 0 },
            })

            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: targetSquaddieId,
                coordinate: { row: 0, col: 1 },
            })

            deterministicRollGenerator = new RollGenerator([3, 3])
        })

        it("calculates results and applies them to squaddies", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const manager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
                coordinateMapCollectionManager: coordinateMapCollectionManager,
                squaddieActionManager: squaddieActionManager,
            })

            const targetHPBefore =
                inBattleSquaddieManager.getSquaddie(targetSquaddieId)
                    .inBattleSquaddie.hitPoints.current

            const results = manager.useActionAndGetResults({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: {
                    id: "attack",
                },
                rollGenerator: deterministicRollGenerator,
            })

            expect(results.actorRoll).toEqual([3, 3])
            expect(results.targetResults.size).toBeGreaterThan(0)

            const targetHPAfter =
                inBattleSquaddieManager.getSquaddie(targetSquaddieId)
                    .inBattleSquaddie.hitPoints.current

            expect(targetHPAfter).toBeLessThan(targetHPBefore)
        })

        it("returns calculation results with rolls and degrees of success", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const manager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
                coordinateMapCollectionManager: coordinateMapCollectionManager,
                squaddieActionManager: squaddieActionManager,
            })

            const results = manager.useActionAndGetResults({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: {
                    id: "attack",
                },
                rollGenerator: deterministicRollGenerator,
            })

            expect(results).toHaveProperty("actorRoll")
            expect(results).toHaveProperty("targetResults")
            expect(results.actorRoll).toEqual([3, 3])

            for (const [_key, targetResult] of results.targetResults) {
                expect(targetResult).toHaveProperty("degreeOfSuccess")
                expect(targetResult).toHaveProperty("squaddieActionResults")
                expect(Array.isArray(targetResult.squaddieActionResults)).toBe(
                    true
                )
            }
        })

        it("throws when state is undefined", () => {
            const manager = new MissionManager({})

            expect(() =>
                manager.useActionAndGetResults({
                    actor: actorSquaddieId,
                    targets: [targetSquaddieId],
                    action: { id: "attack" },
                    rollGenerator: deterministicRollGenerator,
                })
            ).toThrow(
                "[MissionManager.useActionAndGetResults]: state must be defined"
            )
        })

        it("throws when inBattleSquaddieManager is undefined", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const manager = new MissionManager({ missionState: missionState })

            expect(() =>
                manager.useActionAndGetResults({
                    actor: actorSquaddieId,
                    targets: [targetSquaddieId],
                    action: { id: "attack" },
                    rollGenerator: deterministicRollGenerator,
                })
            ).toThrow(
                "[MissionManager.useActionAndGetResults]: inBattleSquaddieManager must be defined"
            )
        })

        it("throws when squaddieActionManager is undefined", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const manager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
                coordinateMapCollectionManager: coordinateMapCollectionManager,
            })

            expect(() =>
                manager.useActionAndGetResults({
                    actor: actorSquaddieId,
                    targets: [targetSquaddieId],
                    action: { id: "attack" },
                    rollGenerator: deterministicRollGenerator,
                })
            ).toThrow(
                "[MissionManager.useActionAndGetResults]: squaddieActionManager must be defined"
            )
        })

        it("throws when coordinateMapCollectionManager is undefined", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const manager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
                coordinateMapCollectionManager: undefined,
                squaddieActionManager: squaddieActionManager,
            })

            expect(() =>
                manager.useActionAndGetResults({
                    actor: actorSquaddieId,
                    targets: [targetSquaddieId],
                    action: { id: "attack" },
                    rollGenerator: deterministicRollGenerator,
                })
            ).toThrow(
                "[MissionManager.useActionAndGetResults]: coordinateMapCollectionManager must be defined"
            )
        })

        it("should remove defeated squaddies from the map", () => {
            const fatalAttackAction = SquaddieActionService.new({
                id: "fatal-attack",
                name: "Fatal Attack",
                targeting: {
                    range: ActionRange.MELEE,
                    shape: CoordinateGeneratorShape.BLOOM,
                    affiliationRelationship: {
                        self: false,
                        foe: true,
                        friend: false,
                    },
                },
                effectOnActor: {
                    SUCCESS: {},
                },
                effectOnTarget: {
                    SUCCESS: {
                        damage: {
                            raw: 100,
                            targetProficiency: ProficiencyType.SKILL_BODY,
                        },
                    },
                },
            })
            squaddieActionManager.addOrUpdate(fatalAttackAction)

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })
            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
            })

            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: actorSquaddieId,
                coordinate: { row: 0, col: 0 },
            })
            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: targetSquaddieId,
                coordinate: { row: 0, col: 1 },
            })

            manager.useActionAndGetResults({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: "fatal-attack" },
                rollGenerator: deterministicRollGenerator,
            })

            expect(
                inBattleSquaddieManager.isSquaddieDefeated(targetSquaddieId)
            ).toBe(true)
            expect(
                coordinateMapCollectionManager.getSquaddieCoordinate({
                    mapId: "test_map",
                    squaddieId: targetSquaddieId,
                })
            ).toBeUndefined()
        })
    })

    describe("undoLastAction", () => {
        let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
        let inBattleSquaddieManager: InBattleSquaddieManager
        let coordinateMapCollectionManager: CoordinateMapCollectionManager
        let squaddieActionManager: SquaddieActionManager
        let missionState: MissionState
        let manager: MissionManager
        let squaddieId: BattleSquaddieId

        beforeEach(() => {
            ;({ manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "attr-sheet-1",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            proficiencyLevels: {
                                [ProficiencyType.DEFEND_BODY]:
                                    ProficiencyLevel.NOVICE,
                                [ProficiencyType.SKILL_BODY]:
                                    ProficiencyLevel.EXPERT,
                            },
                        },
                    }
                ))

            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "squaddie-1",
                    attributeSheetId: "attr-sheet-1",
                    affiliation: SquaddieAffiliation.PLAYER,
                    name: "squaddie-1",
                })
            )

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            squaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "squaddie-1",
            })

            let coordinateMapCollection = CoordinateMapCollectionService.new()
            coordinateMapCollection =
                CoordinateMapCollectionService.addOrUpdate({
                    collection: coordinateMapCollection,
                    map: CoordinateMapService.new({
                        id: "map-1",
                        name: "test map",
                        movementProperties: ["1 1 1 "],
                    }),
                })

            coordinateMapCollectionManager = new CoordinateMapCollectionManager(
                coordinateMapCollection
            )

            const squaddieActionCollection =
                SquaddieActionCollectionService.new()

            squaddieActionManager = new SquaddieActionManager(
                squaddieActionCollection
            )

            squaddieActionManager.addOrUpdate({
                id: "attack",
                name: "Attack",
                actionType: { isDamaging: true },
                actionEffects: [
                    {
                        actionDamageAmount: { damage: 3 },
                    },
                ],
            } as any)

            missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
            })

            manager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
                coordinateMapCollectionManager: coordinateMapCollectionManager,
                squaddieActionManager: squaddieActionManager,
            })
        })

        it("returns undefined if no history exists", () => {
            const result = manager.undoLastAction({
                reversingResults: [],
            })

            expect(result.removedAction).toBeUndefined()
        })

        it("returns undefined if history exists but current turn is empty", () => {
            manager.recordAction({
                action: squaddieActionManager.get("attack"),
                results: [squaddieId],
            })

            expect(manager.missionState?.history).toBeDefined()

            manager.missionState = {
                ...manager.missionState!,
                turn: {
                    ...manager.missionState!.turn,
                    turnCount: 99,
                },
            }

            const result = manager.undoLastAction({
                reversingResults: [],
            })

            expect(result.removedAction).toBeUndefined()
        })

        it("removes last action from history", () => {
            const action = squaddieActionManager.get("attack")
            manager.recordAction({
                action,
                results: [squaddieId],
            })

            expect(manager.getTotalActionCount()).toBe(1)

            const result = manager.undoLastAction({
                reversingResults: [],
            })

            expect(result.removedAction).toBeDefined()
            expect(result.removedAction?.action.id).toBe("attack")
            expect(manager.getTotalActionCount()).toBe(0)
        })

        it("applies reversing results without recording them", () => {
            const action = squaddieActionManager.get("attack")

            manager.recordAction({
                action,
                results: [squaddieId],
            })

            expect(manager.getTotalActionCount()).toBe(1)

            manager.undoLastAction({
                reversingResults: [
                    {
                        ...squaddieId,
                        healing: {
                            net: 3,
                            raw: 3,
                        },
                    },
                ],
            })

            expect(manager.getTotalActionCount()).toBe(0)
        })

        it("only removes last action when multiple actions exist", () => {
            const action = squaddieActionManager.get("attack")

            manager.recordAction({
                action,
                results: [squaddieId],
            })

            manager.recordAction({
                action,
                results: [squaddieId],
            })

            manager.recordAction({
                action,
                results: [squaddieId],
            })

            expect(manager.getTotalActionCount()).toBe(3)

            manager.undoLastAction({
                reversingResults: [],
            })

            expect(manager.getTotalActionCount()).toBe(2)
        })

        it("cleans up empty squaddie records after removing last action", () => {
            const action = squaddieActionManager.get("attack")

            manager.recordAction({
                action,
                results: [squaddieId],
            })

            expect(
                manager.missionState?.history?.turns[0].squaddieTurnRecords
            ).toHaveLength(1)

            manager.undoLastAction({
                reversingResults: [],
            })

            expect(manager.missionState?.history?.turns).toHaveLength(1)
            expect(
                manager.missionState?.history?.turns[0].squaddieTurnRecords
            ).toHaveLength(0)
        })

        it("throws error if missionState is undefined", () => {
            manager.missionState = undefined

            expect(() =>
                manager.undoLastAction({
                    reversingResults: [],
                })
            ).toThrow("[MissionManager.undoLastAction]: state must be defined")
        })

        it("throws error if inBattleSquaddieManager is undefined", () => {
            manager.inBattleSquaddieManager = undefined

            expect(() =>
                manager.undoLastAction({
                    reversingResults: [],
                })
            ).toThrow(
                "[MissionManager.undoLastAction]: inBattleSquaddieManager must be defined"
            )
        })

        it("throws error if coordinateMapCollectionManager is undefined", () => {
            manager.coordinateMapCollectionManager = undefined

            expect(() =>
                manager.undoLastAction({
                    reversingResults: [],
                })
            ).toThrow(
                "[MissionManager.undoLastAction]: coordinateMapCollectionManager must be defined"
            )
        })
    })

    describe("shouldCheckMissionObjectives", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let coordinateMapCollectionManager: CoordinateMapCollectionManager
        let squaddieActionManager: SquaddieActionManager
        let player1SquaddieId: BattleSquaddieId
        let player2SquaddieId: BattleSquaddieId
        let enemySquaddieId: BattleSquaddieId

        beforeEach(() => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "test_sheet",
                        attributeSheetOptions: { maxHitPoints: 10 },
                    }
                )

            const player1OutOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "player-1",
                name: "Player 1",
                affiliation: SquaddieAffiliation.PLAYER,
                attributeSheetId: "test_sheet",
            })

            const player2OutOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "player-2",
                name: "Player 2",
                affiliation: SquaddieAffiliation.PLAYER,
                attributeSheetId: "test_sheet",
            })

            const enemyOutOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "enemy-1",
                name: "Enemy 1",
                affiliation: SquaddieAffiliation.ENEMY,
                attributeSheetId: "test_sheet",
            })

            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                player1OutOfBattleSquaddie
            )
            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                player2OutOfBattleSquaddie
            )
            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                enemyOutOfBattleSquaddie
            )

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            player1SquaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "player-1",
            })

            player2SquaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "player-2",
            })

            enemySquaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy-1",
            })

            const map = CoordinateMapService.new({
                id: "test_map",
                name: "test map",
                movementProperties: [
                    "1 1 1 1 1 ",
                    "1 1 1 1 1 ",
                    "1 1 1 1 1 ",
                    "1 1 1 1 1 ",
                    "1 1 1 1 1 ",
                ],
            })

            coordinateMapCollectionManager = new CoordinateMapCollectionManager(
                CoordinateMapCollectionService.new()
            )
            coordinateMapCollectionManager.addOrUpdate({ map })

            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: player1SquaddieId,
                coordinate: { row: 0, col: 0 },
            })

            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: player2SquaddieId,
                coordinate: { row: 0, col: 1 },
            })

            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: enemySquaddieId,
                coordinate: { row: 4, col: 4 },
            })

            const moveAction = SquaddieActionService.new({
                id: "move",
                name: "Move",
                targeting: {
                    range: ActionRange.SELF,
                    shape: CoordinateGeneratorShape.BLOOM,
                    affiliationRelationship: {
                        self: true,
                        foe: false,
                        friend: false,
                    },
                },
                effectOnActor: {
                    SUCCESS: {
                        movement: {
                            movementType: MovementEffectType.ACTOR_CHOSEN,
                        },
                    },
                },
            })

            squaddieActionManager = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )
            squaddieActionManager.addOrUpdate(moveAction)
        })

        const createMissionObjective = () => {
            return MissionObjectiveService.new({
                id: "obj-1",
                rewards: [MissionObjectiveRewardService.newMissionEndsReward()],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })
        }

        const createMissionManager = (
            missionAffiliationTurn: TMissionAffiliationTurn
        ) => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
                objectives: [createMissionObjective()],
                turn: MissionTurnService.new({
                    missionAffiliationTurn,
                }),
            })

            return new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
                coordinateMapCollectionManager: coordinateMapCollectionManager,
                squaddieActionManager: squaddieActionManager,
            })
        }

        it("returns true when missionAffiliationTurn is TURN_START", () => {
            const missionManager = createMissionManager(
                MissionAffiliationTurn.TURN_START
            )
            expect(missionManager.shouldCheckMissionObjectives()).toBe(true)
        })

        it("returns true when missionAffiliationTurn is TURN_END", () => {
            const missionManager = createMissionManager(
                MissionAffiliationTurn.TURN_END
            )
            expect(missionManager.shouldCheckMissionObjectives()).toBe(true)
        })

        it("returns true when missionAffiliationTurn is PLAYER_TURN_START", () => {
            const missionManager = createMissionManager(
                MissionAffiliationTurn.PLAYER_TURN_START
            )
            expect(missionManager.shouldCheckMissionObjectives()).toBe(true)
        })

        it("returns true when missionAffiliationTurn is PLAYER_TURN_END", () => {
            const missionManager = createMissionManager(
                MissionAffiliationTurn.PLAYER_TURN_END
            )
            expect(missionManager.shouldCheckMissionObjectives()).toBe(true)
        })

        it("returns true when missionAffiliationTurn is ALLY_TURN_START", () => {
            const missionManager = createMissionManager(
                MissionAffiliationTurn.ALLY_TURN_START
            )
            expect(missionManager.shouldCheckMissionObjectives()).toBe(true)
        })

        it("returns true when missionAffiliationTurn is ALLY_TURN_END", () => {
            const missionManager = createMissionManager(
                MissionAffiliationTurn.ALLY_TURN_END
            )
            expect(missionManager.shouldCheckMissionObjectives()).toBe(true)
        })

        it("returns true when missionAffiliationTurn is ENEMY_TURN_START", () => {
            const missionManager = createMissionManager(
                MissionAffiliationTurn.ENEMY_TURN_START
            )
            expect(missionManager.shouldCheckMissionObjectives()).toBe(true)
        })

        it("returns true when missionAffiliationTurn is ENEMY_TURN_END", () => {
            const missionManager = createMissionManager(
                MissionAffiliationTurn.ENEMY_TURN_END
            )
            expect(missionManager.shouldCheckMissionObjectives()).toBe(true)
        })

        it("returns true when missionAffiliationTurn is NONE_AFFILIATION_TURN_START", () => {
            const missionManager = createMissionManager(
                MissionAffiliationTurn.NONE_AFFILIATION_TURN_START
            )
            expect(missionManager.shouldCheckMissionObjectives()).toBe(true)
        })

        it("returns true when missionAffiliationTurn is NONE_AFFILIATION_TURN_END", () => {
            const missionManager = createMissionManager(
                MissionAffiliationTurn.NONE_AFFILIATION_TURN_END
            )
            expect(missionManager.shouldCheckMissionObjectives()).toBe(true)
        })

        it("returns false when missionAffiliationTurn is PLAYER_TURN", () => {
            const missionManager = createMissionManager(
                MissionAffiliationTurn.PLAYER_TURN
            )
            expect(missionManager.shouldCheckMissionObjectives()).toBe(false)
        })

        it("returns false when missionAffiliationTurn is ALLY_TURN", () => {
            const missionManager = createMissionManager(
                MissionAffiliationTurn.ALLY_TURN
            )
            expect(missionManager.shouldCheckMissionObjectives()).toBe(false)
        })

        it("returns false when missionAffiliationTurn is ENEMY_TURN", () => {
            const missionManager = createMissionManager(
                MissionAffiliationTurn.ENEMY_TURN
            )
            expect(missionManager.shouldCheckMissionObjectives()).toBe(false)
        })

        it("returns false when missionAffiliationTurn is NONE_AFFILIATION_TURN", () => {
            const missionManager = createMissionManager(
                MissionAffiliationTurn.NONE_AFFILIATION_TURN
            )
            expect(missionManager.shouldCheckMissionObjectives()).toBe(false)
        })

        it("returns false when PLAYER_TURN and player1 and player2 both have action points", () => {
            const missionManager = createMissionManager(
                MissionAffiliationTurn.PLAYER_TURN
            )

            expect(
                inBattleSquaddieManager.canSquaddieAct({
                    battleSquaddieId: player1SquaddieId,
                })
            ).toBe(true)
            expect(
                inBattleSquaddieManager.canSquaddieAct({
                    battleSquaddieId: player2SquaddieId,
                })
            ).toBe(true)

            expect(missionManager.shouldCheckMissionObjectives()).toBe(false)
        })

        it("returns false when player1 spends 1 action point and still has action points remaining", () => {
            const missionManager = createMissionManager(
                MissionAffiliationTurn.PLAYER_TURN
            )

            const moveAction = squaddieActionManager.get("move")
            missionManager.recordAction({
                action: moveAction,
                results: [
                    {
                        ...player1SquaddieId,
                        actionPoints: { spent: 1 },
                    },
                ],
            })

            inBattleSquaddieManager.spendActionPoints({
                ...player1SquaddieId,
                actionPoints: 1,
            })

            expect(
                inBattleSquaddieManager.canSquaddieAct({
                    battleSquaddieId: player1SquaddieId,
                })
            ).toBe(true)

            expect(missionManager.shouldCheckMissionObjectives()).toBe(false)
        })

        it("returns true when player1 spends all of their action points", () => {
            const missionManager = createMissionManager(
                MissionAffiliationTurn.PLAYER_TURN
            )

            const moveAction = squaddieActionManager.get("move")
            missionManager.recordAction({
                action: moveAction,
                results: [
                    {
                        ...player1SquaddieId,
                        actionPoints: { spent: 3 },
                    },
                ],
            })

            inBattleSquaddieManager.spendActionPoints({
                ...player1SquaddieId,
                actionPoints: 3,
            })

            expect(
                inBattleSquaddieManager.canSquaddieAct({
                    battleSquaddieId: player1SquaddieId,
                })
            ).toBe(false)

            expect(missionManager.shouldCheckMissionObjectives()).toBe(true)
        })

        it("returns true when player1 acts and can still act, then player2 acts and exhausts their action points", () => {
            const missionManager = createMissionManager(
                MissionAffiliationTurn.PLAYER_TURN
            )

            const moveAction = squaddieActionManager.get("move")
            missionManager.recordAction({
                action: moveAction,
                results: [
                    {
                        ...player1SquaddieId,
                        actionPoints: { spent: 1 },
                    },
                ],
            })
            inBattleSquaddieManager.spendActionPoints({
                ...player1SquaddieId,
                actionPoints: 1,
            })

            missionManager.recordAction({
                action: moveAction,
                results: [
                    {
                        ...player2SquaddieId,
                        actionPoints: { spent: 3 },
                    },
                ],
            })
            inBattleSquaddieManager.spendActionPoints({
                ...player2SquaddieId,
                actionPoints: 3,
            })

            expect(
                inBattleSquaddieManager.canSquaddieAct({
                    battleSquaddieId: player1SquaddieId,
                })
            ).toBe(true)
            expect(
                inBattleSquaddieManager.canSquaddieAct({
                    battleSquaddieId: player2SquaddieId,
                })
            ).toBe(false)

            expect(missionManager.shouldCheckMissionObjectives()).toBe(true)
        })

        it("returns true when player1 acts and then is reduced to 0 HP", () => {
            const missionManager = createMissionManager(
                MissionAffiliationTurn.PLAYER_TURN
            )

            const moveAction = squaddieActionManager.get("move")
            missionManager.recordAction({
                action: moveAction,
                results: [
                    {
                        ...player1SquaddieId,
                        actionPoints: { spent: 1 },
                    },
                ],
            })

            inBattleSquaddieManager.dealDamageToSquaddie({
                ...player1SquaddieId,
                damage: {
                    amount: 999,
                    type: AttributeScore.BODY,
                },
            })

            expect(
                inBattleSquaddieManager.canSquaddieAct({
                    battleSquaddieId: player1SquaddieId,
                })
            ).toBe(false)

            expect(missionManager.shouldCheckMissionObjectives()).toBe(true)
        })

        it("returns false when player1 is at 0 HP but did not act this turn", () => {
            const missionManager = createMissionManager(
                MissionAffiliationTurn.PLAYER_TURN
            )

            inBattleSquaddieManager.dealDamageToSquaddie({
                ...player1SquaddieId,
                damage: {
                    amount: 999,
                    type: AttributeScore.BODY,
                },
            })

            expect(
                inBattleSquaddieManager.canSquaddieAct({
                    battleSquaddieId: player1SquaddieId,
                })
            ).toBe(false)

            expect(missionManager.shouldCheckMissionObjectives()).toBe(false)
        })

        it("returns false if inBattleSquaddieManager is undefined during an active turn phase", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
                objectives: [createMissionObjective()],
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                }),
            })

            const missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: undefined,
            })
            expect(missionManager.shouldCheckMissionObjectives()).toBe(false)
        })

        it("throws when state is undefined", () => {
            const missionManager = new MissionManager({})

            expect(() => missionManager.shouldCheckMissionObjectives()).toThrow(
                "[MissionManager.shouldCheckMissionObjectives]: state must be defined"
            )
        })
    })

    describe("createInMissionSummary and loadInMissionSummary", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let missionManager: MissionManager
        let squaddieId: BattleSquaddieId

        beforeEach(() => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "test sheet",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            distancePerAction: 1,
                            items: { maxCapacity: 0 },
                        },
                    }
                )

            const enemySquaddie = OutOfBattleSquaddieService.new({
                id: "enemy-1",
                name: "Enemy",
                actionIds: [],
                attributeSheetId: "test sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(enemySquaddie)

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            squaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy-1",
            })

            const objective = MissionObjectiveService.new({
                id: "obj-1",
                rewards: [MissionObjectiveRewardService.newMissionEndsReward()],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [objective],
            })

            missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
            })
        })

        it("createInMissionSummary captures objective and squaddie state", () => {
            inBattleSquaddieManager.dealDamageToSquaddie({
                ...squaddieId,
                damage: { amount: 5, type: undefined },
            })

            const inMissionSummary = missionManager.createInMissionSummary()

            expect(inMissionSummary.missionObjectives).toHaveLength(1)
            expect(inMissionSummary.missionObjectives[0].id).toBe("obj-1")
            expect(inMissionSummary.missionObjectives[0].isCompleted).toBe(
                false
            )

            const squaddieData =
                inMissionSummary.inBattleSquaddieCollection.byOutOfBattleSquaddieId.get(
                    "enemy-1"
                )![0]
            expect(squaddieData.hitPoints.current).toBe(5)
        })

        it("loadInMissionSummary restores squaddie state", () => {
            const tempManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                inBattleSquaddieManager.outOfBattleSquaddieManager!
            )
            const tempId = tempManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy-1",
            })
            tempManager.dealDamageToSquaddie({
                ...tempId,
                damage: { amount: 7, type: undefined },
            })
            tempManager.spendActionPoints({ ...tempId, actionPoints: 2 })
            const savedState = {
                mapId: "",
                mapName: "",
                missionObjectives: [
                    { id: "obj-1", isCompleted: false, hasGivenReward: false },
                ],
                inBattleSquaddieCollection:
                    tempManager.inBattleSquaddieCollection!,
                recentPhaseTransitions: [],
            }

            missionManager.loadInMissionSummary(savedState)

            const hitPoints = inBattleSquaddieManager.getHitPoints(squaddieId)
            expect(hitPoints.current).toBe(3)

            const actionPoints =
                inBattleSquaddieManager.getActionPoints(squaddieId)
            expect(actionPoints.current).toBe(1)
        })

        it("loadInMissionSummary restores objective hasGivenReward", () => {
            const tempManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                inBattleSquaddieManager.outOfBattleSquaddieManager!
            )
            const tempId = tempManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy-1",
            })
            tempManager.dealDamageToSquaddie({
                ...tempId,
                damage: { amount: 10, type: undefined },
            })
            const savedState = {
                mapId: "",
                mapName: "",
                missionObjectives: [
                    { id: "obj-1", isCompleted: true, hasGivenReward: true },
                ],
                inBattleSquaddieCollection:
                    tempManager.inBattleSquaddieCollection!,
                recentPhaseTransitions: [],
            }

            missionManager.loadInMissionSummary(savedState)

            expect(
                missionManager.missionState!.objectives[0].hasGivenReward
            ).toBe(true)
        })

        it("round-trip preserves state", () => {
            inBattleSquaddieManager.dealDamageToSquaddie({
                ...squaddieId,
                damage: { amount: 7, type: undefined },
            })
            inBattleSquaddieManager.spendActionPoints({
                ...squaddieId,
                actionPoints: 2,
            })

            const originalHitPoints =
                inBattleSquaddieManager.getHitPoints(squaddieId)
            const originalActionPoints =
                inBattleSquaddieManager.getActionPoints(squaddieId)

            const savedState = missionManager.createInMissionSummary()

            inBattleSquaddieManager.giveHealingToSquaddie({
                ...squaddieId,
                healing: { raw: 10 },
            })
            inBattleSquaddieManager.restoreActionPoints({
                ...squaddieId,
                actionPoints: 3,
            })

            missionManager.loadInMissionSummary(savedState)

            const restoredHitPoints =
                inBattleSquaddieManager.getHitPoints(squaddieId)
            const restoredActionPoints =
                inBattleSquaddieManager.getActionPoints(squaddieId)

            expect(restoredHitPoints.current).toBe(originalHitPoints.current)
            expect(restoredActionPoints.current).toBe(
                originalActionPoints.current
            )
        })

        it("createInMissionSummary throws when state is undefined", () => {
            const manager = new MissionManager({
                missionState: undefined,
                inBattleSquaddieManager: inBattleSquaddieManager,
            })

            expect(() => manager.createInMissionSummary()).toThrow(
                "[MissionManager.createInMissionSummary]: state must be defined"
            )
        })

        it("createInMissionSummary throws when inBattleSquaddieManager is undefined", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
            })
            const manager = new MissionManager({ missionState: missionState })

            expect(() => manager.createInMissionSummary()).toThrow(
                "[MissionManager.createInMissionSummary]: inBattleSquaddieManager must be defined"
            )
        })
    })

    describe("Serialize Coordinate Maps", () => {
        it("will throw an error if CoordinateMapCollectionManager is not defined", () => {
            const manager = new MissionManager({})

            expect(() => {
                manager.serializeCoordinateMap("testMap")
            }).toThrow("coordinateMapCollectionManager must be defined")
        })
        it("will serialize and return a map", () => {
            const coordinateMapCollection = CoordinateMapCollectionService.new()
            const coordinateMapCollectionManager =
                new CoordinateMapCollectionManager(coordinateMapCollection)
            coordinateMapCollectionManager.addOrUpdate({
                map: CoordinateMapService.new({
                    id: "testMap",
                    name: "testMap",
                    movementProperties: ["1 1 1 1 ", " 1 2 1 x ", "1 - x x "],
                }),
            })
            coordinateMapCollectionManager.addSquaddie({
                mapId: "testMap",
                squaddieId: {
                    inBattleSquaddieId: 0,
                    outOfBattleSquaddieId: "soldier",
                },
                coordinate: {
                    row: 0,
                    col: 2,
                },
            })

            coordinateMapCollectionManager.addSquaddie({
                mapId: "testMap",
                squaddieId: {
                    inBattleSquaddieId: 0,
                    outOfBattleSquaddieId: "offscreen",
                },
                coordinate: undefined,
            })

            const manager = new MissionManager({
                coordinateMapCollectionManager,
            })

            const originalMap = CoordinateMapCollectionService.get({
                collection:
                    coordinateMapCollectionManager.coordinateMapCollection!,
                id: "testMap",
            })!

            const serializedMap = CoordinateMapService.serialize(originalMap)
            const serializedMapFromManager: SerializedCoordinateMap =
                manager.serializeCoordinateMap("testMap")
            expect(serializedMapFromManager).toEqual(serializedMap)
        })
    })
    describe("getSquaddieAffiliation", () => {
        it("calls its inBattleSquaddieManager to get the squaddie affiliation", () => {
            const inBattleSquaddieManager = {
                getSquaddieAffiliation: vi
                    .fn()
                    .mockReturnValue(SquaddieAffiliation.PLAYER),
            } as any

            const manager = new MissionManager({
                inBattleSquaddieManager: inBattleSquaddieManager,
            })

            const affiliation = manager.getSquaddieAffiliation({
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
            })

            expect(affiliation).toBe(SquaddieAffiliation.PLAYER)
            expect(
                inBattleSquaddieManager.getSquaddieAffiliation
            ).toHaveBeenCalledWith({
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
            })
        })

        it("throws an error if inBattleSquaddieManager is undefined", () => {
            const manager = new MissionManager()

            expect(() => {
                manager.getSquaddieAffiliation({
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie-1",
                })
            }).toThrow(
                "[MissionManager.getSquaddieAffiliation]: inBattleSquaddieManager must be defined"
            )
        })
    })

    describe("calculateNextPhase", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let coordinateMapCollectionManager: CoordinateMapCollectionManager
        let playerSquaddieId: BattleSquaddieId

        beforeEach(() => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "test_sheet",
                        attributeSheetOptions: { maxHitPoints: 10 },
                    }
                )

            const playerOutOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "player-1",
                name: "Player 1",
                affiliation: SquaddieAffiliation.PLAYER,
                attributeSheetId: "test_sheet",
            })

            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                playerOutOfBattleSquaddie
            )

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            playerSquaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "player-1",
            })

            const map = CoordinateMapService.new({
                id: "test_map",
                name: "test map",
                movementProperties: ["1 1 1 "],
            })

            coordinateMapCollectionManager = new CoordinateMapCollectionManager(
                CoordinateMapCollectionService.new()
            )
            coordinateMapCollectionManager.addOrUpdate({ map })

            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: playerSquaddieId,
                coordinate: { row: 0, col: 0 },
            })
        })

        it("throws when state is undefined", () => {
            const manager = new MissionManager({
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
            })

            expect(() => manager.calculateNextPhase()).toThrow(
                "[MissionManager.calculateNextPhase]: state must be defined"
            )
        })

        it("throws when inBattleSquaddieManager is undefined", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const manager = new MissionManager({
                missionState,
                coordinateMapCollectionManager,
            })

            expect(() => manager.calculateNextPhase()).toThrow(
                "[MissionManager.calculateNextPhase]: inBattleSquaddieManager must be defined"
            )
        })

        it("throws when coordinateMapCollectionManager is undefined", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
            })

            expect(() => manager.calculateNextPhase()).toThrow(
                "[MissionManager.calculateNextPhase]: coordinateMapCollectionManager must be defined"
            )
        })

        it("delegates to MissionTurnService.calculateNextPhase", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.TURN_START,
                }),
            })

            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
            })

            const nextTurn = manager.calculateNextPhase()

            expect(nextTurn.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.PLAYER_TURN_START
            )
        })

        it("returns PLAYER_TURN when transitioning from PLAYER_TURN_START", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
                turn: MissionTurnService.new({
                    missionAffiliationTurn:
                        MissionAffiliationTurn.PLAYER_TURN_START,
                }),
            })

            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
            })

            const nextTurn = manager.calculateNextPhase()

            expect(nextTurn.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.PLAYER_TURN
            )
        })

        it("returns TURN_END when no squaddies can act", () => {
            inBattleSquaddieManager.spendActionPoints({
                ...playerSquaddieId,
                actionPoints: 3,
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
                turn: MissionTurnService.new({
                    missionAffiliationTurn:
                        MissionAffiliationTurn.PLAYER_TURN_END,
                }),
            })

            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
            })

            const nextTurn = manager.calculateNextPhase()

            expect(nextTurn.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.TURN_END
            )
        })
    })

    describe("transitionToNextPhase", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let coordinateMapCollectionManager: CoordinateMapCollectionManager
        let playerSquaddieId: BattleSquaddieId
        let allySquaddieId: BattleSquaddieId

        beforeEach(() => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "test_sheet",
                        attributeSheetOptions: { maxHitPoints: 10 },
                    }
                )

            const playerOutOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "player-1",
                name: "Player 1",
                affiliation: SquaddieAffiliation.PLAYER,
                attributeSheetId: "test_sheet",
            })

            const allyOutOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "ally-1",
                name: "Ally 1",
                affiliation: SquaddieAffiliation.ALLY,
                attributeSheetId: "test_sheet",
            })

            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                playerOutOfBattleSquaddie
            )
            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                allyOutOfBattleSquaddie
            )

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            playerSquaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "player-1",
            })

            allySquaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "ally-1",
            })

            const map = CoordinateMapService.new({
                id: "test_map",
                name: "test map",
                movementProperties: ["1 1 1 "],
            })

            coordinateMapCollectionManager = new CoordinateMapCollectionManager(
                CoordinateMapCollectionService.new()
            )
            coordinateMapCollectionManager.addOrUpdate({ map })

            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: playerSquaddieId,
                coordinate: { row: 0, col: 0 },
            })

            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: allySquaddieId,
                coordinate: { row: 0, col: 1 },
            })
        })

        it("throws when state is undefined", () => {
            const manager = new MissionManager({
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
            })

            expect(() => manager.transitionToNextPhase()).toThrow(
                "[MissionManager.transitionToNextPhase]: state must be defined"
            )
        })

        it("throws when inBattleSquaddieManager is undefined", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const manager = new MissionManager({
                missionState,
                coordinateMapCollectionManager,
            })

            expect(() => manager.transitionToNextPhase()).toThrow(
                "[MissionManager.transitionToNextPhase]: inBattleSquaddieManager must be defined"
            )
        })

        it("throws when coordinateMapCollectionManager is undefined", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
            })

            expect(() => manager.transitionToNextPhase()).toThrow(
                "[MissionManager.transitionToNextPhase]: coordinateMapCollectionManager must be defined"
            )
        })

        it("updates missionState's turn to the next phase", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.TURN_START,
                }),
            })

            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
            })

            manager.transitionToNextPhase()

            expect(manager.missionState!.turn.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.PLAYER_TURN_START
            )
        })

        it("state is updated immutably", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.TURN_START,
                }),
            })

            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
            })

            const originalState = manager.missionState

            manager.transitionToNextPhase()

            expect(manager.missionState).not.toBe(originalState)
        })

        it("resets action points when transitioning TURN_START to PLAYER_TURN_START", () => {
            inBattleSquaddieManager.spendActionPoints({
                ...playerSquaddieId,
                actionPoints: 3,
            })

            expect(
                inBattleSquaddieManager.getActionPoints(playerSquaddieId)
                    .current
            ).toBe(0)

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.TURN_START,
                }),
            })

            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
            })

            manager.transitionToNextPhase()

            expect(manager.missionState!.turn.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.PLAYER_TURN_START
            )
            expect(
                inBattleSquaddieManager.getActionPoints(playerSquaddieId)
                    .current
            ).toBe(3)
        })

        it("resets action points when transitioning PLAYER_TURN_END to ALLY_TURN_START", () => {
            inBattleSquaddieManager.spendActionPoints({
                ...allySquaddieId,
                actionPoints: 3,
            })

            expect(
                inBattleSquaddieManager.getActionPoints(allySquaddieId).current
            ).toBe(0)

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
                turn: MissionTurnService.new({
                    missionAffiliationTurn:
                        MissionAffiliationTurn.PLAYER_TURN_END,
                }),
            })

            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
            })

            manager.transitionToNextPhase()

            expect(manager.missionState!.turn.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.ALLY_TURN_START
            )
            expect(
                inBattleSquaddieManager.getActionPoints(allySquaddieId).current
            ).toBe(3)
        })

        it("does NOT reset action points when transitioning PLAYER_TURN_START to PLAYER_TURN", () => {
            inBattleSquaddieManager.spendActionPoints({
                ...playerSquaddieId,
                actionPoints: 1,
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
                turn: MissionTurnService.new({
                    missionAffiliationTurn:
                        MissionAffiliationTurn.PLAYER_TURN_START,
                }),
            })

            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
            })

            manager.transitionToNextPhase()

            expect(manager.missionState!.turn.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.PLAYER_TURN
            )
            expect(
                inBattleSquaddieManager.getActionPoints(playerSquaddieId)
                    .current
            ).toBe(2)
        })

        it("does NOT reset action points when transitioning PLAYER_TURN to PLAYER_TURN_END", () => {
            inBattleSquaddieManager.spendActionPoints({
                ...playerSquaddieId,
                actionPoints: 3,
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                }),
            })

            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
            })

            manager.transitionToNextPhase()

            expect(manager.missionState!.turn.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.PLAYER_TURN_END
            )
            expect(
                inBattleSquaddieManager.getActionPoints(playerSquaddieId)
                    .current
            ).toBe(0)
        })
    })

    describe("Multiple Attack Penalty (MAP) in useActionAndGetResults", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let squaddieActionManager: SquaddieActionManager
        let coordinateMapCollectionManager: CoordinateMapCollectionManager
        let actorSquaddieId: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
        let targetSquaddieId: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
        let weaponActionId: string
        let nonWeaponActionId: string
        let flurryActionId: string

        beforeEach(() => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "actor_sheet",
                        attributeSheetOptions: {
                            maxHitPoints: 20,
                            items: { maxCapacity: 0 },
                        },
                    }
                )

            const targetAttributeSheet =
                OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
                    id: "target_sheet",
                    maxHitPoints: 20,
                    items: { maxCapacity: 0 },
                })
            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(
                targetAttributeSheet
            )

            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "actor",
                    name: "Actor",
                    affiliation: SquaddieAffiliation.PLAYER,
                    attributeSheetId: "actor_sheet",
                })
            )
            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "target",
                    name: "Target",
                    affiliation: SquaddieAffiliation.ENEMY,
                    attributeSheetId: "target_sheet",
                })
            )

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            actorSquaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor",
            })
            targetSquaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "target",
            })

            squaddieActionManager = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )

            weaponActionId = "weapon-attack"
            squaddieActionManager.addOrUpdate(
                SquaddieActionService.new({
                    id: weaponActionId,
                    name: "Weapon Attack",
                    proficiency: ProficiencyType.WEAPON_MARTIAL,
                    targeting: {
                        range: ActionRange.MELEE,
                        shape: CoordinateGeneratorShape.BLOOM,
                        affiliationRelationship: {
                            self: false,
                            foe: true,
                            friend: false,
                        },
                    },
                    effectOnActor: {
                        SUCCESS: { actionPoints: { spent: 1 } },
                    },
                    effectOnTarget: {
                        SUCCESS: {
                            damage: {
                                raw: 1,
                                targetProficiency: ProficiencyType.ARMOR,
                            },
                        },
                    },
                })
            )

            nonWeaponActionId = "non-weapon"
            squaddieActionManager.addOrUpdate(
                SquaddieActionService.new({
                    id: nonWeaponActionId,
                    name: "Non-Weapon",
                    proficiency: ProficiencyType.SKILL_BODY,
                    targeting: {
                        range: ActionRange.MELEE,
                        shape: CoordinateGeneratorShape.BLOOM,
                        affiliationRelationship: {
                            self: false,
                            foe: true,
                            friend: false,
                        },
                    },
                    effectOnActor: {
                        SUCCESS: { actionPoints: { spent: 1 } },
                    },
                    effectOnTarget: {
                        SUCCESS: {
                            damage: {
                                raw: 1,
                                targetProficiency: ProficiencyType.SKILL_BODY,
                            },
                        },
                    },
                })
            )

            flurryActionId = "flurry"
            squaddieActionManager.addOrUpdate(
                SquaddieActionService.new({
                    id: flurryActionId,
                    name: "Flurry",
                    proficiency: ProficiencyType.WEAPON_MARTIAL,
                    multipleAttackPenalty: { contribution: 2 },
                    targeting: {
                        range: ActionRange.MELEE,
                        shape: CoordinateGeneratorShape.BLOOM,
                        affiliationRelationship: {
                            self: false,
                            foe: true,
                            friend: false,
                        },
                    },
                    effectOnActor: {
                        SUCCESS: { actionPoints: { spent: 2 } },
                    },
                    effectOnTarget: {
                        SUCCESS: {
                            damage: {
                                raw: 1,
                                targetProficiency: ProficiencyType.ARMOR,
                            },
                        },
                    },
                })
            )

            const map = CoordinateMapService.new({
                id: "test_map",
                name: "test map",
                movementProperties: ["1 1 1 "],
            })

            coordinateMapCollectionManager = new CoordinateMapCollectionManager(
                CoordinateMapCollectionService.new()
            )
            coordinateMapCollectionManager.addOrUpdate({ map })
            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: actorSquaddieId,
                coordinate: { row: 0, col: 0 },
            })
            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: targetSquaddieId,
                coordinate: { row: 0, col: 1 },
            })
        })

        it("attackContributionThisTurn increments by 1 after a weapon action", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })
            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
            })

            expect(
                inBattleSquaddieManager.getAttackContributionThisTurn(
                    actorSquaddieId
                )
            ).toBe(0)

            manager.useActionAndGetResults({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: weaponActionId },
                rollGenerator: new RollGenerator([3, 3]),
            })

            expect(
                inBattleSquaddieManager.getAttackContributionThisTurn(
                    actorSquaddieId
                )
            ).toBe(1)
        })

        it("attackContributionThisTurn increments to 2 after two weapon actions", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })
            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
            })

            manager.useActionAndGetResults({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: weaponActionId },
                rollGenerator: new RollGenerator([3, 3]),
            })
            manager.useActionAndGetResults({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: weaponActionId },
                rollGenerator: new RollGenerator([3, 3]),
            })

            expect(
                inBattleSquaddieManager.getAttackContributionThisTurn(
                    actorSquaddieId
                )
            ).toBe(2)
        })

        it("non-weapon action does not increment attackContributionThisTurn", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })
            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
            })

            manager.useActionAndGetResults({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: nonWeaponActionId },
                rollGenerator: new RollGenerator([3, 3]),
            })

            expect(
                inBattleSquaddieManager.getAttackContributionThisTurn(
                    actorSquaddieId
                )
            ).toBe(0)
        })

        it("flurry action (mapContribution 2) increments attackContributionThisTurn by 2", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })
            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
            })

            manager.useActionAndGetResults({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: flurryActionId },
                rollGenerator: new RollGenerator([3, 3]),
            })

            expect(
                inBattleSquaddieManager.getAttackContributionThisTurn(
                    actorSquaddieId
                )
            ).toBe(2)
        })

        it("attackContributionThisTurn resets to 0 when resetAttackContributionThisTurn is called", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                }),
            })
            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
            })

            manager.useActionAndGetResults({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: weaponActionId },
                rollGenerator: new RollGenerator([3, 3]),
            })
            expect(
                inBattleSquaddieManager.getAttackContributionThisTurn(
                    actorSquaddieId
                )
            ).toBe(1)

            inBattleSquaddieManager.resetAttackContributionThisTurn(
                actorSquaddieId
            )

            expect(
                inBattleSquaddieManager.getAttackContributionThisTurn(
                    actorSquaddieId
                )
            ).toBe(0)
        })
    })

    describe("resolveAoeTargets", () => {
        describe("LINE action hits every enemy along the line", () => {
            let missionManager: MissionManager
            let actorId: BattleSquaddieId
            let enemyAId: BattleSquaddieId
            let enemyBId: BattleSquaddieId
            let enemyCId: BattleSquaddieId

            const createLineAction = () =>
                SquaddieActionService.new({
                    id: "slash",
                    name: "Slash",
                    range: ActionRange.LONG,
                    shape: CoordinateGeneratorShape.LINE,
                    areaOfEffectSize: 0,
                    affiliationRelationship: {
                        self: false,
                        foe: true,
                        friend: false,
                    },
                    effectOnActor: {
                        SUCCESS: { actionPoints: { spent: 1 } },
                    },
                    effectOnTarget: {
                        SUCCESS: {
                            damage: {
                                raw: 2,
                                targetProficiency: ProficiencyType.SKILL_BODY,
                            },
                        },
                    },
                })

            beforeEach(() => {
                const { manager: outOfBattleSquaddieManager } =
                    OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                        {
                            sheetId: "line_sheet",
                            attributeSheetOptions: {
                                maxHitPoints: 10,
                                items: { maxCapacity: 0 },
                            },
                        }
                    )

                outOfBattleSquaddieManager.addOrUpdateSquaddie(
                    OutOfBattleSquaddieService.new({
                        id: "actor",
                        name: "Actor",
                        affiliation: SquaddieAffiliation.PLAYER,
                        attributeSheetId: "line_sheet",
                    })
                )
                outOfBattleSquaddieManager.addOrUpdateSquaddie(
                    OutOfBattleSquaddieService.new({
                        id: "enemy-a",
                        name: "Enemy A",
                        affiliation: SquaddieAffiliation.ENEMY,
                        attributeSheetId: "line_sheet",
                    })
                )
                outOfBattleSquaddieManager.addOrUpdateSquaddie(
                    OutOfBattleSquaddieService.new({
                        id: "enemy-b",
                        name: "Enemy B",
                        affiliation: SquaddieAffiliation.ENEMY,
                        attributeSheetId: "line_sheet",
                    })
                )
                outOfBattleSquaddieManager.addOrUpdateSquaddie(
                    OutOfBattleSquaddieService.new({
                        id: "enemy-c",
                        name: "Enemy C",
                        affiliation: SquaddieAffiliation.ENEMY,
                        attributeSheetId: "line_sheet",
                    })
                )

                const inBattleSquaddieManager = new InBattleSquaddieManager(
                    InBattleSquaddieCollectionService.new(),
                    outOfBattleSquaddieManager
                )
                actorId = inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "actor",
                })
                enemyAId = inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy-a",
                })
                enemyBId = inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy-b",
                })
                enemyCId = inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy-c",
                })

                const map = CoordinateMapService.new({
                    id: "line_map",
                    name: "Line map",
                    movementProperties: ["1 1 1 1 1 1"],
                })
                const coordinateMapCollectionManager =
                    new CoordinateMapCollectionManager(
                        CoordinateMapCollectionService.new()
                    )
                coordinateMapCollectionManager.addOrUpdate({ map })
                coordinateMapCollectionManager.addSquaddie({
                    mapId: "line_map",
                    squaddieId: actorId,
                    coordinate: { row: 0, col: 0 },
                })
                coordinateMapCollectionManager.addSquaddie({
                    mapId: "line_map",
                    squaddieId: enemyAId,
                    coordinate: { row: 0, col: 2 },
                })
                coordinateMapCollectionManager.addSquaddie({
                    mapId: "line_map",
                    squaddieId: enemyBId,
                    coordinate: { row: 0, col: 4 },
                })
                coordinateMapCollectionManager.addSquaddie({
                    mapId: "line_map",
                    squaddieId: enemyCId,
                    coordinate: { row: 0, col: 5 },
                })

                const squaddieActionManager = new SquaddieActionManager(
                    SquaddieActionCollectionService.new()
                )
                squaddieActionManager.addOrUpdate(createLineAction())

                missionManager = new MissionManager({
                    missionState: MissionStateService.new({
                        id: "line-mission",
                        mapId: "line_map",
                    }),
                    inBattleSquaddieManager,
                    coordinateMapCollectionManager,
                    squaddieActionManager,
                })
            })

            it("returns all enemies along the line", () => {
                const targets = missionManager.resolveAoeTargets({
                    actor: actorId,
                    action: { id: "slash" },
                    targetCoordinate: { row: 0, col: 4 },
                })

                const targetIds = targets.map((t) => t.outOfBattleSquaddieId)
                expect(targetIds).toContain("enemy-a")
                expect(targetIds).toContain("enemy-b")
                expect(targetIds).toContain("enemy-c")
            })

            it("previewActionResults forecasts results for all enemies in the line", () => {
                const targets = missionManager.resolveAoeTargets({
                    actor: actorId,
                    action: { id: "slash" },
                    targetCoordinate: { row: 0, col: 4 },
                })

                const forecastedResults = missionManager.previewActionResults({
                    actor: actorId,
                    targets,
                    action: { id: "slash" },
                })

                const forecastedTargetIds = forecastedResults.map(
                    (result) => result.battleSquaddieId.outOfBattleSquaddieId
                )
                expect(forecastedTargetIds).toContain("enemy-a")
                expect(forecastedTargetIds).toContain("enemy-b")
                expect(forecastedTargetIds).toContain("enemy-c")
            })

            it("useActionAndGetResults applies results to all enemies in the line", () => {
                const targets = missionManager.resolveAoeTargets({
                    actor: actorId,
                    action: { id: "slash" },
                    targetCoordinate: { row: 0, col: 4 },
                })

                const results = missionManager.useActionAndGetResults({
                    actor: actorId,
                    targets,
                    action: { id: "slash" },
                    rollGenerator: new RollGenerator([3, 3]),
                })

                const resultKeys = [...results.targetResults.keys()]
                expect(resultKeys.some((k) => k.startsWith("enemy-a"))).toBe(
                    true
                )
                expect(resultKeys.some((k) => k.startsWith("enemy-b"))).toBe(
                    true
                )
                expect(resultKeys.some((k) => k.startsWith("enemy-c"))).toBe(
                    true
                )
            })
        })

        describe("BLOOM action hits every enemy within the radius", () => {
            let missionManager: MissionManager
            let actorId: BattleSquaddieId
            let enemyAId: BattleSquaddieId
            let enemyBId: BattleSquaddieId
            let enemyCId: BattleSquaddieId

            const createBloomAction = () =>
                SquaddieActionService.new({
                    id: "fireball",
                    name: "Fireball",
                    range: ActionRange.MEDIUM,
                    shape: CoordinateGeneratorShape.BLOOM,
                    areaOfEffectSize: 1,
                    affiliationRelationship: {
                        self: false,
                        foe: true,
                        friend: false,
                    },
                    effectOnActor: {
                        SUCCESS: { actionPoints: { spent: 1 } },
                    },
                    effectOnTarget: {
                        SUCCESS: {
                            damage: {
                                raw: 2,
                                targetProficiency: ProficiencyType.SKILL_BODY,
                            },
                        },
                    },
                })

            beforeEach(() => {
                const { manager: outOfBattleSquaddieManager } =
                    OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                        {
                            sheetId: "bloom_sheet",
                            attributeSheetOptions: {
                                maxHitPoints: 10,
                                items: { maxCapacity: 0 },
                            },
                        }
                    )

                outOfBattleSquaddieManager.addOrUpdateSquaddie(
                    OutOfBattleSquaddieService.new({
                        id: "actor",
                        name: "Actor",
                        affiliation: SquaddieAffiliation.PLAYER,
                        attributeSheetId: "bloom_sheet",
                    })
                )
                outOfBattleSquaddieManager.addOrUpdateSquaddie(
                    OutOfBattleSquaddieService.new({
                        id: "enemy-a",
                        name: "Enemy A",
                        affiliation: SquaddieAffiliation.ENEMY,
                        attributeSheetId: "bloom_sheet",
                    })
                )
                outOfBattleSquaddieManager.addOrUpdateSquaddie(
                    OutOfBattleSquaddieService.new({
                        id: "enemy-b",
                        name: "Enemy B",
                        affiliation: SquaddieAffiliation.ENEMY,
                        attributeSheetId: "bloom_sheet",
                    })
                )
                outOfBattleSquaddieManager.addOrUpdateSquaddie(
                    OutOfBattleSquaddieService.new({
                        id: "enemy-c",
                        name: "Enemy C",
                        affiliation: SquaddieAffiliation.ENEMY,
                        attributeSheetId: "bloom_sheet",
                    })
                )

                const inBattleSquaddieManager = new InBattleSquaddieManager(
                    InBattleSquaddieCollectionService.new(),
                    outOfBattleSquaddieManager
                )
                actorId = inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "actor",
                })
                enemyAId = inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy-a",
                })
                enemyBId = inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy-b",
                })
                enemyCId = inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy-c",
                })

                const map = CoordinateMapService.new({
                    id: "bloom_map",
                    name: "Bloom map",
                    movementProperties: ["1 1 1 1", "1 1 1 1"],
                })
                const coordinateMapCollectionManager =
                    new CoordinateMapCollectionManager(
                        CoordinateMapCollectionService.new()
                    )
                coordinateMapCollectionManager.addOrUpdate({ map })
                coordinateMapCollectionManager.addSquaddie({
                    mapId: "bloom_map",
                    squaddieId: actorId,
                    coordinate: { row: 0, col: 0 },
                })
                coordinateMapCollectionManager.addSquaddie({
                    mapId: "bloom_map",
                    squaddieId: enemyAId,
                    coordinate: { row: 0, col: 1 },
                })
                coordinateMapCollectionManager.addSquaddie({
                    mapId: "bloom_map",
                    squaddieId: enemyBId,
                    coordinate: { row: 1, col: 1 },
                })
                coordinateMapCollectionManager.addSquaddie({
                    mapId: "bloom_map",
                    squaddieId: enemyCId,
                    coordinate: { row: 0, col: 3 },
                })

                const squaddieActionManager = new SquaddieActionManager(
                    SquaddieActionCollectionService.new()
                )
                squaddieActionManager.addOrUpdate(createBloomAction())

                missionManager = new MissionManager({
                    missionState: MissionStateService.new({
                        id: "bloom-mission",
                        mapId: "bloom_map",
                    }),
                    inBattleSquaddieManager,
                    coordinateMapCollectionManager,
                    squaddieActionManager,
                })
            })

            it("returns all enemies within the blast radius, excluding enemies outside it", () => {
                const targets = missionManager.resolveAoeTargets({
                    actor: actorId,
                    action: { id: "fireball" },
                    targetCoordinate: { row: 0, col: 1 },
                })

                const targetIds = targets.map((t) => t.outOfBattleSquaddieId)
                expect(targetIds).toContain("enemy-a")
                expect(targetIds).toContain("enemy-b")
                expect(targetIds).not.toContain("enemy-c")
            })

            it("previewActionResults forecasts results for all enemies in the blast radius", () => {
                const targets = missionManager.resolveAoeTargets({
                    actor: actorId,
                    action: { id: "fireball" },
                    targetCoordinate: { row: 0, col: 1 },
                })

                const forecastedResults = missionManager.previewActionResults({
                    actor: actorId,
                    targets,
                    action: { id: "fireball" },
                })

                const forecastedTargetIds = forecastedResults.map(
                    (result) => result.battleSquaddieId.outOfBattleSquaddieId
                )
                expect(forecastedTargetIds).toContain("enemy-a")
                expect(forecastedTargetIds).toContain("enemy-b")
                expect(forecastedTargetIds).not.toContain("enemy-c")
            })

            it("useActionAndGetResults applies results to all enemies within the blast radius", () => {
                const targets = missionManager.resolveAoeTargets({
                    actor: actorId,
                    action: { id: "fireball" },
                    targetCoordinate: { row: 0, col: 1 },
                })

                const results = missionManager.useActionAndGetResults({
                    actor: actorId,
                    targets,
                    action: { id: "fireball" },
                    rollGenerator: new RollGenerator([3, 3]),
                })

                const resultKeys = [...results.targetResults.keys()]
                expect(resultKeys.some((k) => k.startsWith("enemy-a"))).toBe(
                    true
                )
                expect(resultKeys.some((k) => k.startsWith("enemy-b"))).toBe(
                    true
                )
                expect(resultKeys.every((k) => !k.startsWith("enemy-c"))).toBe(
                    true
                )
            })
        })
    })
})
