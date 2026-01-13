import type { SquaddieTurnActionRecord } from "./squaddieTurnActionRecord"
import { SquaddieTurnActionRecordService } from "./squaddieTurnActionRecord"
import { SquaddieIdConverterService } from "../../squaddie/idConverterService"
import type { BattleSquaddieId } from "../../squaddie/inBattle/inBattleSquaddieManager"

export interface SquaddieTurnRecord {
    actingBattleSquaddieId: string
    actions: SquaddieTurnActionRecord[]
}

export const SquaddieTurnRecordService = {
    new: ({
        actingBattleSquaddieId,
        actions = [],
    }: {
        actingBattleSquaddieId: BattleSquaddieId
        actions?: SquaddieTurnActionRecord[]
    }): SquaddieTurnRecord => {
        throwIfSquaddieIdIsInvalid(actingBattleSquaddieId, "new")

        return {
            actingBattleSquaddieId: SquaddieIdConverterService.squaddieIdToKey(
                actingBattleSquaddieId
            ),
            actions: actions.map((a) => ({
                action: { ...a.action },
                result: { ...a.result },
            })),
        }
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
        entry,
        action,
    }: {
        entry: SquaddieTurnRecord
        action: SquaddieTurnActionRecord
    }): SquaddieTurnRecord => {
        throwIfEntryIsUndefined(entry, "addAction")

        return {
            actingBattleSquaddieId: entry.actingBattleSquaddieId,
            actions: [
                ...entry.actions.map((a) => ({
                    action: { ...a.action },
                    result: { ...a.result },
                })),
                { action: { ...action.action }, result: { ...action.result } },
            ],
        }
    },

    getActions: (entry: SquaddieTurnRecord): SquaddieTurnActionRecord[] => {
        throwIfEntryIsUndefined(entry, "getActions")
        return entry.actions.map((a) => ({
            action: { ...a.action },
            result: { ...a.result },
        }))
    },

    getActionCount: (entry: SquaddieTurnRecord): number => {
        throwIfEntryIsUndefined(entry, "getActionCount")
        return entry.actions.length
    },

    getActingBattleSquaddieId: (
        entry: SquaddieTurnRecord
    ): BattleSquaddieId => {
        throwIfEntryIsUndefined(entry, "getActingBattleSquaddieId")
        return SquaddieIdConverterService.keyToSquaddieId(
            entry.actingBattleSquaddieId
        )
    },
}

const throwIfEntryIsUndefined = (
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
