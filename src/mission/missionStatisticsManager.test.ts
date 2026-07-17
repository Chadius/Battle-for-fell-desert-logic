import { describe, expect, it } from "vitest"
import { MissionStatisticsManager } from "./missionStatisticsManager.js"
import { MissionStatisticsService } from "./missionStatistics.js"

describe("construction", () => {
    it("defaults to zeroed statistics when none are provided", () => {
        const manager = new MissionStatisticsManager()
        expect(manager.getStatistics()).toEqual(MissionStatisticsService.new())
    })

    it("accepts initial statistics", () => {
        const initial = MissionStatisticsService.new({
            damageDealtByPlayerTeam: 9,
        })
        const manager = new MissionStatisticsManager(initial)
        expect(manager.getStatistics()).toEqual(initial)
    })
})

describe("resetting statistics", () => {
    it("returns all fields to zero", () => {
        const manager = new MissionStatisticsManager(
            MissionStatisticsService.new({ damageDealtByPlayerTeam: 9 })
        )
        manager.create()
        expect(manager.getStatistics()).toEqual(MissionStatisticsService.new())
    })
})

type FieldCase = {
    name: string
    add: (manager: MissionStatisticsManager, amount: number) => void
    set: (manager: MissionStatisticsManager, amount: number) => void
    get: (manager: MissionStatisticsManager) => number
}

const fields: FieldCase[] = [
    {
        name: "damageDealtByPlayerTeam",
        add: (manager, amount) => manager.addDamageDealtByPlayerTeam(amount),
        set: (manager, amount) => manager.setDamageDealtByPlayerTeam(amount),
        get: (manager) => manager.getDamageDealtByPlayerTeam(),
    },
    {
        name: "damageTakenByPlayerTeam",
        add: (manager, amount) => manager.addDamageTakenByPlayerTeam(amount),
        set: (manager, amount) => manager.setDamageTakenByPlayerTeam(amount),
        get: (manager) => manager.getDamageTakenByPlayerTeam(),
    },
    {
        name: "damageAbsorbedByPlayerTeam",
        add: (manager, amount) => manager.addDamageAbsorbedByPlayerTeam(amount),
        set: (manager, amount) => manager.setDamageAbsorbedByPlayerTeam(amount),
        get: (manager) => manager.getDamageAbsorbedByPlayerTeam(),
    },
    {
        name: "healingReceivedByPlayerTeam",
        add: (manager, amount) =>
            manager.addHealingReceivedByPlayerTeam(amount),
        set: (manager, amount) =>
            manager.setHealingReceivedByPlayerTeam(amount),
        get: (manager) => manager.getHealingReceivedByPlayerTeam(),
    },
    {
        name: "criticalHitsDealtByPlayerTeam",
        add: (manager, amount) =>
            manager.addCriticalHitsDealtByPlayerTeam(amount),
        set: (manager, amount) =>
            manager.setCriticalHitsDealtByPlayerTeam(amount),
        get: (manager) => manager.getCriticalHitsDealtByPlayerTeam(),
    },
    {
        name: "criticalHitsTakenByPlayerTeam",
        add: (manager, amount) =>
            manager.addCriticalHitsTakenByPlayerTeam(amount),
        set: (manager, amount) =>
            manager.setCriticalHitsTakenByPlayerTeam(amount),
        get: (manager) => manager.getCriticalHitsTakenByPlayerTeam(),
    },
]

describe.each(fields)("$name", ({ add, set, get }) => {
    it("starts at 0", () => {
        const manager = new MissionStatisticsManager()
        expect(get(manager)).toBe(0)
    })

    it("add accumulates across multiple calls", () => {
        const manager = new MissionStatisticsManager()
        add(manager, 3)
        add(manager, 4)
        expect(get(manager)).toBe(7)
    })

    it("set overwrites the value regardless of what was there before", () => {
        const manager = new MissionStatisticsManager()
        add(manager, 10)
        set(manager, 2)
        expect(get(manager)).toBe(2)
    })

    it("keeps a value read before an update unaffected by a later update", () => {
        const manager = new MissionStatisticsManager()
        const valueBefore = get(manager)

        add(manager, 1)

        expect(valueBefore).toBe(0)
    })
})

describe("serialization", () => {
    it("serialize produces the current statistics as plain data", () => {
        const manager = new MissionStatisticsManager()
        manager.addDamageDealtByPlayerTeam(5)

        expect(manager.serialize()).toEqual({
            damageDealtByPlayerTeam: 5,
            damageTakenByPlayerTeam: 0,
            damageAbsorbedByPlayerTeam: 0,
            healingReceivedByPlayerTeam: 0,
            criticalHitsDealtByPlayerTeam: 0,
            criticalHitsTakenByPlayerTeam: 0,
        })
    })

    it("deserialize rebuilds a manager with the same statistics", () => {
        const manager = new MissionStatisticsManager()
        manager.addDamageDealtByPlayerTeam(5)
        manager.addCriticalHitsDealtByPlayerTeam(1)

        const rebuilt = MissionStatisticsManager.deserialize(
            manager.serialize()
        )

        expect(rebuilt.getStatistics()).toEqual(manager.getStatistics())
    })

    it("deserialize throws a named error when data is invalid", () => {
        expect(() =>
            MissionStatisticsManager.deserialize({
                damageDealtByPlayerTeam: "not a number",
            })
        ).toThrow(/\[MissionStatisticsService\.deserialize\]/)
    })
})
