import { z } from "zod"
import type { SquaddieAction } from "../../squaddieAction/squaddieAction.js"
import {
    type SerializedSquaddieActionResult,
    type SquaddieActionResult,
    squaddieActionResultSchema,
    SquaddieActionResultService,
} from "../../squaddieAction/calculate/result/squaddieActionResult.js"
import {
    SquaddieAffiliation,
    SquaddieAffiliationService,
    type TSquaddieAffiliation,
} from "../../affiliation/affiliation.js"
import {
    DegreeOfSuccess,
    type TDegreeOfSuccess,
} from "../../degreesOfSuccess/degreeOfSuccess.js"
import { SquaddieIdConverterService } from "../../squaddie/idConverterService.js"
import type { BattleSquaddieId } from "../../squaddie/inBattle/battleSquaddieId.js"

export interface SquaddieTurnActionRecord {
    action: {
        id: string
        name: string
    }
    results: SquaddieActionResult[]
    actor?: BattleSquaddieId
    sequenceNumber?: number
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
    actor: z
        .object({
            inBattleSquaddieId: z.number(),
            outOfBattleSquaddieId: z.string(),
        })
        .optional(),
    sequenceNumber: z.number().optional(),
})

export const SquaddieTurnActionRecordUndoBlockedReason = {
    NO_ACTION_TO_UNDO: "no action to undo",
    NO_RECORDED_RESULTS: "action has no recorded results",
    ACTION_TYPE_CANNOT_BE_UNDONE: "action type cannot be undone",
    ACTION_DID_NOT_SUCCEED: "action did not succeed",
    ACTION_TARGETED_ENEMIES: "action targeted enemies and cannot be reversed",
    ACTOR_IS_NOT_PLAYER_AFFILIATED:
        "action was taken by a non-player squaddie and cannot be undone by the player",
} as const

type IsPlayerAllowedToUndoInput = {
    squaddieTurnActionRecord: SquaddieTurnActionRecord
    squaddieAffiliations: Map<string, TSquaddieAffiliation>
    squaddieAction: SquaddieAction | undefined
}

export const SquaddieTurnActionRecordService = {
    new: ({
        action,
        results,
        actor,
        sequenceNumber,
    }: {
        action: SquaddieAction
        results: SquaddieActionResult[]
        actor?: BattleSquaddieId
        sequenceNumber?: number
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
            results.map((r) => SquaddieActionResultService.clone(r)),
            actor,
            sequenceNumber
        )
    },

    clone: (original: SquaddieTurnActionRecord): SquaddieTurnActionRecord => {
        return newSquaddieTurnActionRecordService(
            original.action,
            original.results,
            original.actor,
            original.sequenceNumber
        )
    },

    createFromJSON: (data: {
        action: { id: string; name: string }
        results: SerializedSquaddieActionResult[]
        actor?: BattleSquaddieId
        sequenceNumber?: number
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
            actor: data.actor ? { ...data.actor } : undefined,
            sequenceNumber: data.sequenceNumber,
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
            actor: squaddieTurnActionRecord.actor
                ? { ...squaddieTurnActionRecord.actor }
                : undefined,
            sequenceNumber: squaddieTurnActionRecord.sequenceNumber,
        }
    },

    isPlayerAllowedToUndo: (input: IsPlayerAllowedToUndoInput): string | null =>
        noRecordedResultsReason(input) ??
        actionCannotSucceedReason(input) ??
        actorIsNotPlayerAffiliatedReason(input) ??
        resultsBlockUndoReason(input),
}

const noRecordedResultsReason = ({
    squaddieTurnActionRecord,
}: IsPlayerAllowedToUndoInput): string | null =>
    squaddieTurnActionRecord.results[0] == undefined
        ? SquaddieTurnActionRecordUndoBlockedReason.NO_RECORDED_RESULTS
        : null

const actionCannotSucceedReason = ({
    squaddieAction,
}: IsPlayerAllowedToUndoInput): string | null =>
    squaddieAction?.degreesOfSuccess?.some(
        (degreeOfSuccess) =>
            degreeOfSuccess != DegreeOfSuccess.SUCCESS &&
            degreeOfSuccess != DegreeOfSuccess.CRITICAL
    )
        ? SquaddieTurnActionRecordUndoBlockedReason.ACTION_TYPE_CANNOT_BE_UNDONE
        : null

const actorIsNotPlayerAffiliatedReason = (
    input: IsPlayerAllowedToUndoInput
): string | null =>
    actorAffiliationOrThrow(input) === SquaddieAffiliation.PLAYER
        ? null
        : SquaddieTurnActionRecordUndoBlockedReason.ACTOR_IS_NOT_PLAYER_AFFILIATED

const resultsBlockUndoReason = (
    input: IsPlayerAllowedToUndoInput
): string | null => {
    const { squaddieTurnActionRecord, squaddieAffiliations } = input
    const actorResult = squaddieTurnActionRecord.results[0]
    const actorAffiliation = actorAffiliationOrThrow(input)

    for (const result of squaddieTurnActionRecord.results) {
        const degreeOfSuccess = getDegreeOfSuccess(result)
        if (
            degreeOfSuccess != undefined &&
            degreeOfSuccess !== DegreeOfSuccess.SUCCESS
        ) {
            return SquaddieTurnActionRecordUndoBlockedReason.ACTION_DID_NOT_SUCCEED
        }

        if (isSameSquaddie(result, actorResult)) continue

        const targetAffiliation = affiliationOrThrow(
            squaddieAffiliations,
            result
        )
        if (
            !SquaddieAffiliationService.areFriends({
                actor: actorAffiliation,
                target: targetAffiliation,
            })
        ) {
            return SquaddieTurnActionRecordUndoBlockedReason.ACTION_TARGETED_ENEMIES
        }
    }

    return null
}

const isSameSquaddie = (
    left: SquaddieActionResult,
    right: SquaddieActionResult
): boolean =>
    left.inBattleSquaddieId === right.inBattleSquaddieId &&
    left.outOfBattleSquaddieId === right.outOfBattleSquaddieId

const actorAffiliationOrThrow = ({
    squaddieTurnActionRecord,
    squaddieAffiliations,
}: IsPlayerAllowedToUndoInput): TSquaddieAffiliation =>
    affiliationOrThrow(
        squaddieAffiliations,
        squaddieTurnActionRecord.results[0]
    )

const affiliationOrThrow = (
    squaddieAffiliations: Map<string, TSquaddieAffiliation>,
    result: SquaddieActionResult
): TSquaddieAffiliation => {
    const squaddieKey = SquaddieIdConverterService.squaddieIdToKey(result)
    const affiliation = squaddieAffiliations.get(squaddieKey)
    if (!affiliation) {
        throw new Error(
            `[SquaddieTurnActionRecord.isPlayerAllowedToUndo]: ${squaddieKey} does not have an affiliation`
        )
    }
    return affiliation
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
    results: SquaddieActionResult[],
    actor: BattleSquaddieId | undefined,
    sequenceNumber: number | undefined
): SquaddieTurnActionRecord => {
    return {
        action: {
            id: action.id,
            name: action.name,
        },
        results: [...results],
        actor: actor ? { ...actor } : undefined,
        sequenceNumber,
    }
}
