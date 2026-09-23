import { describe, expect, it } from "vitest"
import {
    type CampaignSquaddieInjury,
    CampaignSquaddieService,
} from "./campaignSquaddie.js"

const lini = {
    id: "lini",
    outOfBattleAttributeSheetId: "sheet-lini",
    outOfBattleSquaddieId: "battle-lini",
    name: "Lini",
}

const permanentInjury: CampaignSquaddieInjury = {}

describe("Campaign Squaddie", () => {
    describe("when isLeader, injury, and injuryHistory are omitted", () => {
        it("is an uninjured non-leader with no injury history", () => {
            const campaignSquaddie = CampaignSquaddieService.new(lini)
            expect(campaignSquaddie).toMatchObject({
                isLeader: false,
                injury: undefined,
                injuryHistory: [],
            })
        })
    })

    describe("when constructed as a leader with a temporary injury", () => {
        it("keeps the leader flag, the remaining injury duration, and the injury history", () => {
            const campaignSquaddie = CampaignSquaddieService.new({
                ...lini,
                isLeader: true,
                injury: { duration: 3 },
                injuryHistory: ["mission-1"],
            })
            expect(campaignSquaddie).toMatchObject({
                isLeader: true,
                injury: { duration: 3 },
                injuryHistory: ["mission-1"],
            })
        })
    })

    describe("when the caller changes the injury history it passed in", () => {
        it("leaves the squaddie's injury history unchanged", () => {
            const injuryHistory = ["mission-1"]
            const campaignSquaddie = CampaignSquaddieService.new({
                ...lini,
                injuryHistory,
            })
            injuryHistory.push("mission-2")
            expect(campaignSquaddie.injuryHistory).toEqual(["mission-1"])
        })
    })

    describe("when constructed with invalid data", () => {
        it("rejects a blank id", () => {
            expect(() =>
                CampaignSquaddieService.new({ ...lini, id: "" })
            ).toThrow("CampaignSquaddieService.new")
        })

        it("rejects a blank outOfBattleSquaddieId", () => {
            expect(() =>
                CampaignSquaddieService.new({
                    ...lini,
                    outOfBattleSquaddieId: "",
                })
            ).toThrow("CampaignSquaddieService.new")
        })

        it("rejects a non-positive injury duration", () => {
            expect(() =>
                CampaignSquaddieService.new({
                    ...lini,
                    injury: { duration: 0 },
                })
            ).toThrow("CampaignSquaddieService.new")
        })

        it("rejects a blank mission id in the injury history", () => {
            expect(() =>
                CampaignSquaddieService.new({ ...lini, injuryHistory: [""] })
            ).toThrow("CampaignSquaddieService.new")
        })
    })

    describe("when a clone's injury history is changed", () => {
        it("leaves the original's injury history untouched", () => {
            const original = CampaignSquaddieService.new({
                ...lini,
                injuryHistory: ["mission-1"],
            })
            const cloned = CampaignSquaddieService.clone(original)
            cloned.injuryHistory.push("mission-2")
            expect(original.injuryHistory).toEqual(["mission-1"])
        })
    })

    describe("when a clone's injury is changed", () => {
        it("leaves the original's injury untouched", () => {
            const original = CampaignSquaddieService.new({
                ...lini,
                injury: { duration: 2 },
            })
            const cloned = CampaignSquaddieService.clone(original)
            cloned.injury!.duration = 1
            expect(original.injury).toEqual({ duration: 2 })
        })
    })

    describe("when saved and loaded again", () => {
        it("restores an uninjured leader", () => {
            const original = CampaignSquaddieService.new({
                ...lini,
                isLeader: true,
            })
            const serialized = CampaignSquaddieService.serialize(original)
            const deserialized = CampaignSquaddieService.deserialize(serialized)
            expect(deserialized).toEqual(original)
        })

        it("restores a permanent injury and the injury history that outlives it", () => {
            const original = CampaignSquaddieService.new({
                ...lini,
                injury: permanentInjury,
                injuryHistory: ["mission-1", "mission-2"],
            })
            const serialized = CampaignSquaddieService.serialize(original)
            const deserialized = CampaignSquaddieService.deserialize(serialized)
            expect(deserialized).toEqual(original)
        })
    })

    describe("when loading malformed data", () => {
        describe("when a saved field has the wrong type", () => {
            it("throws from deserialize", () => {
                expect(() =>
                    CampaignSquaddieService.deserialize({
                        ...lini,
                        isLeader: "not-a-boolean",
                        injuryHistory: [],
                    })
                ).toThrow("CampaignSquaddieService.deserialize")
            })
        })

        describe("when loading an injury saved with the old permanent flag", () => {
            it("refuses it instead of loading it as a temporary injury", () => {
                expect(() =>
                    CampaignSquaddieService.deserialize({
                        ...lini,
                        isLeader: false,
                        injury: { duration: 5, permanent: true },
                        injuryHistory: [],
                    })
                ).toThrow("CampaignSquaddieService.deserialize")
            })
        })
    })
})
