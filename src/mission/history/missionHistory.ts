import { z } from "zod"
import type {
    MissionTurnHistoryEntry,
    SerializedMissionTurnHistoryEntry,
} from "./missionTurnHistoryEntry.js"
import {
    MissionTurnHistoryEntryService,
    missionTurnHistoryEntrySchema,
} from "./missionTurnHistoryEntry.js"
import {
    type SquaddieTurnActionRecord,
    SquaddieTurnActionRecordService,
} from "./squaddieTurnActionRecord.js"
import type { SquaddieTurnRecord } from "./squaddieTurnRecord.js"

export interface MissionHistory {
    turns: MissionTurnHistoryEntry[]
}

export interface SerializedMissionHistory {
    turns: SerializedMissionTurnHistoryEntry[]
}

export const missionHistorySchema = z.object({
    turns: z.array(missionTurnHistoryEntrySchema),
})

export const MissionHistoryService = {
    new: ({
        turns = [],
    }: { turns?: MissionTurnHistoryEntry[] } = {}): MissionHistory => {
        return {
            turns: turns.map((t) => ({
                turnNumber: t.turnNumber,
                missionAffiliationTurn: t.missionAffiliationTurn,
                squaddieTurnRecords: t.squaddieTurnRecords.map((s) => ({
                    actingBattleSquaddieId: s.actingBattleSquaddieId,
                    actions: s.actions.map(
                        SquaddieTurnActionRecordService.clone
                    ),
                })),
            })),
        }
    },

    serialize: (history: MissionHistory): SerializedMissionHistory => {
        return {
            turns: history.turns.map(MissionTurnHistoryEntryService.serialize),
        }
    },

    createFromJSON: (data: { turns: any[] }): MissionHistory => {
        const deserializedTurns = data.turns.map((turn) =>
            MissionTurnHistoryEntryService.createFromJSON(turn)
        )

        return MissionHistoryService.new({
            turns: deserializedTurns,
        })
    },

    addOrUpdateTurn: ({
        history,
        turnEntry,
    }: {
        history: MissionHistory
        turnEntry: MissionTurnHistoryEntry
    }): MissionHistory => {
        throwIfHistoryIsUndefined(history, "addOrUpdateTurn")

        const existingIndex = history.turns.findIndex(
            (t) => t.turnNumber === turnEntry.turnNumber
        )

        const squaddieEntriesConvert = (
            squaddieEntries: SquaddieTurnRecord[]
        ) => {
            return squaddieEntries.map((s) => ({
                actingBattleSquaddieId: s.actingBattleSquaddieId,
                actions: s.actions.map(SquaddieTurnActionRecordService.clone),
            }))
        }

        let newTurns: MissionTurnHistoryEntry[]
        if (existingIndex >= 0) {
            newTurns = history.turns.map((t, index) =>
                index === existingIndex
                    ? {
                          turnNumber: turnEntry.turnNumber,
                          missionAffiliationTurn:
                              turnEntry.missionAffiliationTurn,
                          squaddieTurnRecords: squaddieEntriesConvert(
                              turnEntry.squaddieTurnRecords
                          ),
                      }
                    : {
                          turnNumber: t.turnNumber,
                          missionAffiliationTurn: t.missionAffiliationTurn,
                          squaddieTurnRecords: squaddieEntriesConvert(
                              t.squaddieTurnRecords
                          ),
                      }
            )
        } else {
            newTurns = [
                ...history.turns.map((t) => ({
                    turnNumber: t.turnNumber,
                    missionAffiliationTurn: t.missionAffiliationTurn,
                    squaddieTurnRecords: squaddieEntriesConvert(
                        t.squaddieTurnRecords
                    ),
                })),
                {
                    turnNumber: turnEntry.turnNumber,
                    missionAffiliationTurn: turnEntry.missionAffiliationTurn,
                    squaddieTurnRecords: squaddieEntriesConvert(
                        turnEntry.squaddieTurnRecords
                    ),
                },
            ]
        }

        return { turns: newTurns }
    },

    getTurn: ({
        history,
        turnNumber,
    }: {
        history: MissionHistory
        turnNumber: number
    }): MissionTurnHistoryEntry | undefined => {
        throwIfHistoryIsUndefined(history, "getTurn")

        return history.turns.find((t) => t.turnNumber === turnNumber)
    },

    getTotalActionCount: (history: MissionHistory): number => {
        throwIfHistoryIsUndefined(history, "getTotalActionCount")

        return history.turns.reduce(
            (total, turn) =>
                total +
                MissionTurnHistoryEntryService.getTotalActionCount(turn),
            0
        )
    },

    getTurnCount: (history: MissionHistory): number => {
        throwIfHistoryIsUndefined(history, "getTurnCount")
        return history.turns.length
    },

    getActionsBySquaddieInTurn: ({
        history,
        turnNumber,
        squaddieId,
    }: {
        history: MissionHistory
        turnNumber: number
        squaddieId: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
    }): SquaddieTurnActionRecord[] | undefined => {
        throwIfHistoryIsUndefined(history, "getActionsBySquaddieInTurn")

        const turn = MissionHistoryService.getTurn({ history, turnNumber })
        if (turn == undefined) return undefined

        const squaddieEntry =
            MissionTurnHistoryEntryService.getSquaddieTurnRecord({
                turnHistoryEntry: turn,
                squaddieId,
            })
        if (squaddieEntry == undefined) return undefined

        return squaddieEntry.actions.map(SquaddieTurnActionRecordService.clone)
    },

    getActionCountInTurn: ({
        history,
        turnNumber,
    }: {
        history: MissionHistory
        turnNumber: number
    }): number | undefined => {
        throwIfHistoryIsUndefined(history, "getActionCountInTurn")

        const turn = MissionHistoryService.getTurn({ history, turnNumber })
        if (turn == undefined) return undefined

        return MissionTurnHistoryEntryService.getTotalActionCount(turn)
    },
}

const throwIfHistoryIsUndefined = (
    history: MissionHistory,
    callName: string
) => {
    if (history == undefined)
        throw new Error(
            `[MissionHistoryService.${callName}]: history must be defined`
        )
}
