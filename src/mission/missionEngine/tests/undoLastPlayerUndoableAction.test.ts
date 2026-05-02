import { beforeEach, describe, expect, it } from "vitest"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager"
import type { OutOfBattleSquaddieManager } from "../../../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager"
import { type MissionState, MissionStateService } from "../../missionState"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { SquaddieAffiliation } from "../../../affiliation/affiliation"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap"
import { CoordinateMapCollectionService } from "../../../coordinateMap/coordinateMapCollection"
import { MissionEngine } from "../missionEngine"
import { MissionManager } from "../../missionManager"
import {
    CoordinateMovePathMoveType,
    CoordinateMovePathService,
} from "../../../coordinateMap/path/path"
import { SquaddieTurnActionRecordService } from "../../history/squaddieTurnActionRecord"
import type { SquaddieAction } from "../../../squaddieAction/squaddieAction"
import { SquaddieTurnRecordService } from "../../history/squaddieTurnRecord"
import { MissionTurnHistoryEntryService } from "../../history/missionTurnHistoryEntry"
import { MissionAffiliationTurn } from "../../missionTurn"
import { MissionHistoryService } from "../../history/missionHistory"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId"

describe("undoLastPlayerUndoableAction", () => {
    let inBattleSquaddieManager: InBattleSquaddieManager
    let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    let coordinateMapCollectionManager: CoordinateMapCollectionManager
    let playerSquaddieId: BattleSquaddieId
    let missionState: MissionState

    beforeEach(() => {
        const { manager } =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "test_sheet",
                attributeSheetOptions: {
                    maxHitPoints: 10,
                    distancePerAction: 3,
                    items: { maxCapacity: 0 },
                },
            })
        outOfBattleSquaddieManager = manager

        const playerSquaddie = OutOfBattleSquaddieService.new({
            id: "player-1",
            name: "Hero",
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
            movementProperties: [
                "1 1 1 1 1 1 1 1 1 1 ",
                " 1 1 1 1 1 1 1 1 1 1 ",
                "1 1 1 1 1 1 1 1 1 1 ",
            ],
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

        missionState = MissionStateService.new({
            id: "mission-1",
            mapId: "test_map",
        })
    })

    it("throws error if MissionManager is undefined", () => {
        const missionEngine = new MissionEngine()

        expect(() => missionEngine.undoLastPlayerUndoableAction()).toThrow(
            "missionManager is undefined"
        )
    })

    it("returns success: false if no history exists", () => {
        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
            coordinateMapCollectionManager: coordinateMapCollectionManager,
        })
        const missionEngine = new MissionEngine(missionManager)

        const result = missionEngine.undoLastPlayerUndoableAction()

        expect(result.success).toBe(false)
        expect(result.reason).toBe("no action to undo")
        expect(result.removedAction).toBeUndefined()
    })

    it("successfully undoes a movement action", () => {
        coordinateMapCollectionManager.moveSquaddie({
            mapId: "test_map",
            squaddieId: playerSquaddieId,
            coordinate: { row: 1, col: 2 },
        })

        const movementPath = CoordinateMovePathService.new({
            steps: [
                {
                    row: 0,
                    col: 0,
                    moveType: CoordinateMovePathMoveType.START,
                    moveCost: 0,
                },
                {
                    row: 1,
                    col: 2,
                    moveType: CoordinateMovePathMoveType.END,
                    moveCost: 2,
                },
            ],
        })

        const actionRecord = SquaddieTurnActionRecordService.new({
            action: { id: "move", name: "Move" } as SquaddieAction,
            results: [
                {
                    inBattleSquaddieId: playerSquaddieId.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        playerSquaddieId.outOfBattleSquaddieId,
                    movement: { expectedPath: movementPath },
                },
            ],
        })

        const squaddieTurnRecord = SquaddieTurnRecordService.new({
            actingBattleSquaddieId: playerSquaddieId,
            actions: [actionRecord],
        })

        const turnHistoryEntry = MissionTurnHistoryEntryService.new({
            turnNumber: 0,
            missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            squaddieTurnRecords: [squaddieTurnRecord],
        })

        const history = MissionHistoryService.new({
            turns: [turnHistoryEntry],
        })

        missionState = {
            ...missionState,
            history,
        }

        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
            coordinateMapCollectionManager: coordinateMapCollectionManager,
        })
        const missionEngine = new MissionEngine(missionManager)

        const result = missionEngine.undoLastPlayerUndoableAction()

        expect(result.success).toBe(true)
        expect(result.removedAction).toBeDefined()
        expect(result.removedAction?.action.id).toBe("move")

        const position = coordinateMapCollectionManager.getSquaddieCoordinate({
            mapId: "test_map",
            squaddieId: playerSquaddieId,
        })
        expect(position?.row).toBe(0)
        expect(position?.col).toBe(0)
    })

    it("undoes movement after an attack on an enemy, returning the movement action", () => {
        const enemySquaddie = OutOfBattleSquaddieService.new({
            id: "enemy-1",
            name: "Raider",
            affiliation: SquaddieAffiliation.ENEMY,
            attributeSheetId: "test_sheet",
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(enemySquaddie)
        const enemySquaddieId = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "enemy-1",
        })

        coordinateMapCollectionManager.addSquaddie({
            mapId: "test_map",
            squaddieId: enemySquaddieId,
            coordinate: { row: 0, col: 1 },
        })
        coordinateMapCollectionManager.moveSquaddie({
            mapId: "test_map",
            squaddieId: playerSquaddieId,
            coordinate: { row: 2, col: 0 },
        })

        const attackRecord = SquaddieTurnActionRecordService.new({
            action: { id: "attack", name: "Attack" } as SquaddieAction,
            results: [
                {
                    inBattleSquaddieId: playerSquaddieId.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        playerSquaddieId.outOfBattleSquaddieId,
                    actionPoints: { spent: 1 },
                },
                {
                    inBattleSquaddieId: enemySquaddieId.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        enemySquaddieId.outOfBattleSquaddieId,
                    damage: {
                        net: 1,
                        raw: 1,
                        absorbed: 0,
                        willKo: false,
                        type: undefined,
                    },
                },
            ],
        })
        const movementPath = CoordinateMovePathService.new({
            steps: [
                {
                    row: 0,
                    col: 0,
                    moveType: CoordinateMovePathMoveType.START,
                    moveCost: 0,
                },
                {
                    row: 2,
                    col: 0,
                    moveType: CoordinateMovePathMoveType.END,
                    moveCost: 2,
                },
            ],
        })
        const moveRecord = SquaddieTurnActionRecordService.new({
            action: { id: "move", name: "Move" } as SquaddieAction,
            results: [
                {
                    inBattleSquaddieId: playerSquaddieId.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        playerSquaddieId.outOfBattleSquaddieId,
                    movement: { expectedPath: movementPath },
                    actionPoints: { spent: 2 },
                },
            ],
        })

        // Attack record is stored for both actor and enemy; move record only for actor.
        // After addOrUpdateSquaddieTurnRecord processes the move, actor's record
        // must be last so getLastAction returns the move, not the attack.
        const actorTurnRecord = SquaddieTurnRecordService.new({
            actingBattleSquaddieId: playerSquaddieId,
            actions: [attackRecord, moveRecord],
        })
        const enemyTurnRecord = SquaddieTurnRecordService.new({
            actingBattleSquaddieId: enemySquaddieId,
            actions: [attackRecord],
        })

        const turnHistoryEntry = MissionTurnHistoryEntryService.new({
            turnNumber: 0,
            missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            // Enemy's record is placed after actor's (simulating attack recording order),
            // while actor's record has the subsequent move appended.
            // addOrUpdateSquaddieTurnRecord should have moved actor to end during recordAction.
            squaddieTurnRecords: [enemyTurnRecord, actorTurnRecord],
        })
        missionState = {
            ...missionState,
            history: MissionHistoryService.new({ turns: [turnHistoryEntry] }),
        }

        const missionManager = new MissionManager({
            missionState,
            inBattleSquaddieManager,
            coordinateMapCollectionManager,
        })
        const missionEngine = new MissionEngine(missionManager)

        const result = missionEngine.undoLastPlayerUndoableAction()

        expect(result.success).toBe(true)
        expect(result.removedAction?.action.id).toBe("move")

        const position = coordinateMapCollectionManager.getSquaddieCoordinate({
            mapId: "test_map",
            squaddieId: playerSquaddieId,
        })
        expect(position?.row).toBe(0)
        expect(position?.col).toBe(0)
    })

    it("returns success: false if action cannot be undone", () => {
        const enemySquaddie = OutOfBattleSquaddieService.new({
            id: "enemy-1",
            name: "Raider",
            affiliation: SquaddieAffiliation.ENEMY,
            attributeSheetId: "test_sheet",
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(enemySquaddie)
        const enemySquaddieId = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "enemy-1",
        })

        const movementPath = CoordinateMovePathService.new({
            steps: [
                {
                    row: 0,
                    col: 0,
                    moveType: CoordinateMovePathMoveType.START,
                    moveCost: 0,
                },
                {
                    row: 1,
                    col: 2,
                    moveType: CoordinateMovePathMoveType.END,
                    moveCost: 2,
                },
            ],
        })

        const actionRecord = SquaddieTurnActionRecordService.new({
            action: {
                id: "attack-move",
                name: "Attack Move",
            } as SquaddieAction,
            results: [
                {
                    inBattleSquaddieId: playerSquaddieId.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        playerSquaddieId.outOfBattleSquaddieId,
                    movement: { expectedPath: movementPath },
                    damage: {
                        net: 3,
                        raw: 3,
                        absorbed: 0,
                        willKo: false,
                        type: undefined,
                    },
                },
                {
                    inBattleSquaddieId: enemySquaddieId.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        enemySquaddieId.outOfBattleSquaddieId,
                    damage: {
                        net: 3,
                        raw: 3,
                        absorbed: 0,
                        willKo: false,
                        type: undefined,
                    },
                },
            ],
        })

        const squaddieTurnRecord = SquaddieTurnRecordService.new({
            actingBattleSquaddieId: playerSquaddieId,
            actions: [actionRecord],
        })

        const turnHistoryEntry = MissionTurnHistoryEntryService.new({
            turnNumber: 0,
            missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            squaddieTurnRecords: [squaddieTurnRecord],
        })

        const history = MissionHistoryService.new({
            turns: [turnHistoryEntry],
        })

        missionState = {
            ...missionState,
            history,
        }

        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
            coordinateMapCollectionManager: coordinateMapCollectionManager,
        })
        const missionEngine = new MissionEngine(missionManager)

        const result = missionEngine.undoLastPlayerUndoableAction()

        expect(result.success).toBe(false)
        expect(result.reason).toBe(
            "action targeted enemies and cannot be reversed"
        )
    })
})
