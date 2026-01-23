import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngine } from "./missionEngine"
import { MissionManager } from "./missionManager"
import { MissionStateService } from "./missionState"
import { MissionObjectiveService } from "./missionObjective"
import { MissionObjectiveRewardService } from "./missionObjectiveReward"
import { MissionObjectiveCriteriaService } from "./missionObjectiveCriteria"
import { SquaddieAffiliation } from "../affiliation/affiliation"
import { OutOfBattleSquaddieManager } from "../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { OutOfBattleSquaddieCollectionService } from "../squaddie/outOfBattle/outOfBattleSquaddieCollection"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection"
import { OutOfBattleSquaddieAttributeSheetService } from "../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet"
import { OutOfBattleSquaddieService } from "../squaddie/outOfBattle/outOfBattleSquaddie"
import { InBattleSquaddieCollectionService } from "../squaddie/inBattle/inBattleSquaddieCollection"
import {
    type BattleSquaddieId,
    InBattleSquaddieManager,
} from "../squaddie/inBattle/inBattleSquaddieManager"
import { AttributeScore } from "../proficiency/attributeScore"
import { SquaddieActionManager } from "../squaddieAction/squaddieActionManager"
import { SquaddieActionCollectionService } from "../squaddieAction/squaddieActionCollection"
import { SquaddieActionService } from "../squaddieAction/squaddieAction"
import { ProficiencyType } from "../proficiency/proficiencyLevel"
import { CoordinateMapCollectionManager } from "../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../coordinateMap/coordinateMapCollection"
import { CoordinateMapService } from "../coordinateMap/coordinateMap"
import { RollGenerator } from "../squaddieAction/calculate/roll/rollGenerator"
import { ActionRange } from "../squaddieAction/actionRange"
import { CoordinateGeneratorShape } from "../coordinateMap/shape"
import { MissionAffiliationTurn, MissionTurnService } from "./missionTurn"

describe("MissionEngine", () => {
    describe("isDone", () => {
        it("throws error if MissionManager is undefined", () => {
            const missionEngine = new MissionEngine()

            expect(() => missionEngine.isDone()).toThrow(
                "missionManager is undefined"
            )
        })

        it("returns false when MISSION_ENDS reward has not been given", () => {
            const missionObjective = MissionObjectiveService.new({
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
                objectives: [missionObjective],
            })

            const missionManager = new MissionManager(missionState)
            const missionEngine = new MissionEngine(missionManager)

            expect(missionEngine.isDone()).toBe(false)
        })

        it("returns true when MISSION_ENDS reward was given", () => {
            const missionObjective = MissionObjectiveService.new({
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
                MissionObjectiveService.markRewardAsGiven(missionObjective)

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [rewardedObjective],
            })

            const missionManager = new MissionManager(missionState)
            const missionEngine = new MissionEngine(missionManager)

            expect(missionEngine.isDone()).toBe(true)
        })
    })

    describe("getInMissionSummary", () => {
        it("throws error if MissionManager is undefined", () => {
            const missionEngine = new MissionEngine()

            expect(() => missionEngine.getInMissionSummary()).toThrow(
                "missionManager is undefined"
            )
        })

        it("returns InMissionSummary from MissionManager", () => {
            const outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
                OutOfBattleSquaddieCollectionService.new(),
                OutOfBattleSquaddieAttributeSheetCollectionService.new()
            )

            const attributeSheet = OutOfBattleSquaddieAttributeSheetService.new(
                {
                    items: { itemIds: [], maxCapacity: 0 },
                    movement: { distancePerAction: 1 },
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
            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(attributeSheet)

            const enemySquaddie = OutOfBattleSquaddieService.new({
                id: "enemy-1",
                name: "Enemy",
                actionIds: [],
                attributeSheetId: "test sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(enemySquaddie)

            const inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )
            const squaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy-1",
            })

            const missionObjective = MissionObjectiveService.new({
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
                objectives: [missionObjective],
            })

            const missionManager = new MissionManager(
                missionState,
                inBattleSquaddieManager
            )
            const missionEngine = new MissionEngine(missionManager)

            inBattleSquaddieManager.dealDamageToSquaddie({
                ...squaddieId,
                damage: { amount: 3, type: undefined },
            })

            const inMissionSummary = missionEngine.getInMissionSummary()

            expect(inMissionSummary.missionObjectives).toHaveLength(1)
            expect(inMissionSummary.missionObjectives[0].id).toBe("obj-1")
            expect(
                inMissionSummary.inBattleSquaddieCollection
                    .byOutOfBattleSquaddieId["enemy-1"][0].hitPoints.current
            ).toBe(7)
        })
    })

    describe("readyAction", () => {
        it("stores the readied action and returns isValid true", () => {
            const missionEngine = new MissionEngine()

            const result = missionEngine.readyAction({
                actor: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "actor-1",
                },
                targets: [
                    {
                        inBattleSquaddieId: 2,
                        outOfBattleSquaddieId: "target-1",
                    },
                ],
                action: { id: "action-1" },
            })

            expect(result.isValid).toBe(true)

            const readiedAction = missionEngine.getReadiedAction()
            expect(readiedAction?.actor.inBattleSquaddieId).toBe(1)
            expect(readiedAction?.actor.outOfBattleSquaddieId).toBe("actor-1")
            expect(readiedAction?.targets).toHaveLength(1)
            expect(readiedAction?.action.id).toBe("action-1")
        })
    })

    describe("cancelReadiedAction", () => {
        it("clears the readied action when one exists", () => {
            const missionEngine = new MissionEngine()

            missionEngine.readyAction({
                actor: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "actor-1",
                },
                targets: [
                    {
                        inBattleSquaddieId: 2,
                        outOfBattleSquaddieId: "target-1",
                    },
                ],
                action: { id: "action-1" },
            })

            expect(missionEngine.getReadiedAction()).toBeDefined()

            missionEngine.cancelReadiedAction()

            expect(missionEngine.getReadiedAction()).toBeUndefined()
        })

        it("does not throw when no readied action exists", () => {
            const missionEngine = new MissionEngine()

            expect(missionEngine.getReadiedAction()).toBeUndefined()

            expect(() => missionEngine.cancelReadiedAction()).not.toThrow()

            expect(missionEngine.getReadiedAction()).toBeUndefined()
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

        it("throws error if MissionManager is undefined", () => {
            const missionEngine = new MissionEngine()
            missionEngine.readyAction({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: "attack" },
            })

            expect(() => missionEngine.useActionAndGetResults()).toThrow(
                "missionManager is undefined"
            )
        })

        it("throws error if readiedAction is undefined", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const missionManager = new MissionManager(
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager
            )

            const missionEngine = new MissionEngine(
                missionManager,
                deterministicRollGenerator
            )

            expect(() => missionEngine.useActionAndGetResults()).toThrow(
                "readiedAction is undefined"
            )
        })

        it("calls MissionManager.useActionAndGetResults, stores results, and clears readiedAction", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const missionManager = new MissionManager(
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager
            )

            const missionEngine = new MissionEngine(
                missionManager,
                deterministicRollGenerator
            )

            missionEngine.readyAction({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: "attack" },
            })

            const targetHPBefore =
                inBattleSquaddieManager.getSquaddie(targetSquaddieId)
                    .inBattleSquaddie.hitPoints.current

            const results = missionEngine.useActionAndGetResults()

            expect(results.actorRoll).toEqual([3, 3])
            expect(results.targetResults).toBeDefined()
            expect(Object.keys(results.targetResults).length).toBeGreaterThan(0)

            const targetHPAfter =
                inBattleSquaddieManager.getSquaddie(targetSquaddieId)
                    .inBattleSquaddie.hitPoints.current

            expect(targetHPAfter).toBeLessThan(targetHPBefore)

            expect(missionEngine.getReadiedAction()).toBeUndefined()
        })

        it("getActionResults returns the stored results", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const missionManager = new MissionManager(
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager
            )

            const missionEngine = new MissionEngine(
                missionManager,
                deterministicRollGenerator
            )

            expect(missionEngine.getActionResults()).toBeUndefined()

            missionEngine.readyAction({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: "attack" },
            })

            const results = missionEngine.useActionAndGetResults()
            const storedResults = missionEngine.getActionResults()

            expect(storedResults).toEqual(results)
            expect(storedResults?.actorRoll).toEqual([3, 3])
        })

        it("checks mission objectives after applying action and marks completed objectives as rewarded", () => {
            const missionObjective = MissionObjectiveService.new({
                id: "defeat-enemies",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward([
                        "victory",
                    ]),
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
                mapId: "test_map",
                objectives: [missionObjective],
            })

            const missionManager = new MissionManager(
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager
            )

            const missionEngine = new MissionEngine(
                missionManager,
                deterministicRollGenerator
            )

            inBattleSquaddieManager.dealDamageToSquaddie({
                ...targetSquaddieId,
                damage: { amount: 9, type: undefined },
            })

            missionEngine.readyAction({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: "attack" },
            })

            missionEngine.useActionAndGetResults()

            const completedAndRewarded =
                missionEngine.getCompletedAndRewardedMissionObjectives()
            expect(completedAndRewarded).toHaveLength(1)
            expect(completedAndRewarded[0].id).toBe("defeat-enemies")
        })
    })

    describe("mission objective getters", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager

        beforeEach(() => {
            const outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
                OutOfBattleSquaddieCollectionService.new(),
                OutOfBattleSquaddieAttributeSheetCollectionService.new()
            )

            const attributeSheet = OutOfBattleSquaddieAttributeSheetService.new(
                {
                    items: { itemIds: [], maxCapacity: 0 },
                    movement: { distancePerAction: 2 },
                    id: "test_sheet",
                    maxHitPoints: 10,
                    attributeScores: {
                        [AttributeScore.BODY]: 5,
                        [AttributeScore.MIND]: 5,
                        [AttributeScore.SOUL]: 5,
                    },
                    rank: 0,
                }
            )

            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(attributeSheet)

            const aliveEnemy = OutOfBattleSquaddieService.new({
                id: "enemy-alive",
                name: "Alive Enemy",
                affiliation: SquaddieAffiliation.ENEMY,
                attributeSheetId: "test_sheet",
            })

            const deadEnemy = OutOfBattleSquaddieService.new({
                id: "enemy-dead",
                name: "Dead Enemy",
                affiliation: SquaddieAffiliation.ENEMY,
                attributeSheetId: "test_sheet",
            })

            const deadAlly = OutOfBattleSquaddieService.new({
                id: "ally-dead",
                name: "Dead Ally",
                affiliation: SquaddieAffiliation.ALLY,
                attributeSheetId: "test_sheet",
            })

            outOfBattleSquaddieManager.addOrUpdateSquaddie(aliveEnemy)
            outOfBattleSquaddieManager.addOrUpdateSquaddie(deadEnemy)
            outOfBattleSquaddieManager.addOrUpdateSquaddie(deadAlly)

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy-alive",
            })

            const deadEnemySquaddieId =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy-dead",
                })

            const deadAllySquaddieId =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "ally-dead",
                })

            inBattleSquaddieManager.dealDamageToSquaddie({
                ...deadEnemySquaddieId,
                damage: { amount: 100, type: undefined },
            })

            inBattleSquaddieManager.dealDamageToSquaddie({
                ...deadAllySquaddieId,
                damage: { amount: 100, type: undefined },
            })
        })

        it("throws error if MissionManager is undefined for getInProgressObjectives", () => {
            const missionEngine = new MissionEngine()

            expect(() =>
                missionEngine.getInProgressMissionObjectives()
            ).toThrow("missionManager is undefined")
        })

        it("throws error if MissionManager is undefined for getCompletedButNotRewardedObjectives", () => {
            const missionEngine = new MissionEngine()

            expect(() =>
                missionEngine.getCompletedButNotRewardedMissionObjectives()
            ).toThrow("missionManager is undefined")
        })

        it("throws error if MissionManager is undefined for getCompletedAndRewardedObjectives", () => {
            const missionEngine = new MissionEngine()

            expect(() =>
                missionEngine.getCompletedAndRewardedMissionObjectives()
            ).toThrow("missionManager is undefined")
        })

        it("getInProgressObjectives returns objectives that are not complete", () => {
            const inProgressObjective = MissionObjectiveService.new({
                id: "in-progress",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["dialog"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            const completedObjective = MissionObjectiveService.new({
                id: "completed",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["dialog"]),
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
                objectives: [inProgressObjective, completedObjective],
            })

            const missionManager = new MissionManager(
                missionState,
                inBattleSquaddieManager
            )
            const missionEngine = new MissionEngine(missionManager)

            const inProgress = missionEngine.getInProgressMissionObjectives()

            expect(inProgress).toHaveLength(1)
            expect(inProgress[0].id).toBe("in-progress")
        })

        it("getCompletedButNotRewardedObjectives returns completed objectives without reward", () => {
            const completedNotRewarded = MissionObjectiveService.new({
                id: "completed-not-rewarded",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["dialog"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ALLY],
                        }
                    ),
                ],
            })

            const completedAndRewarded = MissionObjectiveService.new({
                id: "completed-and-rewarded",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["dialog"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ALLY],
                        }
                    ),
                ],
                hasGivenReward: true,
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [completedNotRewarded, completedAndRewarded],
            })

            const missionManager = new MissionManager(
                missionState,
                inBattleSquaddieManager
            )
            const missionEngine = new MissionEngine(missionManager)

            const completedButNotRewarded =
                missionEngine.getCompletedButNotRewardedMissionObjectives()

            expect(completedButNotRewarded).toHaveLength(1)
            expect(completedButNotRewarded[0].id).toBe("completed-not-rewarded")
        })

        it("getCompletedAndRewardedObjectives returns objectives that have been rewarded", () => {
            const notRewarded = MissionObjectiveService.new({
                id: "not-rewarded",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["dialog"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ALLY],
                        }
                    ),
                ],
            })

            const rewarded = MissionObjectiveService.new({
                id: "rewarded",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["dialog"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ALLY],
                        }
                    ),
                ],
                hasGivenReward: true,
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [notRewarded, rewarded],
            })

            const missionManager = new MissionManager(
                missionState,
                inBattleSquaddieManager
            )
            const missionEngine = new MissionEngine(missionManager)

            const completedAndRewarded =
                missionEngine.getCompletedAndRewardedMissionObjectives()

            expect(completedAndRewarded).toHaveLength(1)
            expect(completedAndRewarded[0].id).toBe("rewarded")
        })
    })

    describe("markMissionObjectiveAsRewarded", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager

        beforeEach(() => {
            const outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
                OutOfBattleSquaddieCollectionService.new(),
                OutOfBattleSquaddieAttributeSheetCollectionService.new()
            )

            const attributeSheet = OutOfBattleSquaddieAttributeSheetService.new(
                {
                    items: { itemIds: [], maxCapacity: 0 },
                    movement: { distancePerAction: 2 },
                    id: "test_sheet",
                    maxHitPoints: 10,
                    attributeScores: {
                        [AttributeScore.BODY]: 5,
                        [AttributeScore.MIND]: 5,
                        [AttributeScore.SOUL]: 5,
                    },
                    rank: 0,
                }
            )

            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(attributeSheet)

            const deadEnemy = OutOfBattleSquaddieService.new({
                id: "enemy-dead",
                name: "Dead Enemy",
                affiliation: SquaddieAffiliation.ENEMY,
                attributeSheetId: "test_sheet",
            })

            outOfBattleSquaddieManager.addOrUpdateSquaddie(deadEnemy)

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            const deadEnemySquaddieId =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy-dead",
                })

            inBattleSquaddieManager.dealDamageToSquaddie({
                ...deadEnemySquaddieId,
                damage: { amount: 100, type: undefined },
            })
        })

        it("throws error if MissionManager is undefined", () => {
            const missionEngine = new MissionEngine()

            expect(() =>
                missionEngine.markMissionObjectiveAsRewarded("obj-1")
            ).toThrow("missionManager is undefined")
        })

        it("throws error if objective is not found", () => {
            const missionObjective = MissionObjectiveService.new({
                id: "obj-1",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["dialog"]),
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
                objectives: [missionObjective],
            })

            const missionManager = new MissionManager(
                missionState,
                inBattleSquaddieManager
            )
            const missionEngine = new MissionEngine(missionManager)

            expect(() =>
                missionEngine.markMissionObjectiveAsRewarded("non-existent")
            ).toThrow("objective not found")
        })

        it("throws error if objective is not complete", () => {
            const outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
                OutOfBattleSquaddieCollectionService.new(),
                OutOfBattleSquaddieAttributeSheetCollectionService.new()
            )

            const attributeSheet = OutOfBattleSquaddieAttributeSheetService.new(
                {
                    items: { itemIds: [], maxCapacity: 0 },
                    movement: { distancePerAction: 2 },
                    id: "test_sheet",
                    maxHitPoints: 10,
                    attributeScores: {
                        [AttributeScore.BODY]: 5,
                        [AttributeScore.MIND]: 5,
                        [AttributeScore.SOUL]: 5,
                    },
                    rank: 0,
                }
            )

            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(attributeSheet)

            const aliveEnemy = OutOfBattleSquaddieService.new({
                id: "enemy-alive",
                name: "Alive Enemy",
                affiliation: SquaddieAffiliation.ENEMY,
                attributeSheetId: "test_sheet",
            })

            outOfBattleSquaddieManager.addOrUpdateSquaddie(aliveEnemy)

            const inBattleSquaddieManagerWithAliveEnemy =
                new InBattleSquaddieManager(
                    InBattleSquaddieCollectionService.new(),
                    outOfBattleSquaddieManager
                )

            inBattleSquaddieManagerWithAliveEnemy.createNewSquaddie({
                outOfBattleSquaddieId: "enemy-alive",
            })

            const incompleteObjective = MissionObjectiveService.new({
                id: "incomplete-obj",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["dialog"]),
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
                objectives: [incompleteObjective],
            })

            const missionManager = new MissionManager(
                missionState,
                inBattleSquaddieManagerWithAliveEnemy
            )
            const missionEngine = new MissionEngine(missionManager)

            expect(() =>
                missionEngine.markMissionObjectiveAsRewarded("incomplete-obj")
            ).toThrow("objective is not complete")
        })

        it("marks a completed objective as rewarded", () => {
            const completedObjective = MissionObjectiveService.new({
                id: "completed-obj",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["dialog"]),
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
                objectives: [completedObjective],
            })

            const missionManager = new MissionManager(
                missionState,
                inBattleSquaddieManager
            )
            const missionEngine = new MissionEngine(missionManager)

            expect(
                missionEngine.getCompletedButNotRewardedMissionObjectives()
            ).toHaveLength(1)

            missionEngine.markMissionObjectiveAsRewarded("completed-obj")

            expect(
                missionEngine.getCompletedButNotRewardedMissionObjectives()
            ).toHaveLength(0)
            expect(
                missionEngine.getCompletedAndRewardedMissionObjectives()
            ).toHaveLength(1)
            expect(
                missionEngine.getCompletedAndRewardedMissionObjectives()[0].id
            ).toBe("completed-obj")
        })

        it("does nothing if objective is already rewarded", () => {
            const alreadyRewardedObjective = MissionObjectiveService.new({
                id: "already-rewarded",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["dialog"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
                hasGivenReward: true,
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [alreadyRewardedObjective],
            })

            const missionManager = new MissionManager(
                missionState,
                inBattleSquaddieManager
            )
            const missionEngine = new MissionEngine(missionManager)

            expect(() =>
                missionEngine.markMissionObjectiveAsRewarded("already-rewarded")
            ).not.toThrow()

            expect(
                missionEngine.getCompletedAndRewardedMissionObjectives()
            ).toHaveLength(1)
        })
    })

    describe("getCurrentPhase", () => {
        it("throws error if MissionManager is undefined", () => {
            const missionEngine = new MissionEngine()

            expect(() => missionEngine.getCurrentAffiliationTurn()).toThrow(
                "missionManager is undefined"
            )
        })

        it("returns the current phase from mission state", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                }),
            })

            const missionManager = new MissionManager(missionState)
            const missionEngine = new MissionEngine(missionManager)

            expect(missionEngine.getCurrentAffiliationTurn()).toBe(
                MissionAffiliationTurn.PLAYER_TURN
            )
        })

        it("returns TURN_START when that is the current phase", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.TURN_START,
                }),
            })

            const missionManager = new MissionManager(missionState)
            const missionEngine = new MissionEngine(missionManager)

            expect(missionEngine.getCurrentAffiliationTurn()).toBe(
                MissionAffiliationTurn.TURN_START
            )
        })
    })

    describe("getCurrentTurnNumber", () => {
        it("throws error if MissionManager is undefined", () => {
            const missionEngine = new MissionEngine()

            expect(() => missionEngine.getCurrentTurnNumber()).toThrow(
                "missionManager is undefined"
            )
        })

        it("returns the current turn count from mission state", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                turn: MissionTurnService.new({
                    turnCount: 5,
                }),
            })

            const missionManager = new MissionManager(missionState)
            const missionEngine = new MissionEngine(missionManager)

            expect(missionEngine.getCurrentTurnNumber()).toBe(5)
        })

        it("returns 0 when turn count is at initial state", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
            })

            const missionManager = new MissionManager(missionState)
            const missionEngine = new MissionEngine(missionManager)

            expect(missionEngine.getCurrentTurnNumber()).toBe(0)
        })
    })

    describe("getSquaddiesWhoCanActThisPhase", () => {
        let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
        let inBattleSquaddieManager: InBattleSquaddieManager
        let playerSquaddieId: BattleSquaddieId

        beforeEach(() => {
            outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
                OutOfBattleSquaddieCollectionService.new(),
                OutOfBattleSquaddieAttributeSheetCollectionService.new()
            )

            const attributeSheet = OutOfBattleSquaddieAttributeSheetService.new(
                {
                    items: { itemIds: [], maxCapacity: 0 },
                    movement: { distancePerAction: 2 },
                    id: "test_sheet",
                    maxHitPoints: 10,
                    attributeScores: {
                        [AttributeScore.BODY]: 5,
                        [AttributeScore.MIND]: 5,
                        [AttributeScore.SOUL]: 5,
                    },
                    rank: 0,
                }
            )

            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(attributeSheet)

            const playerSquaddie = OutOfBattleSquaddieService.new({
                id: "player-1",
                name: "Player Squaddie",
                affiliation: SquaddieAffiliation.PLAYER,
                attributeSheetId: "test_sheet",
            })

            const enemySquaddie = OutOfBattleSquaddieService.new({
                id: "enemy-1",
                name: "Enemy Squaddie",
                affiliation: SquaddieAffiliation.ENEMY,
                attributeSheetId: "test_sheet",
            })

            outOfBattleSquaddieManager.addOrUpdateSquaddie(playerSquaddie)
            outOfBattleSquaddieManager.addOrUpdateSquaddie(enemySquaddie)

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            playerSquaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "player-1",
            })

            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy-1",
            })
        })

        it("throws error if MissionManager is undefined", () => {
            const missionEngine = new MissionEngine()

            expect(() =>
                missionEngine.getSquaddiesWhoCanActThisPhase()
            ).toThrow("missionManager is undefined")
        })

        it("returns only player squaddies during PLAYER_TURN phase", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                }),
            })

            const missionManager = new MissionManager(
                missionState,
                inBattleSquaddieManager
            )
            const missionEngine = new MissionEngine(missionManager)

            const result = missionEngine.getSquaddiesWhoCanActThisPhase()

            expect(result).toHaveLength(1)
            expect(result[0].outOfBattleSquaddieId).toBe("player-1")
        })

        it("returns only enemy squaddies during ENEMY_TURN phase", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.ENEMY_TURN,
                }),
            })

            const missionManager = new MissionManager(
                missionState,
                inBattleSquaddieManager
            )
            const missionEngine = new MissionEngine(missionManager)

            const result = missionEngine.getSquaddiesWhoCanActThisPhase()

            expect(result).toHaveLength(1)
            expect(result[0].outOfBattleSquaddieId).toBe("enemy-1")
        })

        it("excludes squaddies who cannot act (no action points)", () => {
            inBattleSquaddieManager.spendActionPoints({
                ...playerSquaddieId,
                actionPoints: 3,
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                }),
            })

            const missionManager = new MissionManager(
                missionState,
                inBattleSquaddieManager
            )
            const missionEngine = new MissionEngine(missionManager)

            const result = missionEngine.getSquaddiesWhoCanActThisPhase()

            expect(result).toHaveLength(0)
        })

        it("returns empty array during TURN_START phase", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.TURN_START,
                }),
            })

            const missionManager = new MissionManager(
                missionState,
                inBattleSquaddieManager
            )
            const missionEngine = new MissionEngine(missionManager)

            const result = missionEngine.getSquaddiesWhoCanActThisPhase()

            expect(result).toHaveLength(0)
        })

        it("returns empty array during TURN_END phase", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.TURN_END,
                }),
            })

            const missionManager = new MissionManager(
                missionState,
                inBattleSquaddieManager
            )
            const missionEngine = new MissionEngine(missionManager)

            const result = missionEngine.getSquaddiesWhoCanActThisPhase()

            expect(result).toHaveLength(0)
        })

        it("returns player squaddies during PLAYER_TURN_START phase", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                turn: MissionTurnService.new({
                    missionAffiliationTurn:
                        MissionAffiliationTurn.PLAYER_TURN_START,
                }),
            })

            const missionManager = new MissionManager(
                missionState,
                inBattleSquaddieManager
            )
            const missionEngine = new MissionEngine(missionManager)

            const result = missionEngine.getSquaddiesWhoCanActThisPhase()

            expect(result).toHaveLength(1)
            expect(result[0].outOfBattleSquaddieId).toBe("player-1")
        })
    })

    describe("previewReadiedActionAndForecastResults", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let squaddieActionManager: SquaddieActionManager
        let coordinateMapCollectionManager: CoordinateMapCollectionManager
        let actorSquaddieId: BattleSquaddieId
        let targetSquaddieId: BattleSquaddieId

        beforeEach(() => {
            const outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
                OutOfBattleSquaddieCollectionService.new(),
                OutOfBattleSquaddieAttributeSheetCollectionService.new()
            )

            const actorAttributeSheet =
                OutOfBattleSquaddieAttributeSheetService.new({
                    items: { itemIds: [], maxCapacity: 0 },
                    movement: { distancePerAction: 2 },
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
                    movement: { distancePerAction: 2 },
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
        })

        it("throws error if MissionManager is undefined", () => {
            const missionEngine = new MissionEngine()
            missionEngine.readyAction({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: "attack" },
            })

            expect(() =>
                missionEngine.previewReadiedActionAndForecastResults()
            ).toThrow("missionManager is undefined")
        })

        it("throws error if readiedAction is undefined", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const missionManager = new MissionManager(
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager
            )

            const missionEngine = new MissionEngine(missionManager)

            expect(() =>
                missionEngine.previewReadiedActionAndForecastResults()
            ).toThrow("readiedAction is undefined")
        })

        it("returns forecasted results from MissionManager", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const missionManager = new MissionManager(
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager
            )

            const missionEngine = new MissionEngine(missionManager)

            missionEngine.readyAction({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: "attack" },
            })

            const results = missionEngine.previewReadiedActionAndForecastResults()

            expect(results.length).toBeGreaterThan(0)
            expect(results[0].battleSquaddieId).toBeDefined()
            expect(results[0].degreeOfSuccess).toBeDefined()
            expect(results[0].chanceOutOf36).toBeGreaterThan(0)
            expect(results[0].squaddieActionResults).toBeDefined()
        })

        it("does not consume the readiedAction", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const missionManager = new MissionManager(
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager
            )

            const missionEngine = new MissionEngine(missionManager)

            missionEngine.readyAction({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: "attack" },
            })

            missionEngine.previewReadiedActionAndForecastResults()

            expect(missionEngine.getReadiedAction()).toBeDefined()
            expect(missionEngine.getReadiedAction()?.action.id).toBe("attack")
        })
    })
})
