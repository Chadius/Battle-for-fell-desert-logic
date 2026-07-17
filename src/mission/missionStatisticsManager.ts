import {
    type MissionStatistics,
    MissionStatisticsService,
    type SerializedMissionStatistics,
} from "./missionStatistics.js"

export class MissionStatisticsManager {
    private statistics: MissionStatistics

    constructor(statistics?: MissionStatistics) {
        this.statistics = statistics ?? MissionStatisticsService.new()
    }

    create(): void {
        this.statistics = MissionStatisticsService.new()
    }

    getStatistics(): MissionStatistics {
        return this.statistics
    }

    getDamageDealtByPlayerTeam(): number {
        return this.statistics.damageDealtByPlayerTeam
    }

    getDamageTakenByPlayerTeam(): number {
        return this.statistics.damageTakenByPlayerTeam
    }

    getDamageAbsorbedByPlayerTeam(): number {
        return this.statistics.damageAbsorbedByPlayerTeam
    }

    getHealingReceivedByPlayerTeam(): number {
        return this.statistics.healingReceivedByPlayerTeam
    }

    getCriticalHitsDealtByPlayerTeam(): number {
        return this.statistics.criticalHitsDealtByPlayerTeam
    }

    getCriticalHitsTakenByPlayerTeam(): number {
        return this.statistics.criticalHitsTakenByPlayerTeam
    }

    addDamageDealtByPlayerTeam(amount: number): void {
        this.statistics = MissionStatisticsService.addDamageDealtByPlayerTeam(
            this.statistics,
            amount
        )
    }

    addDamageTakenByPlayerTeam(amount: number): void {
        this.statistics = MissionStatisticsService.addDamageTakenByPlayerTeam(
            this.statistics,
            amount
        )
    }

    addDamageAbsorbedByPlayerTeam(amount: number): void {
        this.statistics =
            MissionStatisticsService.addDamageAbsorbedByPlayerTeam(
                this.statistics,
                amount
            )
    }

    addHealingReceivedByPlayerTeam(amount: number): void {
        this.statistics =
            MissionStatisticsService.addHealingReceivedByPlayerTeam(
                this.statistics,
                amount
            )
    }

    addCriticalHitsDealtByPlayerTeam(amount: number): void {
        this.statistics =
            MissionStatisticsService.addCriticalHitsDealtByPlayerTeam(
                this.statistics,
                amount
            )
    }

    addCriticalHitsTakenByPlayerTeam(amount: number): void {
        this.statistics =
            MissionStatisticsService.addCriticalHitsTakenByPlayerTeam(
                this.statistics,
                amount
            )
    }

    setDamageDealtByPlayerTeam(value: number): void {
        this.statistics = MissionStatisticsService.setDamageDealtByPlayerTeam(
            this.statistics,
            value
        )
    }

    setDamageTakenByPlayerTeam(value: number): void {
        this.statistics = MissionStatisticsService.setDamageTakenByPlayerTeam(
            this.statistics,
            value
        )
    }

    setDamageAbsorbedByPlayerTeam(value: number): void {
        this.statistics =
            MissionStatisticsService.setDamageAbsorbedByPlayerTeam(
                this.statistics,
                value
            )
    }

    setHealingReceivedByPlayerTeam(value: number): void {
        this.statistics =
            MissionStatisticsService.setHealingReceivedByPlayerTeam(
                this.statistics,
                value
            )
    }

    setCriticalHitsDealtByPlayerTeam(value: number): void {
        this.statistics =
            MissionStatisticsService.setCriticalHitsDealtByPlayerTeam(
                this.statistics,
                value
            )
    }

    setCriticalHitsTakenByPlayerTeam(value: number): void {
        this.statistics =
            MissionStatisticsService.setCriticalHitsTakenByPlayerTeam(
                this.statistics,
                value
            )
    }

    serialize(): SerializedMissionStatistics {
        return MissionStatisticsService.serialize(this.statistics)
    }

    static deserialize(data: unknown): MissionStatisticsManager {
        return new MissionStatisticsManager(
            MissionStatisticsService.deserialize(data)
        )
    }
}
