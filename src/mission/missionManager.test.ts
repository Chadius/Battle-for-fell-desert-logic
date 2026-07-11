import { describe, expect, it } from "vitest"
import { MissionManager } from "./missionManager.js"
import { MissionStateService } from "./missionState.js"
import { MovieManager } from "../movie/movieManager.js"
import type { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager.js"
import type { CoordinateMapCollectionManager } from "../coordinateMap/coordinateMapManager.js"
import type { SquaddieActionManager } from "../squaddieAction/squaddieActionManager.js"

describe("MissionManager", () => {
    describe("constructor", () => {
        describe("when constructed with no arguments", () => {
            it("has no state or managers", () => {
                const missionManager = new MissionManager()

                expect(missionManager.missionState).toBeUndefined()
                expect(missionManager.inBattleSquaddieManager).toBeUndefined()
                expect(
                    missionManager.coordinateMapCollectionManager
                ).toBeUndefined()
                expect(missionManager.squaddieActionManager).toBeUndefined()
            })
        })

        describe("when constructed with a mission state", () => {
            it("stores the mission state", () => {
                const missionState = MissionStateService.new({
                    id: "mission-1",
                    mapId: "map-1",
                })

                const missionManager = new MissionManager({ missionState })

                expect(missionManager.missionState).toBe(missionState)
            })
        })

        describe("when constructed with a MovieManager", () => {
            it("stores the MovieManager", () => {
                const movieManager = new MovieManager()

                const missionManager = new MissionManager({ movieManager })

                expect(missionManager.movieManager).toBe(movieManager)
            })
        })

        describe("when constructed with all dependencies", () => {
            it("stores each dependency", () => {
                const missionState = MissionStateService.new({
                    id: "mission-1",
                    mapId: "map-1",
                })
                const inBattleSquaddieManager = {} as InBattleSquaddieManager
                const coordinateMapCollectionManager =
                    {} as CoordinateMapCollectionManager
                const squaddieActionManager = {} as SquaddieActionManager

                const missionManager = new MissionManager({
                    missionState,
                    inBattleSquaddieManager,
                    coordinateMapCollectionManager,
                    squaddieActionManager,
                })

                expect(missionManager.missionState).toBe(missionState)
                expect(missionManager.inBattleSquaddieManager).toBe(
                    inBattleSquaddieManager
                )
                expect(missionManager.coordinateMapCollectionManager).toBe(
                    coordinateMapCollectionManager
                )
                expect(missionManager.squaddieActionManager).toBe(
                    squaddieActionManager
                )
            })
        })
    })
})
