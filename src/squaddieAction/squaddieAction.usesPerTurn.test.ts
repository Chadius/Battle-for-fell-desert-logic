import { describe, expect, it } from "vitest"
import { SquaddieActionService } from "./squaddieAction"
import { DegreeOfSuccess } from "../degreesOfSuccess/degreeOfSuccess"

const baseAction = () =>
    SquaddieActionService.new({
        id: "thunder-strike",
        name: "Thunder Strike",
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
        },
    })

describe("SquaddieAction usesPerTurn", () => {
    it("defaults to undefined when not specified", () => {
        expect(baseAction().usesPerTurn).toBeUndefined()
    })

    it("accepts a positive integer as the per-turn limit", () => {
        const action = SquaddieActionService.new({
            id: "thunder-strike",
            name: "Thunder Strike",
            usesPerTurn: 2,
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
        })
        expect(action.usesPerTurn).toBe(2)
    })

    it("throws when usesPerTurn is zero", () => {
        expect(() =>
            SquaddieActionService.new({
                id: "thunder-strike",
                name: "Thunder Strike",
                usesPerTurn: 0,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
            })
        ).toThrow("[SquaddieActionService.new]")
    })

    it("throws when usesPerTurn is negative", () => {
        expect(() =>
            SquaddieActionService.new({
                id: "thunder-strike",
                name: "Thunder Strike",
                usesPerTurn: -1,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
            })
        ).toThrow("[SquaddieActionService.new]")
    })

    it("throws when usesPerTurn is not an integer", () => {
        expect(() =>
            SquaddieActionService.new({
                id: "thunder-strike",
                name: "Thunder Strike",
                usesPerTurn: 1.5,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
            })
        ).toThrow("[SquaddieActionService.new]")
    })

    describe("serialization", () => {
        it("round-trips usesPerTurn through serialize/deserialize", () => {
            const original = SquaddieActionService.new({
                id: "thunder-strike",
                name: "Thunder Strike",
                usesPerTurn: 3,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
            })
            const restored = SquaddieActionService.deserialize(
                SquaddieActionService.serialize(original)
            )
            expect(restored.usesPerTurn).toBe(3)
        })

        it("preserves undefined usesPerTurn through serialize/deserialize", () => {
            const original = baseAction()
            const restored = SquaddieActionService.deserialize(
                SquaddieActionService.serialize(original)
            )
            expect(restored.usesPerTurn).toBeUndefined()
        })

        it("rejects non-integer usesPerTurn during deserialization", () => {
            const raw = {
                ...SquaddieActionService.serialize(baseAction()),
                usesPerTurn: 1.5,
            }
            expect(() => SquaddieActionService.deserialize(raw)).toThrow(
                "[SquaddieActionService.deserialize]"
            )
        })

        it("rejects zero usesPerTurn during deserialization", () => {
            const raw = {
                ...SquaddieActionService.serialize(baseAction()),
                usesPerTurn: 0,
            }
            expect(() => SquaddieActionService.deserialize(raw)).toThrow(
                "[SquaddieActionService.deserialize]"
            )
        })
    })
})
