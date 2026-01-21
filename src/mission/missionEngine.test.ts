import { describe, expect, it } from "vitest"
import { MissionEngine } from "./missionEngine"
import { MissionManager } from "./missionManager"
import { MissionStateService } from "./missionState"
import { MissionObjectiveService } from "./missionObjective"
import { MissionObjectiveRewardService } from "./missionObjectiveReward"
import { MissionObjectiveCriteriaService } from "./missionObjectiveCriteria"
import { SquaddieAffiliation } from "../affiliation/affiliation"

describe("MissionEngine", () => {
    describe("isDone", () => {
        it("throws error if MissionManager is undefined", () => {
            const missionEngine = new MissionEngine()

            expect(() => missionEngine.isDone()).toThrow(
                "[MissionEngine.isDone]: missionManager is undefined"
            )
        })

        it("returns false when MISSION_ENDS reward has not been given", () => {
            const missionObjective = MissionObjectiveService.new({
                id: "obj-1",
                rewards: [MissionObjectiveRewardService.newMissionEndsReward()],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [missionObjective],
            })

            const missionManager = new MissionManager(missionState)
            const missionEngine = new MissionEngine(missionManager)

            expect(missionEngine.isDone()).toBe(false)
        })

        it("returns true when MISSION_ENDS reward was given", () => {
            const missionObjective = MissionObjectiveService.new({
                id: "obj-1",
                rewards: [MissionObjectiveRewardService.newMissionEndsReward()],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })
            const rewardedObjective =
                MissionObjectiveService.markRewardAsGiven(missionObjective)

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [rewardedObjective],
            })

            const missionManager = new MissionManager(missionState)
            const missionEngine = new MissionEngine(missionManager)

            expect(missionEngine.isDone()).toBe(true)
        })
    })
})
