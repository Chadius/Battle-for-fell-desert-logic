import { beforeEach, describe, expect, it } from "vitest"
import {
    type CampaignSquaddie,
    CampaignSquaddieService,
} from "./campaignSquaddie.js"
import { type Army, ArmyService } from "./army.js"
import { ArmyManager } from "./armyManager.js"

describe("Army Manager", () => {
    let manager: ArmyManager
    let army: Army
    let lini: CampaignSquaddie

    beforeEach(() => {
        lini = CampaignSquaddieService.new({
            id: "lini",
            outOfBattleAttributeSheetId: "sheet-lini",
            name: "Lini",
        })
        army = ArmyService.new()
        manager = new ArmyManager(army)
    })

    it("can add a squaddie and retrieve it", () => {
        manager.addOrUpdate(lini)
        expect(manager.has(lini.id)).toBeTruthy()
        expect(manager.get(lini.id)).toEqual(lini)
        expect(() => manager.get("does not exist")).toThrow("no squaddie")
    })

    it("can remove a squaddie", () => {
        manager.addOrUpdate(lini)
        manager.remove(lini.id)
        expect(manager.has(lini.id)).toBeFalsy()
        expect(() => manager.get(lini.id)).toThrow("no squaddie")
    })

    it("can list all squaddies", () => {
        manager.addOrUpdate(lini)
        expect(manager.getAll()).toEqual([lini])
    })

    describe("serialize", () => {
        it("serializes all squaddies in the army", () => {
            manager.addOrUpdate(lini)
            const serialized = manager.serialize()
            expect(serialized).toHaveLength(1)
            expect(serialized[0]).toEqual(
                CampaignSquaddieService.serialize(lini)
            )
        })

        it("serializes an empty army as an empty array", () => {
            expect(manager.serialize()).toEqual([])
        })
    })

    describe("addSquaddiesFromJson", () => {
        it("loads a single squaddie blob and makes it retrievable", () => {
            const blob = CampaignSquaddieService.serialize(lini)
            const errors = manager.addSquaddiesFromJson(blob)
            expect(errors).toHaveLength(0)
            expect(manager.has(lini.id)).toBeTruthy()
            expect(manager.get(lini.id)).toEqual(lini)
        })

        it("loads an array of squaddie blobs", () => {
            const rem = CampaignSquaddieService.new({
                id: "rem",
                outOfBattleAttributeSheetId: "sheet-rem",
                name: "Rem",
                isLeader: true,
            })
            const blobs = [
                CampaignSquaddieService.serialize(lini),
                CampaignSquaddieService.serialize(rem),
            ]
            const errors = manager.addSquaddiesFromJson(blobs)
            expect(errors).toHaveLength(0)
            expect(manager.has(lini.id)).toBeTruthy()
            expect(manager.has(rem.id)).toBeTruthy()
        })

        it("returns errors for invalid blobs and still loads valid ones", () => {
            const blobs = [
                CampaignSquaddieService.serialize(lini),
                {
                    id: "",
                    outOfBattleAttributeSheetId: "sheet",
                    name: "Bad Squaddie",
                    isLeader: false,
                },
            ]
            const errors = manager.addSquaddiesFromJson(blobs)
            expect(errors).toHaveLength(1)
            expect(errors[0]).toContain("CampaignSquaddieService.deserialize")
            expect(manager.has(lini.id)).toBeTruthy()
        })

        it("round-trips: serialize then addSquaddiesFromJson restores squaddies", () => {
            manager.addOrUpdate(lini)
            const serialized = manager.serialize()

            const freshManager = new ArmyManager(ArmyService.new())
            const errors = freshManager.addSquaddiesFromJson(serialized)
            expect(errors).toHaveLength(0)
            expect(freshManager.get(lini.id)).toEqual(lini)
        })
    })
})
