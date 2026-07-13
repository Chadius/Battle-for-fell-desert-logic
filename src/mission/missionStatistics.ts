import { z } from "zod"

export interface MissionStatistics {
    damageDealtByPlayerTeam: number
    damageTakenByPlayerTeam: number
    damageAbsorbedByPlayerTeam: number
    healingReceivedByPlayerTeam: number
    criticalHitsDealtByPlayerTeam: number
    criticalHitsTakenByPlayerTeam: number
}

export const missionStatisticsSchema = z.object({
    damageDealtByPlayerTeam: z.number(),
    damageTakenByPlayerTeam: z.number(),
    damageAbsorbedByPlayerTeam: z.number(),
    healingReceivedByPlayerTeam: z.number(),
    criticalHitsDealtByPlayerTeam: z.number(),
    criticalHitsTakenByPlayerTeam: z.number(),
})

export type SerializedMissionStatistics = z.infer<
    typeof missionStatisticsSchema
>

export const MissionStatisticsService = {
    new: ({
        damageDealtByPlayerTeam,
        damageTakenByPlayerTeam,
        damageAbsorbedByPlayerTeam,
        healingReceivedByPlayerTeam,
        criticalHitsDealtByPlayerTeam,
        criticalHitsTakenByPlayerTeam,
    }: {
        damageDealtByPlayerTeam?: number
        damageTakenByPlayerTeam?: number
        damageAbsorbedByPlayerTeam?: number
        healingReceivedByPlayerTeam?: number
        criticalHitsDealtByPlayerTeam?: number
        criticalHitsTakenByPlayerTeam?: number
    } = {}): MissionStatistics => ({
        damageDealtByPlayerTeam: damageDealtByPlayerTeam ?? 0,
        damageTakenByPlayerTeam: damageTakenByPlayerTeam ?? 0,
        damageAbsorbedByPlayerTeam: damageAbsorbedByPlayerTeam ?? 0,
        healingReceivedByPlayerTeam: healingReceivedByPlayerTeam ?? 0,
        criticalHitsDealtByPlayerTeam: criticalHitsDealtByPlayerTeam ?? 0,
        criticalHitsTakenByPlayerTeam: criticalHitsTakenByPlayerTeam ?? 0,
    }),

    addDamageDealtByPlayerTeam: (
        missionStatistics: MissionStatistics,
        amount: number
    ): MissionStatistics => ({
        ...missionStatistics,
        damageDealtByPlayerTeam:
            missionStatistics.damageDealtByPlayerTeam + amount,
    }),

    addDamageTakenByPlayerTeam: (
        missionStatistics: MissionStatistics,
        amount: number
    ): MissionStatistics => ({
        ...missionStatistics,
        damageTakenByPlayerTeam:
            missionStatistics.damageTakenByPlayerTeam + amount,
    }),

    addDamageAbsorbedByPlayerTeam: (
        missionStatistics: MissionStatistics,
        amount: number
    ): MissionStatistics => ({
        ...missionStatistics,
        damageAbsorbedByPlayerTeam:
            missionStatistics.damageAbsorbedByPlayerTeam + amount,
    }),

    addHealingReceivedByPlayerTeam: (
        missionStatistics: MissionStatistics,
        amount: number
    ): MissionStatistics => ({
        ...missionStatistics,
        healingReceivedByPlayerTeam:
            missionStatistics.healingReceivedByPlayerTeam + amount,
    }),

    addCriticalHitsDealtByPlayerTeam: (
        missionStatistics: MissionStatistics,
        amount: number
    ): MissionStatistics => ({
        ...missionStatistics,
        criticalHitsDealtByPlayerTeam:
            missionStatistics.criticalHitsDealtByPlayerTeam + amount,
    }),

    addCriticalHitsTakenByPlayerTeam: (
        missionStatistics: MissionStatistics,
        amount: number
    ): MissionStatistics => ({
        ...missionStatistics,
        criticalHitsTakenByPlayerTeam:
            missionStatistics.criticalHitsTakenByPlayerTeam + amount,
    }),

    setDamageDealtByPlayerTeam: (
        missionStatistics: MissionStatistics,
        value: number
    ): MissionStatistics => ({
        ...missionStatistics,
        damageDealtByPlayerTeam: value,
    }),

    setDamageTakenByPlayerTeam: (
        missionStatistics: MissionStatistics,
        value: number
    ): MissionStatistics => ({
        ...missionStatistics,
        damageTakenByPlayerTeam: value,
    }),

    setDamageAbsorbedByPlayerTeam: (
        missionStatistics: MissionStatistics,
        value: number
    ): MissionStatistics => ({
        ...missionStatistics,
        damageAbsorbedByPlayerTeam: value,
    }),

    setHealingReceivedByPlayerTeam: (
        missionStatistics: MissionStatistics,
        value: number
    ): MissionStatistics => ({
        ...missionStatistics,
        healingReceivedByPlayerTeam: value,
    }),

    setCriticalHitsDealtByPlayerTeam: (
        missionStatistics: MissionStatistics,
        value: number
    ): MissionStatistics => ({
        ...missionStatistics,
        criticalHitsDealtByPlayerTeam: value,
    }),

    setCriticalHitsTakenByPlayerTeam: (
        missionStatistics: MissionStatistics,
        value: number
    ): MissionStatistics => ({
        ...missionStatistics,
        criticalHitsTakenByPlayerTeam: value,
    }),

    serialize: (
        missionStatistics: MissionStatistics
    ): SerializedMissionStatistics => ({
        ...missionStatistics,
    }),

    createFromJSON: (data: SerializedMissionStatistics): MissionStatistics =>
        MissionStatisticsService.new(data),

    deserialize: (data: unknown): MissionStatistics => {
        const result = missionStatisticsSchema.safeParse(data)
        if (!result.success) {
            const details = result.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ")
            throw new Error(
                `[MissionStatisticsService.deserialize]: ${details}`
            )
        }
        return MissionStatisticsService.createFromJSON(result.data)
    },
}
