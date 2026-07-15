import { describe, expect, it } from "vitest"
import { OrdinalFormatterService } from "./ordinalFormatter.js"

describe("OrdinalFormatterService.format", () => {
    it.each([
        [1, "1st"],
        [2, "2nd"],
        [3, "3rd"],
        [4, "4th"],
        [10, "10th"],
        [11, "11th"],
        [12, "12th"],
        [13, "13th"],
        [21, "21st"],
        [111, "111th"],
        [112, "112th"],
        [113, "113th"],
        [0, "0th"],
    ])("formats %i as %s", (value, expected) => {
        expect(OrdinalFormatterService.format(value)).toBe(expected)
    })

    it("rounds non-integer values before formatting", () => {
        expect(OrdinalFormatterService.format(1.6)).toBe("2nd")
    })
})
