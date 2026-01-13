import type { TMissionAffiliationTurn } from "../missionTurn"
import type { SquaddieTurnRecord } from "./squaddieTurnRecord"
import { SquaddieTurnRecordService } from "./squaddieTurnRecord"
import type { SquaddieTurnActionRecord } from "./squaddieTurnActionRecord"
import { SquaddieIdConverterService } from "../../squaddie/idConverterService"
import type { BattleSquaddieId } from "../../squaddie/inBattle/inBattleSquaddieManager"

export interface MissionTurnHistoryEntry {
    turnNumber: number
    missionAffiliationTurn: TMissionAffiliationTurn
    squaddieTurnRecords: SquaddieTurnRecord[]
}

export const MissionTurnHistoryEntryService = {
    new: ({
        turnNumber,
        missionAffiliationTurn,
        squaddieEntries = [],
    }: {
        turnNumber: number
        missionAffiliationTurn: TMissionAffiliationTurn
        squaddieEntries?: SquaddieTurnRecord[]
    }): MissionTurnHistoryEntry => {
        if (turnNumber == undefined || turnNumber < 0) {
            throw new Error(
                "[MissionTurnHistoryEntryService.new]: turnNumber must be >= 0"
            )
        }

        if (missionAffiliationTurn == undefined) {
            throw new Error(
                "[MissionTurnHistoryEntryService.new]: missionAffiliationTurn must be defined"
            )
        }

        return {
            turnNumber,
            missionAffiliationTurn: missionAffiliationTurn,
            squaddieTurnRecords: squaddieEntries.map((s) => ({
                actingBattleSquaddieId: s.actingBattleSquaddieId,
                actions: s.actions.map((a) => ({
                    action: { ...a.action },
                    result: { ...a.result },
                })),
            })),
        }
    },

    createFromJSON: (data: {
        turnNumber: number
        missionAffiliationTurn: TMissionAffiliationTurn
        squaddieTurnRecords: any[]
    }): MissionTurnHistoryEntry => {
        const deserializedSquaddieEntries = data.squaddieTurnRecords.map(
            (squaddieEntry) =>
                SquaddieTurnRecordService.createFromJSON(squaddieEntry)
        )

        return MissionTurnHistoryEntryService.new({
            turnNumber: data.turnNumber,
            missionAffiliationTurn: data.missionAffiliationTurn,
            squaddieEntries: deserializedSquaddieEntries,
        })
    },

    addOrUpdateSquaddieEntry: ({
        entry,
        squaddieEntry,
    }: {
        entry: MissionTurnHistoryEntry
        squaddieEntry: SquaddieTurnRecord
    }): MissionTurnHistoryEntry => {
        throwIfEntryIsUndefined(entry, "addOrUpdateSquaddieEntry")

        const existingIndex = entry.squaddieTurnRecords.findIndex(
            (s) =>
                s.actingBattleSquaddieId ===
                squaddieEntry.actingBattleSquaddieId
        )

        const convertSquaddieActions = (
            actions: SquaddieTurnActionRecord[]
        ) => {
            return actions.map((a) => ({
                action: { ...a.action },
                result: { ...a.result },
            }))
        }

        let newSquaddieEntries: SquaddieTurnRecord[]
        if (existingIndex >= 0) {
            newSquaddieEntries = entry.squaddieTurnRecords.map((s, index) =>
                index === existingIndex
                    ? {
                          actingBattleSquaddieId:
                              squaddieEntry.actingBattleSquaddieId,
                          actions: convertSquaddieActions(
                              squaddieEntry.actions
                          ),
                      }
                    : {
                          actingBattleSquaddieId: s.actingBattleSquaddieId,
                          actions: convertSquaddieActions(s.actions),
                      }
            )
        } else {
            newSquaddieEntries = [
                ...entry.squaddieTurnRecords.map((s) => ({
                    actingBattleSquaddieId: s.actingBattleSquaddieId,
                    actions: convertSquaddieActions(s.actions),
                })),
                {
                    actingBattleSquaddieId:
                        squaddieEntry.actingBattleSquaddieId,
                    actions: convertSquaddieActions(squaddieEntry.actions),
                },
            ]
        }

        return {
            turnNumber: entry.turnNumber,
            missionAffiliationTurn: entry.missionAffiliationTurn,
            squaddieTurnRecords: newSquaddieEntries,
        }
    },

    getSquaddieTurnRecord: ({
        entry,
        squaddieId,
    }: {
        entry: MissionTurnHistoryEntry
        squaddieId: BattleSquaddieId
    }): SquaddieTurnRecord | undefined => {
        throwIfEntryIsUndefined(entry, "getSquaddieEntry")

        const squaddieKey =
            SquaddieIdConverterService.squaddieIdToKey(squaddieId)
        return entry.squaddieTurnRecords.find(
            (s) => s.actingBattleSquaddieId === squaddieKey
        )
    },

    getTotalActionCount: (entry: MissionTurnHistoryEntry): number => {
        throwIfEntryIsUndefined(entry, "getTotalActionCount")

        return entry.squaddieTurnRecords.reduce(
            (total, squaddieEntry) =>
                total + SquaddieTurnRecordService.getActionCount(squaddieEntry),
            0
        )
    },

    getTurnNumber: (entry: MissionTurnHistoryEntry): number => {
        throwIfEntryIsUndefined(entry, "getTurnNumber")
        return entry.turnNumber
    },

    getMissionAffiliationTurn: (
        entry: MissionTurnHistoryEntry
    ): TMissionAffiliationTurn => {
        throwIfEntryIsUndefined(entry, "getMissionAffiliationTurn")
        return entry.missionAffiliationTurn
    },
}

const throwIfEntryIsUndefined = (
    entry: MissionTurnHistoryEntry,
    callName: string
) => {
    if (entry == undefined)
        throw new Error(
            `[MissionTurnHistoryEntryService.${callName}]: entry must be defined`
        )
}
