import { beforeEach, describe, expect, it } from "vitest"
import { MissionAffiliationTurn, MissionTurnService } from "../../missionTurn"
import { MissionEngine } from "../missionEngine"
import { MissionManager } from "../../missionManager"
import { MissionStateService } from "../../missionState"
import {
    type BattleSquaddieId,
    InBattleSquaddieManager,
} from "../../../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { SquaddieAffiliation } from "../../../affiliation/affiliation"
import { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../../../coordinateMap/coordinateMapCollection"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap"
import { SquaddieActionManager } from "../../../squaddieAction/squaddieActionManager"
import { SquaddieActionCollectionService } from "../../../squaddieAction/squaddieActionCollection"
import {
    MissionEngineTestHarness,
    MissionEngineTestHarnessIds,
} from "../../../testUtils/mission/missionEngineTestHarness"
import { TurnControllerType } from "../../turnController"
import { SquaddieIdConverterService } from "../../../squaddie/idConverterService"

function advanceHarnessToPlayerTurn(missionEngine: MissionEngine): void {
    missionEngine.transitionToNextPhase()
    missionEngine.transitionToNextPhase()
}

describe("endSquaddieTurn", () => {
    describe("ends the acting squaddie's turn", () => {
        it("sets the squaddie's AP to 0 so they cannot act", () => {
            const harness = new MissionEngineTestHarness()
            advanceHarnessToPlayerTurn(harness)
            const liniId = harness.getLiniSquaddieId()

            harness.endSquaddieTurn(liniId)

            expect(
                harness.missionManager!.inBattleSquaddieManager!.canSquaddieAct(
                    { battleSquaddieId: liniId }
                )
            ).toBe(false)
        })
    })

    describe("auto-advances phase when the active affiliation is exhausted", () => {
        it("advances to ENEMY_TURN after the only player squaddie ends their turn", () => {
            const harness = new MissionEngineTestHarness()
            advanceHarnessToPlayerTurn(harness)
            const liniId = harness.getLiniSquaddieId()

            harness.endSquaddieTurn(liniId)

            expect(harness.getCurrentAffiliationTurn()).toBe(
                MissionAffiliationTurn.ENEMY_TURN
            )
        })

        it("skips empty ALLY affiliation and lands directly in ENEMY_TURN", () => {
            const harnessWithOnlyPlayerLiniAndEnemy =
                new MissionEngineTestHarness()
            advanceHarnessToPlayerTurn(harnessWithOnlyPlayerLiniAndEnemy)
            const liniId = harnessWithOnlyPlayerLiniAndEnemy.getLiniSquaddieId()

            harnessWithOnlyPlayerLiniAndEnemy.endSquaddieTurn(liniId)

            const phase =
                harnessWithOnlyPlayerLiniAndEnemy.getCurrentAffiliationTurn()
            expect(phase).not.toBe(MissionAffiliationTurn.ALLY_TURN_START)
            expect(phase).not.toBe(MissionAffiliationTurn.ALLY_TURN)
            expect(phase).toBe(MissionAffiliationTurn.ENEMY_TURN)
        })
    })

    describe("evaluates objectives at the turn boundary", () => {
        it("shows a completed objective as not yet rewarded when all enemies are defeated", () => {
            const harness = new MissionEngineTestHarness()
            advanceHarnessToPlayerTurn(harness)
            const liniId = harness.getLiniSquaddieId()
            const slitherDemonId = harness.getSlitherDemonSquaddieId()

            harness.missionManager!.inBattleSquaddieManager!.dealDamageToSquaddie(
                {
                    ...slitherDemonId,
                    damage: { amount: 100, type: undefined },
                }
            )

            harness.endSquaddieTurn(liniId)

            const summary = harness.getInMissionSummary()
            const defeatEnemiesObjective = summary.missionObjectives.find(
                (o) =>
                    o.id ===
                    MissionEngineTestHarnessIds.objectives.defeatAllEnemies
            )
            expect(defeatEnemiesObjective!.isCompleted).toBe(true)
            expect(defeatEnemiesObjective!.hasGivenReward).toBe(false)
            expect(harness.isDone()).toBe(false)
        })

        it("isDone becomes true after the caller rewards the completed objective", () => {
            const harness = new MissionEngineTestHarness()
            advanceHarnessToPlayerTurn(harness)
            const liniId = harness.getLiniSquaddieId()
            const slitherDemonId = harness.getSlitherDemonSquaddieId()

            harness.missionManager!.inBattleSquaddieManager!.dealDamageToSquaddie(
                {
                    ...slitherDemonId,
                    damage: { amount: 100, type: undefined },
                }
            )

            harness.endSquaddieTurn(liniId)
            harness.markMissionObjectiveAsRewarded(
                MissionEngineTestHarnessIds.objectives.defeatAllEnemies
            )

            expect(harness.isDone()).toBe(true)
        })
    })

    describe("does not advance when other squaddies of the same affiliation can still act", () => {
        let missionEngine: MissionEngine
        let player1Id: BattleSquaddieId
        let player2Id: BattleSquaddieId

        beforeEach(() => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "player_sheet",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            distancePerAction: 2,
                            items: { maxCapacity: 0 },
                        },
                    }
                )

            const enemyAttributeSheet =
                OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
                    id: "enemy_sheet",
                    maxHitPoints: 10,
                    distancePerAction: 2,
                    items: { maxCapacity: 0 },
                })
            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(
                enemyAttributeSheet
            )

            const player1 = OutOfBattleSquaddieService.new({
                id: "player-1",
                name: "Player One",
                affiliation: SquaddieAffiliation.PLAYER,
                attributeSheetId: "player_sheet",
            })
            const player2 = OutOfBattleSquaddieService.new({
                id: "player-2",
                name: "Player Two",
                affiliation: SquaddieAffiliation.PLAYER,
                attributeSheetId: "player_sheet",
            })
            const enemy = OutOfBattleSquaddieService.new({
                id: "enemy-1",
                name: "Enemy",
                affiliation: SquaddieAffiliation.ENEMY,
                attributeSheetId: "enemy_sheet",
            })

            outOfBattleSquaddieManager.addOrUpdateSquaddie(player1)
            outOfBattleSquaddieManager.addOrUpdateSquaddie(player2)
            outOfBattleSquaddieManager.addOrUpdateSquaddie(enemy)

            const inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            player1Id = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "player-1",
            })
            player2Id = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "player-2",
            })
            const enemyId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy-1",
            })

            const map = CoordinateMapService.new({
                id: "test_map",
                name: "test map",
                movementProperties: ["1 1 1 1 1"],
            })

            const coordinateMapCollectionManager =
                new CoordinateMapCollectionManager(
                    CoordinateMapCollectionService.new()
                )
            coordinateMapCollectionManager.addOrUpdate({ map })
            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: player1Id,
                coordinate: { row: 0, col: 0 },
            })
            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: player2Id,
                coordinate: { row: 0, col: 1 },
            })
            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: enemyId,
                coordinate: { row: 0, col: 4 },
            })

            const squaddieActionManager = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                }),
            })

            const missionManager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
            })

            missionEngine = new MissionEngine(missionManager)
        })

        it("stays in PLAYER_TURN when a second player can still act", () => {
            missionEngine.endSquaddieTurn(player1Id)

            expect(missionEngine.getCurrentAffiliationTurn()).toBe(
                MissionAffiliationTurn.PLAYER_TURN
            )
        })

        it("still lists the second player in getSquaddiesWhoCanActThisPhase", () => {
            missionEngine.endSquaddieTurn(player1Id)

            const canAct = missionEngine.getSquaddiesWhoCanActThisPhase()
            expect(canAct).toHaveLength(1)
            expect(canAct[0].outOfBattleSquaddieId).toBe(
                player2Id.outOfBattleSquaddieId
            )
        })
    })

    describe("advances the turn counter after a full round", () => {
        it("increments turnCount when all affiliations have exhausted their squaddies", () => {
            const harness = new MissionEngineTestHarness()
            advanceHarnessToPlayerTurn(harness)
            const liniId = harness.getLiniSquaddieId()
            const slitherDemonId = harness.getSlitherDemonSquaddieId()

            harness.endSquaddieTurn(liniId)

            harness.endSquaddieTurn(slitherDemonId)

            expect(harness.getCurrentTurnNumber()).toBe(1)
        })
    })

    describe("turn controller affects readyAction", () => {
        it("readyAction is rejected for an AI-controlled PLAYER squaddie", () => {
            const harness = new MissionEngineTestHarness()
            advanceHarnessToPlayerTurn(harness)
            const liniId = harness.getLiniSquaddieId()
            const liniKey = SquaddieIdConverterService.squaddieIdToKey(liniId)

            const missionState = MissionStateService.new({
                id: "mission-override",
                mapId: harness.missionManager!.missionState!.mapId,
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                }),
                controllerTypeOverrides: {
                    squaddie: {
                        [liniKey]: TurnControllerType.AI,
                    },
                },
            })

            const missionManagerWithAiLini = new MissionManager({
                missionState,
                inBattleSquaddieManager:
                    harness.missionManager!.inBattleSquaddieManager,
                coordinateMapCollectionManager:
                    harness.missionManager!.coordinateMapCollectionManager,
                squaddieActionManager:
                    harness.missionManager!.squaddieActionManager,
            })

            const missionEngine = new MissionEngine(missionManagerWithAiLini)

            const result = missionEngine.readyAction({
                actor: {
                    inBattleSquaddieId: liniId.inBattleSquaddieId,
                    outOfBattleSquaddieId: liniId.outOfBattleSquaddieId,
                },
                targets: [
                    {
                        inBattleSquaddieId: liniId.inBattleSquaddieId,
                        outOfBattleSquaddieId: liniId.outOfBattleSquaddieId,
                    },
                ],
                action: { id: "any-action" },
            })

            expect(result.isValid).toBe(false)
            expect(result.message).toBe("This squaddie is AI controlled")
        })

        it("readyAction is accepted for a HUMAN-controlled ENEMY squaddie (debug override)", () => {
            const harness = new MissionEngineTestHarness()
            advanceHarnessToPlayerTurn(harness)

            const liniId = harness.getLiniSquaddieId()
            harness.endSquaddieTurn(liniId)

            const slitherDemonId = harness.getSlitherDemonSquaddieId()
            const slitherKey =
                SquaddieIdConverterService.squaddieIdToKey(slitherDemonId)

            const missionState = MissionStateService.new({
                id: "mission-enemy-human",
                mapId: harness.missionManager!.missionState!.mapId,
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.ENEMY_TURN,
                }),
                controllerTypeOverrides: {
                    squaddie: {
                        [slitherKey]: TurnControllerType.HUMAN,
                    },
                },
            })

            const missionManagerWithHumanEnemy = new MissionManager({
                missionState,
                inBattleSquaddieManager:
                    harness.missionManager!.inBattleSquaddieManager,
                coordinateMapCollectionManager:
                    harness.missionManager!.coordinateMapCollectionManager,
                squaddieActionManager:
                    harness.missionManager!.squaddieActionManager,
            })

            const missionEngine = new MissionEngine(
                missionManagerWithHumanEnemy
            )

            const result = missionEngine.readyAction({
                actor: {
                    inBattleSquaddieId: slitherDemonId.inBattleSquaddieId,
                    outOfBattleSquaddieId: slitherDemonId.outOfBattleSquaddieId,
                },
                targets: [
                    {
                        inBattleSquaddieId: slitherDemonId.inBattleSquaddieId,
                        outOfBattleSquaddieId:
                            slitherDemonId.outOfBattleSquaddieId,
                    },
                ],
                action: { id: "any-action" },
            })

            expect(result.isValid).toBe(true)
        })
    })

    describe("recentPhaseTransitions in getInMissionSummary", () => {
        it("reports the phases traversed after endSquaddieTurn exhausts the active affiliation", () => {
            const harness = new MissionEngineTestHarness()
            advanceHarnessToPlayerTurn(harness)
            const liniId = harness.getLiniSquaddieId()

            harness.endSquaddieTurn(liniId)

            const summary = harness.getInMissionSummary()
            expect(summary.recentPhaseTransitions).toEqual([
                MissionAffiliationTurn.PLAYER_TURN_END,
                MissionAffiliationTurn.ENEMY_TURN_START,
                MissionAffiliationTurn.ENEMY_TURN,
            ])
        })

        it("is empty when the phase does not advance after the action", () => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "player_sheet",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            distancePerAction: 2,
                            items: { maxCapacity: 0 },
                        },
                    }
                )

            const player1 = OutOfBattleSquaddieService.new({
                id: "player-1",
                name: "Player One",
                affiliation: SquaddieAffiliation.PLAYER,
                attributeSheetId: "player_sheet",
            })
            const player2 = OutOfBattleSquaddieService.new({
                id: "player-2",
                name: "Player Two",
                affiliation: SquaddieAffiliation.PLAYER,
                attributeSheetId: "player_sheet",
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(player1)
            outOfBattleSquaddieManager.addOrUpdateSquaddie(player2)

            const inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )
            const player1Id = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "player-1",
            })
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "player-2",
            })

            const map = CoordinateMapService.new({
                id: "test_map",
                name: "test map",
                movementProperties: ["1 1 1"],
            })
            const coordinateMapCollectionManager =
                new CoordinateMapCollectionManager(
                    CoordinateMapCollectionService.new()
                )
            coordinateMapCollectionManager.addOrUpdate({ map })
            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: player1Id,
                coordinate: { row: 0, col: 0 },
            })

            const squaddieActionManager = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                }),
            })
            const missionEngine = new MissionEngine(
                new MissionManager({
                    missionState,
                    inBattleSquaddieManager,
                    coordinateMapCollectionManager,
                    squaddieActionManager,
                })
            )

            missionEngine.endSquaddieTurn(player1Id)

            const summary = missionEngine.getInMissionSummary()
            expect(summary.recentPhaseTransitions).toEqual([])
        })

        it("persists across multiple getInMissionSummary calls until the next action", () => {
            const harness = new MissionEngineTestHarness()
            advanceHarnessToPlayerTurn(harness)
            const liniId = harness.getLiniSquaddieId()

            harness.endSquaddieTurn(liniId)

            const firstCall = harness.getInMissionSummary()
            const secondCall = harness.getInMissionSummary()

            expect(firstCall.recentPhaseTransitions).toEqual(
                secondCall.recentPhaseTransitions
            )
            expect(secondCall.recentPhaseTransitions).toEqual([
                MissionAffiliationTurn.PLAYER_TURN_END,
                MissionAffiliationTurn.ENEMY_TURN_START,
                MissionAffiliationTurn.ENEMY_TURN,
            ])
        })
    })
})
