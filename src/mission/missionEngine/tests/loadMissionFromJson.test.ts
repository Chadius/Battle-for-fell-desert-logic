import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine"
import {
    MissionEngineTestHarness,
    MissionEngineTestHarnessIds,
} from "../../../testUtils/mission/missionEngineTestHarness"
import { MissionStateService } from "../../missionState"

const loadValidMission = (engine: MissionEngine) =>
    engine.loadMissionFromJson({
        squaddies: MissionEngineTestHarness.serializeSquaddies(),
        attributeSheets: MissionEngineTestHarness.serializeAttributeSheets(),
        maps: MissionEngineTestHarness.serializeMaps(),
        actions: MissionEngineTestHarness.serializeActions(),
        missionState: MissionEngineTestHarness.serializeMissionState(),
    })

describe("MissionEngine.loadMissionFromJson", () => {
    it("returns isValid true for a complete resource set", () => {
        const engine = new MissionEngine()
        const result = loadValidMission(engine)
        expect(result.isValid).toBeTruthy()
        expect(result.errors).toHaveLength(0)
    })

    it("returns isValid false when the mission state references a nonexistent map", () => {
        const engine = new MissionEngine()
        const badState = MissionStateService.new({
            id: "bad-mission",
            mapId: "nonexistent-map",
        })

        const result = engine.loadMissionFromJson({
            maps: MissionEngineTestHarness.serializeMaps(),
            actions: MissionEngineTestHarness.serializeActions(),
            missionState: MissionStateService.serialize(badState),
        })

        expect(result.isValid).toBeFalsy()
        expect(result.errors.length).toBeGreaterThan(0)
    })

    it("succeeds without optional items field", () => {
        const engine = new MissionEngine()
        const result = loadValidMission(engine)
        expect(result.isValid).toBeTruthy()
    })

    it("auto-creates a MissionManager when none exists", () => {
        const engine = new MissionEngine()
        expect(engine.missionManager).toBeUndefined()
        loadValidMission(engine)
        expect(engine.missionManager).toBeDefined()
    })

    it("does not place squaddies on the map before finalizeLoadingMission", () => {
        const engine = new MissionEngine()
        loadValidMission(engine)

        const liniInBattleId =
            engine.missionManager?.inBattleSquaddieManager?.getBattleSquaddieIdsByOutOfBattleSquaddieId(
                MissionEngineTestHarnessIds.lini.outOfBattleSquaddieId
            )[0]
        expect(liniInBattleId).toBeDefined()
        const position = engine.getSquaddiePosition(liniInBattleId!)
        expect(position).toBeUndefined()
    })
})

describe("MissionEngine.finalizeLoadingMission", () => {
    describe("after a valid load", () => {
        let engine: MissionEngine

        beforeEach(() => {
            engine = new MissionEngine()
            loadValidMission(engine)
        })

        it("returns isValid true", () => {
            const result = engine.finalizeLoadingMission()
            expect(result.isValid).toBeTruthy()
            expect(result.errors).toHaveLength(0)
        })

        it("places Lini on the map at the deployment coordinate", () => {
            engine.finalizeLoadingMission()
            const liniInBattleId =
                engine.missionManager?.inBattleSquaddieManager?.getBattleSquaddieIdsByOutOfBattleSquaddieId(
                    MissionEngineTestHarnessIds.lini.outOfBattleSquaddieId
                )[0]
            expect(liniInBattleId).toBeDefined()
            const position = engine.getSquaddiePosition(liniInBattleId!)
            expect(position).toBeDefined()
        })

        it("places Slither Demon on the map at the deployment coordinate", () => {
            engine.finalizeLoadingMission()
            const demonInBattleId =
                engine.missionManager?.inBattleSquaddieManager?.getBattleSquaddieIdsByOutOfBattleSquaddieId(
                    MissionEngineTestHarnessIds.slitherDemon
                        .outOfBattleSquaddieId
                )[0]
            expect(demonInBattleId).toBeDefined()
            const position = engine.getSquaddiePosition(demonInBattleId!)
            expect(position).toBeDefined()
        })
    })

    it("returns isValid false with errors when called without a prior valid load", () => {
        const engine = new MissionEngine()
        const result = engine.finalizeLoadingMission()
        expect(result.isValid).toBeFalsy()
        expect(result.errors.length).toBeGreaterThan(0)
    })

    it("returns isValid false with errors after an invalid load", () => {
        const engine = new MissionEngine()
        engine.loadMissionFromJson({
            maps: MissionEngineTestHarness.serializeMaps(),
            missionState: MissionStateService.serialize(
                MissionStateService.new({
                    id: "bad",
                    mapId: "nonexistent-map",
                })
            ),
        })

        const result = engine.finalizeLoadingMission()
        expect(result.isValid).toBeFalsy()
        expect(result.errors.length).toBeGreaterThan(0)
    })
})
