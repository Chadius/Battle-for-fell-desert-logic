import type { SquaddieAction } from "../../squaddieAction/squaddieAction"
import {
    type SerializableSquaddieActionResult,
    type SquaddieActionResult,
    SquaddieActionResultService,
} from "../../squaddieAction/calculate/result/squaddieActionResult"

export interface SquaddieTurnActionRecord {
    action: {
        id: string
        name: string
    }
    results: SquaddieActionResult[]
}

export type SerializableSquaddieTurnActionRecord = Omit<
    SquaddieTurnActionRecord,
    "results"
> & {
    results: SerializableSquaddieActionResult[]
}

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
        results: SerializableSquaddieActionResult[]
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
    ): SerializableSquaddieTurnActionRecord => {
        return {
            action: { ...squaddieTurnActionRecord.action },
            results: squaddieTurnActionRecord.results.map((result) =>
                SquaddieActionResultService.serialize(result)
            ),
        }
    },
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
    result: SquaddieActionResult | SerializableSquaddieActionResult,
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
