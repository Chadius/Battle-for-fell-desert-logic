import { describe, expect, it } from "vitest"
import { MissionManager } from "./missionManager"
import { MissionStateService } from "./missionState"

describe("MissionManager", () => {
    describe("constructor", () => {
        it("creates a new MissionManager with no parameters", () => {
            const manager = new MissionManager()

            expect(manager.missionState).toBeUndefined()
            expect(manager.inBattleSquaddieManager).toBeUndefined()
            expect(manager.coordinateMapCollectionManager).toBeUndefined()
            expect(manager.squaddieActionManager).toBeUndefined()
        })

        it("creates a new MissionManager with state", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
            })

            const manager = new MissionManager({ missionState: missionState })

            expect(manager.missionState).toBe(missionState)
        })

        it("creates a new MissionManager with all dependencies", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
            })
            const inBattleSquaddieManager = {} as any
            const coordinateMapCollectionManager = {} as any
            const squaddieActionManager = {} as any

            const manager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
                coordinateMapCollectionManager: coordinateMapCollectionManager,
                squaddieActionManager: squaddieActionManager,
            })

            expect(manager.missionState).toBe(missionState)
            expect(manager.inBattleSquaddieManager).toBe(
                inBattleSquaddieManager
            )
            expect(manager.coordinateMapCollectionManager).toBe(
                coordinateMapCollectionManager
            )
            expect(manager.squaddieActionManager).toBe(squaddieActionManager)
        })
    })
})
