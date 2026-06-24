import { MovieSceneCommand } from "./movieSceneCommand"
import type { ResourceManifestCollection } from "../resource/resourceManifestCollection"
import { ResourceManifestCollectionService } from "../resource/resourceManifestCollection"
import {
    type ResourceManifestEntry,
    ResourceManifestEntryService,
} from "../resource/resourceManifest"

export const MovieSceneImageCommand = {
    ...MovieSceneCommand,
    COMPLETE_SCENE: "COMPLETE_SCENE",
    SCROLL_UP: "SCROLL_UP",
    SCROLL_DOWN: "SCROLL_DOWN",
    SCROLL_LEFT: "SCROLL_LEFT",
    SCROLL_RIGHT: "SCROLL_RIGHT",
} as const satisfies Record<string, string>

export type TMovieSceneImageCommand =
    (typeof MovieSceneImageCommand)[keyof typeof MovieSceneImageCommand]

export interface MovieSceneTransition {
    durationMs: number
}

export interface MovieSceneAutoScroll {
    direction: "HORIZONTAL" | "VERTICAL"
    durationMs: number
}

export interface MovieSceneImage {
    id: string
    nextSceneId: string | undefined
    resourceManifestEntryId: string | undefined
    caption: string | undefined
    introTransition: MovieSceneTransition | undefined
    exitTransition: MovieSceneTransition | undefined
    manualScrollEnabled: boolean
    autoScroll: MovieSceneAutoScroll | undefined
}

export const MovieSceneImagePhase = {
    INTRO_TRANSITION: "INTRO_TRANSITION",
    DISPLAY: "DISPLAY",
    EXIT_TRANSITION: "EXIT_TRANSITION",
    COMPLETE: "COMPLETE",
} as const satisfies Record<string, string>

export type TMovieSceneImagePhase =
    (typeof MovieSceneImagePhase)[keyof typeof MovieSceneImagePhase]

export interface MovieSceneImageState {
    phase: TMovieSceneImagePhase
    phaseElapsedMs: number
    isFastForward: boolean
    manualScrollOffset: { x: number; y: number }
}

export const MovieSceneImageService = {
    new: ({
        id,
        nextSceneId,
        resourceManifestEntryId,
        caption,
        introTransition,
        exitTransition,
        manualScrollEnabled,
        autoScroll,
    }: {
        id: string
        nextSceneId?: string
        resourceManifestEntryId?: string
        caption?: string
        introTransition?: MovieSceneTransition
        exitTransition?: MovieSceneTransition
        manualScrollEnabled?: boolean
        autoScroll?: MovieSceneAutoScroll
    }): MovieSceneImage => ({
        id,
        nextSceneId,
        resourceManifestEntryId,
        caption,
        introTransition,
        exitTransition,
        manualScrollEnabled: manualScrollEnabled ?? false,
        autoScroll,
    }),

    initialState: (movieSceneImage: MovieSceneImage): MovieSceneImageState => ({
        phase:
            movieSceneImage.introTransition == undefined
                ? MovieSceneImagePhase.DISPLAY
                : MovieSceneImagePhase.INTRO_TRANSITION,
        phaseElapsedMs: 0,
        isFastForward: false,
        manualScrollOffset: { x: 0, y: 0 },
    }),

    tick: (
        movieSceneImage: MovieSceneImage,
        movieSceneImageState: MovieSceneImageState,
        elapsedMs: number
    ): MovieSceneImageState => {
        switch (movieSceneImageState.phase) {
            case MovieSceneImagePhase.COMPLETE:
                return movieSceneImageState
            case MovieSceneImagePhase.INTRO_TRANSITION:
                if (movieSceneImage.introTransition === undefined)
                    return movieSceneImageState
                return tickedIntroTransitionState(
                    movieSceneImage.introTransition,
                    movieSceneImageState,
                    elapsedMs
                )
            case MovieSceneImagePhase.DISPLAY:
                return tickedDisplayState(movieSceneImageState, elapsedMs)
            case MovieSceneImagePhase.EXIT_TRANSITION:
                if (movieSceneImage.exitTransition === undefined)
                    return movieSceneImageState
                return tickedExitTransitionState(
                    movieSceneImage.exitTransition,
                    movieSceneImageState,
                    elapsedMs
                )
        }
    },

    stateAfterCommand: (
        movieSceneImage: MovieSceneImage,
        movieSceneImageState: MovieSceneImageState,
        command: TMovieSceneImageCommand
    ): MovieSceneImageState => {
        if (movieSceneImageState.phase === MovieSceneImagePhase.COMPLETE)
            return movieSceneImageState
        switch (command) {
            case MovieSceneImageCommand.COMPLETE_SCENE:
                return stateAfterCompleteScene(movieSceneImageState)
            case MovieSceneImageCommand.FAST_FORWARD:
                return stateAfterFastForward(movieSceneImageState)
            case MovieSceneImageCommand.CONFIRM:
                return stateAfterConfirm(movieSceneImage, movieSceneImageState)
            case MovieSceneImageCommand.SCROLL_UP:
                return stateAfterScroll(movieSceneImage, movieSceneImageState, {
                    x: 0,
                    y: -1,
                })
            case MovieSceneImageCommand.SCROLL_DOWN:
                return stateAfterScroll(movieSceneImage, movieSceneImageState, {
                    x: 0,
                    y: 1,
                })
            case MovieSceneImageCommand.SCROLL_LEFT:
                return stateAfterScroll(movieSceneImage, movieSceneImageState, {
                    x: -1,
                    y: 0,
                })
            case MovieSceneImageCommand.SCROLL_RIGHT:
                return stateAfterScroll(movieSceneImage, movieSceneImageState, {
                    x: 1,
                    y: 0,
                })
        }
    },

    commandFromEngineCommand: (
        command: string
    ): TMovieSceneImageCommand | undefined => {
        const validCommands = new Set<string>(
            Object.values(MovieSceneImageCommand)
        )
        return validCommands.has(command)
            ? (command as TMovieSceneImageCommand)
            : undefined
    },

    isComplete: (movieSceneImageState: MovieSceneImageState): boolean =>
        movieSceneImageState.phase === MovieSceneImagePhase.COMPLETE,

    canSkip: (_movieSceneImage: MovieSceneImage): boolean => true,

    autoScrollProgress: (
        movieSceneImage: MovieSceneImage,
        movieSceneImageState: MovieSceneImageState
    ): { x: number; y: number } => {
        if (
            movieSceneImage.autoScroll == undefined ||
            movieSceneImageState.phase !== MovieSceneImagePhase.DISPLAY
        ) {
            return { x: 0, y: 0 }
        }

        const progress = Math.min(
            1,
            movieSceneImageState.phaseElapsedMs /
                movieSceneImage.autoScroll.durationMs
        )
        if (movieSceneImage.autoScroll.direction === "HORIZONTAL") {
            return { x: progress, y: 0 }
        }

        return { x: 0, y: progress }
    },

    imageEntry: (
        movieSceneImage: MovieSceneImage,
        resourceManifestCollection: ResourceManifestCollection
    ): ResourceManifestEntry | undefined => {
        if (movieSceneImage.resourceManifestEntryId == undefined) {
            return undefined
        }
        return ResourceManifestCollectionService.get(
            resourceManifestCollection,
            movieSceneImage.resourceManifestEntryId
        )
    },

    description: (
        movieSceneImage: MovieSceneImage,
        resourceManifestCollection: ResourceManifestCollection,
        languageCode = ResourceManifestEntryService.FALLBACK_LANGUAGE
    ): string | undefined => {
        if (movieSceneImage.resourceManifestEntryId == undefined) {
            return undefined
        }

        const entry = ResourceManifestCollectionService.get(
            resourceManifestCollection,
            movieSceneImage.resourceManifestEntryId
        )
        if (entry == undefined) return undefined

        return ResourceManifestEntryService.getDescription(entry, languageCode)
    },
}

const tickedIntroTransitionState = (
    introTransition: MovieSceneTransition,
    movieSceneImageState: MovieSceneImageState,
    elapsedMs: number
): MovieSceneImageState => {
    const updatedPhaseElapsedMs =
        movieSceneImageState.phaseElapsedMs + elapsedMs
    if (updatedPhaseElapsedMs < introTransition.durationMs) {
        return {
            ...movieSceneImageState,
            phaseElapsedMs: updatedPhaseElapsedMs,
        }
    }
    if (movieSceneImageState.isFastForward) {
        return {
            ...movieSceneImageState,
            phase: MovieSceneImagePhase.COMPLETE,
            phaseElapsedMs: 0,
        }
    }
    return {
        ...movieSceneImageState,
        phase: MovieSceneImagePhase.DISPLAY,
        phaseElapsedMs: 0,
    }
}

const tickedDisplayState = (
    movieSceneImageState: MovieSceneImageState,
    elapsedMs: number
): MovieSceneImageState => {
    if (movieSceneImageState.isFastForward) {
        return {
            ...movieSceneImageState,
            phase: MovieSceneImagePhase.COMPLETE,
            phaseElapsedMs: 0,
        }
    }
    return {
        ...movieSceneImageState,
        phaseElapsedMs: movieSceneImageState.phaseElapsedMs + elapsedMs,
    }
}

const tickedExitTransitionState = (
    exitTransition: MovieSceneTransition,
    movieSceneImageState: MovieSceneImageState,
    elapsedMs: number
): MovieSceneImageState => {
    if (movieSceneImageState.isFastForward) {
        return {
            ...movieSceneImageState,
            phase: MovieSceneImagePhase.COMPLETE,
            phaseElapsedMs: 0,
        }
    }
    const updatedPhaseElapsedMs =
        movieSceneImageState.phaseElapsedMs + elapsedMs
    if (updatedPhaseElapsedMs >= exitTransition.durationMs) {
        return {
            ...movieSceneImageState,
            phase: MovieSceneImagePhase.COMPLETE,
            phaseElapsedMs: 0,
        }
    }
    return {
        ...movieSceneImageState,
        phaseElapsedMs: updatedPhaseElapsedMs,
    }
}

const stateAfterCompleteScene = (
    movieSceneImageState: MovieSceneImageState
): MovieSceneImageState => {
    if (movieSceneImageState.phase === MovieSceneImagePhase.INTRO_TRANSITION)
        return movieSceneImageState
    return {
        ...movieSceneImageState,
        phase: MovieSceneImagePhase.COMPLETE,
        phaseElapsedMs: 0,
    }
}

const stateAfterFastForward = (
    movieSceneImageState: MovieSceneImageState
): MovieSceneImageState => {
    if (movieSceneImageState.phase === MovieSceneImagePhase.INTRO_TRANSITION) {
        return { ...movieSceneImageState, isFastForward: true }
    }
    return {
        ...movieSceneImageState,
        isFastForward: true,
        phase: MovieSceneImagePhase.COMPLETE,
        phaseElapsedMs: 0,
    }
}

const stateAfterConfirm = (
    movieSceneImage: MovieSceneImage,
    movieSceneImageState: MovieSceneImageState
): MovieSceneImageState => {
    if (movieSceneImageState.phase !== MovieSceneImagePhase.DISPLAY)
        return movieSceneImageState
    if (
        movieSceneImage.exitTransition != undefined &&
        !movieSceneImageState.isFastForward
    ) {
        return {
            ...movieSceneImageState,
            phase: MovieSceneImagePhase.EXIT_TRANSITION,
            phaseElapsedMs: 0,
        }
    }
    return {
        ...movieSceneImageState,
        phase: MovieSceneImagePhase.COMPLETE,
        phaseElapsedMs: 0,
    }
}

const stateAfterScroll = (
    movieSceneImage: MovieSceneImage,
    movieSceneImageState: MovieSceneImageState,
    scrollDelta: { x: number; y: number }
): MovieSceneImageState => {
    if (
        movieSceneImageState.phase !== MovieSceneImagePhase.DISPLAY ||
        !movieSceneImage.manualScrollEnabled
    ) {
        return movieSceneImageState
    }
    const { manualScrollOffset } = movieSceneImageState
    return {
        ...movieSceneImageState,
        manualScrollOffset: {
            x: manualScrollOffset.x + scrollDelta.x,
            y: manualScrollOffset.y + scrollDelta.y,
        },
    }
}
