import { describe, expect, it } from "vitest"
import { MissionStateService } from "./missionState"
import { MissionObjectiveService } from "./missionObjective"
import { MissionObjectiveRewardService } from "./missionObjectiveReward"
import { MissionObjectiveCriteriaService } from "./missionObjectiveCriteria"
import { SquaddieAffiliation } from "../affiliation/affiliation"
import { MissionTurnService } from "./missionTurn"
import { MissionHistoryService } from "./history/missionHistory"
import { MissionDeploymentService } from "./missionDeployment"

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

        it("creates a MissionState with deployments", () => {
            const deployment = MissionDeploymentService.new({
                id: "lini-start",
                outOfBattleSquaddieId: "lini",
                coordinates: [{ row: 0, col: 0 }],
            })

            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                deployments: { required: [deployment] },
            })

            expect(state.deployments).toBeDefined()
            expect(state.deployments!.required).toHaveLength(1)
            expect(state.deployments!.required[0]).toBe(deployment)
            expect(state.deployments!.completedDeploymentIds).toEqual([])
        })
    })

    describe("getPendingDeployments", () => {
        it("returns all required deployments when none are completed", () => {
            const lini = MissionDeploymentService.new({
                id: "lini-start",
                outOfBattleSquaddieId: "lini",
                coordinates: [{ row: 0, col: 0 }],
            })
            const demon = MissionDeploymentService.new({
                id: "demon-start",
                outOfBattleSquaddieId: "slither-demon",
                coordinates: [{ row: 3, col: 4 }],
            })
            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                deployments: { required: [lini, demon] },
            })

            const pending = MissionStateService.getPendingDeployments(state)

            expect(pending).toHaveLength(2)
            expect(pending).toContain(lini)
            expect(pending).toContain(demon)
        })

        it("excludes already-completed deployments", () => {
            const lini = MissionDeploymentService.new({
                id: "lini-start",
                outOfBattleSquaddieId: "lini",
                coordinates: [{ row: 0, col: 0 }],
            })
            const demon = MissionDeploymentService.new({
                id: "demon-start",
                outOfBattleSquaddieId: "slither-demon",
                coordinates: [{ row: 3, col: 4 }],
            })
            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                deployments: { required: [lini, demon] },
            })
            const stateAfterLini = MissionStateService.markDeploymentComplete(
                state,
                lini.id
            )

            const pending =
                MissionStateService.getPendingDeployments(stateAfterLini)

            expect(pending).toHaveLength(1)
            expect(pending[0]).toBe(demon)
        })

        it("a single deployment with multiple coordinates counts as one pending entry", () => {
            const goblins = MissionDeploymentService.new({
                id: "goblins",
                outOfBattleSquaddieId: "goblin",
                coordinates: [
                    { row: 0, col: 0 },
                    { row: 4, col: 4 },
                ],
            })
            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                deployments: { required: [goblins] },
            })

            expect(
                MissionStateService.getPendingDeployments(state)
            ).toHaveLength(1)
            const completed = MissionStateService.markDeploymentComplete(
                state,
                goblins.id
            )
            expect(
                MissionStateService.getPendingDeployments(completed)
            ).toHaveLength(0)
        })

        it("two deployment objects with the same outOfBattleSquaddieId are tracked independently by deployment id", () => {
            const wave1 = MissionDeploymentService.new({
                id: "goblin-wave-1",
                outOfBattleSquaddieId: "goblin",
                coordinates: [{ row: 0, col: 0 }],
            })
            const wave2 = MissionDeploymentService.new({
                id: "goblin-wave-2",
                outOfBattleSquaddieId: "goblin",
                coordinates: [{ row: 4, col: 4 }],
            })
            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                deployments: { required: [wave1, wave2] },
            })
            const stateAfterFirst = MissionStateService.markDeploymentComplete(
                state,
                wave1.id
            )

            const pending =
                MissionStateService.getPendingDeployments(stateAfterFirst)

            expect(pending).toHaveLength(1)
            expect(pending[0]).toBe(wave2)
        })

        it("returns empty array when deployments field is undefined", () => {
            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
            })

            expect(MissionStateService.getPendingDeployments(state)).toEqual([])
        })

        it("returns empty array when all deployments are completed", () => {
            const lini = MissionDeploymentService.new({
                id: "lini-start",
                outOfBattleSquaddieId: "lini",
                coordinates: [{ row: 0, col: 0 }],
            })
            let state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                deployments: { required: [lini] },
            })
            state = MissionStateService.markDeploymentComplete(state, lini.id)

            expect(MissionStateService.getPendingDeployments(state)).toEqual([])
        })
    })

    describe("markDeploymentComplete", () => {
        it("adds the deployment id to the completed list", () => {
            const deployment = MissionDeploymentService.new({
                id: "lini-start",
                outOfBattleSquaddieId: "lini",
                coordinates: [{ row: 0, col: 0 }],
            })
            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                deployments: { required: [deployment] },
            })

            const updated = MissionStateService.markDeploymentComplete(
                state,
                deployment.id
            )

            expect(updated.deployments!.completedDeploymentIds).toContain(
                deployment.id
            )
        })

        it("does not modify the original state", () => {
            const deployment = MissionDeploymentService.new({
                id: "lini-start",
                outOfBattleSquaddieId: "lini",
                coordinates: [{ row: 0, col: 0 }],
            })
            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                deployments: { required: [deployment] },
            })

            MissionStateService.markDeploymentComplete(state, deployment.id)

            expect(state.deployments!.completedDeploymentIds).toHaveLength(0)
        })

        it("is a no-op when the deployment id is already completed", () => {
            const deployment = MissionDeploymentService.new({
                id: "lini-start",
                outOfBattleSquaddieId: "lini",
                coordinates: [{ row: 0, col: 0 }],
            })
            let state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                deployments: { required: [deployment] },
            })
            state = MissionStateService.markDeploymentComplete(
                state,
                deployment.id
            )
            const stateAgain = MissionStateService.markDeploymentComplete(
                state,
                deployment.id
            )

            expect(stateAgain.deployments!.completedDeploymentIds).toHaveLength(
                1
            )
        })

        it("returns the same state when deployments field is undefined", () => {
            const state = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
            })

            const result = MissionStateService.markDeploymentComplete(
                state,
                "lini-start"
            )

            expect(result).toBe(state)
        })
    })
})
