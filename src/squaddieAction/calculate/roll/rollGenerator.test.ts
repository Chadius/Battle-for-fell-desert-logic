import { describe, expect, it, vi } from "vitest"
import { RollGenerator } from "./rollGenerator.js"

describe("RollGenerator", () => {
    describe("constructor", () => {
        it("can add numbers to the queue using the constructor", () => {
            const generator = new RollGenerator([3, 5, 2, 4])

            const result = generator.roll()
            expect(result).toEqual([3, 5])
        })
    })

    describe("roll with queue", () => {
        it("returns queued numbers when requested, 2 at a time", () => {
            const generator = new RollGenerator([3, 5, 2, 4, 1, 6])

            const firstRoll = generator.roll()
            expect(firstRoll).toEqual([3, 5])

            const secondRoll = generator.roll()
            expect(secondRoll).toEqual([2, 4])

            const thirdRoll = generator.roll()
            expect(thirdRoll).toEqual([1, 6])
        })

        it("can add additional numbers to the queue", () => {
            const generator = new RollGenerator()
            const mathRandomSpy = vi.spyOn(Math, "random")

            generator.addToQueue([9, 11])
            const firstRoll = generator.roll()
            expect(firstRoll).toEqual([3, 5])
            expect(mathRandomSpy).not.toBeCalled()
            mathRandomSpy.mockRestore()
        })
    })

    describe("roll with empty queue", () => {
        it("calls Math.random() 2 times when queue is empty", () => {
            const mathRandomSpy = vi.spyOn(Math, "random")
            mathRandomSpy.mockReturnValueOnce(0.5)
            mathRandomSpy.mockReturnValueOnce(0.0)

            const generator = new RollGenerator()
            const result = generator.roll()

            expect(mathRandomSpy).toHaveBeenCalledTimes(2)
            expect(result).toEqual([4, 1])

            mathRandomSpy.mockRestore()
        })
    })
})
