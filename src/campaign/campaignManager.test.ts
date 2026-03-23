import { beforeEach, describe, expect, it } from "vitest"
import { CampaignManager } from "./campaignManager"
import { CampaignCollectionService } from "./campaignCollection"
import { CampaignMissionService } from "./campaignMission"
import type { MissionManager } from "../mission/missionManager"

describe("CampaignManager", () => {
    let manager: CampaignManager

    const createMission = (id: string, name: string) =>
        CampaignMissionService.new({ id, name })

    beforeEach(() => {
        manager = new CampaignManager(CampaignCollectionService.new())
    })

    describe("addMission", () => {
        it("registers a mission in the collection", () => {
            manager.addMission(createMission("mission-1", "First Mission"))

            const serialized = manager.getSerializedMissions()
            expect(serialized).toHaveLength(1)
            expect(serialized[0]).toEqual({
                id: "mission-1",
                name: "First Mission",
            })
        })

        it("throws when collection is undefined", () => {
            const managerWithoutCollection = new CampaignManager()
            expect(() =>
                managerWithoutCollection.addMission(
                    createMission("mission-1", "First Mission")
                )
            ).toThrow(/CampaignManager\.addMission/)
        })
    })

    describe("addMissionManager and loadMissionById", () => {
        it("stores a MissionManager and retrieves it as current after load", () => {
            const stubMissionManager = {} as MissionManager
            manager.addMission(createMission("mission-1", "First Mission"))
            manager.addMissionManager({
                id: "mission-1",
                missionManager: stubMissionManager,
            })

            manager.loadMissionById("mission-1")

            expect(manager.getCurrentMission()).toBe(stubMissionManager)
        })

        it("replaces the current mission when loading a second one", () => {
            const firstManager = {} as MissionManager
            const secondManager = {} as MissionManager

            manager.addMission(createMission("mission-1", "First Mission"))
            manager.addMissionManager({
                id: "mission-1",
                missionManager: firstManager,
            })
            manager.addMission(createMission("mission-2", "Second Mission"))
            manager.addMissionManager({
                id: "mission-2",
                missionManager: secondManager,
            })

            manager.loadMissionById("mission-1")
            expect(manager.getCurrentMission()).toBe(firstManager)

            manager.loadMissionById("mission-2")
            expect(manager.getCurrentMission()).toBe(secondManager)
        })

        it("throws when the mission id has no registered manager", () => {
            expect(() => manager.loadMissionById("nonexistent-id")).toThrow(
                /CampaignManager\.loadMissionById/
            )
        })
    })

    describe("getCurrentMission", () => {
        it("returns undefined before any mission is loaded", () => {
            expect(manager.getCurrentMission()).toBeUndefined()
        })
    })

    describe("getSerializedMissions", () => {
        it("returns metadata for all registered missions", () => {
            manager.addMission(createMission("mission-1", "First Mission"))
            manager.addMission(createMission("mission-2", "Second Mission"))

            const serialized = manager.getSerializedMissions()

            expect(serialized).toEqual([
                { id: "mission-1", name: "First Mission" },
                { id: "mission-2", name: "Second Mission" },
            ])
        })
    })
})
