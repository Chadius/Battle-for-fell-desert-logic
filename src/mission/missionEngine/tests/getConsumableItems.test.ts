import { beforeEach, describe, expect, it } from "vitest"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager.js"
import { type MissionState, MissionStateService } from "../../missionState.js"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup.js"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { SquaddieAffiliation } from "../../../affiliation/affiliation.js"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { MissionEngine } from "../missionEngine.js"
import { MissionManager } from "../../missionManager.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"
import { SquaddieItemManager } from "../../../squaddieItem/squaddieItemManager.js"
import { SquaddieItemCollectionService } from "../../../squaddieItem/squaddieItemCollection.js"
import { SquaddieItemService } from "../../../squaddieItem/squaddieItem.js"

describe("MissionEngine.getConsumableItems", () => {
    let inBattleSquaddieManager: InBattleSquaddieManager
    let squaddieItemManager: SquaddieItemManager
    let playerSquaddieId: BattleSquaddieId
    let missionState: MissionState

    beforeEach(() => {
        const { manager: outOfBattleSquaddieManager } =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "test_sheet",
                attributeSheetOptions: {
                    maxHitPoints: 10,
                    distancePerAction: 2,
                    items: {
                        itemIds: ["healScroll"],
                        maxCapacity: 1,
                    },
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

        squaddieItemManager = new SquaddieItemManager(
            SquaddieItemCollectionService.new()
        )
        squaddieItemManager.addOrUpdate(
            SquaddieItemService.new({
                id: "healScroll",
                name: "Heal Scroll",
                numberOfUses: 2,
                actionIds: [],
                glossaryTermIds: ["item.healScroll"],
            })
        )
        inBattleSquaddieManager.setSquaddieItemManager(squaddieItemManager)

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

        expect(() =>
            missionEngine.getConsumableItems(playerSquaddieId)
        ).toThrow("missionManager is undefined")
    })

    it("throws error if inBattleSquaddieManager is undefined", () => {
        const missionManager = new MissionManager({
            missionState: missionState,
        })
        const missionEngine = new MissionEngine(missionManager)

        expect(() =>
            missionEngine.getConsumableItems(playerSquaddieId)
        ).toThrow("inBattleSquaddieManager is undefined")
    })

    it("returns each consumable item's remaining uses and glossaryTermIds", () => {
        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
        })
        const missionEngine = new MissionEngine(missionManager)

        const consumableItems =
            missionEngine.getConsumableItems(playerSquaddieId)

        expect(consumableItems).toEqual(
            new Map([
                [
                    "healScroll",
                    { numberOfUses: 2, glossaryTermIds: ["item.healScroll"] },
                ],
            ])
        )
    })

    it("reflects items already used during the mission", () => {
        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
        })
        const missionEngine = new MissionEngine(missionManager)

        inBattleSquaddieManager.useItem({
            ...playerSquaddieId,
            itemId: "healScroll",
        })

        const consumableItems =
            missionEngine.getConsumableItems(playerSquaddieId)

        expect(consumableItems.get("healScroll")?.numberOfUses).toBe(1)
    })
})
