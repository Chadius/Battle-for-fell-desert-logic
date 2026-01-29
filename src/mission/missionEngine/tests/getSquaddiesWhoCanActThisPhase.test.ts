import { beforeEach, describe, expect, it } from "vitest"
import {
    type BattleSquaddieId,
    InBattleSquaddieManager,
} from "../../../squaddie/inBattle/inBattleSquaddieManager"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { SquaddieAffiliation } from "../../../affiliation/affiliation"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection"
import { MissionEngine } from "../missionEngine"
import { MissionStateService } from "../../missionState"
import { MissionAffiliationTurn, MissionTurnService } from "../../missionTurn"
import { MissionManager } from "../../missionManager"

describe("getSquaddiesWhoCanActThisPhase", () => {
    let inBattleSquaddieManager: InBattleSquaddieManager
    let playerSquaddieId: BattleSquaddieId

    beforeEach(() => {
        const { manager: outOfBattleSquaddieManager } =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "test_sheet",
                attributeSheetOptions: {
                    maxHitPoints: 10,
                    distancePerAction: 2,
                    items: { maxCapacity: 0 },
                },
            })

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

        expect(() => missionEngine.getSquaddiesWhoCanActThisPhase()).toThrow(
            "missionManager is undefined"
        )
    })

    it("returns only player squaddies during PLAYER_TURN phase", () => {
        const missionState = MissionStateService.new({
            id: "mission-1",
            mapId: "map-1",
            turn: MissionTurnService.new({
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            }),
        })

        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
        })
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

        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
        })
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

        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
        })
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

        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
        })
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

        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
        })
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

        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
        })
        const missionEngine = new MissionEngine(missionManager)

        const result = missionEngine.getSquaddiesWhoCanActThisPhase()

        expect(result).toHaveLength(1)
        expect(result[0].outOfBattleSquaddieId).toBe("player-1")
    })
})
