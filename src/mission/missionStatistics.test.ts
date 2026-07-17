import { describe, expect, it } from "vitest"
import {
    type MissionStatistics,
    MissionStatisticsService,
} from "./missionStatistics.js"

describe("MissionStatisticsService.new", () => {
    it("defaults all fields to 0", () => {
        expect(MissionStatisticsService.new()).toEqual({
            damageDealtByPlayerTeam: 0,
            damageTakenByPlayerTeam: 0,
            damageAbsorbedByPlayerTeam: 0,
            healingReceivedByPlayerTeam: 0,
            criticalHitsDealtByPlayerTeam: 0,
            criticalHitsTakenByPlayerTeam: 0,
        })
    })

    it("accepts initial values for each field", () => {
        expect(
            MissionStatisticsService.new({
                damageDealtByPlayerTeam: 1,
                damageTakenByPlayerTeam: 2,
                damageAbsorbedByPlayerTeam: 3,
                healingReceivedByPlayerTeam: 4,
                criticalHitsDealtByPlayerTeam: 5,
                criticalHitsTakenByPlayerTeam: 6,
            })
        ).toEqual({
            damageDealtByPlayerTeam: 1,
            damageTakenByPlayerTeam: 2,
            damageAbsorbedByPlayerTeam: 3,
            healingReceivedByPlayerTeam: 4,
            criticalHitsDealtByPlayerTeam: 5,
            criticalHitsTakenByPlayerTeam: 6,
        })
    })
})

type FieldCase = {
    name: string
    add: (stats: MissionStatistics, amount: number) => MissionStatistics
    set: (stats: MissionStatistics, amount: number) => MissionStatistics
    get: (stats: MissionStatistics) => number
}

const fields: FieldCase[] = [
    {
        name: "damageDealtByPlayerTeam",
        add: MissionStatisticsService.addDamageDealtByPlayerTeam,
        set: MissionStatisticsService.setDamageDealtByPlayerTeam,
        get: (stats) => stats.damageDealtByPlayerTeam,
    },
    {
        name: "damageTakenByPlayerTeam",
        add: MissionStatisticsService.addDamageTakenByPlayerTeam,
        set: MissionStatisticsService.setDamageTakenByPlayerTeam,
        get: (stats) => stats.damageTakenByPlayerTeam,
    },
    {
        name: "damageAbsorbedByPlayerTeam",
        add: MissionStatisticsService.addDamageAbsorbedByPlayerTeam,
        set: MissionStatisticsService.setDamageAbsorbedByPlayerTeam,
        get: (stats) => stats.damageAbsorbedByPlayerTeam,
    },
    {
        name: "healingReceivedByPlayerTeam",
        add: MissionStatisticsService.addHealingReceivedByPlayerTeam,
        set: MissionStatisticsService.setHealingReceivedByPlayerTeam,
        get: (stats) => stats.healingReceivedByPlayerTeam,
    },
    {
        name: "criticalHitsDealtByPlayerTeam",
        add: MissionStatisticsService.addCriticalHitsDealtByPlayerTeam,
        set: MissionStatisticsService.setCriticalHitsDealtByPlayerTeam,
        get: (stats) => stats.criticalHitsDealtByPlayerTeam,
    },
    {
        name: "criticalHitsTakenByPlayerTeam",
        add: MissionStatisticsService.addCriticalHitsTakenByPlayerTeam,
        set: MissionStatisticsService.setCriticalHitsTakenByPlayerTeam,
        get: (stats) => stats.criticalHitsTakenByPlayerTeam,
    },
]

describe.each(fields)("$name", ({ add, set, get }) => {
    it("add returns a new object with the amount added, leaving the original untouched", () => {
        const original = MissionStatisticsService.new()
        const updated = add(original, 5)

        expect(get(updated)).toBe(5)
        expect(get(original)).toBe(0)
        expect(updated).not.toBe(original)
    })

    it("add accumulates across multiple calls", () => {
        let stats = MissionStatisticsService.new()
        stats = add(stats, 3)
        stats = add(stats, 4)

        expect(get(stats)).toBe(7)
    })

    it("set overwrites the value regardless of what was there before, leaving the original untouched", () => {
        const original = add(MissionStatisticsService.new(), 10)
        const updated = set(original, 2)

        expect(get(updated)).toBe(2)
        expect(get(original)).toBe(10)
        expect(updated).not.toBe(original)
    })
})

describe("serialization", () => {
    const populated: MissionStatistics = MissionStatisticsService.new({
        damageDealtByPlayerTeam: 1,
        damageTakenByPlayerTeam: 2,
        damageAbsorbedByPlayerTeam: 3,
        healingReceivedByPlayerTeam: 4,
        criticalHitsDealtByPlayerTeam: 5,
        criticalHitsTakenByPlayerTeam: 6,
    })

    it("serialize produces a plain JSON-compatible object", () => {
        expect(MissionStatisticsService.serialize(populated)).toEqual(populated)
    })

    it("createFromJSON rebuilds the same statistics", () => {
        const serialized = MissionStatisticsService.serialize(populated)
        expect(MissionStatisticsService.createFromJSON(serialized)).toEqual(
            populated
        )
    })

    it("deserialize rebuilds the same statistics from unknown data", () => {
        const serialized = MissionStatisticsService.serialize(populated)
        expect(MissionStatisticsService.deserialize(serialized)).toEqual(
            populated
        )
    })

    it("deserialize throws a named error when data is invalid", () => {
        expect(() =>
            MissionStatisticsService.deserialize({
                damageDealtByPlayerTeam: "not a number",
            })
        ).toThrow(/\[MissionStatisticsService\.deserialize\]/)
    })
})
