import { describe, expect, it } from "vitest"
import { MissionResourceLoader } from "./missionResourceLoader.js"

describe("MissionResourceLoader.addGlossaryFromJson", () => {
    describe("when given a well-formed glossary payload", () => {
        it("registers each term with the glossary manager", () => {
            const missionResourceLoader = new MissionResourceLoader()

            const errors = missionResourceLoader.addGlossaryFromJson({
                terms: [
                    {
                        termId: "condition.ARMOR",
                        name: { "en-us": { text: "Armor" } },
                        definition: { "en-us": { text: "Reduces hits" } },
                    },
                ],
            })

            expect(errors).toEqual([])
            expect(
                missionResourceLoader.glossaryManager?.has("condition.ARMOR")
            ).toBe(true)
        })
    })
})
