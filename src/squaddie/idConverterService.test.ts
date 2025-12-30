import { describe, expect, it } from "vitest"
import { SquaddieIdConverterService } from "./idConverterService"

describe("Squaddie Id Converter Service", () => {
    it("can convert a squaddie id into a key", () => {
        expect(
            SquaddieIdConverterService.squaddieIdToKey({
                inBattleSquaddieId: 9001,
                outOfBattleSquaddieId: "Brigand",
            })
        ).toEqual("Brigand+++9001")
    })
    it("can convert a key into an id", () => {
        expect(
            SquaddieIdConverterService.keyToSquaddieId("Champion+++101")
        ).toEqual({
            inBattleSquaddieId: 101,
            outOfBattleSquaddieId: "Champion",
        })
    })
})
