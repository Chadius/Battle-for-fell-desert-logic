import { describe, expect, it } from "vitest"
import { MissionResourceLoader } from "./missionResourceLoader.js"
import { GlossaryTermType } from "../campaign/glossary/glossaryTermType.js"

describe("MissionResourceLoader.addGlossaryFromJson", () => {
    describe("when given a well-formed glossary payload", () => {
        it("registers each term with the glossary manager", () => {
            const missionResourceLoader = new MissionResourceLoader()

            const errors = missionResourceLoader.addGlossaryFromJson({
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
            expect(
                missionResourceLoader.glossaryManager?.has("condition.ARMOR")
            ).toBe(true)
        })
    })
})
