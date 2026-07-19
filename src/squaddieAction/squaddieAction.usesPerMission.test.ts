import { describe, expect, it } from "vitest"
import { SquaddieActionService } from "./squaddieAction.js"
import { DegreeOfSuccess } from "../degreesOfSuccess/degreeOfSuccess.js"

const actionWith = (usesPerMission?: number) =>
    SquaddieActionService.new({
        id: "warcry",
        name: "Warcry",
        usesPerMission,
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
        },
    })

describe("SquaddieAction usesPerMission", () => {
    it("defaults to undefined when not specified", () => {
        expect(actionWith(undefined).usesPerMission).toBeUndefined()
    })

    it("accepts a positive integer as the per-mission limit", () => {
        expect(actionWith(3).usesPerMission).toBe(3)
    })

    it("throws when usesPerMission is zero", () => {
        expect(() => actionWith(0)).toThrow("[SquaddieActionService.new]")
    })

    it("throws when usesPerMission is negative", () => {
        expect(() => actionWith(-1)).toThrow("[SquaddieActionService.new]")
    })

    it("throws when usesPerMission is not an integer", () => {
        expect(() => actionWith(1.5)).toThrow("[SquaddieActionService.new]")
    })

    describe("serialization", () => {
        it("round-trips usesPerMission through serialize/deserialize", () => {
            const restored = SquaddieActionService.deserialize(
                SquaddieActionService.serialize(actionWith(3))
            )
            expect(restored.usesPerMission).toBe(3)
        })

        it("preserves undefined usesPerMission through serialize/deserialize", () => {
            const restored = SquaddieActionService.deserialize(
                SquaddieActionService.serialize(actionWith(undefined))
            )
            expect(restored.usesPerMission).toBeUndefined()
        })

        it("rejects non-integer usesPerMission during deserialization", () => {
            const raw = {
                ...SquaddieActionService.serialize(actionWith(undefined)),
                usesPerMission: 1.5,
            }
            expect(() => SquaddieActionService.deserialize(raw)).toThrow(
                "[SquaddieActionService.deserialize]"
            )
        })

        it("rejects zero usesPerMission during deserialization", () => {
            const raw = {
                ...SquaddieActionService.serialize(actionWith(undefined)),
                usesPerMission: 0,
            }
            expect(() => SquaddieActionService.deserialize(raw)).toThrow(
                "[SquaddieActionService.deserialize]"
            )
        })
    })
})
