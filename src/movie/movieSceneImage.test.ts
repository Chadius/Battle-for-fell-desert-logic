import { describe, expect, it } from "vitest"
import {
    type MovieSceneImage,
    MovieSceneImageCommand,
    MovieSceneImagePhase,
    MovieSceneImageService,
    type MovieSceneImageState,
} from "./movieSceneImage"
import { ResourceManifestCollectionService } from "../resource/resourceManifestCollection"
import { ResourceManifestEntryService } from "../resource/resourceManifest"

const makeImageEntry = () =>
    ResourceManifestEntryService.new({
        id: "battlefield-overview",
        label: "Battlefield Overview",
        description: {
            "en-us": { text: "A tactical map of the fell desert" },
            "fr-fr": { text: "Une carte tactique du désert maudit" },
        },
        filepath: "./battlefield.png",
        format: "PNG",
        type: "IMAGE",
    })

const makeCollection = () => {
    let collection = ResourceManifestCollectionService.new()
    collection = ResourceManifestCollectionService.add(
        collection,
        "battlefield-overview",
        makeImageEntry()
    )
    return collection
}

const makeScene = (
    overrides: Partial<Parameters<typeof MovieSceneImageService.new>[0]> = {}
): MovieSceneImage =>
    MovieSceneImageService.new({
        id: "scene-1",
        resourceManifestEntryId: "battlefield-overview",
        introTransition: { durationMs: 1000 },
        exitTransition: { durationMs: 500 },
        ...overrides,
    })

const makeDisplayState = (
    overrides: Partial<MovieSceneImageState> = {}
): MovieSceneImageState => ({
    phase: MovieSceneImagePhase.DISPLAY,
    phaseElapsedMs: 0,
    isFastForward: false,
    manualScrollOffset: { x: 0, y: 0 },
    ...overrides,
})

const makeCompleteState = (
    overrides: Partial<MovieSceneImageState> = {}
): MovieSceneImageState => ({
    phase: MovieSceneImagePhase.COMPLETE,
    phaseElapsedMs: 0,
    isFastForward: false,
    manualScrollOffset: { x: 0, y: 0 },
    ...overrides,
})

describe("MovieSceneImage", () => {
    describe("new()", () => {
        it("stores all fields", () => {
            const scene = MovieSceneImageService.new({
                id: "tutorial-1",
                resourceManifestEntryId: "tutorial-img",
                caption: "Move your squaddie forward.",
                introTransition: { durationMs: 800 },
                exitTransition: { durationMs: 400 },
                manualScrollEnabled: true,
                autoScroll: { direction: "VERTICAL", durationMs: 3000 },
            })
            expect(scene.id).toBe("tutorial-1")
            expect(scene.resourceManifestEntryId).toBe("tutorial-img")
            expect(scene.caption).toBe("Move your squaddie forward.")
            expect(scene.introTransition).toEqual({ durationMs: 800 })
            expect(scene.exitTransition).toEqual({ durationMs: 400 })
            expect(scene.manualScrollEnabled).toBe(true)
            expect(scene.autoScroll).toEqual({
                direction: "VERTICAL",
                durationMs: 3000,
            })
        })

        it("caption defaults to undefined when not provided", () => {
            const scene = makeScene({ caption: undefined })
            expect(scene.caption).toBeUndefined()
        })

        it("manualScrollEnabled defaults to false when not provided", () => {
            const scene = makeScene({ manualScrollEnabled: undefined })
            expect(scene.manualScrollEnabled).toBe(false)
        })
    })

    describe("createInitialState()", () => {
        it("starts in INTRO_TRANSITION when introTransition is defined", () => {
            const scene = makeScene({ introTransition: { durationMs: 1000 } })
            const state = MovieSceneImageService.initialState(scene)
            expect(state.phase).toBe(MovieSceneImagePhase.INTRO_TRANSITION)
            expect(state.phaseElapsedMs).toBe(0)
            expect(state.isFastForward).toBe(false)
            expect(state.manualScrollOffset).toEqual({ x: 0, y: 0 })
        })

        it("starts in DISPLAY when no introTransition", () => {
            const scene = makeScene({ introTransition: undefined })
            const state = MovieSceneImageService.initialState(scene)
            expect(state.phase).toBe(MovieSceneImagePhase.DISPLAY)
        })
    })

    describe("tick() — INTRO_TRANSITION", () => {
        it("advances phaseElapsedMs while under duration", () => {
            const scene = makeScene({ introTransition: { durationMs: 1000 } })
            const state = MovieSceneImageService.initialState(scene)
            const next = MovieSceneImageService.tick(scene, state, 400)
            expect(next.phase).toBe(MovieSceneImagePhase.INTRO_TRANSITION)
            expect(next.phaseElapsedMs).toBe(400)
        })

        it("transitions to DISPLAY when elapsed reaches duration", () => {
            const scene = makeScene({ introTransition: { durationMs: 1000 } })
            const state = MovieSceneImageService.initialState(scene)
            const next = MovieSceneImageService.tick(scene, state, 1000)
            expect(next.phase).toBe(MovieSceneImagePhase.DISPLAY)
            expect(next.phaseElapsedMs).toBe(0)
        })

        it("transitions to DISPLAY when elapsed exceeds duration", () => {
            const scene = makeScene({ introTransition: { durationMs: 1000 } })
            const state = MovieSceneImageService.initialState(scene)
            const next = MovieSceneImageService.tick(scene, state, 1200)
            expect(next.phase).toBe(MovieSceneImagePhase.DISPLAY)
        })

        it("transitions to COMPLETE when intro finishes and isFastForward is true", () => {
            const scene = makeScene({ introTransition: { durationMs: 1000 } })
            const stateWithFF: MovieSceneImageState = {
                phase: MovieSceneImagePhase.INTRO_TRANSITION,
                phaseElapsedMs: 0,
                isFastForward: true,
                manualScrollOffset: { x: 0, y: 0 },
            }
            const next = MovieSceneImageService.tick(scene, stateWithFF, 1000)
            expect(next.phase).toBe(MovieSceneImagePhase.COMPLETE)
        })

        it("does not skip intro when isFastForward is true but duration not reached", () => {
            const scene = makeScene({ introTransition: { durationMs: 1000 } })
            const stateWithFF: MovieSceneImageState = {
                phase: MovieSceneImagePhase.INTRO_TRANSITION,
                phaseElapsedMs: 0,
                isFastForward: true,
                manualScrollOffset: { x: 0, y: 0 },
            }
            const next = MovieSceneImageService.tick(scene, stateWithFF, 400)
            expect(next.phase).toBe(MovieSceneImagePhase.INTRO_TRANSITION)
            expect(next.phaseElapsedMs).toBe(400)
        })
    })

    describe("tick() — DISPLAY", () => {
        it("accumulates elapsed time for auto-scroll progress", () => {
            const scene = makeScene()
            const state = makeDisplayState()
            const next = MovieSceneImageService.tick(scene, state, 300)
            expect(next.phase).toBe(MovieSceneImagePhase.DISPLAY)
            expect(next.phaseElapsedMs).toBe(300)
        })

        it("goes to COMPLETE immediately when isFastForward is true", () => {
            const scene = makeScene()
            const state = makeDisplayState({ isFastForward: true })
            const next = MovieSceneImageService.tick(scene, state, 300)
            expect(next.phase).toBe(MovieSceneImagePhase.COMPLETE)
        })
    })

    describe("tick() — EXIT_TRANSITION", () => {
        const makeExitState = (
            overrides: Partial<MovieSceneImageState> = {}
        ): MovieSceneImageState => ({
            phase: MovieSceneImagePhase.EXIT_TRANSITION,
            phaseElapsedMs: 0,
            isFastForward: false,
            manualScrollOffset: { x: 0, y: 0 },
            ...overrides,
        })

        it("advances phaseElapsedMs while under duration", () => {
            const scene = makeScene({ exitTransition: { durationMs: 500 } })
            const state = makeExitState()
            const next = MovieSceneImageService.tick(scene, state, 200)
            expect(next.phase).toBe(MovieSceneImagePhase.EXIT_TRANSITION)
            expect(next.phaseElapsedMs).toBe(200)
        })

        it("transitions to COMPLETE when elapsed reaches duration", () => {
            const scene = makeScene({ exitTransition: { durationMs: 500 } })
            const state = makeExitState()
            const next = MovieSceneImageService.tick(scene, state, 500)
            expect(next.phase).toBe(MovieSceneImagePhase.COMPLETE)
        })

        it("goes to COMPLETE immediately when isFastForward is true", () => {
            const scene = makeScene({ exitTransition: { durationMs: 500 } })
            const state = makeExitState({ isFastForward: true })
            const next = MovieSceneImageService.tick(scene, state, 100)
            expect(next.phase).toBe(MovieSceneImagePhase.COMPLETE)
        })
    })

    describe("tick() — COMPLETE", () => {
        it("leaves all state unchanged when already COMPLETE", () => {
            const scene = makeScene()
            const state = makeCompleteState()
            const next = MovieSceneImageService.tick(scene, state, 500)
            expect(next).toEqual(state)
        })
    })

    describe("processCommand() — CONFIRM", () => {
        it("transitions DISPLAY → EXIT_TRANSITION when exitTransition is defined", () => {
            const scene = makeScene({ exitTransition: { durationMs: 500 } })
            const state = makeDisplayState()
            const next = MovieSceneImageService.stateAfterCommand(
                scene,
                state,
                MovieSceneImageCommand.CONFIRM
            )
            expect(next.phase).toBe(MovieSceneImagePhase.EXIT_TRANSITION)
            expect(next.phaseElapsedMs).toBe(0)
        })

        it("transitions DISPLAY → COMPLETE when no exitTransition", () => {
            const scene = makeScene({ exitTransition: undefined })
            const state = makeDisplayState()
            const next = MovieSceneImageService.stateAfterCommand(
                scene,
                state,
                MovieSceneImageCommand.CONFIRM
            )
            expect(next.phase).toBe(MovieSceneImagePhase.COMPLETE)
        })

        it("transitions DISPLAY → COMPLETE when isFastForward is true, skipping exit", () => {
            const scene = makeScene({ exitTransition: { durationMs: 500 } })
            const state = makeDisplayState({ isFastForward: true })
            const next = MovieSceneImageService.stateAfterCommand(
                scene,
                state,
                MovieSceneImageCommand.CONFIRM
            )
            expect(next.phase).toBe(MovieSceneImagePhase.COMPLETE)
        })

        it("is ignored during INTRO_TRANSITION", () => {
            const scene = makeScene()
            const state = MovieSceneImageService.initialState(scene)
            const next = MovieSceneImageService.stateAfterCommand(
                scene,
                state,
                MovieSceneImageCommand.CONFIRM
            )
            expect(next.phase).toBe(MovieSceneImagePhase.INTRO_TRANSITION)
        })

        it("leaves all state unchanged when already COMPLETE", () => {
            const scene = makeScene()
            const state = makeCompleteState()
            const next = MovieSceneImageService.stateAfterCommand(
                scene,
                state,
                MovieSceneImageCommand.CONFIRM
            )
            expect(next).toEqual(state)
        })
    })

    describe("processCommand() — FAST_FORWARD", () => {
        it("sets isFastForward during INTRO_TRANSITION without changing phase", () => {
            const scene = makeScene()
            const state = MovieSceneImageService.initialState(scene)
            const next = MovieSceneImageService.stateAfterCommand(
                scene,
                state,
                MovieSceneImageCommand.FAST_FORWARD
            )
            expect(next.phase).toBe(MovieSceneImagePhase.INTRO_TRANSITION)
            expect(next.isFastForward).toBe(true)
        })

        it("transitions to COMPLETE during DISPLAY", () => {
            const scene = makeScene()
            const state = makeDisplayState()
            const next = MovieSceneImageService.stateAfterCommand(
                scene,
                state,
                MovieSceneImageCommand.FAST_FORWARD
            )
            expect(next.phase).toBe(MovieSceneImagePhase.COMPLETE)
            expect(next.isFastForward).toBe(true)
        })

        it("transitions to COMPLETE during EXIT_TRANSITION", () => {
            const scene = makeScene()
            const state: MovieSceneImageState = {
                phase: MovieSceneImagePhase.EXIT_TRANSITION,
                phaseElapsedMs: 100,
                isFastForward: false,
                manualScrollOffset: { x: 0, y: 0 },
            }
            const next = MovieSceneImageService.stateAfterCommand(
                scene,
                state,
                MovieSceneImageCommand.FAST_FORWARD
            )
            expect(next.phase).toBe(MovieSceneImagePhase.COMPLETE)
            expect(next.isFastForward).toBe(true)
        })
    })

    describe("processCommand() — SCROLL commands", () => {
        it("SCROLL_UP decreases y offset when manualScrollEnabled", () => {
            const scene = makeScene({ manualScrollEnabled: true })
            const state = makeDisplayState()
            const next = MovieSceneImageService.stateAfterCommand(
                scene,
                state,
                MovieSceneImageCommand.SCROLL_UP
            )
            expect(next.manualScrollOffset).toEqual({ x: 0, y: -1 })
        })

        it("SCROLL_DOWN increases y offset when manualScrollEnabled", () => {
            const scene = makeScene({ manualScrollEnabled: true })
            const state = makeDisplayState()
            const next = MovieSceneImageService.stateAfterCommand(
                scene,
                state,
                MovieSceneImageCommand.SCROLL_DOWN
            )
            expect(next.manualScrollOffset).toEqual({ x: 0, y: 1 })
        })

        it("SCROLL_LEFT decreases x offset when manualScrollEnabled", () => {
            const scene = makeScene({ manualScrollEnabled: true })
            const state = makeDisplayState()
            const next = MovieSceneImageService.stateAfterCommand(
                scene,
                state,
                MovieSceneImageCommand.SCROLL_LEFT
            )
            expect(next.manualScrollOffset).toEqual({ x: -1, y: 0 })
        })

        it("SCROLL_RIGHT increases x offset when manualScrollEnabled", () => {
            const scene = makeScene({ manualScrollEnabled: true })
            const state = makeDisplayState()
            const next = MovieSceneImageService.stateAfterCommand(
                scene,
                state,
                MovieSceneImageCommand.SCROLL_RIGHT
            )
            expect(next.manualScrollOffset).toEqual({ x: 1, y: 0 })
        })

        it("scroll commands are ignored when manualScrollEnabled is false", () => {
            const scene = makeScene({ manualScrollEnabled: false })
            const state = makeDisplayState()
            const next = MovieSceneImageService.stateAfterCommand(
                scene,
                state,
                MovieSceneImageCommand.SCROLL_DOWN
            )
            expect(next.manualScrollOffset).toEqual({ x: 0, y: 0 })
        })

        it("scroll commands are ignored during INTRO_TRANSITION even when manualScrollEnabled", () => {
            const scene = makeScene({ manualScrollEnabled: true })
            const state = MovieSceneImageService.initialState(scene)
            const next = MovieSceneImageService.stateAfterCommand(
                scene,
                state,
                MovieSceneImageCommand.SCROLL_DOWN
            )
            expect(next.manualScrollOffset).toEqual({ x: 0, y: 0 })
        })
    })

    describe("isComplete()", () => {
        it("returns false when not COMPLETE", () => {
            const scene = makeScene()
            const state = MovieSceneImageService.initialState(scene)
            expect(MovieSceneImageService.isComplete(state)).toBe(false)
        })

        it("returns true when phase is COMPLETE", () => {
            const state = makeCompleteState()
            expect(MovieSceneImageService.isComplete(state)).toBe(true)
        })
    })

    describe("canSkip()", () => {
        it("always returns true", () => {
            expect(MovieSceneImageService.canSkip(makeScene())).toBe(true)
        })
    })

    describe("getAutoScrollProgress()", () => {
        it("returns zero when no autoScroll defined", () => {
            const scene = makeScene({ autoScroll: undefined })
            const state = makeDisplayState({ phaseElapsedMs: 2000 })
            expect(
                MovieSceneImageService.autoScrollProgress(scene, state)
            ).toEqual({ x: 0, y: 0 })
        })

        it("returns zero when not in DISPLAY phase", () => {
            const scene = makeScene({
                autoScroll: { direction: "VERTICAL", durationMs: 4000 },
            })
            const state = MovieSceneImageService.initialState(scene)
            expect(
                MovieSceneImageService.autoScrollProgress(scene, state)
            ).toEqual({ x: 0, y: 0 })
        })

        it("returns vertical progress for VERTICAL direction", () => {
            const scene = makeScene({
                autoScroll: { direction: "VERTICAL", durationMs: 4000 },
            })
            const state = makeDisplayState({ phaseElapsedMs: 2000 })
            expect(
                MovieSceneImageService.autoScrollProgress(scene, state)
            ).toEqual({ x: 0, y: 0.5 })
        })

        it("returns horizontal progress for HORIZONTAL direction", () => {
            const scene = makeScene({
                autoScroll: { direction: "HORIZONTAL", durationMs: 4000 },
            })
            const state = makeDisplayState({ phaseElapsedMs: 1000 })
            expect(
                MovieSceneImageService.autoScrollProgress(scene, state)
            ).toEqual({ x: 0.25, y: 0 })
        })

        it("clamps progress to 1.0 when elapsed exceeds duration", () => {
            const scene = makeScene({
                autoScroll: { direction: "VERTICAL", durationMs: 4000 },
            })
            const state = makeDisplayState({ phaseElapsedMs: 9000 })
            expect(
                MovieSceneImageService.autoScrollProgress(scene, state)
            ).toEqual({ x: 0, y: 1 })
        })
    })

    describe("getImageEntry()", () => {
        it("returns the entry when present in the collection", () => {
            const scene = makeScene()
            const collection = makeCollection()
            const entry = MovieSceneImageService.imageEntry(scene, collection)
            expect(entry).toBeDefined()
            expect(entry?.id).toBe("battlefield-overview")
        })

        it("returns undefined when entry is not in the collection", () => {
            const scene = makeScene({ resourceManifestEntryId: "missing-id" })
            const collection = makeCollection()
            expect(
                MovieSceneImageService.imageEntry(scene, collection)
            ).toBeUndefined()
        })
    })

    describe("getDescription()", () => {
        it("returns en-us description by default", () => {
            const scene = makeScene()
            const collection = makeCollection()
            expect(MovieSceneImageService.description(scene, collection)).toBe(
                "A tactical map of the fell desert"
            )
        })

        it("returns description for the requested language code", () => {
            const scene = makeScene()
            const collection = makeCollection()
            expect(
                MovieSceneImageService.description(scene, collection, "fr-fr")
            ).toBe("Une carte tactique du désert maudit")
        })

        it("returns a warning prefix when requested language is missing", () => {
            const scene = makeScene()
            const collection = makeCollection()
            const result = MovieSceneImageService.description(
                scene,
                collection,
                "de-de"
            )
            expect(result).toMatch(/^de-de MISSING: /)
        })

        it("returns undefined when entry is not in the collection", () => {
            const scene = makeScene({ resourceManifestEntryId: "missing-id" })
            const collection = makeCollection()
            expect(
                MovieSceneImageService.description(scene, collection)
            ).toBeUndefined()
        })
    })
})
