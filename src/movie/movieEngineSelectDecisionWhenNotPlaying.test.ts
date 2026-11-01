import { beforeEach, describe, expect, it } from "vitest"
import {
    MovieEngine,
    MovieEngineCommand,
    MovieEngineState,
} from "./movieEngine.js"
import {
    createOneDecisionMovie,
    OneDecisionMovieIds,
} from "../testUtils/movie/oneDecisionMovie.js"

describe("MovieEngine selectDecision when the movie is not playing", () => {
    describe("when the movie was stopped on a DECISION line", () => {
        let engine: MovieEngine
        beforeEach(() => {
            engine = new MovieEngine(createOneDecisionMovie())
            engine.processCommand(MovieEngineCommand.STOP)
        })

        it("rejects the decision because no movie is playing", () => {
            const result = engine.selectDecision(
                OneDecisionMovieIds.firstChoice
            )

            expect(result.message).toContain("no movie is playing")
        })

        it("keeps the movie stopped", () => {
            engine.selectDecision(OneDecisionMovieIds.firstChoice)

            expect(engine.result()?.state).toBe(MovieEngineState.STOPPED)
        })

        it("does not record the decision", () => {
            engine.selectDecision(OneDecisionMovieIds.firstChoice)

            expect(engine.result()?.decisions).toEqual([])
        })
    })

    describe("when the player's decision has finished the movie", () => {
        it("rejects a second decision because no movie is playing", () => {
            const engine = new MovieEngine(createOneDecisionMovie())
            engine.selectDecision(OneDecisionMovieIds.firstChoice)

            const result = engine.selectDecision(
                OneDecisionMovieIds.secondChoice
            )

            expect(result.message).toContain("no movie is playing")
        })
    })
})
