import {
    type SerializedTargetResult,
    type TargetResult,
    TargetResultService,
} from "./targetResult"

export interface ActionResult {
    actorRoll?: [number, number]
    targetResults: { [squaddieKey: string]: TargetResult }
}

export interface SerializedActionResults {
    actorRoll?: [number, number]
    targetResults: { [squaddieKey: string]: SerializedTargetResult }
}

export const ActionResultsService = {
    new: ({
        actorRoll,
        targetResults,
    }: {
        actorRoll?: [number, number]
        targetResults: { [_: string]: TargetResult }
    }): ActionResult => {
        return {
            actorRoll,
            targetResults,
        }
    },
    serialize: (actionResults: ActionResult): SerializedActionResults => {
        const serializedTargetResults: {
            [squaddieKey: string]: SerializedTargetResult
        } = {}

        for (const [key, targetResult] of Object.entries(
            actionResults.targetResults
        )) {
            serializedTargetResults[key] =
                TargetResultService.serialize(targetResult)
        }

        return {
            actorRoll: actionResults.actorRoll,
            targetResults: serializedTargetResults,
        }
    },

    deserialize: (serializable: SerializedActionResults): ActionResult => {
        const targetResults: { [squaddieKey: string]: TargetResult } = {}

        for (const [key, serializedTargetResult] of Object.entries(
            serializable.targetResults
        )) {
            targetResults[key] = TargetResultService.deserialize(
                serializedTargetResult
            )
        }

        return ActionResultsService.new({
            actorRoll: serializable.actorRoll,
            targetResults,
        })
    },
}
