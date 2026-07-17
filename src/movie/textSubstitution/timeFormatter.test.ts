import { describe, expect, it } from "vitest"
import { TimeFormatterService } from "./timeFormatter.js"

describe("TimeFormatterService.format", () => {
    it("formats mm:ss including minute overflow past an hour", () => {
        expect(TimeFormatterService.format(83000, "mm:ss")).toBe("01:23")
    })

    it("formats ss alone as total elapsed seconds", () => {
        expect(TimeFormatterService.format(125000, "ss")).toBe("125")
    })

    it("formats hh:mm:ss.SSS with hour and millisecond components", () => {
        expect(TimeFormatterService.format(3723456, "hh:mm:ss.SSS")).toBe(
            "01:02:03.456"
        )
    })

    it("pads single-digit runs with leading zeros to match the run length", () => {
        expect(TimeFormatterService.format(5000, "mm:ss")).toBe("00:05")
    })

    it("leaves punctuation separators untouched", () => {
        expect(TimeFormatterService.format(65000, "m:s")).toBe("1:5")
    })
})
