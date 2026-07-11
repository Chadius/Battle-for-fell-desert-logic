import { beforeEach, describe, expect, it } from "vitest"
import { MissionManager } from "../missionManager.js"
import { MissionStateService } from "../missionState.js"
import { SquaddieAffiliation } from "../../affiliation/affiliation.js"
import { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager.js"
import { OutOfBattleSquaddieService } from "../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { InBattleSquaddieCollectionService } from "../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { OutOfBattleSquaddieTestSetup } from "../../testUtils/outOfBattleSquaddieTestSetup.js"
import { CoordinateMapCollectionManager } from "../../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../../coordinateMap/coordinateMapCollection.js"
import { CoordinateMapService } from "../../coordinateMap/coordinateMap.js"
import { MissionAffiliationTurn, MissionTurnService } from "../missionTurn.js"
import type { BattleSquaddieId } from "../../squaddie/inBattle/battleSquaddieId.js"

describe("MissionManager", () => {
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
})
