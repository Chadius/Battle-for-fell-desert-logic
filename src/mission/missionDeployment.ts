import type { OffsetCoordinate } from "../coordinateMap/offsetCoordinate"

export interface MissionDeployment {
    id: string
    outOfBattleSquaddieId: string
    coordinates: OffsetCoordinate[]
}

export const MissionDeploymentService = {
    new: (params: {
        id: string
        outOfBattleSquaddieId: string
        coordinates: OffsetCoordinate[]
    }): MissionDeployment => ({ ...params }),
}
