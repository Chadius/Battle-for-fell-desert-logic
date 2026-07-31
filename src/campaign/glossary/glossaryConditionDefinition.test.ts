import { describe, expect, it } from "vitest"
import { GlossaryManager } from "./glossaryManager.js"
import { GlossaryCollectionService } from "./glossaryCollection.js"
import { TextSubstitutionService } from "../../movie/textSubstitution.js"
import {
    SquaddieConditionDecaysAt,
    SquaddieConditionService,
    SquaddieConditionSource,
    SquaddieConditionType,
} from "../../proficiency/squaddieCondition.js"

describe("resolving a condition's glossary term as a definition template", () => {
    it("substitutes the live condition's source and remaining duration into the definition text", () => {
        const glossaryManager = new GlossaryManager(
            GlossaryCollectionService.new()
        )
        glossaryManager.addTermsFromJson({
            terms: [
                {
                    termId: "condition.ARMOR",
                    name: { "en-us": { text: "Armor" } },
                    definition: {
                        "en-us": {
                            text: "({SOURCE}, {DURATION} rounds) Reduces the chance to get hit",
                        },
                    },
                },
            ],
        })
        const armorCondition = SquaddieConditionService.new({
            type: SquaddieConditionType.ARMOR,
            source: SquaddieConditionSource.ITEM,
            amount: { amount: 2 },
            duration: {
                duration: 3,
                decaysAt: SquaddieConditionDecaysAt.TURN_END,
            },
        })

        const resolvedTerm = glossaryManager.resolveTerm(
            `condition.${armorCondition.type}`,
            "en-us"
        )
        expect(resolvedTerm).toBeDefined()
        const definition = TextSubstitutionService.substitute(
            resolvedTerm!.definition,
            {
                SOURCE: armorCondition.source,
                DURATION: String(armorCondition.limit.duration!.duration),
            }
        )

        expect(definition).toBe(
            "(ITEM, 3 rounds) Reduces the chance to get hit"
        )
    })
})
