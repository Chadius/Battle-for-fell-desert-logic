import {
    type SerializedTargetResult,
    type TargetResult,
    TargetResultService,
} from "./targetResult.js"

export interface ActionResult {
    actorRoll?: [number, number]
    actorSquaddieKey?: string
    targetResults: { [squaddieKey: string]: TargetResult }
}

export interface SerializedActionResults {
    actorRoll?: [number, number]
    actorSquaddieKey?: string
    targetResults: { [squaddieKey: string]: SerializedTargetResult }
}

export const ActionResultsService = {
    new: ({
        actorRoll,
        actorSquaddieKey,
        targetResults,
    }: {
        actorRoll?: [number, number]
        actorSquaddieKey?: string
        targetResults: { [_: string]: TargetResult }
    }): ActionResult => {
        return {
            actorRoll,
            actorSquaddieKey,
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
            actorSquaddieKey: actionResults.actorSquaddieKey,
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
            actorSquaddieKey: serializable.actorSquaddieKey,
            targetResults,
        })
    },
}
