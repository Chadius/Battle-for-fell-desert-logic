import { beforeEach, describe, expect, it } from "vitest"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager.js"
import type { OutOfBattleSquaddieManager } from "../../../squaddie/outOfBattle/outOfBattleSquaddieManager.js"
import { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager.js"
import { type MissionState, MissionStateService } from "../../missionState.js"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup.js"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { SquaddieAffiliation } from "../../../affiliation/affiliation.js"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap.js"
import { CoordinateMapCollectionService } from "../../../coordinateMap/coordinateMapCollection.js"
import { MissionEngine } from "../missionEngine.js"
import { MissionManager } from "../../missionManager.js"
import {
    CoordinateMovePathMoveType,
    CoordinateMovePathService,
} from "../../../coordinateMap/path/path.js"
import {
    type SquaddieTurnActionRecord,
    SquaddieTurnActionRecordService,
} from "../../history/squaddieTurnActionRecord.js"
import {
    type SquaddieAction,
    SquaddieActionService,
} from "../../../squaddieAction/squaddieAction.js"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.js"
import { SquaddieTurnRecordService } from "../../history/squaddieTurnRecord.js"
import { MissionTurnHistoryEntryService } from "../../history/missionTurnHistoryEntry.js"
import { MissionAffiliationTurn } from "../../missionTurn.js"
import { MissionHistoryService } from "../../history/missionHistory.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"
import { SquaddieIdConverterService } from "../../../squaddie/idConverterService.js"

const HISTORY_TURN_NUMBER = 0

describe("MissionEngine.canUndoLastPlayerUndoableAction", () => {
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

        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: "player-1",
                name: "Hero",
                affiliation: SquaddieAffiliation.PLAYER,
                attributeSheetId: "test_sheet",
            })
        )

        inBattleSquaddieManager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            outOfBattleSquaddieManager
        )
        playerSquaddieId = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "player-1",
        })

        const coordinateMap = CoordinateMapService.new({
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
        coordinateMapCollectionManager.addOrUpdate({ map: coordinateMap })
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

    const squaddieActionNamed = (id: string, name: string): SquaddieAction =>
        SquaddieActionService.new({
            id,
            name,
            effectOnActor: { [DegreeOfSuccess.SUCCESS]: {} },
        })

    const addEnemySquaddie = (): BattleSquaddieId => {
        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: "enemy-1",
                name: "Raider",
                affiliation: SquaddieAffiliation.ENEMY,
                attributeSheetId: "test_sheet",
            })
        )
        return inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "enemy-1",
        })
    }

    const undoableMovementRecord = (): SquaddieTurnActionRecord =>
        SquaddieTurnActionRecordService.new({
            action: squaddieActionNamed("move", "Move"),
            results: [
                {
                    inBattleSquaddieId: playerSquaddieId.inBattleSquaddieId,
                    outOfBattleSquaddieId:
                        playerSquaddieId.outOfBattleSquaddieId,
                    movement: {
                        expectedPath: CoordinateMovePathService.new({
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
                        }),
                    },
                },
            ],
        })

    const enemyStrikeRecord = (
        enemySquaddieId: BattleSquaddieId
    ): SquaddieTurnActionRecord =>
        SquaddieTurnActionRecordService.new({
            action: squaddieActionNamed("attack", "Attack"),
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

    const missionEngineWith = ({
        squaddieTurnActionRecord,
        currentTurnCount = HISTORY_TURN_NUMBER,
    }: {
        squaddieTurnActionRecord?: SquaddieTurnActionRecord
        currentTurnCount?: number
    }): MissionEngine => {
        if (squaddieTurnActionRecord != undefined) {
            missionState = {
                ...missionState,
                history: MissionHistoryService.new({
                    turns: [
                        MissionTurnHistoryEntryService.new({
                            turnNumber: HISTORY_TURN_NUMBER,
                            missionAffiliationTurn:
                                MissionAffiliationTurn.PLAYER_TURN,
                            squaddieTurnRecords: [
                                SquaddieTurnRecordService.new({
                                    actingBattleSquaddieId: playerSquaddieId,
                                    actions: [squaddieTurnActionRecord],
                                }),
                            ],
                        }),
                    ],
                }),
            }
        }
        missionState = {
            ...missionState,
            turn: { ...missionState.turn, turnCount: currentTurnCount },
        }
        return new MissionEngine(
            new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
            })
        )
    }

    const findPlayerCoordinate = (
        missionEngine: MissionEngine
    ): { row: number; col: number } | undefined => {
        const playerKey =
            SquaddieIdConverterService.squaddieIdToKey(playerSquaddieId)
        for (const row of missionEngine.getMapOverview().tiles) {
            for (const tile of row) {
                if (
                    tile.squaddieId != undefined &&
                    SquaddieIdConverterService.squaddieIdToKey(
                        tile.squaddieId
                    ) === playerKey
                ) {
                    return { row: tile.row, col: tile.col }
                }
            }
        }
        return undefined
    }

    describe("when no mission is loaded", () => {
        it("throws", () => {
            const missionEngine = new MissionEngine()

            expect(() =>
                missionEngine.canUndoLastPlayerUndoableAction()
            ).toThrow("missionManager is undefined")
        })
    })

    describe("when the squaddie has taken no action this turn", () => {
        it("reports the player cannot undo", () => {
            const missionEngine = missionEngineWith({})

            expect(missionEngine.canUndoLastPlayerUndoableAction()).toEqual({
                canUndo: false,
                reason: "no action to undo",
            })
        })
    })

    describe("when the only recorded action belongs to a previous turn", () => {
        it("reports the player cannot undo, so they cannot rewind past the turn boundary", () => {
            const missionEngine = missionEngineWith({
                squaddieTurnActionRecord: undoableMovementRecord(),
                currentTurnCount: HISTORY_TURN_NUMBER + 1,
            })

            expect(missionEngine.canUndoLastPlayerUndoableAction()).toEqual({
                canUndo: false,
                reason: "no action to undo",
            })
        })
    })

    describe("when the last action was an undoable move", () => {
        it("reports the player can undo", () => {
            const missionEngine = missionEngineWith({
                squaddieTurnActionRecord: undoableMovementRecord(),
            })

            expect(missionEngine.canUndoLastPlayerUndoableAction()).toEqual({
                canUndo: true,
            })
        })

        it("does not move the squaddie", () => {
            coordinateMapCollectionManager.moveSquaddie({
                mapId: "test_map",
                squaddieId: playerSquaddieId,
                coordinate: { row: 1, col: 2 },
            })
            const missionEngine = missionEngineWith({
                squaddieTurnActionRecord: undoableMovementRecord(),
            })

            missionEngine.canUndoLastPlayerUndoableAction()

            expect(findPlayerCoordinate(missionEngine)).toEqual({
                row: 1,
                col: 2,
            })
        })
    })

    describe("when the last action struck an enemy", () => {
        it("reports the player cannot undo, citing the enemy target", () => {
            const missionEngine = missionEngineWith({
                squaddieTurnActionRecord: enemyStrikeRecord(addEnemySquaddie()),
            })

            expect(missionEngine.canUndoLastPlayerUndoableAction()).toEqual({
                canUndo: false,
                reason: "action targeted enemies and cannot be reversed",
            })
        })
    })

    describe("the preview verdict never disagrees with the undo that follows", () => {
        it("both allow an undoable move", () => {
            const missionEngine = missionEngineWith({
                squaddieTurnActionRecord: undoableMovementRecord(),
            })

            const preview = missionEngine.canUndoLastPlayerUndoableAction()
            const undo = missionEngine.undoLastPlayerUndoableAction()

            expect(preview.canUndo).toBe(true)
            expect(undo.success).toBe(true)
        })

        it("both refuse an action that struck an enemy, with the same reason", () => {
            const missionEngine = missionEngineWith({
                squaddieTurnActionRecord: enemyStrikeRecord(addEnemySquaddie()),
            })

            const preview = missionEngine.canUndoLastPlayerUndoableAction()
            const undo = missionEngine.undoLastPlayerUndoableAction()

            expect(preview).toEqual({
                canUndo: false,
                reason: "action targeted enemies and cannot be reversed",
            })
            expect(undo).toMatchObject({
                success: false,
                reason: "action targeted enemies and cannot be reversed",
            })
        })
    })
})
