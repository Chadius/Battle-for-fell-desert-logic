import { z } from "zod"
import type { TMissionAffiliationTurn } from "../missionTurn.js"
import type {
    SquaddieTurnRecord,
    SerializedSquaddieTurnRecord,
} from "./squaddieTurnRecord.js"
import {
    SquaddieTurnRecordService,
    squaddieTurnRecordSchema,
} from "./squaddieTurnRecord.js"
import {
    type SquaddieTurnActionRecord,
    SquaddieTurnActionRecordService,
} from "./squaddieTurnActionRecord.js"
import { SquaddieIdConverterService } from "../../squaddie/idConverterService.js"
import type { BattleSquaddieId } from "../../squaddie/inBattle/battleSquaddieId.js"

export interface MissionTurnHistoryEntry {
    turnNumber: number
    missionAffiliationTurn: TMissionAffiliationTurn
    squaddieTurnRecords: SquaddieTurnRecord[]
}

export interface SerializedMissionTurnHistoryEntry {
    turnNumber: number
    missionAffiliationTurn: string
    squaddieTurnRecords: SerializedSquaddieTurnRecord[]
}

export const missionTurnHistoryEntrySchema = z.object({
    turnNumber: z.number(),
    missionAffiliationTurn: z.string(),
    squaddieTurnRecords: z.array(squaddieTurnRecordSchema),
})

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

        const lastAction = MissionTurnHistoryEntryService.getLastAction(
            missionTurnHistoryEntry
        )
        if (lastAction == undefined) {
            return { missionTurnHistoryEntry }
        }

        const lastSquaddieTurnRecord =
            missionTurnHistoryEntry.squaddieTurnRecords.at(-1)
        if (
            lastSquaddieTurnRecord == undefined ||
            lastSquaddieTurnRecord.actions.length === 0
        ) {
            return { missionTurnHistoryEntry }
        }

        const newSquaddieRecords: SquaddieTurnRecord[] =
            missionTurnHistoryEntry.squaddieTurnRecords
                .map((squaddieTurnRecord) =>
                    removeMatchingLastActionFromRecord({
                        squaddieTurnRecord,
                        isLastTurnRecord:
                            squaddieTurnRecord === lastSquaddieTurnRecord,
                        targetSequenceNumber: lastAction.sequenceNumber,
                    })
                )
                .filter(
                    (
                        squaddieTurnRecord
                    ): squaddieTurnRecord is SquaddieTurnRecord =>
                        squaddieTurnRecord != undefined
                )

        return {
            missionTurnHistoryEntry: {
                turnNumber: missionTurnHistoryEntry.turnNumber,
                missionAffiliationTurn:
                    missionTurnHistoryEntry.missionAffiliationTurn,
                squaddieTurnRecords: newSquaddieRecords,
            },
            removed: lastAction,
        }
    },

    serialize: (
        entry: MissionTurnHistoryEntry
    ): SerializedMissionTurnHistoryEntry => {
        return {
            turnNumber: entry.turnNumber,
            missionAffiliationTurn: entry.missionAffiliationTurn,
            squaddieTurnRecords: entry.squaddieTurnRecords.map(
                SquaddieTurnRecordService.serialize
            ),
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

const removeMatchingLastActionFromRecord = ({
    squaddieTurnRecord,
    isLastTurnRecord,
    targetSequenceNumber,
}: {
    squaddieTurnRecord: SquaddieTurnRecord
    isLastTurnRecord: boolean
    targetSequenceNumber: number | undefined
}): SquaddieTurnRecord | undefined => {
    if (
        !bucketRecordedTheSameAction({
            squaddieTurnRecord,
            isLastTurnRecord,
            targetSequenceNumber,
        })
    ) {
        return SquaddieTurnRecordService.clone(squaddieTurnRecord)
    }

    const remainingActions = squaddieTurnRecord.actions.slice(0, -1)
    if (remainingActions.length === 0) {
        return undefined
    }

    return SquaddieTurnRecordService.new({
        actingBattleSquaddieId: SquaddieIdConverterService.keyToSquaddieId(
            squaddieTurnRecord.actingBattleSquaddieId
        ),
        actions: remainingActions,
    })
}

const bucketRecordedTheSameAction = ({
    squaddieTurnRecord,
    isLastTurnRecord,
    targetSequenceNumber,
}: {
    squaddieTurnRecord: SquaddieTurnRecord
    isLastTurnRecord: boolean
    targetSequenceNumber: number | undefined
}): boolean => {
    if (targetSequenceNumber == undefined) {
        return isLastTurnRecord
    }

    const lastActionInBucket = squaddieTurnRecord.actions.at(-1)
    return lastActionInBucket?.sequenceNumber === targetSequenceNumber
}
