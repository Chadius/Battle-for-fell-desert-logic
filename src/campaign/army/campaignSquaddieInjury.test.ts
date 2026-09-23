import { describe, expect, it } from "vitest"
import {
    type CampaignSquaddie,
    CampaignSquaddieService,
} from "./campaignSquaddie.js"

const newLini = (
    overrides: Partial<Pick<CampaignSquaddie, "injury" | "injuryHistory">> = {}
): CampaignSquaddie =>
    CampaignSquaddieService.new({
        id: "lini",
        outOfBattleAttributeSheetId: "sheet-lini",
        outOfBattleSquaddieId: "battle-lini",
        name: "Lini",
        ...overrides,
    })

describe("Campaign Squaddie injuries", () => {
    describe("when a squaddie is injured on a mission", () => {
        it("gives the squaddie the injury", () => {
            const injured = CampaignSquaddieService.injureSquaddie({
                campaignSquaddie: newLini(),
                missionId: "mission-2",
                injury: { duration: 2 },
            })
            expect(injured.injury).toEqual({ duration: 2 })
        })

        it("adds the mission to the end of the injury history", () => {
            const injured = CampaignSquaddieService.injureSquaddie({
                campaignSquaddie: newLini({ injuryHistory: ["mission-1"] }),
                missionId: "mission-2",
                injury: { duration: 2 },
            })
            expect(injured.injuryHistory).toEqual(["mission-1", "mission-2"])
        })

        it("leaves the original squaddie uninjured", () => {
            const original = newLini()
            CampaignSquaddieService.injureSquaddie({
                campaignSquaddie: original,
                missionId: "mission-2",
                injury: { duration: 2 },
            })
            expect(original).toMatchObject({
                injury: undefined,
                injuryHistory: [],
            })
        })

        it("rejects a non-positive injury duration", () => {
            expect(() =>
                CampaignSquaddieService.injureSquaddie({
                    campaignSquaddie: newLini(),
                    missionId: "mission-2",
                    injury: { duration: 0 },
                })
            ).toThrow("CampaignSquaddieService.injureSquaddie")
        })
    })

    describe("when an injured squaddie recovers for one mission", () => {
        describe("when more than one mission of recovery remains", () => {
            it("has one fewer mission of recovery left", () => {
                const recovered =
                    CampaignSquaddieService.recoverFromInjuryByOneMission(
                        newLini({ injury: { duration: 2 } })
                    )
                expect(recovered.injury).toEqual({ duration: 1 })
            })
        })

        describe("when it was the last mission of recovery", () => {
            it("is no longer injured but keeps the injury history", () => {
                const recovered =
                    CampaignSquaddieService.recoverFromInjuryByOneMission(
                        newLini({
                            injury: { duration: 1 },
                            injuryHistory: ["mission-1"],
                        })
                    )
                expect(recovered).toMatchObject({
                    injury: undefined,
                    injuryHistory: ["mission-1"],
                })
            })
        })

        describe("when the injury is permanent", () => {
            it("stays permanently injured", () => {
                const recovered =
                    CampaignSquaddieService.recoverFromInjuryByOneMission(
                        newLini({ injury: {} })
                    )
                expect(
                    CampaignSquaddieService.isPermanentlyInjured(recovered)
                ).toBe(true)
            })
        })

        it("leaves the original squaddie's injury untouched", () => {
            const original = newLini({ injury: { duration: 2 } })
            CampaignSquaddieService.recoverFromInjuryByOneMission(original)
            expect(original.injury).toEqual({ duration: 2 })
        })
    })

    describe("when an uninjured squaddie recovers for one mission", () => {
        it("stays uninjured", () => {
            const recovered =
                CampaignSquaddieService.recoverFromInjuryByOneMission(newLini())
            expect(recovered.injury).toBeUndefined()
        })
    })

    describe("when checking whether a squaddie is permanently injured", () => {
        it("is false for a temporary injury", () => {
            expect(
                CampaignSquaddieService.isPermanentlyInjured(
                    newLini({ injury: { duration: 1 } })
                )
            ).toBe(false)
        })

        it("is false for an uninjured squaddie", () => {
            expect(
                CampaignSquaddieService.isPermanentlyInjured(newLini())
            ).toBe(false)
        })
    })
})
