import { z } from "zod"
import type {
    SquaddieTurnActionRecord,
    SerializedSquaddieTurnActionRecord,
} from "./squaddieTurnActionRecord.js"
import {
    SquaddieTurnActionRecordService,
    squaddieTurnActionRecordSchema,
} from "./squaddieTurnActionRecord.js"
import { SquaddieIdConverterService } from "../../squaddie/idConverterService.js"
import type { BattleSquaddieId } from "../../squaddie/inBattle/battleSquaddieId.js"

export interface SquaddieTurnRecord {
    actingBattleSquaddieId: string
    actions: SquaddieTurnActionRecord[]
}

export interface SerializedSquaddieTurnRecord {
    actingBattleSquaddieId: string
    actions: SerializedSquaddieTurnActionRecord[]
}

export const squaddieTurnRecordSchema = z.object({
    actingBattleSquaddieId: z.string(),
    actions: z.array(squaddieTurnActionRecordSchema),
})

export const SquaddieTurnRecordService = {
    new: ({
        actingBattleSquaddieId,
        actions = [],
    }: {
        actingBattleSquaddieId: BattleSquaddieId
        actions?: SquaddieTurnActionRecord[]
    }): SquaddieTurnRecord => {
        throwIfSquaddieIdIsInvalid(actingBattleSquaddieId, "new")
        return newSquaddieTurnRecordService(
            SquaddieIdConverterService.squaddieIdToKey(actingBattleSquaddieId),
            actions
        )
    },

    createFromJSON: (data: any): SquaddieTurnRecord => {
        let squaddieIdKey: string
        if (typeof data.actingBattleSquaddieId === "object") {
            squaddieIdKey = SquaddieIdConverterService.squaddieIdToKey(
                data.actingBattleSquaddieId
            )
        } else {
            squaddieIdKey = data.actingBattleSquaddieId
        }

        if (!squaddieIdKey) {
            throw new Error(
                "[SquaddieTurnRecordService.createFromJSON]: actingBattleSquaddieId must be defined"
            )
        }

        const deserializedActions = data.actions.map((action: any) =>
            SquaddieTurnActionRecordService.createFromJSON(action)
        )

        return {
            actingBattleSquaddieId: squaddieIdKey,
            actions: deserializedActions,
        }
    },

    addAction: ({
        squaddieTurnRecord,
        action,
    }: {
        squaddieTurnRecord: SquaddieTurnRecord
        action: SquaddieTurnActionRecord
    }): SquaddieTurnRecord => {
        throwIfSquaddieTurnRecordIsUndefined(squaddieTurnRecord, "addAction")

        return {
            actingBattleSquaddieId: squaddieTurnRecord.actingBattleSquaddieId,
            actions: [
                ...squaddieTurnRecord.actions.map(
                    SquaddieTurnActionRecordService.clone
                ),
                SquaddieTurnActionRecordService.clone(action),
            ],
        }
    },

    getActions: (
        squaddieTurnRecord: SquaddieTurnRecord
    ): SquaddieTurnActionRecord[] => {
        throwIfSquaddieTurnRecordIsUndefined(squaddieTurnRecord, "getActions")
        return squaddieTurnRecord.actions.map(
            SquaddieTurnActionRecordService.clone
        )
    },

    getActionCount: (entry: SquaddieTurnRecord): number => {
        throwIfSquaddieTurnRecordIsUndefined(entry, "getActionCount")
        return entry.actions.length
    },

    getActingBattleSquaddieId: (
        entry: SquaddieTurnRecord
    ): BattleSquaddieId => {
        throwIfSquaddieTurnRecordIsUndefined(entry, "getActingBattleSquaddieId")
        return SquaddieIdConverterService.keyToSquaddieId(
            entry.actingBattleSquaddieId
        )
    },
    clone: (original: SquaddieTurnRecord): SquaddieTurnRecord => {
        return newSquaddieTurnRecordService(
            original.actingBattleSquaddieId,
            original.actions
        )
    },

    serialize: (record: SquaddieTurnRecord): SerializedSquaddieTurnRecord => {
        return {
            actingBattleSquaddieId: record.actingBattleSquaddieId,
            actions: record.actions.map(
                SquaddieTurnActionRecordService.serialize
            ),
        }
    },
}

const throwIfSquaddieTurnRecordIsUndefined = (
    entry: SquaddieTurnRecord,
    callName: string
) => {
    if (entry == undefined)
        throw new Error(
            `[SquaddieTurnRecordService.${callName}]: entry must be defined`
        )
}

const throwIfSquaddieIdIsInvalid = (id: BattleSquaddieId, callName: string) => {
    if (id?.inBattleSquaddieId == undefined || !id.outOfBattleSquaddieId)
        throw new Error(
            `[SquaddieTurnRecordService.${callName}]: squaddie ID must be valid`
        )
}

const newSquaddieTurnRecordService = (
    actingBattleSquaddieId: string,
    actions: SquaddieTurnActionRecord[]
): SquaddieTurnRecord => {
    return {
        actingBattleSquaddieId,
        actions: actions.map(SquaddieTurnActionRecordService.clone),
    }
}
