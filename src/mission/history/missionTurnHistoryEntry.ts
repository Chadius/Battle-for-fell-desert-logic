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
        squaddieTurnRecords = [],
    }: {
        turnNumber: number
        missionAffiliationTurn: TMissionAffiliationTurn
        squaddieTurnRecords?: SquaddieTurnRecord[]
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
            squaddieTurnRecords: squaddieTurnRecords.map((s) => ({
                actingBattleSquaddieId: s.actingBattleSquaddieId,
                actions: s.actions.map((a) => ({
                    action: { ...a.action },
                    results: a.results.map((r) => ({ ...r })),
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
            squaddieTurnRecords: deserializedSquaddieEntries,
        })
    },

    addOrUpdateSquaddieTurnRecord: ({
        turnHistory,
        squaddieTurnRecord,
    }: {
        turnHistory: MissionTurnHistoryEntry
        squaddieTurnRecord: SquaddieTurnRecord
    }): MissionTurnHistoryEntry => {
        throwIfEntryIsUndefined(turnHistory, "addOrUpdateSquaddieEntry")

        const existingIndex = turnHistory.squaddieTurnRecords.findIndex(
            (s) =>
                s.actingBattleSquaddieId ===
                squaddieTurnRecord.actingBattleSquaddieId
        )

        const convertSquaddieActions = (
            actions: SquaddieTurnActionRecord[]
        ) => {
            return actions.map((a) => ({
                action: { ...a.action },
                results: a.results.map((r) => ({ ...r })),
            }))
        }

        let newSquaddieEntries: SquaddieTurnRecord[]
        if (existingIndex >= 0) {
            newSquaddieEntries = turnHistory.squaddieTurnRecords.map(
                (s, index) =>
                    index === existingIndex
                        ? {
                              actingBattleSquaddieId:
                                  squaddieTurnRecord.actingBattleSquaddieId,
                              actions: convertSquaddieActions(
                                  squaddieTurnRecord.actions
                              ),
                          }
                        : {
                              actingBattleSquaddieId: s.actingBattleSquaddieId,
                              actions: convertSquaddieActions(s.actions),
                          }
            )
        } else {
            newSquaddieEntries = [
                ...turnHistory.squaddieTurnRecords.map((s) => ({
                    actingBattleSquaddieId: s.actingBattleSquaddieId,
                    actions: convertSquaddieActions(s.actions),
                })),
                {
                    actingBattleSquaddieId:
                        squaddieTurnRecord.actingBattleSquaddieId,
                    actions: convertSquaddieActions(squaddieTurnRecord.actions),
                },
            ]
        }

        return {
            turnNumber: turnHistory.turnNumber,
            missionAffiliationTurn: turnHistory.missionAffiliationTurn,
            squaddieTurnRecords: newSquaddieEntries,
        }
    },

    getSquaddieTurnRecord: ({
        turnHistoryEntry,
        squaddieId,
    }: {
        turnHistoryEntry: MissionTurnHistoryEntry
        squaddieId: BattleSquaddieId
    }): SquaddieTurnRecord | undefined => {
        throwIfEntryIsUndefined(turnHistoryEntry, "getSquaddieEntry")

        const squaddieKey =
            SquaddieIdConverterService.squaddieIdToKey(squaddieId)
        return turnHistoryEntry.squaddieTurnRecords.find(
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
