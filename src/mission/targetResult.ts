import type { TDegreeOfSuccess } from "../degreesOfSuccess/degreeOfSuccess"
import {
    type SerializedSquaddieActionResult,
    type SquaddieActionResult,
    SquaddieActionResultService,
} from "../squaddieAction/calculate/result/squaddieActionResult"

export interface TargetResult {
    degreeOfSuccess: TDegreeOfSuccess
    squaddieActionResults: SquaddieActionResult[]
}

export interface SerializedTargetResult {
    degreeOfSuccess: TDegreeOfSuccess
    squaddieActionResults: SerializedSquaddieActionResult[]
}

export const TargetResultService = {
    new: ({
        degreeOfSuccess,
        squaddieActionResults,
    }: {
        degreeOfSuccess: TDegreeOfSuccess
        squaddieActionResults: SquaddieActionResult[]
    }): TargetResult => {
        return {
            degreeOfSuccess,
            squaddieActionResults,
        }
    },
    serialize: (targetResult: TargetResult): SerializedTargetResult => {
        return {
            degreeOfSuccess: targetResult.degreeOfSuccess,
            squaddieActionResults: targetResult.squaddieActionResults.map(
                (result) => SquaddieActionResultService.serialize(result)
            ),
        }
    },

    deserialize: (serializable: SerializedTargetResult): TargetResult => {
        return {
            degreeOfSuccess: serializable.degreeOfSuccess,
            squaddieActionResults: serializable.squaddieActionResults.map(
                (result) => SquaddieActionResultService.deserialize(result)
            ),
        }
    },
}
