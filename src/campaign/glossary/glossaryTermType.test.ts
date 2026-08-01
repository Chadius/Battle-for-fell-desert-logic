import { describe, expect, it } from "vitest"
import {
    GlossaryTermType,
    GlossaryTermTypeService,
} from "./glossaryTermType.js"
import { ActionRange } from "../../squaddieAction/actionRange.js"
import { SquaddieConditionType } from "../../proficiency/squaddieCondition.js"

describe("GlossaryTermTypeService.subtypesOf", () => {
    describe("when the type has a fixed set of game values", () => {
        it("returns every value of the underlying ActionRange enum", () => {
            expect(
                GlossaryTermTypeService.subtypesOf(
                    GlossaryTermType.ACTION_RANGE
                )
            ).toEqual(Object.values(ActionRange))
        })

        it("returns every value of the underlying SquaddieConditionType enum", () => {
            expect(
                GlossaryTermTypeService.subtypesOf(
                    GlossaryTermType.SQUADDIE_CONDITION_TYPE
                )
            ).toEqual(Object.values(SquaddieConditionType))
        })
    })

    describe("when the type is OTHER", () => {
        it("returns undefined so editors fall back to a free text field", () => {
            expect(
                GlossaryTermTypeService.subtypesOf(GlossaryTermType.OTHER)
            ).toBeUndefined()
        })
    })
})
