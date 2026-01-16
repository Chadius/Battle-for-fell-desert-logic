import { beforeEach, describe, expect, it } from "vitest"
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
import { OutOfBattleSquaddieManager } from "../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { OutOfBattleSquaddieCollectionService } from "../squaddie/outOfBattle/outOfBattleSquaddieCollection"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection"
import { OutOfBattleSquaddieAttributeSheetService } from "../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet"
import { OutOfBattleSquaddieService } from "../squaddie/outOfBattle/outOfBattleSquaddie"
import { InBattleSquaddieCollectionService } from "../squaddie/inBattle/inBattleSquaddieCollection"
import { AttributeScore } from "../proficiency/attributeScore"
import { SquaddieActionManager } from "../squaddieAction/squaddieActionManager"
import { SquaddieActionCollectionService } from "../squaddieAction/squaddieActionCollection"
import { SquaddieActionService } from "../squaddieAction/squaddieAction"
import {
    ProficiencyLevel,
    ProficiencyType,
} from "../proficiency/proficiencyLevel"
import { CoordinateMapCollectionManager } from "../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../coordinateMap/coordinateMapCollection"
import { CoordinateMapService } from "../coordinateMap/coordinateMap"
import { RollGenerator } from "../squaddieAction/calculate/roll/rollGenerator"
import { ActionRange } from "../squaddieAction/actionRange"
import { CoordinateGeneratorShape } from "../coordinateMap/shape"

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
            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
            })

            const manager = new MissionManager(state)

            expect(manager.missionState).toBe(state)
        })

        it("creates a new MissionManager with all dependencies", () => {
            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
            })
            const inBattleSquaddieManager = {} as any
            const coordinateMapCollectionManager = {} as any
            const squaddieActionManager = {} as any

            const manager = new MissionManager(
                state,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager
            )

            expect(manager.missionState).toBe(state)
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
        it("returns false when no objectives have MISSION_ENDS reward", () => {
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

            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [objective],
            })

            const manager = new MissionManager(state)

            expect(manager.hasMissionEnded()).toBe(false)
        })

        it("returns false when objective has MISSION_ENDS but not yet rewarded", () => {
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

            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [objective],
            })

            const manager = new MissionManager(state)

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

            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [rewardedObjective],
            })

            const manager = new MissionManager(state)

            expect(manager.hasMissionEnded()).toBe(true)
        })

        it("throws when state is undefined", () => {
            const manager = new MissionManager()

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
            const outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
                OutOfBattleSquaddieCollectionService.new(),
                OutOfBattleSquaddieAttributeSheetCollectionService.new()
            )

            const attributeSheet = OutOfBattleSquaddieAttributeSheetService.new(
                {
                    items: { itemIds: [], maxCapacity: 0 },
                    movement: {
                        distancePerAction: 1,
                    },
                    id: "test sheet",
                    maxHitPoints: 10,
                    attributeScores: {
                        [AttributeScore.BODY]: 5,
                        [AttributeScore.MIND]: 5,
                        [AttributeScore.SOUL]: 5,
                    },
                    rank: 0,
                }
            )

            const enemyOutOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "enemy-1",
                name: "Enemy",
                affiliation: SquaddieAffiliation.ENEMY,
                attributeSheetId: "test sheet",
            })

            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(attributeSheet)
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

            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [objective],
            })

            const manager = new MissionManager(state, inBattleSquaddieManager)

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

            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [objective],
            })

            const manager = new MissionManager(state, inBattleSquaddieManager)

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

            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [rewardedObjective],
            })

            const manager = new MissionManager(state, inBattleSquaddieManager)

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
            const manager = new MissionManager()

            expect(() =>
                manager.calculateCompletedButNotRewardedMissionObjectives()
            ).toThrow(
                "[MissionManager.calculateCompletedButNotRewardedMissionObjectives]: state must be defined"
            )
        })

        it("throws when inBattleSquaddieManager is undefined", () => {
            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
            })

            const manager = new MissionManager(state)

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

            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [objective],
            })

            const manager = new MissionManager(state)

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

            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [objective1, objective2],
            })

            const manager = new MissionManager(state)

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

            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [objective],
            })

            const manager = new MissionManager(state)
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

            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [objective],
            })

            const manager = new MissionManager(state)

            expect(() => {
                manager.setMissionObjectiveAsRewarded("non-existent")
            }).not.toThrow()

            expect(manager.missionState!.objectives[0].hasGivenReward).toBe(
                false
            )
        })

        it("throws when state is undefined", () => {
            const manager = new MissionManager()

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
            const outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
                OutOfBattleSquaddieCollectionService.new(),
                OutOfBattleSquaddieAttributeSheetCollectionService.new()
            )

            const actorAttributeSheet =
                OutOfBattleSquaddieAttributeSheetService.new({
                    items: { itemIds: [], maxCapacity: 0 },
                    movement: {
                        distancePerAction: 2,
                    },
                    id: "actor_sheet",
                    maxHitPoints: 10,
                    attributeScores: {
                        [AttributeScore.BODY]: 5,
                        [AttributeScore.MIND]: 5,
                        [AttributeScore.SOUL]: 5,
                    },
                    rank: 0,
                })

            const targetAttributeSheet =
                OutOfBattleSquaddieAttributeSheetService.new({
                    items: { itemIds: [], maxCapacity: 0 },
                    movement: {
                        distancePerAction: 2,
                    },
                    id: "target_sheet",
                    maxHitPoints: 10,
                    attributeScores: {
                        [AttributeScore.BODY]: 5,
                        [AttributeScore.MIND]: 5,
                        [AttributeScore.SOUL]: 5,
                    },
                    rank: 0,
                })

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

            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(
                actorAttributeSheet
            )
            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(
                targetAttributeSheet
            )
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
            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const manager = new MissionManager(
                state,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager
            )

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
            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const manager = new MissionManager(
                state,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager
            )

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
            const manager = new MissionManager()

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
            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const manager = new MissionManager(state)

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
            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const manager = new MissionManager(
                state,
                inBattleSquaddieManager,
                coordinateMapCollectionManager
            )

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
            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const manager = new MissionManager(
                state,
                inBattleSquaddieManager,
                undefined,
                squaddieActionManager
            )

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
            outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
                OutOfBattleSquaddieCollectionService.new(),
                OutOfBattleSquaddieAttributeSheetCollectionService.new()
            )

            const attributeSheet = OutOfBattleSquaddieAttributeSheetService.new(
                {
                    id: "attr-sheet-1",
                    maxHitPoints: 10,
                    attributeScores: {
                        [AttributeScore.BODY]: 5,
                        [AttributeScore.MIND]: 5,
                        [AttributeScore.SOUL]: 5,
                    },
                    movement: {
                        distancePerAction: 2,
                    },
                    proficiencyLevels: {
                        [ProficiencyType.DEFEND_BODY]: ProficiencyLevel.NOVICE,
                        [ProficiencyType.SKILL_BODY]: ProficiencyLevel.EXPERT,
                    },
                    rank: 0,
                }
            )

            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(attributeSheet)
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

            manager = new MissionManager(
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager
            )
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
})
