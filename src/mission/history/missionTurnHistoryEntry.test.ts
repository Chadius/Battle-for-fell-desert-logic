import { beforeEach, describe, expect, it } from "vitest"
import {
    type MissionTurnHistoryEntry,
    MissionTurnHistoryEntryService,
} from "./missionTurnHistoryEntry"
import { SquaddieTurnRecordService } from "./squaddieTurnRecord"
import {
    type SquaddieTurnActionRecord,
    SquaddieTurnActionRecordService,
} from "./squaddieTurnActionRecord"
import { MissionAffiliationTurn } from "../missionTurn"
import type { SquaddieAction } from "../../squaddieAction/squaddieAction"
import type { SquaddieActionResult } from "../../squaddieAction/calculate/result/squaddieActionResult"
import { SquaddieIdConverterService } from "../../squaddie/idConverterService"

describe("MissionTurnHistoryEntryService", () => {
    describe("new", () => {
        it("creates entry with turn number and phase", () => {
            const missionTurnHistoryEntry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            })

            expect(missionTurnHistoryEntry.turnNumber).toBe(0)
            expect(missionTurnHistoryEntry.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.PLAYER_TURN
            )
            expect(missionTurnHistoryEntry.squaddieTurnRecords).toHaveLength(0)
        })

        it("creates entry with squaddie turn records", () => {
            const squaddieTurnRecord = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "outOfBattleSquaddieId",
                },
            })

            const missionTurnHistoryEntry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieTurnRecords: [squaddieTurnRecord],
            })

            expect(missionTurnHistoryEntry.squaddieTurnRecords).toHaveLength(1)
        })

        it("throws error if turn number is negative", () => {
            expect(() =>
                MissionTurnHistoryEntryService.new({
                    turnNumber: -1,
                    missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                })
            ).toThrow("turnNumber must be >= 0")
        })

        it("throws error if phase is undefined", () => {
            expect(() =>
                MissionTurnHistoryEntryService.new({
                    turnNumber: 0,
                    missionAffiliationTurn: undefined as any,
                })
            ).toThrow("missionAffiliationTurn must be defined")
        })
    })

    describe("createFromJSON", () => {
        it("deserializes entry with no squaddie turn records", () => {
            const data = {
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieTurnRecords: [],
            }

            const missionTurnHistoryEntry =
                MissionTurnHistoryEntryService.createFromJSON(data)

            expect(missionTurnHistoryEntry.turnNumber).toBe(0)
            expect(missionTurnHistoryEntry.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.PLAYER_TURN
            )
            expect(missionTurnHistoryEntry.squaddieTurnRecords).toHaveLength(0)
        })

        it("deserializes entry with squaddie turn records", () => {
            const data = {
                turnNumber: 1,
                missionAffiliationTurn: MissionAffiliationTurn.ENEMY_TURN,
                squaddieTurnRecords: [
                    {
                        actingBattleSquaddieId: "squaddieTurnRecord1+++1",
                        actions: [],
                    },
                ],
            }

            const missionTurnHistoryEntry =
                MissionTurnHistoryEntryService.createFromJSON(data)

            expect(missionTurnHistoryEntry.squaddieTurnRecords).toHaveLength(1)
        })
    })

    describe("addOrUpdateSquaddieEntry", () => {
        let missionTurnHistoryEntry: MissionTurnHistoryEntry

        beforeEach(() => {
            missionTurnHistoryEntry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            })
        })

        it("adds new squaddie MissionTurnHistoryEntry to empty list", () => {
            const squaddieEntry = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddieTurnRecord1",
                },
            })

            const updated =
                MissionTurnHistoryEntryService.addOrUpdateSquaddieTurnRecord({
                    turnHistory: missionTurnHistoryEntry,
                    squaddieTurnRecord: squaddieEntry,
                })

            expect(updated.squaddieTurnRecords).toHaveLength(1)
            expect(updated.squaddieTurnRecords[0].actingBattleSquaddieId).toBe(
                "squaddieTurnRecord1+++1"
            )
        })

        it("adds new squaddie missionTurnHistoryEntry to existing list", () => {
            const squaddieTurnRecord1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddieTurnRecord1",
                },
            })

            missionTurnHistoryEntry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieTurnRecords: [squaddieTurnRecord1],
            })

            const squaddieTurnRecord2 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 2,
                    outOfBattleSquaddieId: "squaddieTurnRecord2",
                },
            })

            const updated =
                MissionTurnHistoryEntryService.addOrUpdateSquaddieTurnRecord({
                    turnHistory: missionTurnHistoryEntry,
                    squaddieTurnRecord: squaddieTurnRecord2,
                })

            expect(updated.squaddieTurnRecords).toHaveLength(2)
            expect(updated.squaddieTurnRecords[1].actingBattleSquaddieId).toBe(
                "squaddieTurnRecord2+++2"
            )
        })

        it("updates existing squaddie missionTurnHistoryEntry", () => {
            const squaddieTurnActionRecord1 = createSquaddieTurnActionRecord1()

            const squaddieTurnRecord1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddieTurnRecord1",
                },
                actions: [squaddieTurnActionRecord1],
            })

            missionTurnHistoryEntry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieTurnRecords: [squaddieTurnRecord1],
            })

            const squaddieTurnActionRecord2 = createSquaddieTurnActionRecord2()

            const updatedSquaddie = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddieTurnRecord1",
                },
                actions: [squaddieTurnActionRecord1, squaddieTurnActionRecord2],
            })

            const updated =
                MissionTurnHistoryEntryService.addOrUpdateSquaddieTurnRecord({
                    turnHistory: missionTurnHistoryEntry,
                    squaddieTurnRecord: updatedSquaddie,
                })

            expect(updated.squaddieTurnRecords).toHaveLength(1)
            expect(updated.squaddieTurnRecords[0].actions).toHaveLength(2)
        })

        it("returns new instance without modifying original", () => {
            const squaddieEntry = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddieTurnRecord1",
                },
            })

            const updated =
                MissionTurnHistoryEntryService.addOrUpdateSquaddieTurnRecord({
                    turnHistory: missionTurnHistoryEntry,
                    squaddieTurnRecord: squaddieEntry,
                })

            expect(missionTurnHistoryEntry.squaddieTurnRecords).toHaveLength(0)
            expect(updated.squaddieTurnRecords).toHaveLength(1)
        })

        it("moves updated entry to the end so getLastAction reflects insertion order", () => {
            const action1 = SquaddieTurnActionRecordService.new({
                action: { id: "attack", name: "Attack" } as SquaddieAction,
                results: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "actor",
                    } as SquaddieActionResult,
                    {
                        inBattleSquaddieId: 2,
                        outOfBattleSquaddieId: "enemy",
                    } as SquaddieActionResult,
                ],
            })
            const action2 = SquaddieTurnActionRecordService.new({
                action: { id: "move", name: "Move" } as SquaddieAction,
                results: [
                    {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "actor",
                    } as SquaddieActionResult,
                ],
            })

            const actorRecord = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "actor",
                },
                actions: [action1],
            })
            const enemyRecord = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 2,
                    outOfBattleSquaddieId: "enemy",
                },
                actions: [action1],
            })

            // After the attack: actor is at index 0, enemy at index 1
            let entry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieTurnRecords: [actorRecord, enemyRecord],
            })

            // Actor moves: actor's record is updated and should move to the end
            const updatedActorRecord = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "actor",
                },
                actions: [action1, action2],
            })
            entry =
                MissionTurnHistoryEntryService.addOrUpdateSquaddieTurnRecord({
                    turnHistory: entry,
                    squaddieTurnRecord: updatedActorRecord,
                })

            // Actor's record should now be last, enemy's record first
            expect(entry.squaddieTurnRecords).toHaveLength(2)
            expect(
                entry.squaddieTurnRecords.at(-1)!.actingBattleSquaddieId
            ).toBe(
                SquaddieIdConverterService.squaddieIdToKey({
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "actor",
                })
            )

            // getLastAction should return the movement (actor's last action), not the attack
            const lastAction =
                MissionTurnHistoryEntryService.getLastAction(entry)
            expect(lastAction?.action.id).toBe("move")
        })

        it("throws error when missionTurnHistoryEntry is undefined", () => {
            const squaddieEntry = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddieTurnRecord1",
                },
            })

            expect(() =>
                MissionTurnHistoryEntryService.addOrUpdateSquaddieTurnRecord({
                    turnHistory: undefined as any,
                    squaddieTurnRecord: squaddieEntry,
                })
            ).toThrow("turnHistory must be defined")
        })
    })

    describe("getSquaddieTurnRecord", () => {
        let missionTurnHistoryEntry: MissionTurnHistoryEntry

        beforeEach(() => {
            const squaddieTurnRecord1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "outOfBattleSquaddieId1",
                },
            })

            const squaddieTurnRecord2 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 2,
                    outOfBattleSquaddieId: "outOfBattleSquaddieId2",
                },
            })

            missionTurnHistoryEntry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieTurnRecords: [squaddieTurnRecord1, squaddieTurnRecord2],
            })
        })

        it("finds squaddie missionTurnHistoryEntry by ID", () => {
            const found = MissionTurnHistoryEntryService.getSquaddieTurnRecord({
                turnHistoryEntry: missionTurnHistoryEntry,
                squaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "outOfBattleSquaddieId1",
                },
            })

            expect(found).toBeDefined()
            expect(found?.actingBattleSquaddieId).toBe(
                SquaddieIdConverterService.squaddieIdToKey({
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "outOfBattleSquaddieId1",
                })
            )
        })

        it("returns undefined if squaddie not found", () => {
            const found = MissionTurnHistoryEntryService.getSquaddieTurnRecord({
                turnHistoryEntry: missionTurnHistoryEntry,
                squaddieId: {
                    inBattleSquaddieId: 999,
                    outOfBattleSquaddieId: "not-found",
                },
            })

            expect(found).toBeUndefined()
        })

        it("throws error when missionTurnHistoryEntry is undefined", () => {
            expect(() =>
                MissionTurnHistoryEntryService.getSquaddieTurnRecord({
                    turnHistoryEntry: undefined as any,
                    squaddieId: {
                        inBattleSquaddieId: 1,
                        outOfBattleSquaddieId: "outOfBattleSquaddieId1",
                    },
                })
            ).toThrow("turnHistory must be defined")
        })
    })

    describe("getTotalActionCount", () => {
        it("returns 0 for turn with no squaddie turn records", () => {
            const missionTurnHistoryEntry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            })

            expect(
                MissionTurnHistoryEntryService.getTotalActionCount(
                    missionTurnHistoryEntry
                )
            ).toBe(0)
        })

        it("returns 0 for turn with squaddie turn records but no actions", () => {
            const squaddieTurnRecord1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddieTurnRecord1",
                },
            })

            const missionTurnHistoryEntry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieTurnRecords: [squaddieTurnRecord1],
            })

            expect(
                MissionTurnHistoryEntryService.getTotalActionCount(
                    missionTurnHistoryEntry
                )
            ).toBe(0)
        })

        it("sums actions across multiple squaddies", () => {
            const squaddieTurnActionRecord1 = createSquaddieTurnActionRecord1()
            const squaddieTurnActionRecord2 = createSquaddieTurnActionRecord2()

            const squaddieTurnRecord1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddieTurnRecord1",
                },
                actions: [squaddieTurnActionRecord1, squaddieTurnActionRecord2],
            })

            const squaddieTurnActionRecord3 =
                SquaddieTurnActionRecordService.new({
                    action: {
                        id: "squaddieTurnActionRecord3",
                        name: "Attack",
                    } as SquaddieAction,
                    results: [
                        {
                            inBattleSquaddieId: 2,
                            outOfBattleSquaddieId: "squaddieTurnRecord2",
                        } as SquaddieActionResult,
                    ],
                })

            const squaddieTurnRecord2 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 2,
                    outOfBattleSquaddieId: "squaddieTurnRecord2",
                },
                actions: [squaddieTurnActionRecord3],
            })

            const missionTurnHistoryEntry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieTurnRecords: [squaddieTurnRecord1, squaddieTurnRecord2],
            })

            expect(
                MissionTurnHistoryEntryService.getTotalActionCount(
                    missionTurnHistoryEntry
                )
            ).toBe(3)
        })
    })

    describe("getters", () => {
        let missionTurnHistoryEntry: MissionTurnHistoryEntry

        beforeEach(() => {
            missionTurnHistoryEntry = MissionTurnHistoryEntryService.new({
                turnNumber: 5,
                missionAffiliationTurn: MissionAffiliationTurn.ENEMY_TURN,
            })
        })

        it("getTurnNumber returns turn number", () => {
            expect(
                MissionTurnHistoryEntryService.getTurnNumber(
                    missionTurnHistoryEntry
                )
            ).toBe(5)
        })

        it("missionAffiliationTurn returns affiliation turn", () => {
            expect(
                MissionTurnHistoryEntryService.getMissionAffiliationTurn(
                    missionTurnHistoryEntry
                )
            ).toBe(MissionAffiliationTurn.ENEMY_TURN)
        })

        it("throws error when missionTurnHistoryEntry is undefined", () => {
            expect(() =>
                MissionTurnHistoryEntryService.getTurnNumber(undefined as any)
            ).toThrow("turnHistory must be defined")
        })
    })

    describe("JSON round-trip", () => {
        it("serializes and deserializes complete entry", () => {
            const squaddieTurnActionRecord1 =
                SquaddieTurnActionRecordService.new({
                    action: {
                        id: "squaddieTurnActionRecord1",
                        name: "Attack",
                    } as SquaddieAction,
                    results: [
                        {
                            inBattleSquaddieId: 1,
                            outOfBattleSquaddieId: "squaddieTurnRecord1",
                            damage: {
                                net: 10,
                                raw: 12,
                                absorbed: 2,
                                willKo: false,
                            },
                        } as SquaddieActionResult,
                    ],
                })

            const squaddieTurnRecord1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddieTurnRecord1",
                },
                actions: [squaddieTurnActionRecord1],
            })

            const missionTurnHistoryEntry = MissionTurnHistoryEntryService.new({
                turnNumber: 3,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN_END,
                squaddieTurnRecords: [squaddieTurnRecord1],
            })

            const json = JSON.stringify(missionTurnHistoryEntry)
            const parsed = JSON.parse(json)
            const deserialized =
                MissionTurnHistoryEntryService.createFromJSON(parsed)

            expect(deserialized.turnNumber).toBe(3)
            expect(deserialized.missionAffiliationTurn).toBe(
                MissionAffiliationTurn.PLAYER_TURN_END
            )
            expect(deserialized.squaddieTurnRecords).toHaveLength(1)
            expect(deserialized.squaddieTurnRecords[0].actions).toHaveLength(1)
            expect(
                deserialized.squaddieTurnRecords[0].actions[0].results[0].damage
                    ?.net
            ).toBe(10)
        })
    })

    describe("getLastAction", () => {
        it("returns undefined for turn with no squaddie records", () => {
            const missionTurnHistoryEntry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            })

            const lastAction = MissionTurnHistoryEntryService.getLastAction(
                missionTurnHistoryEntry
            )

            expect(lastAction).toBeUndefined()
        })

        it("returns undefined for turn with squaddie records but no actions", () => {
            const squaddieTurnRecord1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddieTurnRecord1",
                },
            })

            const missionTurnHistoryEntry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieTurnRecords: [squaddieTurnRecord1],
            })

            const lastAction = MissionTurnHistoryEntryService.getLastAction(
                missionTurnHistoryEntry
            )

            expect(lastAction).toBeUndefined()
        })

        it("returns last turn action for single squaddie turn record with one action", () => {
            const squaddieTurnActionRecord1 =
                SquaddieTurnActionRecordService.new({
                    action: {
                        id: "squaddieTurnActionRecord1",
                        name: "Attack",
                    } as SquaddieAction,
                    results: [
                        {
                            inBattleSquaddieId: 1,
                            outOfBattleSquaddieId: "squaddieTurnRecord1",
                        } as SquaddieActionResult,
                    ],
                })

            const squaddieTurnRecord1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddieTurnRecord1",
                },
                actions: [squaddieTurnActionRecord1],
            })

            const missionTurnHistoryEntry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieTurnRecords: [squaddieTurnRecord1],
            })

            const lastAction = MissionTurnHistoryEntryService.getLastAction(
                missionTurnHistoryEntry
            )

            expect(lastAction).toBeDefined()
            expect(lastAction?.action.id).toBe("squaddieTurnActionRecord1")
        })

        it("returns last turn action for single squaddie turn record with multiple actions", () => {
            const squaddieTurnActionRecord1 = createSquaddieTurnActionRecord1()
            const squaddieTurnActionRecord2 = createSquaddieTurnActionRecord2()
            const squaddieTurnActionRecord3 =
                SquaddieTurnActionRecordService.new({
                    action: {
                        id: "squaddieTurnActionRecord3",
                        name: "Heal",
                    } as SquaddieAction,
                    results: [
                        {
                            inBattleSquaddieId: 1,
                            outOfBattleSquaddieId: "outOfBattleSquaddieId1",
                        } as SquaddieActionResult,
                    ],
                })

            const squaddieTurnRecord1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "outOfBattleSquaddieId1",
                },
                actions: [
                    squaddieTurnActionRecord1,
                    squaddieTurnActionRecord2,
                    squaddieTurnActionRecord3,
                ],
            })

            const missionTurnHistoryEntry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieTurnRecords: [squaddieTurnRecord1],
            })

            const lastAction = MissionTurnHistoryEntryService.getLastAction(
                missionTurnHistoryEntry
            )

            expect(lastAction).toBeDefined()
            expect(lastAction?.action.id).toBe("squaddieTurnActionRecord3")
        })

        it("returns last turn action across multiple squaddie turn records", () => {
            const squaddieTurnActionRecord1 = createSquaddieTurnActionRecord1()
            const squaddieTurnActionRecord2 = createSquaddieTurnActionRecord2()

            const squaddieTurnRecord1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "outOfBattleSquaddieId1",
                },
                actions: [squaddieTurnActionRecord1],
            })

            const squaddieTurnActionRecord3 =
                SquaddieTurnActionRecordService.new({
                    action: {
                        id: "squaddieTurnActionRecord3",
                        name: "Heal",
                    } as SquaddieAction,
                    results: [
                        {
                            inBattleSquaddieId: 2,
                            outOfBattleSquaddieId: "outOfBattleSquaddieId2",
                        } as SquaddieActionResult,
                    ],
                })

            const squaddieTurnRecord2 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 2,
                    outOfBattleSquaddieId: "outOfBattleSquaddieId2",
                },
                actions: [squaddieTurnActionRecord2, squaddieTurnActionRecord3],
            })

            const missionTurnHistoryEntry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieTurnRecords: [squaddieTurnRecord1, squaddieTurnRecord2],
            })

            const lastAction = MissionTurnHistoryEntryService.getLastAction(
                missionTurnHistoryEntry
            )

            expect(lastAction).toBeDefined()
            expect(lastAction?.action.id).toBe(
                squaddieTurnActionRecord3.action.id
            )
        })

        it("throws error when entry is undefined", () => {
            expect(() =>
                MissionTurnHistoryEntryService.getLastAction(undefined as any)
            ).toThrow("turnHistory must be defined")
        })
    })

    describe("removeLastAction", () => {
        it("returns undefined for turn with no squaddie records", () => {
            const missionTurnHistoryEntry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            })

            const { removed: lastAction } =
                MissionTurnHistoryEntryService.removeLastAction(
                    missionTurnHistoryEntry
                )

            expect(lastAction).toBeUndefined()
        })

        it("returns undefined for turn with squaddie records but no actions", () => {
            const squaddieTurnRecord1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddieTurnRecord1",
                },
            })

            const entry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieTurnRecords: [squaddieTurnRecord1],
            })

            const { removed } =
                MissionTurnHistoryEntryService.removeLastAction(entry)

            expect(removed).toBeUndefined()
        })

        it("removes last action from single squaddie turn record with one action", () => {
            const squaddieTurnActionRecord = createSquaddieTurnActionRecord1()

            const squaddieTurnRecord1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddieTurnRecord1",
                },
                actions: [squaddieTurnActionRecord],
            })

            const missionTurnHistoryEntry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieTurnRecords: [squaddieTurnRecord1],
            })

            const updated = MissionTurnHistoryEntryService.removeLastAction(
                missionTurnHistoryEntry
            )

            expect(updated).toBeDefined()
            expect(
                updated?.missionTurnHistoryEntry.squaddieTurnRecords
            ).toHaveLength(0)
        })

        it("removes last action from squaddie turn record, keeps squaddie turn record with remaining actions", () => {
            const squaddieTurnActionRecord1 = createSquaddieTurnActionRecord1()
            const squaddieTurnActionRecord2 = createSquaddieTurnActionRecord2()

            const squaddieTurnRecord1 = SquaddieTurnRecordService.new({
                actingBattleSquaddieId: {
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddieTurnRecord1",
                },
                actions: [squaddieTurnActionRecord1, squaddieTurnActionRecord2],
            })

            const missionTurnHistoryEntry = MissionTurnHistoryEntryService.new({
                turnNumber: 0,
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                squaddieTurnRecords: [squaddieTurnRecord1],
            })

            const updated = MissionTurnHistoryEntryService.removeLastAction(
                missionTurnHistoryEntry
            )

            expect(updated.removed).toEqual(squaddieTurnActionRecord2)
            expect(
                updated.missionTurnHistoryEntry?.squaddieTurnRecords
            ).toHaveLength(1)
            expect(
                updated.missionTurnHistoryEntry?.squaddieTurnRecords[0].actions
            ).toHaveLength(1)
            expect(
                updated.missionTurnHistoryEntry?.squaddieTurnRecords[0]
                    .actions[0].action.id
            ).toBe(squaddieTurnActionRecord1.action.id)
        })

        it("throws error when entry is undefined", () => {
            expect(() =>
                MissionTurnHistoryEntryService.removeLastAction(
                    undefined as any
                )
            ).toThrow("turnHistory must be defined")
        })
    })
})

const createSquaddieTurnActionRecord1 = (): SquaddieTurnActionRecord => {
    return SquaddieTurnActionRecordService.new({
        action: { id: "action1", name: "Attack" } as SquaddieAction,
        results: [
            {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "outOfBattleSquaddieId",
            } as SquaddieActionResult,
        ],
    })
}

const createSquaddieTurnActionRecord2 = (): SquaddieTurnActionRecord => {
    return SquaddieTurnActionRecordService.new({
        action: { id: "action2", name: "Move" } as SquaddieAction,
        results: [
            {
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "outOfBattleSquaddieId",
            } as SquaddieActionResult,
        ],
    })
}
