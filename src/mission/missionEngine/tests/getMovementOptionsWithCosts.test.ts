import { describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine.js"
import { MissionManager } from "../../missionManager.js"
import { MissionStateService } from "../../missionState.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"
import { MissionEngineTestHarness } from "../../../testUtils/mission/missionEngineTestHarness.js"

describe("MissionEngine.getMovementOptionsWithCosts", () => {
    it("throws error if missionManager is undefined", () => {
        const missionEngine = new MissionEngine()

        const actor: BattleSquaddieId = {
            inBattleSquaddieId: 0,
            outOfBattleSquaddieId: "squaddie-1",
        }

        expect(() => missionEngine.getMovementOptionsWithCosts(actor)).toThrow(
            "[MissionEngine.getMovementOptionsWithCosts]: missionManager is undefined"
        )
    })

    it("throws error if inBattleSquaddieManager is undefined", () => {
        const missionManager = new MissionManager({
            missionState: MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
            }),
        })
        const missionEngine = new MissionEngine(missionManager)

        const actor: BattleSquaddieId = {
            inBattleSquaddieId: 0,
            outOfBattleSquaddieId: "squaddie-1",
        }

        expect(() => missionEngine.getMovementOptionsWithCosts(actor)).toThrow(
            "[MissionEngine.getMovementOptionsWithCosts]: inBattleSquaddieManager is undefined"
        )
    })

    it("returns an array of reachable destinations with AP costs", () => {
        const harness = new MissionEngineTestHarness()
        const missionEngine = new MissionEngine(harness.missionManager)

        missionEngine.transitionToNextPhase()
        missionEngine.transitionToNextPhase()

        const liniId = harness.getLiniSquaddieId()
        const result = missionEngine.getMovementOptionsWithCosts(liniId)

        expect(result.length).toBeGreaterThan(0)
        result.forEach((item) => {
            expect(item.destination).toBeDefined()
            expect(item.destination.row).toBeDefined()
            expect(item.destination.col).toBeDefined()
            expect(item.actionPointCost).toBeGreaterThan(0)
        })
    })

    it("returns empty array when the squaddie has no action points remaining", () => {
        const harness = new MissionEngineTestHarness()
        const missionEngine = new MissionEngine(harness.missionManager)

        missionEngine.transitionToNextPhase()
        missionEngine.transitionToNextPhase()

        const liniId = harness.getLiniSquaddieId()

        harness.exhaustActionPoints(liniId)

        const result = missionEngine.getMovementOptionsWithCosts(liniId)

        expect(result).toHaveLength(0)
    })
})
