import { beforeEach, describe, expect, it } from "vitest"
import { SquaddieAffiliation } from "../squaddie/outOfBattle/affiliation.ts"
import { SquaddieRole } from "./roles.ts"
import {
    type SquadCollection,
    SquadCollectionService,
} from "./squadCollection.ts"
import { SquadManager } from "./squadManager.ts"
import { SquadService } from "./squad.ts"

describe("Squad Manager", () => {
    let manager: SquadManager
    let collection: SquadCollection

    beforeEach(() => {
        collection = SquadCollectionService.new()
        manager = new SquadManager(collection)
    })

    it("can add a squad", () => {
        const squad = SquadService.new({
            id: "squad",
            name: "Squad",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddies: new Map([
                [
                    "soldier",
                    new Map([
                        [0, SquaddieRole.NONE],
                        [1, SquaddieRole.NONE],
                    ]),
                ],
            ]),
        })
        manager.addSquad(squad)
        expect(manager.getSquad(squad.id)).toEqual(squad)
    })
    it("can add a squaddie to a squad", () => {
        const squad = SquadService.new({
            id: "squad",
            name: "Squad",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddies: new Map([
                [
                    "soldier",
                    new Map([
                        [0, SquaddieRole.NONE],
                        [1, SquaddieRole.NONE],
                    ]),
                ],
            ]),
        })
        manager.addSquad(squad)
        manager.addSquaddie({
            squadId: squad.id,
            outOfBattleSquaddieId: "soldier",
            inBattleSquaddieId: 0,
            role: SquaddieRole.NONE,
        })
        const newSquaddieDescription = manager.getSquaddie({
            squadId: squad.id,
            outOfBattleSquaddieId: "soldier",
            inBattleSquaddieId: 0,
        })
        expect(newSquaddieDescription?.role).toEqual(SquaddieRole.NONE)
    })
    it("can remove a squaddie from a squad", () => {
        const squad = SquadService.new({
            id: "squad",
            name: "Squad",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddies: new Map([
                [
                    "soldier",
                    new Map([
                        [0, SquaddieRole.NONE],
                        [1, SquaddieRole.NONE],
                    ]),
                ],
            ]),
        })
        manager.addSquad(squad)
        manager.addSquaddie({
            squadId: squad.id,
            outOfBattleSquaddieId: "soldier",
            inBattleSquaddieId: 0,
            role: SquaddieRole.NONE,
        })
        manager.addSquaddie({
            squadId: squad.id,
            outOfBattleSquaddieId: "soldier",
            inBattleSquaddieId: 1,
            role: SquaddieRole.NONE,
        })
        manager.removeSquaddie({
            squadId: squad.id,
            outOfBattleSquaddieId: "soldier",
            inBattleSquaddieId: 0,
        })

        expect(
            manager.doesSquaddieExist({
                squadId: squad.id,
                outOfBattleSquaddieId: "soldier",
                inBattleSquaddieId: 0,
            })
        ).toBeFalsy()
        expect(
            manager.doesSquaddieExist({
                squadId: squad.id,
                outOfBattleSquaddieId: "soldier",
                inBattleSquaddieId: 1,
            })
        ).toBeTruthy()
    })
})
