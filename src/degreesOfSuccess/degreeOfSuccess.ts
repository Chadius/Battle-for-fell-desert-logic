import type { EnumLike } from "../enum.ts"

export const DegreeOfSuccess = {
    SUCCESS: "SUCCESS",
    FAILURE: "FAILURE",
    CRITICAL: "CRITICAL",
    BOTCH: "BOTCH",
} as const satisfies Record<string, string>
export type TDegreeOfSuccess = EnumLike<typeof DegreeOfSuccess>

export const DegreeOfSuccessService = {
    getDegreeBasedOnValue: ({
        value,
        criticalIsAllowed = true,
        botchIsAllowed = true,
        failureIsAllowed = true,
    }: {
        value: number
        criticalIsAllowed?: boolean
        botchIsAllowed?: boolean
        failureIsAllowed?: boolean
    }): TDegreeOfSuccess => {
        const bands = generateValueBands({
            criticalIsAllowed,
            botchIsAllowed,
            failureIsAllowed,
        })
        return getDegreeOfSuccessBandBasedOnValue({
            value,
            bands,
        })
    },
}

type DegreeOfSuccessBands = {
    [DegreeOfSuccess.CRITICAL]?: { min: number }
    [DegreeOfSuccess.FAILURE]?: { min?: number; max: number }
    [DegreeOfSuccess.BOTCH]?: { max: number }
}

const generateValueBands = ({
    criticalIsAllowed,
    botchIsAllowed,
    failureIsAllowed,
}: {
    criticalIsAllowed: boolean
    botchIsAllowed: boolean
    failureIsAllowed: boolean
}) => {
    let bands: DegreeOfSuccessBands = {
        [DegreeOfSuccess.CRITICAL]: {
            min: 6,
        },
        [DegreeOfSuccess.FAILURE]: {
            min: -5,
            max: -1,
        },
        [DegreeOfSuccess.BOTCH]: {
            max: -6,
        },
    }

    if (!criticalIsAllowed) {
        delete bands[DegreeOfSuccess.CRITICAL]
    }
    if (!botchIsAllowed) {
        delete bands[DegreeOfSuccess.BOTCH]
        delete bands[DegreeOfSuccess.FAILURE]?.min
    }
    if (!failureIsAllowed) {
        if (bands[DegreeOfSuccess.BOTCH]) {
            if (bands[DegreeOfSuccess.FAILURE])
                bands[DegreeOfSuccess.BOTCH]!.max =
                    bands[DegreeOfSuccess.FAILURE]!.max
            else bands[DegreeOfSuccess.BOTCH]!.max = -1
        }
        delete bands[DegreeOfSuccess.FAILURE]
    }

    return bands
}

const getDegreeOfSuccessBandBasedOnValue = ({
    value,
    bands,
}: {
    value: number
    bands: DegreeOfSuccessBands
}): TDegreeOfSuccess => {
    if (
        bands[DegreeOfSuccess.CRITICAL] != undefined &&
        value >= bands[DegreeOfSuccess.CRITICAL]!.min
    ) {
        return DegreeOfSuccess.CRITICAL
    }

    if (
        bands[DegreeOfSuccess.FAILURE] != undefined &&
        value <= bands[DegreeOfSuccess.FAILURE]!.max &&
        (bands[DegreeOfSuccess.FAILURE]!.min == undefined ||
            value >= bands[DegreeOfSuccess.FAILURE]!.min!)
    ) {
        return DegreeOfSuccess.FAILURE
    }

    if (
        bands[DegreeOfSuccess.BOTCH] != undefined &&
        value <= bands[DegreeOfSuccess.BOTCH]!.max
    ) {
        return DegreeOfSuccess.BOTCH
    }

    return DegreeOfSuccess.SUCCESS
}
