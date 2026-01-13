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
            actions: actions.map((actionRecord) => {
                return {
                    action: { ...actionRecord.action },
                    results: actionRecord.results.map((r) => ({ ...r })),
                }
            }),
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
                ...squaddieTurnRecord.actions.map((a) => ({
                    action: { ...a.action },
                    results: a.results.map((r) => ({ ...r })),
                })),
                {
                    action: { ...action.action },
                    results: action.results.map((r) => ({ ...r })),
                },
            ],
        }
    },

    getActions: (entry: SquaddieTurnRecord): SquaddieTurnActionRecord[] => {
        throwIfSquaddieTurnRecordIsUndefined(entry, "getActions")
        return entry.actions.map((a) => ({
            action: { ...a.action },
            results: a.results.map((r) => ({ ...r })),
        }))
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
