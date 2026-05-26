import { z } from "zod"
import type { SquaddieAction } from "../../squaddieAction/squaddieAction"
import {
    type SerializedSquaddieActionResult,
    type SquaddieActionResult,
    SquaddieActionResultService,
    squaddieActionResultSchema,
} from "../../squaddieAction/calculate/result/squaddieActionResult"
import {
    SquaddieAffiliationService,
    type TSquaddieAffiliation,
} from "../../affiliation/affiliation"
import {
    DegreeOfSuccess,
    type TDegreeOfSuccess,
} from "../../degreesOfSuccess/degreeOfSuccess"
import { SquaddieIdConverterService } from "../../squaddie/idConverterService"

export interface SquaddieTurnActionRecord {
    action: {
        id: string
        name: string
    }
    results: SquaddieActionResult[]
}

export type SerializedSquaddieTurnActionRecord = Omit<
    SquaddieTurnActionRecord,
    "results"
> & {
    results: SerializedSquaddieActionResult[]
}

export const squaddieTurnActionRecordSchema = z.object({
    action: z.object({ id: z.string(), name: z.string() }),
    results: z.array(squaddieActionResultSchema),
})

export const SquaddieTurnActionRecordService = {
    new: ({
        action,
        results,
    }: {
        action: SquaddieAction
        results: SquaddieActionResult[]
    }): SquaddieTurnActionRecord => {
        throwIfActionDataIsInvalid(action, "new")

        if (!results || results.length === 0) {
            throw new Error(
                "[SquaddieTurnActionRecordService.new]: results must have at least one entry"
            )
        }

        results.forEach((result) => {
            throwIfResultIsInvalid(result, "new")
        })
        return newSquaddieTurnActionRecordService(
            action,
            results.map((r) => SquaddieActionResultService.clone(r))
        )
    },

    clone: (original: SquaddieTurnActionRecord): SquaddieTurnActionRecord => {
        return newSquaddieTurnActionRecordService(
            original.action,
            original.results
        )
    },

    createFromJSON: (data: {
        action: { id: string; name: string }
        results: SerializedSquaddieActionResult[]
    }): SquaddieTurnActionRecord => {
        throwIfActionDataIsInvalid(data.action, "createFromJSON")

        if (!data.results || data.results.length === 0) {
            throw new Error(
                "[SquaddieTurnActionRecordService.createFromJSON]: results must have at least one entry"
            )
        }

        data.results.forEach((result) => {
            throwIfResultIsInvalid(result, "createFromJSON")
        })

        return {
            action: { ...data.action },
            results: data.results.map((result) =>
                SquaddieActionResultService.deserialize(result)
            ),
        }
    },

    getActionId: (entry: SquaddieTurnActionRecord): string => {
        throwIfEntryIsUndefined(entry, "getActionId")
        return entry.action.id
    },

    getActionName: (entry: SquaddieTurnActionRecord): string => {
        throwIfEntryIsUndefined(entry, "getActionName")
        return entry.action.name
    },

    getResults: (entry: SquaddieTurnActionRecord): SquaddieActionResult[] => {
        throwIfEntryIsUndefined(entry, "getResults")
        return entry.results.map((result) =>
            SquaddieActionResultService.clone(result)
        )
    },

    serialize: (
        squaddieTurnActionRecord: SquaddieTurnActionRecord
    ): SerializedSquaddieTurnActionRecord => {
        return {
            action: { ...squaddieTurnActionRecord.action },
            results: squaddieTurnActionRecord.results.map((result) =>
                SquaddieActionResultService.serialize(result)
            ),
        }
    },

    isPlayerAllowedToUndo: ({
        squaddieTurnActionRecord,
        squaddieAffiliations,
        squaddieAction,
    }: {
        squaddieTurnActionRecord: SquaddieTurnActionRecord
        squaddieAffiliations: Map<string, TSquaddieAffiliation>
        squaddieAction: SquaddieAction | undefined
    }): string | null => {
        const actorResult = squaddieTurnActionRecord.results[0]
        if (!actorResult) return "action has no recorded results"

        if (
            squaddieAction?.degreesOfSuccess?.some(
                (d) =>
                    d != DegreeOfSuccess.SUCCESS &&
                    d != DegreeOfSuccess.CRITICAL
            )
        )
            return "action type cannot be undone"

        const actorAffiliation = squaddieAffiliations.get(
            SquaddieIdConverterService.squaddieIdToKey(actorResult)
        )
        if (!actorAffiliation) {
            throw new Error(
                `[SquaddieTurnActionRecord.isPlayerAllowedToUndo]: ${SquaddieIdConverterService.squaddieIdToKey(actorResult)} does not have an affiliation`
            )
        }

        for (const result of squaddieTurnActionRecord.results) {
            const degreeOfSuccess = getDegreeOfSuccess(result)
            if (
                degreeOfSuccess != undefined &&
                degreeOfSuccess !== DegreeOfSuccess.SUCCESS
            ) {
                return "action did not succeed"
            }

            if (
                result.inBattleSquaddieId !== actorResult.inBattleSquaddieId ||
                result.outOfBattleSquaddieId !==
                    actorResult.outOfBattleSquaddieId
            ) {
                const targetAffiliation = squaddieAffiliations.get(
                    SquaddieIdConverterService.squaddieIdToKey(result)
                )

                if (!targetAffiliation) {
                    throw new Error(
                        `[SquaddieTurnActionRecord.isPlayerAllowedToUndo]: ${SquaddieIdConverterService.squaddieIdToKey(result)} does not have an affiliation`
                    )
                }

                if (
                    !SquaddieAffiliationService.areFriends({
                        actor: actorAffiliation,
                        target: targetAffiliation,
                    })
                ) {
                    return "action targeted enemies and cannot be reversed"
                }
            }
        }

        return null
    },
}

const getDegreeOfSuccess = (
    result: SquaddieActionResult
): TDegreeOfSuccess | undefined => {
    const extendedResult = result as SquaddieActionResult & {
        degreeOfSuccess?: TDegreeOfSuccess
    }
    return extendedResult.degreeOfSuccess
}

const throwIfEntryIsUndefined = (
    entry: SquaddieTurnActionRecord,
    callName: string
) => {
    if (entry == undefined)
        throw new Error(
            `[ActionHistoryEntryService.${callName}]: entry must be defined`
        )
}

const throwIfActionDataIsInvalid = (
    action: { id: string; name: string },
    callName: string
) => {
    if (action?.id == undefined || action?.name == undefined)
        throw new Error(
            `[ActionHistoryEntryService.${callName}]: action must have id and name`
        )
}

const throwIfResultIsInvalid = (
    result: SquaddieActionResult | SerializedSquaddieActionResult,
    callName: string
) => {
    if (
        result?.inBattleSquaddieId == undefined ||
        result?.outOfBattleSquaddieId == undefined
    )
        throw new Error(
            `[ActionHistoryEntryService.${callName}]: result must have squaddie IDs`
        )
}

const newSquaddieTurnActionRecordService = (
    action: { id: string; name: string },
    results: SquaddieActionResult[]
): SquaddieTurnActionRecord => {
    return {
        action: {
            id: action.id,
            name: action.name,
        },
        results: [...results],
    }
}
