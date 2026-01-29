import { beforeEach, describe, expect, it } from "vitest"
import {
    type BattleSquaddieId,
    InBattleSquaddieManager,
} from "../../../squaddie/inBattle/inBattleSquaddieManager"
import { type MissionState, MissionStateService } from "../../missionState"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { SquaddieAffiliation } from "../../../affiliation/affiliation"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection"
import { MissionEngine } from "../missionEngine"
import { MissionManager } from "../../missionManager"

describe("getSquaddieInfo", () => {
    let inBattleSquaddieManager: InBattleSquaddieManager
    let playerSquaddieId: BattleSquaddieId
    let missionState: MissionState

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

        missionState = MissionStateService.new({
            id: "mission-1",
            mapId: "map-1",
        })
    })

    it("throws error if MissionManager is undefined", () => {
        const missionEngine = new MissionEngine()

        expect(() => missionEngine.getSquaddieInfo(playerSquaddieId)).toThrow(
            "missionManager is undefined"
        )
    })

    it("throws error if inBattleSquaddieManager is undefined", () => {
        const missionManager = new MissionManager({
            missionState: missionState,
        })
        const missionEngine = new MissionEngine(missionManager)

        expect(() => missionEngine.getSquaddieInfo(playerSquaddieId)).toThrow(
            "inBattleSquaddieManager is undefined"
        )
    })

    it("returns squaddie info from InBattleSquaddieManager", () => {
        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
        })
        const missionEngine = new MissionEngine(missionManager)

        const info = missionEngine.getSquaddieInfo(playerSquaddieId)

        expect(info.name).toBe("Hero")
        expect(info.affiliation).toBe(SquaddieAffiliation.PLAYER)
        expect(info.currentHitPoints).toBe(10)
        expect(info.maxHitPoints).toBe(10)
        expect(info.currentActionPoints).toBe(3)
        expect(info.maximumActionPoints).toBe(3)
        expect(info.conditions).toEqual([])
        expect(info.isDefeated).toBe(false)
        expect(info.canAct).toBe(true)
        expect(info.items.itemIds).toEqual([])
        expect(info.items.itemIdsUsed).toEqual([])
    })

    it("reflects squaddie state changes", () => {
        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
        })
        const missionEngine = new MissionEngine(missionManager)

        inBattleSquaddieManager.dealDamageToSquaddie({
            ...playerSquaddieId,
            damage: { amount: 4, type: undefined },
        })

        inBattleSquaddieManager.spendActionPoints({
            ...playerSquaddieId,
            actionPoints: 2,
        })

        const info = missionEngine.getSquaddieInfo(playerSquaddieId)

        expect(info.currentHitPoints).toBe(6)
        expect(info.currentActionPoints).toBe(1)
        expect(info.canAct).toBe(true)
    })

    it("canAct reflects when squaddie cannot act", () => {
        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
        })
        const missionEngine = new MissionEngine(missionManager)

        inBattleSquaddieManager.spendActionPoints({
            ...playerSquaddieId,
            actionPoints: 3,
        })

        const info = missionEngine.getSquaddieInfo(playerSquaddieId)

        expect(info.canAct).toBe(false)
    })

    it("can be serialized to JSON", () => {
        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
        })
        const missionEngine = new MissionEngine(missionManager)

        const info = missionEngine.getSquaddieInfo(playerSquaddieId)
        const jsonString = JSON.stringify(info)
        const parsed = JSON.parse(jsonString)

        expect(parsed.name).toBe("Hero")
        expect(parsed.affiliation).toBe(SquaddieAffiliation.PLAYER)
        expect(parsed.currentHitPoints).toBe(10)
        expect(parsed.isDefeated).toBe(false)
        expect(parsed.canAct).toBe(true)
        expect(parsed.items).toBeDefined()
    })
})
