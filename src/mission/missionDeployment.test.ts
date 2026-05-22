import { describe, expect, it } from "vitest"
import { MissionDeploymentService } from "./missionDeployment"

describe("MissionDeployment", () => {
    describe("new", () => {
        it("creates a deployment with the given id, outOfBattleSquaddieId and coordinates", () => {
            const deployment = MissionDeploymentService.new({
                id: "lini-start",
                outOfBattleSquaddieId: "lini",
                coordinates: [{ row: 2, col: 3 }],
            })

            expect(deployment.id).toBe("lini-start")
            expect(deployment.outOfBattleSquaddieId).toBe("lini")
            expect(deployment.coordinates).toEqual([{ row: 2, col: 3 }])
        })

        it("creates a deployment with multiple coordinates for several instances", () => {
            const deployment = MissionDeploymentService.new({
                id: "goblins",
                outOfBattleSquaddieId: "goblin",
                coordinates: [
                    { row: 0, col: 0 },
                    { row: 1, col: 1 },
                    { row: 2, col: 2 },
                ],
            })

            expect(deployment.coordinates).toHaveLength(3)
            expect(deployment.coordinates[1]).toEqual({ row: 1, col: 1 })
        })
    })
})
