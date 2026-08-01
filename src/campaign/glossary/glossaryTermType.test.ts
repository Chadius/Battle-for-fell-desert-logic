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

describe("GlossaryTermTypeService.termIdPrefix", () => {
    describe("when the type has a fixed set of game values", () => {
        it("returns the settled termId prefix for ACTION_RANGE", () => {
            expect(
                GlossaryTermTypeService.termIdPrefix(
                    GlossaryTermType.ACTION_RANGE
                )
            ).toBe("actionRange")
        })
    })

    describe("when the type is OTHER", () => {
        it("returns undefined so editors fall back to a free text termId", () => {
            expect(
                GlossaryTermTypeService.termIdPrefix(GlossaryTermType.OTHER)
            ).toBeUndefined()
        })
    })
})

describe("GlossaryTermTypeService.termIdFor", () => {
    describe("when the type has a fixed termId prefix", () => {
        it("returns the termId used to look up the subtype's glossary entry", () => {
            expect(
                GlossaryTermTypeService.termIdFor(
                    GlossaryTermType.SQUADDIE_CONDITION_TYPE,
                    "ARMOR"
                )
            ).toBe("condition.ARMOR")
        })
    })

    describe("when the type is OTHER", () => {
        it("throws an error naming the calling function", () => {
            expect(() =>
                GlossaryTermTypeService.termIdFor(
                    GlossaryTermType.OTHER,
                    "ARMOR"
                )
            ).toThrow("[GlossaryTermTypeService.termIdFor]")
        })
    })
})
