import {
    type SerializableTargetResult,
    type TargetResult,
    TargetResultService,
} from "./targetResult"

export interface ActionResult {
    actorRoll: [number, number]
    targetResults: { [squaddieKey: string]: TargetResult }
}

export interface SerializableActionResults {
    actorRoll: [number, number]
    targetResults: { [squaddieKey: string]: SerializableTargetResult }
}

export const ActionResultsService = {
    new: ({
        actorRoll,
        targetResults,
    }: {
        actorRoll: [number, number]
        targetResults: { [_: string]: TargetResult }
    }): ActionResult => {
        return {
            actorRoll,
            targetResults,
        }
    },
    serialize: (actionResults: ActionResult): SerializableActionResults => {
        const serializedTargetResults: {
            [squaddieKey: string]: SerializableTargetResult
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

    deserialize: (serializable: SerializableActionResults): ActionResult => {
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
