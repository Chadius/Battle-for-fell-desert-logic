import { beforeEach, describe, expect, it } from "vitest"
import { type Army, ArmyService } from "./army.js"
import {
    type CampaignSquaddie,
    CampaignSquaddieService,
} from "./campaignSquaddie.js"

describe("Army", () => {
    let army: Army
    let lini: CampaignSquaddie

    beforeEach(() => {
        lini = CampaignSquaddieService.new({
            id: "lini",
            outOfBattleAttributeSheetId: "sheet-lini",
            outOfBattleSquaddieId: "battle-lini",
            name: "Lini",
        })
        army = ArmyService.new()
    })

    it("can add and retrieve squaddies", () => {
        const newArmy = ArmyService.addOrUpdate({
            army,
            campaignSquaddie: lini,
        })
        expect(ArmyService.getById({ army: newArmy, id: lini.id })).toEqual(
            lini
        )
        expect(ArmyService.getById({ army, id: lini.id })).toBeUndefined()
    })

    it("can update an existing squaddie", () => {
        const withLini = ArmyService.addOrUpdate({
            army,
            campaignSquaddie: lini,
        })
        const updatedLini = CampaignSquaddieService.new({
            id: lini.id,
            outOfBattleAttributeSheetId: lini.outOfBattleAttributeSheetId,
            outOfBattleSquaddieId: lini.outOfBattleSquaddieId,
            name: "Lini the Bold",
            isLeader: true,
        })
        const updatedArmy = ArmyService.addOrUpdate({
            army: withLini,
            campaignSquaddie: updatedLini,
        })
        expect(ArmyService.getById({ army: updatedArmy, id: lini.id })).toEqual(
            updatedLini
        )
    })

    it("can remove a squaddie", () => {
        const withLini = ArmyService.addOrUpdate({
            army,
            campaignSquaddie: lini,
        })
        const withoutLini = ArmyService.remove({ army: withLini, id: lini.id })
        expect(
            ArmyService.getById({ army: withoutLini, id: lini.id })
        ).toBeUndefined()
        expect(ArmyService.getById({ army: withLini, id: lini.id })).toEqual(
            lini
        )
    })

    it("deep clones existing squaddies so separate army snapshots don't share references", () => {
        const withLini = ArmyService.addOrUpdate({
            army,
            campaignSquaddie: lini,
        })
        const rem = CampaignSquaddieService.new({
            id: "rem",
            outOfBattleAttributeSheetId: "sheet-rem",
            outOfBattleSquaddieId: "battle-rem",
            name: "Rem",
        })
        const withRem = ArmyService.addOrUpdate({
            army: withLini,
            campaignSquaddie: rem,
        })

        const liniFromWithRem = ArmyService.getById({
            army: withRem,
            id: lini.id,
        })!
        liniFromWithRem.injury = {
            duration: 1,
            permanent: false,
        }

        expect(
            ArmyService.getById({ army: withLini, id: lini.id })!.injury
        ).toBeUndefined()
    })

    it("can check membership and list all squaddies", () => {
        const withLini = ArmyService.addOrUpdate({
            army,
            campaignSquaddie: lini,
        })
        expect(ArmyService.has({ army: withLini, id: lini.id })).toBeTruthy()
        expect(ArmyService.has({ army, id: lini.id })).toBeFalsy()
        expect(ArmyService.getAll(withLini)).toEqual([lini])
    })

    describe("getLeader", () => {
        describe("when the army has a leader", () => {
            it("returns the campaign squaddie flagged as leader", () => {
                const leader = CampaignSquaddieService.new({
                    id: "leader",
                    outOfBattleAttributeSheetId: "sheet-leader",
                    outOfBattleSquaddieId: "battle-leader",
                    name: "Leader",
                    isLeader: true,
                })
                const withLini = ArmyService.addOrUpdate({
                    army,
                    campaignSquaddie: lini,
                })
                const withLeader = ArmyService.addOrUpdate({
                    army: withLini,
                    campaignSquaddie: leader,
                })

                expect(ArmyService.getLeader(withLeader)).toEqual(leader)
            })
        })

        describe("when the army has no leader", () => {
            it("returns undefined", () => {
                const withLini = ArmyService.addOrUpdate({
                    army,
                    campaignSquaddie: lini,
                })

                expect(ArmyService.getLeader(withLini)).toBeUndefined()
            })
        })
    })

    describe("serialize and deserializeAll", () => {
        it("round-trips an army", () => {
            const withLini = ArmyService.addOrUpdate({
                army,
                campaignSquaddie: lini,
            })
            const serialized = ArmyService.serialize(withLini)
            const { army: deserializedArmy, errors } =
                ArmyService.deserializeAll(serialized)
            expect(errors).toHaveLength(0)
            expect(
                ArmyService.getById({ army: deserializedArmy, id: lini.id })
            ).toEqual(lini)
        })

        it("collects errors for invalid entries but keeps valid ones", () => {
            const serializedLini = CampaignSquaddieService.serialize(lini)
            const { army: deserializedArmy, errors } =
                ArmyService.deserializeAll([
                    serializedLini,
                    {
                        id: "",
                        outOfBattleAttributeSheetId: "x",
                        name: "y",
                        isLeader: false,
                    },
                ])
            expect(errors).toHaveLength(1)
            expect(errors[0]).toContain("CampaignSquaddieService.deserialize")
            expect(
                ArmyService.getById({ army: deserializedArmy, id: lini.id })
            ).toEqual(lini)
        })
    })
})
