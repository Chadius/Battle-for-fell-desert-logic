import { describe, expect, it } from "vitest"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup"
import { MissionEngine } from "../missionEngine"
import {
    type BattleSquaddieId,
    InBattleSquaddieManager,
} from "../../../squaddie/inBattle/inBattleSquaddieManager"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { SquaddieAffiliation } from "../../../affiliation/affiliation"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap"
import { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../../../coordinateMap/coordinateMapCollection"
import { SquaddieActionManager } from "../../../squaddieAction/squaddieActionManager"
import { SquaddieActionCollectionService } from "../../../squaddieAction/squaddieActionCollection"
import { MissionStateService } from "../../missionState"
import { MissionManager } from "../../missionManager"

describe("getValidSquaddieActions", () => {
    it("throws error if MissionManager is undefined", () => {
        const missionEngine = new MissionEngine()

        const actor: BattleSquaddieId = {
            inBattleSquaddieId: 0,
            outOfBattleSquaddieId: "squaddie-1",
        }

        expect(() => missionEngine.getValidSquaddieActions(actor)).toThrow(
            "[MissionEngine.getValidSquaddieActions]: missionManager is undefined"
        )
    })

    it("returns valid actions for a squaddie on the map", () => {
        const { manager: outOfBattleSquaddieManager } =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "test_sheet",
                attributeSheetOptions: {
                    maxHitPoints: 10,
                    distancePerAction: 3,
                },
            })

        const playerSquaddie = OutOfBattleSquaddieService.new({
            id: "player-1",
            name: "Player 1",
            affiliation: SquaddieAffiliation.PLAYER,
            attributeSheetId: "test_sheet",
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(playerSquaddie)

        const inBattleSquaddieManager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            outOfBattleSquaddieManager
        )

        const playerSquaddieId = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "player-1",
        })

        const map = CoordinateMapService.new({
            id: "test_map",
            name: "test map",
            movementProperties: ["1 1 1 "],
        })

        const coordinateMapCollectionManager =
            new CoordinateMapCollectionManager(
                CoordinateMapCollectionService.new()
            )
        coordinateMapCollectionManager.addOrUpdate({ map })

        coordinateMapCollectionManager.addSquaddie({
            mapId: "test_map",
            squaddieId: playerSquaddieId,
            coordinate: { row: 0, col: 0 },
        })

        const squaddieActionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )

        const missionState = MissionStateService.new({
            id: "mission-1",
            mapId: "test_map",
        })

        const missionManager = new MissionManager({
            missionState,
            inBattleSquaddieManager,
            coordinateMapCollectionManager,
            squaddieActionManager,
        })

        const missionEngine = new MissionEngine(missionManager)

        const validActions =
            missionEngine.getValidSquaddieActions(playerSquaddieId)

        expect(validActions.length).toBeGreaterThan(0)

        const endTurnAction = validActions.find(
            (action) => action.action.id === "default-end-turn"
        )
        expect(endTurnAction).toBeDefined()

        const moveActions = validActions.filter(
            (action) => action.action.id === "default-move"
        )
        expect(moveActions.length).toBeGreaterThan(0)
    })
})
