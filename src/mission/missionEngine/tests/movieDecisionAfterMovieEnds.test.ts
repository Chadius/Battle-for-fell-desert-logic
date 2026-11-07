import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine.js"
import {
    MovieEngineCommand,
    MovieEngineState,
} from "../../../movie/movieEngine.js"
import { MovieDecisionRejectionReason } from "../../../movie/movieDecisionRejection.js"
import {
    createOneDecisionMovie,
    OneDecisionMovieIds,
} from "../../../testUtils/movie/oneDecisionMovie.js"

const noMoviePlayingRejection = {
    isValid: false,
    rejection: { reason: MovieDecisionRejectionReason.NO_MOVIE_PLAYING },
}

describe("MissionEngine selectMovieDecision after a movie ends", () => {
    describe("when the player's decision has finished the movie", () => {
        it("rejects a second decision because no movie is playing", () => {
            const engine = new MissionEngine()
            engine.playMovie(createOneDecisionMovie())
            engine.selectMovieDecision(OneDecisionMovieIds.firstChoice)

            expect(
                engine.selectMovieDecision(OneDecisionMovieIds.secondChoice)
            ).toEqual(noMoviePlayingRejection)
        })
    })

    describe("when the movie was stopped on a DECISION line", () => {
        let engine: MissionEngine
        beforeEach(() => {
            engine = new MissionEngine()
            engine.playMovie(createOneDecisionMovie())
            engine.processMovieCommand(MovieEngineCommand.STOP)
        })

        it("rejects the decision because no movie is playing", () => {
            expect(
                engine.selectMovieDecision(OneDecisionMovieIds.firstChoice)
            ).toEqual(noMoviePlayingRejection)
        })

        it("leaves the movie stopped", () => {
            engine.selectMovieDecision(OneDecisionMovieIds.firstChoice)

            expect(engine.getMovieStatus()?.state).toBe(
                MovieEngineState.STOPPED
            )
        })
    })
})
