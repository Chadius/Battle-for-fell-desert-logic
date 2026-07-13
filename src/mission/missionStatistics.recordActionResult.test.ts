import { describe, expect, it } from "vitest"
import { MissionStatisticsService } from "./missionStatistics.js"
import { DegreeOfSuccess } from "../degreesOfSuccess/degreeOfSuccess.js"
import { SquaddieAffiliation } from "../affiliation/affiliation.js"

describe("MissionStatisticsService.recordActionResult", () => {
    describe("when a PLAYER attacks an ENEMY", () => {
        it("credits the damage to damageDealtByPlayerTeam", () => {
            const result = MissionStatisticsService.recordActionResult({
                missionStatistics: MissionStatisticsService.new(),
                actorAffiliation: SquaddieAffiliation.PLAYER,
                targetAffiliation: SquaddieAffiliation.ENEMY,
                damageNet: 2,
                damageAbsorbed: 0,
                healingNet: 0,
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            })

            expect(result).toEqual(
                MissionStatisticsService.new({ damageDealtByPlayerTeam: 2 })
            )
        })
    })

    describe("when an ENEMY attacks a PLAYER", () => {
        it("credits the damage taken and absorbed to the player team", () => {
            const result = MissionStatisticsService.recordActionResult({
                missionStatistics: MissionStatisticsService.new(),
                actorAffiliation: SquaddieAffiliation.ENEMY,
                targetAffiliation: SquaddieAffiliation.PLAYER,
                damageNet: 1,
                damageAbsorbed: 3,
                healingNet: 0,
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            })

            expect(result).toEqual(
                MissionStatisticsService.new({
                    damageTakenByPlayerTeam: 1,
                    damageAbsorbedByPlayerTeam: 3,
                })
            )
        })
    })

    describe("when a PLAYER heals a PLAYER", () => {
        it("credits the healing to healingReceivedByPlayerTeam", () => {
            const result = MissionStatisticsService.recordActionResult({
                missionStatistics: MissionStatisticsService.new(),
                actorAffiliation: SquaddieAffiliation.PLAYER,
                targetAffiliation: SquaddieAffiliation.PLAYER,
                damageNet: 0,
                damageAbsorbed: 0,
                healingNet: 2,
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            })

            expect(result).toEqual(
                MissionStatisticsService.new({ healingReceivedByPlayerTeam: 2 })
            )
        })
    })

    describe("when a PLAYER critically hits an ENEMY", () => {
        it("credits both the damage dealt and a critical hit dealt", () => {
            const result = MissionStatisticsService.recordActionResult({
                missionStatistics: MissionStatisticsService.new(),
                actorAffiliation: SquaddieAffiliation.PLAYER,
                targetAffiliation: SquaddieAffiliation.ENEMY,
                damageNet: 4,
                damageAbsorbed: 0,
                healingNet: 0,
                degreeOfSuccess: DegreeOfSuccess.CRITICAL,
            })

            expect(result).toEqual(
                MissionStatisticsService.new({
                    damageDealtByPlayerTeam: 4,
                    criticalHitsDealtByPlayerTeam: 1,
                })
            )
        })
    })

    describe("when an ENEMY critically hits a PLAYER", () => {
        it("credits both the damage taken and a critical hit taken", () => {
            const result = MissionStatisticsService.recordActionResult({
                missionStatistics: MissionStatisticsService.new(),
                actorAffiliation: SquaddieAffiliation.ENEMY,
                targetAffiliation: SquaddieAffiliation.PLAYER,
                damageNet: 4,
                damageAbsorbed: 0,
                healingNet: 0,
                degreeOfSuccess: DegreeOfSuccess.CRITICAL,
            })

            expect(result).toEqual(
                MissionStatisticsService.new({
                    damageTakenByPlayerTeam: 4,
                    criticalHitsTakenByPlayerTeam: 1,
                })
            )
        })
    })

    describe("when neither the actor nor the target is PLAYER", () => {
        it("leaves the statistics unchanged", () => {
            const original = MissionStatisticsService.new()

            const result = MissionStatisticsService.recordActionResult({
                missionStatistics: original,
                actorAffiliation: SquaddieAffiliation.ENEMY,
                targetAffiliation: SquaddieAffiliation.ENEMY,
                damageNet: 5,
                damageAbsorbed: 0,
                healingNet: 0,
                degreeOfSuccess: DegreeOfSuccess.CRITICAL,
            })

            expect(result).toEqual(original)
        })
    })

    describe("when recording a result", () => {
        it("does not mutate the original statistics object", () => {
            const original = MissionStatisticsService.new()

            MissionStatisticsService.recordActionResult({
                missionStatistics: original,
                actorAffiliation: SquaddieAffiliation.PLAYER,
                targetAffiliation: SquaddieAffiliation.ENEMY,
                damageNet: 2,
                damageAbsorbed: 0,
                healingNet: 0,
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            })

            expect(original).toEqual(MissionStatisticsService.new())
        })
    })
})
