import { z } from "zod"
import {
    type MissionObjective,
    missionObjectiveSchema,
    MissionObjectiveService,
    type SerializedMissionObjective,
} from "./missionObjective"
import {
    type MissionTurn,
    missionTurnSchema,
    MissionTurnService,
    type SerializedMissionTurn,
} from "./missionTurn"
import {
    type MissionHistory,
    MissionHistoryService,
    type SerializedMissionHistory,
    missionHistorySchema,
} from "./history/missionHistory"
import type { TTurnControllerType } from "./turnController"
import type { TSquaddieAffiliation } from "../affiliation/affiliation"
import type { StrategyControllerOverrides } from "./strategyController"
import type { DebugFlags } from "./debugFlags"
import {
    type MissionDeployment,
    missionDeploymentSchema,
    MissionDeploymentService,
    type SerializedMissionDeployment,
} from "./missionDeployment"

export interface MissionState {
    id: string
    mapId: string
    objectives: MissionObjective[]
    turn: MissionTurn
    history?: MissionHistory
    overrides?: MissionStateOverrides
    deployments?: {
        required: MissionDeployment[]
        completedDeploymentIds: string[]
    }
}

export const missionStateSchema = z.object({
    id: z.string().min(1),
    mapId: z.string().min(1),
    objectives: z.array(missionObjectiveSchema),
    turn: missionTurnSchema,
    history: missionHistorySchema.optional(),
    deployments: z
        .object({
            required: z.array(missionDeploymentSchema),
            completedDeploymentIds: z.array(z.string()),
        })
        .optional(),
})

export type SerializedMissionState = {
    id: string
    mapId: string
    objectives: SerializedMissionObjective[]
    turn: SerializedMissionTurn
    history?: SerializedMissionHistory
    deployments?: {
        required: SerializedMissionDeployment[]
        completedDeploymentIds: string[]
    }
}

export interface MissionStateOverrides {
    controllerType?: {
        affiliation?: Partial<Record<TSquaddieAffiliation, TTurnControllerType>>
        squaddie?: Record<string, TTurnControllerType>
    }
    strategy?: StrategyControllerOverrides
    debugFlags?: DebugFlags
}

export const MissionStateService = {
    new: ({
        id,
        mapId,
        objectives,
        turn,
        history,
        overrides,
        deployments,
    }: {
        id: string
        mapId: string
        objectives?: MissionObjective[]
        turn?: MissionTurn
        history?: MissionHistory
        overrides?: MissionStateOverrides
        deployments?: { required: MissionDeployment[] }
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
            overrides,
            deployments: deployments
                ? {
                      required: deployments.required,
                      completedDeploymentIds: [],
                  }
                : undefined,
        }
    },

    getPendingDeployments: (
        missionState: MissionState
    ): MissionDeployment[] => {
        if (missionState.deployments == undefined) return []
        const completed = new Set(
            missionState.deployments.completedDeploymentIds
        )
        return missionState.deployments.required.filter(
            (d) => !completed.has(d.id)
        )
    },

    markDeploymentComplete: (
        missionState: MissionState,
        deploymentId: string
    ): MissionState => {
        if (missionState.deployments == undefined) return missionState
        if (
            missionState.deployments.completedDeploymentIds.includes(
                deploymentId
            )
        )
            return missionState
        return {
            ...missionState,
            deployments: {
                required: [...missionState.deployments.required],
                completedDeploymentIds: [
                    ...missionState.deployments.completedDeploymentIds,
                    deploymentId,
                ],
            },
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

    serialize: (state: MissionState): SerializedMissionState => {
        return {
            id: state.id,
            mapId: state.mapId,
            objectives: state.objectives.map(MissionObjectiveService.serialize),
            turn: MissionTurnService.serialize(state.turn),
            history: state.history
                ? MissionHistoryService.serialize(state.history)
                : undefined,
            deployments: state.deployments
                ? {
                      required: state.deployments.required.map(
                          MissionDeploymentService.serialize
                      ),
                      completedDeploymentIds: [
                          ...state.deployments.completedDeploymentIds,
                      ],
                  }
                : undefined,
        }
    },

    deserialize: (data: unknown): MissionState => {
        const result = missionStateSchema.safeParse(data)
        if (!result.success) {
            const details = result.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ")
            throw new Error(`[MissionStateService.deserialize]: ${details}`)
        }
        const parsed = result.data

        const objectives = parsed.objectives.map((obj) =>
            MissionObjectiveService.createFromJSON(obj)
        )
        const turn = MissionTurnService.createFromJSON(
            parsed.turn as Parameters<
                typeof MissionTurnService.createFromJSON
            >[0]
        )
        const history = parsed.history
            ? MissionHistoryService.createFromJSON(
                  parsed.history as Parameters<
                      typeof MissionHistoryService.createFromJSON
                  >[0]
              )
            : undefined

        return {
            id: parsed.id,
            mapId: parsed.mapId,
            objectives,
            turn,
            history,
            deployments: parsed.deployments
                ? {
                      required: parsed.deployments.required.map((d) =>
                          MissionDeploymentService.new(d)
                      ),
                      completedDeploymentIds: [
                          ...parsed.deployments.completedDeploymentIds,
                      ],
                  }
                : undefined,
        }
    },
}
