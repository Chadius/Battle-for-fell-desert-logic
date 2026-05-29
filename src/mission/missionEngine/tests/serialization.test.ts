import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine"
import {
    MissionEngineTestHarness,
    MissionEngineTestHarnessIds,
} from "../../../testUtils/mission/missionEngineTestHarness"
import { RollGenerator } from "../../../squaddieAction/calculate/roll/rollGenerator"
import { MissionAffiliationTurn } from "../../missionTurn"
import type { OutOfBattleSquaddieManager } from "../../../squaddie/outOfBattle/outOfBattleSquaddieManager"

describe("MissionEngine serialize and deserialize", () => {
    let harness: MissionEngineTestHarness
    let outOfBattleSquaddieManager: OutOfBattleSquaddieManager

    function advanceToPlayerTurn(engine: MissionEngine): void {
        engine.transitionToNextPhase()
        engine.transitionToNextPhase()
    }

    beforeEach(() => {
        harness = new MissionEngineTestHarness()
        outOfBattleSquaddieManager =
            harness.missionManager!.inBattleSquaddieManager!
                .outOfBattleSquaddieManager!
        harness.setDebugFlag("enemyAlwaysEndsTheirTurn", true)
        advanceToPlayerTurn(harness)
    })

    describe("serialize", () => {
        it("includes the mission state map id", () => {
            const serialized = harness.serialize()

            expect(serialized.missionState?.mapId).toBe(
                MissionEngineTestHarnessIds.mapId
            )
        })

        it("includes the roll generator queue", () => {
            const harnessWithQueue = new MissionEngineTestHarness(
                new RollGenerator([3, 4])
            )

            const serialized = harnessWithQueue.serialize()

            expect(serialized.rollGeneratorQueue).toEqual([3, 4])
        })

        it("includes the readied action when one is set", () => {
            const liniId = harness.getLiniSquaddieId()
            harness.readyAction({
                actor: liniId,
                targets: [liniId],
                action: { id: "default-end-turn" },
            })

            const serialized = harness.serialize()

            expect(serialized.readiedAction?.action.id).toBe("default-end-turn")
        })

        it("includes squaddie state", () => {
            const serialized = harness.serialize()

            expect(serialized.inBattleSquaddieCollection).toBeDefined()
        })

        it("includes coordinate maps", () => {
            const serialized = harness.serialize()

            expect(serialized.coordinateMaps).toBeDefined()
            expect(serialized.coordinateMaps!.length).toBeGreaterThan(0)
        })
    })

    describe("deserialize", () => {
        it("throws on invalid data", () => {
            expect(() =>
                MissionEngine.deserialize(
                    "invalid-not-an-object",
                    outOfBattleSquaddieManager
                )
            ).toThrow("[MissionEngine.deserialize]")
        })

        it("round-trip preserves current turn phase", () => {
            const serialized = harness.serialize()

            const restored = MissionEngine.deserialize(
                serialized,
                outOfBattleSquaddieManager
            )

            expect(restored.getCurrentAffiliationTurn()).toBe(
                MissionAffiliationTurn.PLAYER_TURN
            )
        })

        it("round-trip preserves turn count", () => {
            const turnCountBefore = harness.getCurrentTurnNumber()

            const serialized = harness.serialize()
            const restored = MissionEngine.deserialize(
                serialized,
                outOfBattleSquaddieManager
            )

            expect(restored.getCurrentTurnNumber()).toBe(turnCountBefore)
        })

        it("round-trip preserves squaddie HP", () => {
            const liniId = harness.getLiniSquaddieId()
            const hpBefore = harness.getSquaddieInfo(liniId).currentHitPoints

            const serialized = harness.serialize()
            const restored = MissionEngine.deserialize(
                serialized,
                outOfBattleSquaddieManager
            )

            expect(restored.getSquaddieInfo(liniId).currentHitPoints).toBe(
                hpBefore
            )
        })

        it("round-trip preserves roll generator queue", () => {
            const harnessWithQueue = new MissionEngineTestHarness(
                new RollGenerator([5, 6, 3, 4])
            )

            const serialized = harnessWithQueue.serialize()
            const restored = MissionEngine.deserialize(
                serialized,
                outOfBattleSquaddieManager
            )

            expect(restored.serialize().rollGeneratorQueue).toEqual([
                5, 6, 3, 4,
            ])
        })

        it("round-trip preserves readied action", () => {
            const liniId = harness.getLiniSquaddieId()
            harness.readyAction({
                actor: liniId,
                targets: [liniId],
                action: { id: "default-end-turn" },
            })

            const serialized = harness.serialize()
            const restored = MissionEngine.deserialize(
                serialized,
                outOfBattleSquaddieManager
            )

            expect(restored.getReadiedAction()?.action.id).toBe(
                "default-end-turn"
            )
        })

        it("can execute endSquaddieTurn after deserialization", () => {
            const liniId = harness.getLiniSquaddieId()

            const serialized = harness.serialize()
            const restored = MissionEngine.deserialize(
                serialized,
                outOfBattleSquaddieManager
            )
            restored.setDebugFlag("enemyAlwaysEndsTheirTurn", true)

            expect(() => restored.endSquaddieTurn(liniId)).not.toThrow()
        })

        it("advances turn after full round in restored engine", () => {
            const liniId = harness.getLiniSquaddieId()
            const turnCountBefore = harness.getCurrentTurnNumber()

            const serialized = harness.serialize()
            const restored = MissionEngine.deserialize(
                serialized,
                outOfBattleSquaddieManager
            )
            restored.setDebugFlag("enemyAlwaysEndsTheirTurn", true)

            restored.endSquaddieTurn(liniId)

            expect(restored.getCurrentTurnNumber()).toBeGreaterThan(
                turnCountBefore
            )
        })
    })
})
