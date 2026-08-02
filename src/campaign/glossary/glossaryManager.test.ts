import { describe, expect, it } from "vitest"
import { GlossaryManager } from "./glossaryManager.js"
import { GlossaryCollectionService } from "./glossaryCollection.js"
import { GlossaryTermType } from "./glossaryTermType.js"

const newGlossaryManager = (): GlossaryManager =>
    new GlossaryManager(GlossaryCollectionService.new())

describe("GlossaryManager.addTermsFromJson", () => {
    describe("when given a well-formed glossary payload", () => {
        it("makes each term retrievable by termId", () => {
            const glossaryManager = newGlossaryManager()

            const errors = glossaryManager.addTermsFromJson({
                terms: [
                    {
                        termId: "condition.ARMOR",
                        type: GlossaryTermType.SQUADDIE_CONDITION_TYPE,
                        name: { "en-us": { text: "Armor" } },
                        definition: { "en-us": { text: "Reduces hits" } },
                    },
                ],
            })

            expect(errors).toEqual([])
            expect(glossaryManager.has("condition.ARMOR")).toBe(true)
        })
    })

    describe("when the payload contains a duplicate termId", () => {
        it("reports a duplicate termId error and keeps the first occurrence", () => {
            const glossaryManager = newGlossaryManager()

            const errors = glossaryManager.addTermsFromJson({
                terms: [
                    {
                        termId: "condition.ARMOR",
                        type: GlossaryTermType.SQUADDIE_CONDITION_TYPE,
                        name: { "en-us": { text: "Armor" } },
                        definition: { "en-us": { text: "First definition" } },
                    },
                    {
                        termId: "condition.ARMOR",
                        type: GlossaryTermType.SQUADDIE_CONDITION_TYPE,
                        name: { "en-us": { text: "Armor" } },
                        definition: { "en-us": { text: "Second definition" } },
                    },
                ],
            })

            expect(errors).toEqual([
                expect.stringContaining('duplicate termId "condition.ARMOR"'),
            ])
            expect(glossaryManager.get("condition.ARMOR").definition).toEqual({
                "en-us": { text: "First definition" },
            })
        })
    })

    describe("when a term in the payload is missing termId", () => {
        it("reports a validation error", () => {
            const glossaryManager = newGlossaryManager()

            const errors = glossaryManager.addTermsFromJson({
                terms: [
                    {
                        type: GlossaryTermType.SQUADDIE_CONDITION_TYPE,
                        name: { "en-us": { text: "Armor" } },
                        definition: { "en-us": { text: "Reduces hits" } },
                    },
                ],
            })

            expect(errors).toHaveLength(1)
        })
    })
})

describe("GlossaryManager.termIds", () => {
    describe("when terms have been added", () => {
        it("enumerates every registered termId", () => {
            const glossaryManager = newGlossaryManager()
            glossaryManager.addTermsFromJson({
                terms: [
                    {
                        termId: "condition.ARMOR",
                        type: GlossaryTermType.SQUADDIE_CONDITION_TYPE,
                        name: { "en-us": { text: "Armor" } },
                        definition: { "en-us": { text: "Reduces hits" } },
                    },
                    {
                        termId: "condition.HUSTLE",
                        type: GlossaryTermType.SQUADDIE_CONDITION_TYPE,
                        name: { "en-us": { text: "Hustle" } },
                        definition: {
                            "en-us": { text: "Reduces movement costs" },
                        },
                    },
                ],
            })

            expect(glossaryManager.termIds().sort()).toEqual([
                "condition.ARMOR",
                "condition.HUSTLE",
            ])
        })
    })

    describe("when no terms have been added", () => {
        it("returns an empty list", () => {
            const glossaryManager = newGlossaryManager()

            expect(glossaryManager.termIds()).toEqual([])
        })
    })
})

describe("GlossaryManager.resolveTerm", () => {
    describe("when the term exists", () => {
        it("resolves the name and definition for the requested language", () => {
            const glossaryManager = newGlossaryManager()
            glossaryManager.addTermsFromJson({
                terms: [
                    {
                        termId: "condition.HUSTLE",
                        type: GlossaryTermType.SQUADDIE_CONDITION_TYPE,
                        name: {
                            "en-us": { text: "Hustle" },
                            "fr-fr": { text: "Hâte" },
                        },
                        definition: {
                            "en-us": { text: "Reduces movement costs" },
                            "fr-fr": {
                                text: "Réduit les coûts de déplacement",
                            },
                        },
                    },
                ],
            })

            const resolved = glossaryManager.resolveTerm(
                "condition.HUSTLE",
                "fr-fr"
            )

            expect(resolved).toEqual({
                name: "Hâte",
                definition: "Réduit les coûts de déplacement",
            })
        })
    })

    describe("when the term does not exist", () => {
        it("returns undefined", () => {
            const glossaryManager = newGlossaryManager()

            expect(
                glossaryManager.resolveTerm("condition.UNKNOWN", "en-us")
            ).toBeUndefined()
        })
    })
})
