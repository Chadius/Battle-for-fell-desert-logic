import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngine } from "./missionEngine"
import { MissionManager } from "../missionManager"
import { type MissionState, MissionStateService } from "../missionState"
import { MissionObjectiveService } from "../missionObjective"
import { MissionObjectiveRewardService } from "../missionObjectiveReward"
import { MissionObjectiveCriteriaService } from "../missionObjectiveCriteria"
import { SquaddieAffiliation } from "../../affiliation/affiliation"
import { OutOfBattleSquaddieService } from "../../squaddie/outOfBattle/outOfBattleSquaddie"
import type { OutOfBattleSquaddieManager } from "../../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../../squaddie/inBattle/inBattleSquaddieCollection"
import {
    type BattleSquaddieId,
    InBattleSquaddieManager,
} from "../../squaddie/inBattle/inBattleSquaddieManager"
import { OutOfBattleSquaddieTestSetup } from "../../testUtils/outOfBattleSquaddieTestSetup"
import { SquaddieActionManager } from "../../squaddieAction/squaddieActionManager"
import { SquaddieActionCollectionService } from "../../squaddieAction/squaddieActionCollection"
import { SquaddieActionService } from "../../squaddieAction/squaddieAction"
import { ProficiencyType } from "../../proficiency/proficiencyLevel"
import { CoordinateMapCollectionManager } from "../../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../../coordinateMap/coordinateMapCollection"
import { CoordinateMapService } from "../../coordinateMap/coordinateMap"
import { RollGenerator } from "../../squaddieAction/calculate/roll/rollGenerator"
import { ActionRange } from "../../squaddieAction/actionRange"
import { CoordinateGeneratorShape } from "../../coordinateMap/shape"
import { MissionAffiliationTurn, MissionTurnService } from "../missionTurn"

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

            const missionManager = new MissionManager({
                missionState: missionState,
            })
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

            const missionManager = new MissionManager({
                missionState: missionState,
            })
            const missionEngine = new MissionEngine(missionManager)

            expect(missionEngine.isDone()).toBe(true)
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

            const serialized = missionEngine.getSerializedReadiedAction()
            expect(serialized?.actor.inBattleSquaddieId).toBe(1)
            expect(serialized?.actor.outOfBattleSquaddieId).toBe("actor-1")
            expect(serialized?.targets).toHaveLength(1)
            expect(serialized?.action.id).toBe("action-1")
        })

        describe("validates actor affiliation matches current turn phase", () => {
            let inBattleSquaddieManager: InBattleSquaddieManager
            let playerSquaddieId: BattleSquaddieId
            let enemySquaddieId: BattleSquaddieId

            beforeEach(() => {
                const { manager: outOfBattleSquaddieManager } =
                    OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                        {
                            sheetId: "test_sheet",
                            attributeSheetOptions: {
                                maxHitPoints: 10,
                                distancePerAction: 2,
                                items: { maxCapacity: 0 },
                            },
                        }
                    )

                const playerSquaddie = OutOfBattleSquaddieService.new({
                    id: "player-1",
                    name: "Player",
                    affiliation: SquaddieAffiliation.PLAYER,
                    attributeSheetId: "test_sheet",
                })

                const enemySquaddie = OutOfBattleSquaddieService.new({
                    id: "enemy-1",
                    name: "Enemy",
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

                enemySquaddieId = inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy-1",
                })
            })

            it("returns isValid true when actor affiliation matches current turn phase", () => {
                const missionState = MissionStateService.new({
                    id: "mission-1",
                    mapId: "map-1",
                    turn: MissionTurnService.new({
                        missionAffiliationTurn:
                            MissionAffiliationTurn.PLAYER_TURN,
                    }),
                })

                const missionManager = new MissionManager({
                    missionState,
                    inBattleSquaddieManager,
                })

                const missionEngine = new MissionEngine(missionManager)

                const result = missionEngine.readyAction({
                    actor: playerSquaddieId,
                    targets: [enemySquaddieId],
                    action: { id: "action-1" },
                })

                expect(result.isValid).toBe(true)
                expect(result.message).toBeUndefined()
                expect(missionEngine.getReadiedAction()).toBeDefined()
            })

            it("returns isValid false with a message when actor affiliation does not match current turn phase", () => {
                const missionState = MissionStateService.new({
                    id: "mission-1",
                    mapId: "map-1",
                    turn: MissionTurnService.new({
                        missionAffiliationTurn:
                            MissionAffiliationTurn.PLAYER_TURN,
                    }),
                })

                const missionManager = new MissionManager({
                    missionState,
                    inBattleSquaddieManager,
                })

                const missionEngine = new MissionEngine(missionManager)

                const result = missionEngine.readyAction({
                    actor: enemySquaddieId,
                    targets: [playerSquaddieId],
                    action: { id: "action-1" },
                })

                expect(result.isValid).toBe(false)
                expect(result.message).toBe("It is not this squaddie's turn")
            })

            it("does not store the readied action when affiliation does not match", () => {
                const missionState = MissionStateService.new({
                    id: "mission-1",
                    mapId: "map-1",
                    turn: MissionTurnService.new({
                        missionAffiliationTurn:
                            MissionAffiliationTurn.PLAYER_TURN,
                    }),
                })

                const missionManager = new MissionManager({
                    missionState,
                    inBattleSquaddieManager,
                })

                const missionEngine = new MissionEngine(missionManager)

                missionEngine.readyAction({
                    actor: enemySquaddieId,
                    targets: [playerSquaddieId],
                    action: { id: "action-1" },
                })

                expect(missionEngine.getReadiedAction()).toBeUndefined()
            })
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
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "actor_sheet",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            distancePerAction: 2,
                            items: { maxCapacity: 0 },
                        },
                    }
                )

            const targetAttributeSheet =
                OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
                    id: "target_sheet",
                    maxHitPoints: 10,
                    distancePerAction: 2,
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

            const missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
                coordinateMapCollectionManager: coordinateMapCollectionManager,
                squaddieActionManager: squaddieActionManager,
            })

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

            const missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
                coordinateMapCollectionManager: coordinateMapCollectionManager,
                squaddieActionManager: squaddieActionManager,
            })

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

            const missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
                coordinateMapCollectionManager: coordinateMapCollectionManager,
                squaddieActionManager: squaddieActionManager,
            })

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

        it("getSerializedActionResults returns undefined when no action has been used", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
                coordinateMapCollectionManager: coordinateMapCollectionManager,
                squaddieActionManager: squaddieActionManager,
            })

            const missionEngine = new MissionEngine(
                missionManager,
                deterministicRollGenerator
            )

            expect(missionEngine.getSerializedActionResults()).toBeUndefined()
        })

        it("getSerializedActionResults returns serialized results after action is used", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
                coordinateMapCollectionManager: coordinateMapCollectionManager,
                squaddieActionManager: squaddieActionManager,
            })

            const missionEngine = new MissionEngine(
                missionManager,
                deterministicRollGenerator
            )

            missionEngine.readyAction({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: "attack" },
            })

            missionEngine.useActionAndGetResults()

            const serializedResults = missionEngine.getSerializedActionResults()

            expect(serializedResults).toBeDefined()
            expect(serializedResults?.actorRoll).toEqual([3, 3])
            expect(serializedResults?.targetResults).toBeDefined()
            expect(
                Object.keys(serializedResults!.targetResults).length
            ).toBeGreaterThan(0)
        })

        it("getSerializedActionResults can be converted to JSON and back", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
                coordinateMapCollectionManager: coordinateMapCollectionManager,
                squaddieActionManager: squaddieActionManager,
            })

            const missionEngine = new MissionEngine(
                missionManager,
                deterministicRollGenerator
            )

            missionEngine.readyAction({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: "attack" },
            })

            missionEngine.useActionAndGetResults()

            const serializedResults = missionEngine.getSerializedActionResults()
            const jsonString = JSON.stringify(serializedResults)
            const parsed = JSON.parse(jsonString)

            expect(parsed.actorRoll).toEqual([3, 3])
            expect(parsed.targetResults).toBeDefined()
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

            const missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
                coordinateMapCollectionManager: coordinateMapCollectionManager,
                squaddieActionManager: squaddieActionManager,
            })

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

    describe("getCurrentAffiliationTurn", () => {
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

            const missionManager = new MissionManager({
                missionState: missionState,
            })
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

            const missionManager = new MissionManager({
                missionState: missionState,
            })
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

            const missionManager = new MissionManager({
                missionState: missionState,
            })
            const missionEngine = new MissionEngine(missionManager)

            expect(missionEngine.getCurrentTurnNumber()).toBe(5)
        })

        it("returns 0 when turn count is at initial state", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
            })

            const missionManager = new MissionManager({
                missionState: missionState,
            })
            const missionEngine = new MissionEngine(missionManager)

            expect(missionEngine.getCurrentTurnNumber()).toBe(0)
        })
    })

    describe("getDefeatedSquaddies", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let playerSquaddieId: BattleSquaddieId
        let enemySquaddieId: BattleSquaddieId
        let missionState: MissionState

        beforeEach(() => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "test_sheet",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            distancePerAction: 2,
                            items: { maxCapacity: 0 },
                        },
                    }
                )

            const playerSquaddie = OutOfBattleSquaddieService.new({
                id: "player-1",
                name: "Hero",
                affiliation: SquaddieAffiliation.PLAYER,
                attributeSheetId: "test_sheet",
            })

            const enemySquaddie = OutOfBattleSquaddieService.new({
                id: "enemy-1",
                name: "Enemy",
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

            enemySquaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy-1",
            })

            missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
            })
        })

        it("throws error if MissionManager is undefined", () => {
            const missionEngine = new MissionEngine()

            expect(() => missionEngine.getDefeatedSquaddies()).toThrow(
                "missionManager is undefined"
            )
        })

        it("throws error if inBattleSquaddieManager is undefined", () => {
            const missionManager = new MissionManager({
                missionState: missionState,
            })
            const missionEngine = new MissionEngine(missionManager)

            expect(() => missionEngine.getDefeatedSquaddies()).toThrow(
                "inBattleSquaddieManager is undefined"
            )
        })

        it("returns empty array when no squaddies are defeated", () => {
            const missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
            })
            const missionEngine = new MissionEngine(missionManager)

            const defeatedSquaddies = missionEngine.getDefeatedSquaddies()

            expect(defeatedSquaddies).toEqual([])
        })

        it("returns defeated squaddies", () => {
            const missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
            })
            const missionEngine = new MissionEngine(missionManager)

            inBattleSquaddieManager.dealDamageToSquaddie({
                ...enemySquaddieId,
                damage: { amount: 100, type: undefined },
            })

            const defeatedSquaddies = missionEngine.getDefeatedSquaddies()

            expect(defeatedSquaddies).toHaveLength(1)
            expect(defeatedSquaddies[0].inBattleSquaddieId).toBe(
                enemySquaddieId.inBattleSquaddieId
            )
            expect(defeatedSquaddies[0].outOfBattleSquaddieId).toBe(
                enemySquaddieId.outOfBattleSquaddieId
            )
        })

        it("returns multiple defeated squaddies", () => {
            const missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
            })
            const missionEngine = new MissionEngine(missionManager)

            inBattleSquaddieManager.dealDamageToSquaddie({
                ...playerSquaddieId,
                damage: { amount: 100, type: undefined },
            })

            inBattleSquaddieManager.dealDamageToSquaddie({
                ...enemySquaddieId,
                damage: { amount: 100, type: undefined },
            })

            const defeatedSquaddies = missionEngine.getDefeatedSquaddies()

            expect(defeatedSquaddies).toHaveLength(2)
        })

        it("does not include squaddies who are still alive", () => {
            const missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
            })
            const missionEngine = new MissionEngine(missionManager)

            inBattleSquaddieManager.dealDamageToSquaddie({
                ...enemySquaddieId,
                damage: { amount: 5, type: undefined },
            })

            const defeatedSquaddies = missionEngine.getDefeatedSquaddies()

            expect(defeatedSquaddies).toEqual([])
        })
    })

    describe("getMapOverview", () => {
        it("throws error if MissionManager is undefined", () => {
            const missionEngine = new MissionEngine()

            expect(() => missionEngine.getMapOverview()).toThrow(
                "missionManager is undefined"
            )
        })

        it("returns map dimensions, terrain, and squaddie positions", () => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "test_sheet",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            distancePerAction: 2,
                            items: { maxCapacity: 0 },
                        },
                    }
                )

            const actorSquaddie = OutOfBattleSquaddieService.new({
                id: "actor",
                name: "Actor",
                affiliation: SquaddieAffiliation.PLAYER,
                attributeSheetId: "test_sheet",
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(actorSquaddie)

            const inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            const actorSquaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor",
            })

            const map = CoordinateMapService.new({
                id: "overview_map",
                name: "overview map",
                movementProperties: ["1 2 - X"],
            })

            const coordinateMapCollectionManager =
                new CoordinateMapCollectionManager(
                    CoordinateMapCollectionService.new()
                )
            coordinateMapCollectionManager.addOrUpdate({ map })

            coordinateMapCollectionManager.addSquaddie({
                mapId: "overview_map",
                squaddieId: actorSquaddieId,
                coordinate: { row: 0, col: 0 },
            })

            const missionState = MissionStateService.new({
                id: "mission-overview",
                mapId: "overview_map",
            })

            const missionManager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
            })

            const missionEngine = new MissionEngine(missionManager)
            const overview = missionEngine.getMapOverview()

            expect(overview.width).toBe(4)
            expect(overview.height).toBe(1)
            expect(overview.tiles).toHaveLength(1)
            expect(overview.tiles[0]).toHaveLength(4)

            expect(overview.tiles[0][0].movementCost).toBe(1)
            expect(overview.tiles[0][0].canStop).toBe(true)
            expect(overview.tiles[0][0].squaddieId).toEqual(actorSquaddieId)

            expect(overview.tiles[0][1].movementCost).toBe(2)
            expect(overview.tiles[0][1].canStop).toBe(true)
            expect(overview.tiles[0][1].squaddieId).toBeUndefined()

            expect(overview.tiles[0][2].movementCost).toBe(1)
            expect(overview.tiles[0][2].canStop).toBe(false)
            expect(overview.tiles[0][2].squaddieId).toBeUndefined()

            expect(overview.tiles[0][3].movementCost).toBeUndefined()
            expect(overview.tiles[0][3].canStop).toBe(false)
            expect(overview.tiles[0][3].squaddieId).toBeUndefined()
        })

        it("returns correct row and col for each tile", () => {
            const map = CoordinateMapService.new({
                id: "grid_map",
                name: "grid map",
                movementProperties: ["1 1", " 1 1"],
            })

            const coordinateMapCollectionManager =
                new CoordinateMapCollectionManager(
                    CoordinateMapCollectionService.new()
                )
            coordinateMapCollectionManager.addOrUpdate({ map })

            const missionState = MissionStateService.new({
                id: "mission-grid",
                mapId: "grid_map",
            })

            const missionManager = new MissionManager({
                missionState,
                coordinateMapCollectionManager,
            })

            const missionEngine = new MissionEngine(missionManager)
            const overview = missionEngine.getMapOverview()

            expect(overview.height).toBe(2)
            expect(overview.width).toBe(2)
            expect(overview.tiles[0][0].row).toBe(0)
            expect(overview.tiles[0][0].col).toBe(0)
            expect(overview.tiles[1][1].row).toBe(1)
            expect(overview.tiles[1][1].col).toBe(1)
        })
    })

    describe("transitionToNextPhase", () => {
        let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
        let inBattleSquaddieManager: InBattleSquaddieManager
        let coordinateMapCollectionManager: CoordinateMapCollectionManager
        let playerSquaddieId: BattleSquaddieId

        beforeEach(() => {
            ;({ manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "test_sheet",
                        attributeSheetOptions: { maxHitPoints: 10 },
                    }
                ))

            const playerSquaddie = OutOfBattleSquaddieService.new({
                id: "player-1",
                name: "Player 1",
                affiliation: SquaddieAffiliation.PLAYER,
                attributeSheetId: "test_sheet",
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(playerSquaddie)

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

        it("throws when missionManager is undefined", () => {
            const missionEngine = new MissionEngine()

            expect(() => missionEngine.transitionToNextPhase()).toThrow(
                "[MissionEngine.transitionToNextPhase]: missionManager is undefined"
            )
        })

        it("transitions to the next phase and returns serialized results", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.TURN_START,
                }),
            })

            const missionManager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
            })

            const missionEngine = new MissionEngine(missionManager)

            const results = missionEngine.transitionToNextPhase()

            expect(results).toEqual([])
            expect(missionEngine.getCurrentAffiliationTurn()).toBe(
                MissionAffiliationTurn.PLAYER_TURN_START
            )
        })
    })
})
