import { z } from "zod"
import type { OffsetCoordinate } from "../coordinateMap/offsetCoordinate"

export interface MissionDeployment {
    id: string
    outOfBattleSquaddieId: string
    coordinates: OffsetCoordinate[]
}

const offsetCoordinateSchema = z.object({
    row: z.number(),
    col: z.number(),
})

export const missionDeploymentSchema = z.object({
    id: z.string().min(1),
    outOfBattleSquaddieId: z.string().min(1),
    coordinates: z.array(offsetCoordinateSchema),
})

export type SerializedMissionDeployment = z.infer<
    typeof missionDeploymentSchema
>

export const MissionDeploymentService = {
    new: (params: {
        id: string
        outOfBattleSquaddieId: string
        coordinates: OffsetCoordinate[]
    }): MissionDeployment => ({ ...params }),

    serialize: (deployment: MissionDeployment): SerializedMissionDeployment => {
        return {
            id: deployment.id,
            outOfBattleSquaddieId: deployment.outOfBattleSquaddieId,
            coordinates: [...deployment.coordinates],
        }
    },
}
