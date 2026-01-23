import type { TDegreeOfSuccess } from "../degreesOfSuccess/degreeOfSuccess"
import {
    type SerializableSquaddieActionResult,
    type SquaddieActionResult,
    SquaddieActionResultService,
} from "../squaddieAction/calculate/result/squaddieActionResult"

export interface TargetResult {
    degreeOfSuccess: TDegreeOfSuccess
    squaddieActionResults: SquaddieActionResult[]
}

export interface SerializableTargetResult {
    degreeOfSuccess: TDegreeOfSuccess
    squaddieActionResults: SerializableSquaddieActionResult[]
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
    serialize: (targetResult: TargetResult): SerializableTargetResult => {
        return {
            degreeOfSuccess: targetResult.degreeOfSuccess,
            squaddieActionResults: targetResult.squaddieActionResults.map(
                (result) => SquaddieActionResultService.serialize(result)
            ),
        }
    },

    deserialize: (serializable: SerializableTargetResult): TargetResult => {
        return {
            degreeOfSuccess: serializable.degreeOfSuccess,
            squaddieActionResults: serializable.squaddieActionResults.map(
                (result) => SquaddieActionResultService.deserialize(result)
            ),
        }
    },
}
