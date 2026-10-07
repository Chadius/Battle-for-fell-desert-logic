import {
    type SerializedTargetResult,
    type TargetResult,
    TargetResultService,
} from "./targetResult.js"

export interface ActionResult {
    actionId?: string
    actorRoll?: [number, number]
    actorSquaddieKey?: string
    targetResults: { [squaddieKey: string]: TargetResult }
}

export interface SerializedActionResults {
    actionId?: string
    actorRoll?: [number, number]
    actorSquaddieKey?: string
    targetResults: { [squaddieKey: string]: SerializedTargetResult }
}

export const ActionResultsService = {
    new: ({
        actionId,
        actorRoll,
        actorSquaddieKey,
        targetResults,
    }: {
        actionId?: string
        actorRoll?: [number, number]
        actorSquaddieKey?: string
        targetResults: { [_: string]: TargetResult }
    }): ActionResult => {
        return {
            actionId,
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
            actionId: actionResults.actionId,
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
            actionId: serializable.actionId,
            actorRoll: serializable.actorRoll,
            actorSquaddieKey: serializable.actorSquaddieKey,
            targetResults,
        })
    },
}
