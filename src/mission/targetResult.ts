import type { TDegreeOfSuccess } from "../degreesOfSuccess/degreeOfSuccess"
import {
    type SerializedSquaddieActionResult,
    type SquaddieActionResult,
    SquaddieActionResultService,
} from "../squaddieAction/calculate/result/squaddieActionResult"

export interface TargetResult {
    degreeOfSuccess: TDegreeOfSuccess
    squaddieActionResults: SquaddieActionResult[]
    targetRoll?: [number, number]
}

export interface SerializedTargetResult {
    degreeOfSuccess: TDegreeOfSuccess
    squaddieActionResults: SerializedSquaddieActionResult[]
    targetRoll?: [number, number]
}

export const TargetResultService = {
    new: ({
        degreeOfSuccess,
        squaddieActionResults,
        targetRoll,
    }: {
        degreeOfSuccess: TDegreeOfSuccess
        squaddieActionResults: SquaddieActionResult[]
        targetRoll?: [number, number]
    }): TargetResult => {
        return {
            degreeOfSuccess,
            squaddieActionResults,
            targetRoll,
        }
    },
    serialize: (targetResult: TargetResult): SerializedTargetResult => {
        return {
            degreeOfSuccess: targetResult.degreeOfSuccess,
            squaddieActionResults: targetResult.squaddieActionResults.map(
                (result) => SquaddieActionResultService.serialize(result)
            ),
            targetRoll: targetResult.targetRoll,
        }
    },

    deserialize: (serializable: SerializedTargetResult): TargetResult => {
        return {
            degreeOfSuccess: serializable.degreeOfSuccess,
            squaddieActionResults: serializable.squaddieActionResults.map(
                (result) => SquaddieActionResultService.deserialize(result)
            ),
            targetRoll: serializable.targetRoll,
        }
    },
}
