import { beforeEach, describe, expect, it } from "vitest"
import {
    MovieEngine,
    MovieEngineCommand,
    MovieEngineState,
} from "./movieEngine.js"
import { MovieDecisionRejectionReason } from "./movieDecisionRejection.js"
import {
    createOneDecisionMovie,
    OneDecisionMovieIds,
} from "../testUtils/movie/oneDecisionMovie.js"

const noMoviePlayingRejection = {
    isValid: false,
    rejection: { reason: MovieDecisionRejectionReason.NO_MOVIE_PLAYING },
}

describe("MovieEngine selectDecision when the movie is not playing", () => {
    describe("when the movie was stopped on a DECISION line", () => {
        let engine: MovieEngine
        beforeEach(() => {
            engine = new MovieEngine(createOneDecisionMovie())
            engine.processCommand(MovieEngineCommand.STOP)
        })

        it("rejects the decision because no movie is playing", () => {
            expect(
                engine.selectDecision(OneDecisionMovieIds.firstChoice)
            ).toEqual(noMoviePlayingRejection)
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

            expect(
                engine.selectDecision(OneDecisionMovieIds.secondChoice)
            ).toEqual(noMoviePlayingRejection)
        })
    })
})
