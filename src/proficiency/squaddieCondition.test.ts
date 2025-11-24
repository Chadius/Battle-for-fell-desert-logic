import { describe, expect, it } from "vitest"

import {
    SquaddieConditionService,
    SquaddieConditionType,
} from "./squaddieCondition.ts"

describe("Squaddie Condition", () => {
    describe("Is helpful", () => {
        it("is when type is helpful and binary", () => {
            expect(
                SquaddieConditionService.isHelpful(
                    SquaddieConditionService.new({
                        type: SquaddieConditionType.ELUSIVE,
                        amount: undefined,
                        duration: 1,
                    })
                )
            ).toBeTruthy()
        })
        it("is when type is helpful and amount is positive", () => {
            expect(
                SquaddieConditionService.isHelpful(
                    SquaddieConditionService.new({
                        type: SquaddieConditionType.ABSORB,
                        amount: 1,
                        duration: 1,
                    })
                )
            ).toBeTruthy()
        })
        it("is not when type is helpful and amount is not positive", () => {
            expect(
                SquaddieConditionService.isHelpful(
                    SquaddieConditionService.new({
                        type: SquaddieConditionType.ARMOR,
                        amount: -1,
                        duration: 1,
                    })
                )
            ).toBeFalsy()
        })
    })
    describe("Is hindering", () => {
        it("is when type is hindering and amount is positive", () => {
            expect(
                SquaddieConditionService.isHindering(
                    SquaddieConditionService.new({
                        type: SquaddieConditionType.SLOWED,
                        amount: 1,
                        duration: 1,
                    })
                )
            ).toBeTruthy()
        })
        it("is when type is helpful and amount is not positive", () => {
            expect(
                SquaddieConditionService.isHindering(
                    SquaddieConditionService.new({
                        type: SquaddieConditionType.ARMOR,
                        amount: -1,
                        duration: 1,
                    })
                )
            ).toBeTruthy()
        })
    })
})
