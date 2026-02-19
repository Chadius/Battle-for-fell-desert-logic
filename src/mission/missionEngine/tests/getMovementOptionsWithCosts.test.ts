import { describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine"
import { MissionManager } from "../../missionManager"
import { MissionStateService } from "../../missionState"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/inBattleSquaddieManager"
import { MissionEngineTestHarness } from "../../../testUtils/mission/missionEngineTestHarness"
import { DEFAULT_ACTION_POINTS } from "../../../squaddie/inBattle/inBattleSquaddie"

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

        harness.missionManager!.inBattleSquaddieManager!.spendActionPoints({
            inBattleSquaddieId: liniId.inBattleSquaddieId,
            outOfBattleSquaddieId: liniId.outOfBattleSquaddieId,
            actionPoints: DEFAULT_ACTION_POINTS,
        })

        const result = missionEngine.getMovementOptionsWithCosts(liniId)

        expect(result).toHaveLength(0)
    })
})
