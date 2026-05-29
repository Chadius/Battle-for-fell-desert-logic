import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine"
import {
    MissionEngineTestHarness,
    MissionEngineTestHarnessIds,
} from "../../../testUtils/mission/missionEngineTestHarness"
import { MissionStateService } from "../../missionState"

describe("MissionEngine.loadMissionStateFromJson", () => {
    let harness: MissionEngineTestHarness

    beforeEach(() => {
        harness = new MissionEngineTestHarness()
    })

    it("returns isValid true and commits when the data is valid", () => {
        const newState = MissionStateService.new({
            id: "new-mission",
            mapId: MissionEngineTestHarnessIds.mapId,
        })

        const result = harness.loadMissionStateFromJson(
            MissionStateService.serialize(newState)
        )

        expect(result.isValid).toBeTruthy()
        expect(result.errors).toHaveLength(0)
        expect(harness.missionManager!.missionState?.id).toBe("new-mission")
    })

    it("returns isValid false with errors when the mapId does not exist", () => {
        const newState = MissionStateService.new({
            id: "new-mission",
            mapId: "nonexistent-map",
        })

        const result = harness.loadMissionStateFromJson(
            MissionStateService.serialize(newState)
        )

        expect(result.isValid).toBeFalsy()
        expect(result.errors.length).toBeGreaterThan(0)
    })

    it("leaves the existing missionState unchanged after a failed load", () => {
        const originalId = harness.missionManager!.missionState?.id

        const newState = MissionStateService.new({
            id: "replacement",
            mapId: "nonexistent-map",
        })

        harness.loadMissionStateFromJson(
            MissionStateService.serialize(newState)
        )

        expect(harness.missionManager!.missionState?.id).toBe(originalId)
    })

    it("throws when missionManager is undefined", () => {
        const engine = new MissionEngine()
        expect(() =>
            engine.loadMissionStateFromJson(
                MissionStateService.serialize(
                    MissionStateService.new({
                        id: "m",
                        mapId: "any",
                    })
                )
            )
        ).toThrow("missionManager is undefined")
    })
})
