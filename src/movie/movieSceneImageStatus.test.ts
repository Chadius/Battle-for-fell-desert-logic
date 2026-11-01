import { describe, expect, it } from "vitest"
import {
    type MovieSceneImage,
    MovieSceneImageCommand,
    MovieSceneImagePhase,
    MovieSceneImageService,
    type MovieSceneImageState,
} from "./movieSceneImage.js"

const makeSceneWithTransitions = (): MovieSceneImage =>
    MovieSceneImageService.new({
        id: "scene-1",
        introTransition: { durationMs: 1000 },
        exitTransition: { durationMs: 500 },
    })

const makeSceneInDisplay = (): MovieSceneImage =>
    MovieSceneImageService.new({
        id: "scene-1",
        exitTransition: { durationMs: 500 },
    })

describe("MovieSceneImageService.status", () => {
    describe("while the scene is displayed", () => {
        it("reports the scene with no transition or scroll progress", () => {
            const movieSceneImage = makeSceneInDisplay()

            const status = MovieSceneImageService.status(
                movieSceneImage,
                MovieSceneImageService.initialState(movieSceneImage)
            )

            expect(status).toEqual({
                type: "IMAGE",
                sceneId: "scene-1",
                phase: MovieSceneImagePhase.DISPLAY,
                transitionProgress: 0,
                autoScrollProgress: { x: 0, y: 0 },
                manualScrollOffset: { x: 0, y: 0 },
            })
        })
    })

    describe("partway through the intro transition", () => {
        it("reports the fraction of the intro that has elapsed", () => {
            const movieSceneImage = makeSceneWithTransitions()
            const movieSceneImageState = MovieSceneImageService.tick(
                movieSceneImage,
                MovieSceneImageService.initialState(movieSceneImage),
                250
            )

            const status = MovieSceneImageService.status(
                movieSceneImage,
                movieSceneImageState
            )

            expect(status.transitionProgress).toBe(0.25)
        })
    })

    describe("partway through the exit transition", () => {
        it("reports the fraction of the exit that has elapsed", () => {
            const movieSceneImage = makeSceneInDisplay()
            const movieSceneImageState = MovieSceneImageService.tick(
                movieSceneImage,
                MovieSceneImageService.stateAfterCommand(
                    movieSceneImage,
                    MovieSceneImageService.initialState(movieSceneImage),
                    MovieSceneImageCommand.CONFIRM
                ),
                100
            )

            const status = MovieSceneImageService.status(
                movieSceneImage,
                movieSceneImageState
            )

            expect(status.transitionProgress).toBe(0.2)
        })
    })

    describe("when elapsed time overruns the transition", () => {
        it("reports the transition as finished, not past finished", () => {
            const movieSceneImage = makeSceneWithTransitions()
            const overrunState: MovieSceneImageState = {
                ...MovieSceneImageService.initialState(movieSceneImage),
                phaseElapsedMs: 1500,
            }

            const status = MovieSceneImageService.status(
                movieSceneImage,
                overrunState
            )

            expect(status.transitionProgress).toBe(1)
        })
    })
})
