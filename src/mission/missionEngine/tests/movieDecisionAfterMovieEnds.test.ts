import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine.js"
import {
    MovieEngineCommand,
    MovieEngineState,
} from "../../../movie/movieEngine.js"
import {
    createOneDecisionMovie,
    OneDecisionMovieIds,
} from "../../../testUtils/movie/oneDecisionMovie.js"

describe("MissionEngine selectMovieDecision after a movie ends", () => {
    describe("when the player's decision has finished the movie", () => {
        it("rejects a second decision because no movie is playing", () => {
            const engine = new MissionEngine()
            engine.playMovie(createOneDecisionMovie())
            engine.selectMovieDecision(OneDecisionMovieIds.firstChoice)

            const result = engine.selectMovieDecision(
                OneDecisionMovieIds.secondChoice
            )

            expect(result.message).toContain("no movie is playing")
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
            const result = engine.selectMovieDecision(
                OneDecisionMovieIds.firstChoice
            )

            expect(result.message).toContain("no movie is playing")
        })

        it("leaves the movie stopped", () => {
            engine.selectMovieDecision(OneDecisionMovieIds.firstChoice)

            expect(engine.getMovieStatus()?.state).toBe(
                MovieEngineState.STOPPED
            )
        })
    })
})
