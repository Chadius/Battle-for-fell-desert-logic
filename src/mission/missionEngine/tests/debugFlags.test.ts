import { describe, expect, it } from "vitest"
import { DebugFlagsService } from "../../debugFlags.js"

describe("debugFlags", () => {
    describe("setFlag", () => {
        it("can set boolean fields", () => {
            const original = DebugFlagsService.new()
            const updated = DebugFlagsService.setFlag({
                debugFlags: original,
                flag: "enemyAlwaysEndsTheirTurn",
                value: true,
            })
            expect(updated.enemyAlwaysEndsTheirTurn).toBeTruthy()
        })
    })
})
