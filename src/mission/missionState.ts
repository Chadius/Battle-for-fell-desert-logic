import type { MissionObjective } from "./missionObjective"
import { MissionObjectiveService } from "./missionObjective"
import type { MissionTurn } from "./missionTurn"
import { MissionTurnService } from "./missionTurn"
import type { MissionHistory } from "./history/missionHistory"
import { MissionHistoryService } from "./history/missionHistory"
import type { TTurnControllerType } from "./turnController"
import type { TSquaddieAffiliation } from "../affiliation/affiliation"

export interface MissionState {
    id: string
    mapId: string
    objectives: MissionObjective[]
    turn: MissionTurn
    history?: MissionHistory
    controllerTypeOverrides?: {
        affiliation?: Partial<Record<TSquaddieAffiliation, TTurnControllerType>>
        squaddie?: Record<string, TTurnControllerType>
    }
}

export const MissionStateService = {
    new: ({
        id,
        mapId,
        objectives,
        turn,
        history,
        controllerTypeOverrides,
    }: {
        id: string
        mapId: string
        objectives?: MissionObjective[]
        turn?: MissionTurn
        history?: MissionHistory
        controllerTypeOverrides?: {
            affiliation?: Partial<
                Record<TSquaddieAffiliation, TTurnControllerType>
            >
            squaddie?: Record<string, TTurnControllerType>
        }
    }): MissionState => {
        if (id == undefined || id.length === 0) {
            throw new Error(
                "[MissionStateService.new]: id must be defined and not empty"
            )
        }

        if (mapId == undefined || mapId.length === 0) {
            throw new Error(
                "[MissionStateService.new]: mapId must be defined and not empty"
            )
        }

        return {
            id,
            mapId,
            objectives: objectives ?? [],
            turn: turn ?? MissionTurnService.new(),
            history: history ?? MissionHistoryService.new(),
            controllerTypeOverrides,
        }
    },

    createFromJSON: (data: {
        id: string
        mapId: string
        objectives?: any[]
        turn?: any
        history?: any
    }): MissionState => {
        const parsedObjectives = data.objectives?.map((obj) =>
            MissionObjectiveService.createFromJSON(obj)
        )
        const parsedTurn = data.turn
            ? MissionTurnService.createFromJSON(data.turn)
            : undefined
        const parsedHistory = data.history
            ? MissionHistoryService.createFromJSON(data.history)
            : undefined

        return MissionStateService.new({
            id: data.id,
            mapId: data.mapId,
            objectives: parsedObjectives,
            turn: parsedTurn,
            history: parsedHistory,
        })
    },
}
