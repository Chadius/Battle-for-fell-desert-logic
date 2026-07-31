import { describe, expect, it } from "vitest"
import { GlossaryTermService } from "./glossaryTerm.js"

describe("GlossaryTermService.deserialize", () => {
    describe("when the data matches the schema", () => {
        it("returns a GlossaryTerm with the parsed fields", () => {
            const data = {
                termId: "condition.ARMOR",
                name: { "en-us": { text: "Armor" } },
                definition: {
                    "en-us": { text: "Reduces the chance to get hit" },
                },
                iconResourceKey: "icon-armor",
            }

            const glossaryTerm = GlossaryTermService.deserialize(data)

            expect(glossaryTerm).toEqual(data)
        })
    })

    describe("when termId is missing", () => {
        it("throws an error naming the deserializing service", () => {
            const data = {
                name: { "en-us": { text: "Armor" } },
                definition: {
                    "en-us": { text: "Reduces the chance to get hit" },
                },
            }

            expect(() => GlossaryTermService.deserialize(data)).toThrow(
                "[GlossaryTermService.deserialize]"
            )
        })
    })
})

describe("when a GlossaryTerm is serialized then deserialized", () => {
    it("produces an equivalent GlossaryTerm", () => {
        const glossaryTerm = GlossaryTermService.new({
            termId: "condition.HUSTLE",
            name: { "en-us": { text: "Hustle" } },
            definition: {
                "en-us": { text: "Reduces movement costs to a minimum of 1" },
            },
        })

        const roundTripped = GlossaryTermService.deserialize(
            GlossaryTermService.serialize(glossaryTerm)
        )

        expect(roundTripped).toEqual(glossaryTerm)
    })
})
