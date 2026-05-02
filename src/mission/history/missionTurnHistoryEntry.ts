import type { TMissionAffiliationTurn } from "../missionTurn"
import type { SquaddieTurnRecord } from "./squaddieTurnRecord"
import { SquaddieTurnRecordService } from "./squaddieTurnRecord"
import {
    type SquaddieTurnActionRecord,
    SquaddieTurnActionRecordService,
} from "./squaddieTurnActionRecord"
import { SquaddieIdConverterService } from "../../squaddie/idConverterService"
import type { BattleSquaddieId } from "../../squaddie/inBattle/battleSquaddieId"

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
                actions: s.actions.map(SquaddieTurnActionRecordService.clone),
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
        throwIfTurnHistoryIsUndefined(turnHistory, "addOrUpdateSquaddieEntry")

        const existingIndex = turnHistory.squaddieTurnRecords.findIndex(
            (s) =>
                s.actingBattleSquaddieId ===
                squaddieTurnRecord.actingBattleSquaddieId
        )

        let newSquaddieEntries: SquaddieTurnRecord[]
        if (existingIndex >= 0) {
            newSquaddieEntries = [
                ...turnHistory.squaddieTurnRecords
                    .filter((_, index) => index !== existingIndex)
                    .map((s) => ({
                        actingBattleSquaddieId: s.actingBattleSquaddieId,
                        actions: s.actions.map(
                            SquaddieTurnActionRecordService.clone
                        ),
                    })),
                {
                    actingBattleSquaddieId:
                        squaddieTurnRecord.actingBattleSquaddieId,
                    actions: squaddieTurnRecord.actions.map(
                        SquaddieTurnActionRecordService.clone
                    ),
                },
            ]
        } else {
            newSquaddieEntries = [
                ...turnHistory.squaddieTurnRecords.map((s) => ({
                    actingBattleSquaddieId: s.actingBattleSquaddieId,
                    actions: s.actions.map(
                        SquaddieTurnActionRecordService.clone
                    ),
                })),
                {
                    actingBattleSquaddieId:
                        squaddieTurnRecord.actingBattleSquaddieId,
                    actions: squaddieTurnRecord.actions.map(
                        SquaddieTurnActionRecordService.clone
                    ),
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
        throwIfTurnHistoryIsUndefined(turnHistoryEntry, "getSquaddieEntry")

        const squaddieKey =
            SquaddieIdConverterService.squaddieIdToKey(squaddieId)
        return turnHistoryEntry.squaddieTurnRecords.find(
            (s) => s.actingBattleSquaddieId === squaddieKey
        )
    },

    getTotalActionCount: (entry: MissionTurnHistoryEntry): number => {
        throwIfTurnHistoryIsUndefined(entry, "getTotalActionCount")

        return entry.squaddieTurnRecords.reduce(
            (total, squaddieEntry) =>
                total + SquaddieTurnRecordService.getActionCount(squaddieEntry),
            0
        )
    },

    getTurnNumber: (entry: MissionTurnHistoryEntry): number => {
        throwIfTurnHistoryIsUndefined(entry, "getTurnNumber")
        return entry.turnNumber
    },

    getMissionAffiliationTurn: (
        entry: MissionTurnHistoryEntry
    ): TMissionAffiliationTurn => {
        throwIfTurnHistoryIsUndefined(entry, "getMissionAffiliationTurn")
        return entry.missionAffiliationTurn
    },

    getLastAction: (
        entry: MissionTurnHistoryEntry
    ): SquaddieTurnActionRecord | undefined => {
        throwIfTurnHistoryIsUndefined(entry, "getLastAction")

        for (let i = entry.squaddieTurnRecords.length - 1; i >= 0; i--) {
            const squaddieRecord = entry.squaddieTurnRecords[i]
            if (squaddieRecord.actions.length > 0) {
                const lastAction = squaddieRecord.actions.at(-1)!
                return SquaddieTurnActionRecordService.clone(lastAction)
            }
        }

        return undefined
    },

    removeLastAction: (
        missionTurnHistoryEntry: MissionTurnHistoryEntry
    ): {
        missionTurnHistoryEntry: MissionTurnHistoryEntry
        removed?: SquaddieTurnActionRecord
    } => {
        throwIfTurnHistoryIsUndefined(
            missionTurnHistoryEntry,
            "removeLastAction"
        )

        const lastSquaddieTurnActionRecord =
            MissionTurnHistoryEntryService.getLastAction(
                missionTurnHistoryEntry
            )

        if (lastSquaddieTurnActionRecord == undefined) {
            return {
                missionTurnHistoryEntry,
            }
        }

        const lastSquaddieTurnRecord =
            missionTurnHistoryEntry.squaddieTurnRecords.at(-1)
        if (lastSquaddieTurnRecord == undefined) {
            return {
                missionTurnHistoryEntry,
            }
        }

        let removedAction: SquaddieTurnActionRecord | undefined =
            lastSquaddieTurnRecord.actions.at(-1)
        if (removedAction == undefined) {
            return {
                missionTurnHistoryEntry,
            }
        }

        const newSquaddieRecords: SquaddieTurnRecord[] =
            missionTurnHistoryEntry.squaddieTurnRecords
                .slice(0, -1)
                .map((squaddieTurnRecord) => {
                    return SquaddieTurnRecordService.clone(squaddieTurnRecord)
                })

        const updatedLastTurnRecord: SquaddieTurnRecord =
            SquaddieTurnRecordService.new({
                actingBattleSquaddieId:
                    SquaddieIdConverterService.keyToSquaddieId(
                        missionTurnHistoryEntry.squaddieTurnRecords.at(-1)!
                            .actingBattleSquaddieId
                    ),
                actions: missionTurnHistoryEntry.squaddieTurnRecords
                    .at(-1)!
                    .actions.slice(0, -1),
            })
        if (updatedLastTurnRecord.actions.length > 0) {
            newSquaddieRecords.push(updatedLastTurnRecord)
        }

        return {
            missionTurnHistoryEntry: {
                turnNumber: missionTurnHistoryEntry.turnNumber,
                missionAffiliationTurn:
                    missionTurnHistoryEntry.missionAffiliationTurn,
                squaddieTurnRecords: newSquaddieRecords,
            },
            removed: removedAction,
        }
    },
}

const throwIfTurnHistoryIsUndefined = (
    turnHistory: MissionTurnHistoryEntry,
    callName: string
) => {
    if (turnHistory == undefined)
        throw new Error(
            `[MissionTurnHistoryEntryService.${callName}]: turnHistory must be defined`
        )
}
