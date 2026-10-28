import { describe, expect, it } from "vitest"
import { SquaddieActionService } from "./squaddieAction.js"
import { DegreeOfSuccess } from "../degreesOfSuccess/degreeOfSuccess.js"

describe("SquaddieAction deserialization", () => {
    describe("when the JSON still has a display name from before names moved to displayNames.json", () => {
        it("loads the action without the name", () => {
            const warcry = SquaddieActionService.new({
                id: "warcry",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
            })

            const restored = SquaddieActionService.deserialize({
                ...SquaddieActionService.serialize(warcry),
                name: "Warcry",
            })

            expect(restored).toEqual(warcry)
        })
    })
})
