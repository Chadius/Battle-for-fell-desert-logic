import { describe, expect, it } from "vitest"
import { CampaignSquaddieService } from "./campaignSquaddie.js"

describe("Campaign Squaddie", () => {
    describe("when isLeader, injury, and injuryHistory are omitted", () => {
        it("defaults isLeader to false, injury to undefined, and injuryHistory to empty", () => {
            const campaignSquaddie = CampaignSquaddieService.new({
                id: "lini",
                outOfBattleAttributeSheetId: "sheet-lini",
                name: "Lini",
            })
            expect(campaignSquaddie).toEqual({
                id: "lini",
                outOfBattleAttributeSheetId: "sheet-lini",
                name: "Lini",
                isLeader: false,
                injury: undefined,
                injuryHistory: [],
            })
        })
    })

    it("can be constructed as a leader with a current injury and injury history", () => {
        const campaignSquaddie = CampaignSquaddieService.new({
            id: "lini",
            outOfBattleAttributeSheetId: "sheet-lini",
            name: "Lini",
            isLeader: true,
            injury: { duration: 3, permanent: false },
            injuryHistory: ["mission-1"],
        })
        expect(campaignSquaddie.isLeader).toBeTruthy()
        expect(campaignSquaddie.injury).toEqual({
            duration: 3,
            permanent: false,
        })
        expect(campaignSquaddie.injuryHistory).toEqual(["mission-1"])
    })

    describe("when constructed with invalid data", () => {
        it("rejects a blank id", () => {
            expect(() =>
                CampaignSquaddieService.new({
                    id: "",
                    outOfBattleAttributeSheetId: "sheet-lini",
                    name: "Lini",
                })
            ).toThrow("CampaignSquaddieService.new")
        })

        it("rejects a non-positive injury duration", () => {
            expect(() =>
                CampaignSquaddieService.new({
                    id: "lini",
                    outOfBattleAttributeSheetId: "sheet-lini",
                    name: "Lini",
                    injury: { duration: 0, permanent: false },
                })
            ).toThrow("CampaignSquaddieService.new")
        })

        it("rejects a blank mission id in the injury history", () => {
            expect(() =>
                CampaignSquaddieService.new({
                    id: "lini",
                    outOfBattleAttributeSheetId: "sheet-lini",
                    name: "Lini",
                    injuryHistory: [""],
                })
            ).toThrow("CampaignSquaddieService.new")
        })
    })

    describe("clone", () => {
        it("produces a deep copy that does not share the injury history array", () => {
            const original = CampaignSquaddieService.new({
                id: "lini",
                outOfBattleAttributeSheetId: "sheet-lini",
                name: "Lini",
                injury: { duration: 2, permanent: false },
                injuryHistory: ["mission-1"],
            })
            const cloned = CampaignSquaddieService.clone(original)
            cloned.injuryHistory.push("mission-2")
            expect(original.injuryHistory).toEqual(["mission-1"])
            expect(cloned.injuryHistory).toEqual(["mission-1", "mission-2"])
        })
    })

    describe("serialize and deserialize", () => {
        it("round-trips a squaddie without an injury", () => {
            const original = CampaignSquaddieService.new({
                id: "lini",
                outOfBattleAttributeSheetId: "sheet-lini",
                name: "Lini",
                isLeader: true,
            })
            const serialized = CampaignSquaddieService.serialize(original)
            const deserialized = CampaignSquaddieService.deserialize(serialized)
            expect(deserialized).toEqual(original)
        })

        it("round-trips a squaddie with a current injury and injury history that outlives it", () => {
            const original = CampaignSquaddieService.new({
                id: "lini",
                outOfBattleAttributeSheetId: "sheet-lini",
                name: "Lini",
                injury: { duration: 5, permanent: true },
                injuryHistory: ["mission-1", "mission-2"],
            })
            const serialized = CampaignSquaddieService.serialize(original)
            const deserialized = CampaignSquaddieService.deserialize(serialized)
            expect(deserialized).toEqual(original)
        })

        it("throws a descriptive error for invalid data", () => {
            expect(() =>
                CampaignSquaddieService.deserialize({
                    id: "lini",
                    outOfBattleAttributeSheetId: "sheet-lini",
                    name: "Lini",
                    isLeader: "not-a-boolean",
                    injuryHistory: [],
                })
            ).toThrow("CampaignSquaddieService.deserialize")
        })
    })
})
