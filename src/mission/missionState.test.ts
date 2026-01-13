import { describe, expect, it } from "vitest"
import { MissionStateService } from "./missionState"
import { MissionObjectiveService } from "./missionObjective"
import { MissionObjectiveRewardService } from "./missionObjectiveReward"
import { MissionObjectiveCriteriaService } from "./missionObjectiveCriteria"
import { SquaddieAffiliation } from "../affiliation/affiliation"
import { MissionTurnService } from "./missionTurn"
import { MissionHistoryService } from "./history/missionHistory"

describe("MissionState", () => {
    describe("new", () => {
        it("creates a new MissionState with required fields", () => {
            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                history: MissionHistoryService.new(),
            })

            expect(state).toEqual({
                id: "mission-1",
                mapId: "map-1",
                objectives: [],
                turn: MissionTurnService.new(),
                history: MissionHistoryService.new(),
            })
        })

        it("creates a new MissionState with objectives", () => {
            const objective = MissionObjectiveService.new({
                id: "obj-1",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["d1"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [objective],
            })

            expect(state.objectives).toHaveLength(1)
            expect(state.objectives[0]).toBe(objective)
        })

        it("creates a new MissionState with custom turn", () => {
            const turn = MissionTurnService.new({
                turnCount: 5,
            })

            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                turn,
            })

            expect(state.turn).toBe(turn)
            expect(state.turn.turnCount).toBe(5)
        })

        it("throws error when id is undefined", () => {
            expect(() =>
                MissionStateService.new({
                    id: undefined as unknown as string,
                    mapId: "map-1",
                })
            ).toThrow(
                "[MissionStateService.new]: id must be defined and not empty"
            )
        })

        it("throws error when id is empty string", () => {
            expect(() =>
                MissionStateService.new({
                    id: "",
                    mapId: "map-1",
                })
            ).toThrow(
                "[MissionStateService.new]: id must be defined and not empty"
            )
        })

        it("throws error when mapId is undefined", () => {
            expect(() =>
                MissionStateService.new({
                    id: "mission-1",
                    mapId: undefined as unknown as string,
                })
            ).toThrow(
                "[MissionStateService.new]: mapId must be defined and not empty"
            )
        })

        it("throws error when mapId is empty string", () => {
            expect(() =>
                MissionStateService.new({
                    id: "mission-1",
                    mapId: "",
                })
            ).toThrow(
                "[MissionStateService.new]: mapId must be defined and not empty"
            )
        })
    })
})
