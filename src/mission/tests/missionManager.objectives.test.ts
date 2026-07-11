import { beforeEach, describe, expect, it } from "vitest"
import { MissionManager } from "../missionManager.js"
import { MissionStateService } from "../missionState.js"
import { MissionObjectiveService } from "../missionObjective.js"
import { MissionObjectiveRewardService } from "../missionObjectiveReward.js"
import { MissionObjectiveCriteriaService } from "../missionObjectiveCriteria.js"
import { SquaddieAffiliation } from "../../affiliation/affiliation.js"
import { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager.js"
import { OutOfBattleSquaddieService } from "../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { InBattleSquaddieCollectionService } from "../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { AttributeScore } from "../../proficiency/attributeScore.js"
import { OutOfBattleSquaddieTestSetup } from "../../testUtils/outOfBattleSquaddieTestSetup.js"
import { CoordinateMapCollectionManager } from "../../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../../coordinateMap/coordinateMapCollection.js"
import { CoordinateMapService } from "../../coordinateMap/coordinateMap.js"
import { SquaddieActionManager } from "../../squaddieAction/squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../../squaddieAction/squaddieActionCollection.js"
import {
    MovementEffectType,
    SquaddieActionService,
} from "../../squaddieAction/squaddieAction.js"
import { ActionRange } from "../../squaddieAction/actionRange.js"
import { CoordinateGeneratorShape } from "../../coordinateMap/shape.js"
import {
    MissionAffiliationTurn,
    MissionTurnService,
    type TMissionAffiliationTurn,
} from "../missionTurn.js"
import type { BattleSquaddieId } from "../../squaddie/inBattle/battleSquaddieId.js"

describe("MissionManager", () => {
    describe("hasMissionEnded", () => {
        it("returns false when no objectives have MISSION_ENDS or MISSION_FAILURE reward", () => {
            const objective = MissionObjectiveService.new({
                id: "obj-1",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward("d1"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
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
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
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
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
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
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
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
                    MissionObjectiveRewardService.newPlayMovieReward("d1"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
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
                    MissionObjectiveRewardService.newPlayMovieReward("d1"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
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
                    MissionObjectiveRewardService.newPlayMovieReward("d1"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
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
                    MissionObjectiveRewardService.newPlayMovieReward("d1"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
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
                    MissionObjectiveRewardService.newPlayMovieReward("d1"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            const objective2 = MissionObjectiveService.new({
                id: "obj-2",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward("d2"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
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
                    MissionObjectiveRewardService.newPlayMovieReward("d1"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
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
                    MissionObjectiveRewardService.newPlayMovieReward("d1"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
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
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
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
})
