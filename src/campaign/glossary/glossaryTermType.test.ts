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

    describe("when the type's subtypes are dynamic campaign/mission content", () => {
        it("returns undefined for SQUADDIE_ACTION since action ids aren't a compile-time enum", () => {
            expect(
                GlossaryTermTypeService.subtypesOf(
                    GlossaryTermType.SQUADDIE_ACTION
                )
            ).toBeUndefined()
        })

        it("returns undefined for SQUADDIE_ITEM since item ids aren't a compile-time enum", () => {
            expect(
                GlossaryTermTypeService.subtypesOf(
                    GlossaryTermType.SQUADDIE_ITEM
                )
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

    describe("when the type has dynamic subtypes but a fixed prefix", () => {
        it("returns the settled termId prefix for SQUADDIE_ACTION", () => {
            expect(
                GlossaryTermTypeService.termIdPrefix(
                    GlossaryTermType.SQUADDIE_ACTION
                )
            ).toBe("action")
        })

        it("returns the settled termId prefix for SQUADDIE_ITEM", () => {
            expect(
                GlossaryTermTypeService.termIdPrefix(
                    GlossaryTermType.SQUADDIE_ITEM
                )
            ).toBe("item")
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

    describe("when the type has dynamic subtypes but a fixed termId prefix", () => {
        it("builds a termId from a squaddie action's own id", () => {
            expect(
                GlossaryTermTypeService.termIdFor(
                    GlossaryTermType.SQUADDIE_ACTION,
                    "scimitar"
                )
            ).toBe("action.scimitar")
        })

        it("builds a termId from a squaddie item's own id", () => {
            expect(
                GlossaryTermTypeService.termIdFor(
                    GlossaryTermType.SQUADDIE_ITEM,
                    "healing-potion"
                )
            ).toBe("item.healing-potion")
        })
    })
})
