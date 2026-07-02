import type { Movie } from "./movie"
import type { ResourceManifestCollection } from "../resource/resourceManifestCollection"
import {
    type MovieSceneImage,
    MovieSceneImageCommand,
    MovieSceneImageService,
    type MovieSceneImageState,
    type TMovieSceneImagePhase,
} from "./movieSceneImage"
import {
    type ConversationSceneStatus,
    type DecisionRecord,
    MovieSceneConversationService,
    type MovieSceneConversationState,
} from "./movieSceneConversation"
import { resolveResourceManifestEntry } from "../resource/resourceManifestResolver"
import { ResourceManifestEntryService } from "../resource/resourceManifest"
import { type MovieScene, MovieSceneType } from "./movieScene"

export const MovieEngineState = {
    PLAYING: "PLAYING",
    DONE: "DONE",
    STOPPED: "STOPPED",
} as const satisfies Record<string, string>

export type TMovieEngineState =
    (typeof MovieEngineState)[keyof typeof MovieEngineState]

interface ImageSceneStatus {
    type: "IMAGE"
    sceneId: string
    phase: TMovieSceneImagePhase
    resourceManifestEntryId: string | undefined
    description: string | undefined
    caption: string | undefined
    transitionProgress: number
    autoScrollProgress: { x: number; y: number }
    manualScrollOffset: { x: number; y: number }
}

interface MovieStatus {
    state: TMovieEngineState
    isFastForward: boolean
    canSkip: boolean
    currentScene: ImageSceneStatus | ConversationSceneStatus | undefined
}

export const MovieEngineCommand = {
    CONFIRM: "CONFIRM",
    COMPLETE_SCENE: "COMPLETE_SCENE",
    FAST_FORWARD: "FAST_FORWARD",
    STOP: "STOP",
    SKIP: "SKIP",
    SCROLL_UP: "SCROLL_UP",
    SCROLL_DOWN: "SCROLL_DOWN",
    SCROLL_LEFT: "SCROLL_LEFT",
    SCROLL_RIGHT: "SCROLL_RIGHT",
} as const

export type TMovieEngineCommand =
    (typeof MovieEngineCommand)[keyof typeof MovieEngineCommand]

type ActiveSceneState =
    | { type: typeof MovieSceneType.IMAGE; state: MovieSceneImageState }
    | {
          type: typeof MovieSceneType.CONVERSATION
          state: MovieSceneConversationState
      }

export class MovieEngine {
    private movieState: TMovieEngineState = MovieEngineState.PLAYING
    private isFastForward: boolean = false
    private isSkipPending: boolean = false
    private currentScene: MovieScene
    private currentSceneState: ActiveSceneState
    private collectedDecisions: DecisionRecord[] = []
    private readonly resourceCollections: ResourceManifestCollection[] = []
    private readonly languageCode: string = "en-us"
    private readonly movie: Movie
    private branchOriginSceneId: string | undefined

    constructor(
        movie: Movie,
        resourceCollections: ResourceManifestCollection[],
        languageCode: string = "en-us"
    ) {
        this.currentScene = sceneById(movie, movie.firstSceneId)
        this.currentSceneState = initialSceneState(this.currentScene)
        this.resourceCollections = resourceCollections
        this.languageCode = languageCode
        this.movie = movie
    }

    status(): MovieStatus {
        const isTerminal = this.movieState !== MovieEngineState.PLAYING
        return {
            state: this.movieState,
            isFastForward: this.isFastForward,
            canSkip: canSkipRemainingScenes(
                this.movie,
                this.currentScene,
                this.currentSceneState
            ),
            currentScene: isTerminal
                ? undefined
                : sceneStatus(
                      this.currentScene,
                      this.currentSceneState,
                      this.resourceCollections,
                      this.languageCode
                  ),
        }
    }

    result():
        | { state: "DONE" | "STOPPED"; decisions: DecisionRecord[] }
        | undefined {
        if (this.movieState === MovieEngineState.PLAYING) return undefined
        return { state: this.movieState, decisions: this.collectedDecisions }
    }

    tick(elapsedMs: number): void {
        if (this.movieState !== MovieEngineState.PLAYING) return
        this.currentSceneState = tickedSceneState(
            this.currentScene,
            this.currentSceneState,
            elapsedMs
        )
        this.advanceIfComplete()
        this.checkSkipProgress()
    }

    selectDecision(decisionId: string): { isValid: boolean; message?: string } {
        if (
            this.currentScene.type !== MovieSceneType.CONVERSATION ||
            this.currentSceneState.type !== MovieSceneType.CONVERSATION
        ) {
            return {
                isValid: false,
                message: "Current scene is not a conversation",
            }
        }

        const result = MovieSceneConversationService.selectDecision(
            this.currentScene.data,
            this.currentSceneState.state,
            decisionId
        )
        if (!result.isValid) return result

        this.currentSceneState = {
            type: MovieSceneType.CONVERSATION,
            state: result.state,
        }
        this.advanceIfComplete()
        if (this.isSkipPending) this.resumeSkip()
        return { isValid: true }
    }

    processCommand(command: TMovieEngineCommand): void {
        if (command === MovieEngineCommand.STOP) {
            this.movieState = MovieEngineState.STOPPED
            return
        }

        if (this.movieState !== MovieEngineState.PLAYING) return

        if (command === MovieEngineCommand.FAST_FORWARD) {
            this.enableFastForward()
            return
        }

        if (command === MovieEngineCommand.SKIP) {
            this.handleSkip()
            return
        }

        this.currentSceneState = sceneStateAfterCommand(
            this.currentScene,
            this.currentSceneState,
            command
        )
        this.advanceIfComplete()
    }

    private advanceIfComplete(): void {
        if (!isSceneComplete(this.currentSceneState)) return

        let pendingNextSceneId: string | undefined
        if (this.currentSceneState.type === MovieSceneType.CONVERSATION) {
            this.collectedDecisions = [
                ...this.collectedDecisions,
                ...this.currentSceneState.state.recordedDecisions,
            ]
            pendingNextSceneId = this.currentSceneState.state.pendingNextSceneId
        }

        let branchOriginSceneId: string | undefined
        if (pendingNextSceneId !== undefined) {
            this.branchOriginSceneId = this.currentScene.data.id
        } else {
            branchOriginSceneId = this.branchOriginSceneId
            this.branchOriginSceneId = undefined
        }

        const movieScene = nextScene(
            this.movie,
            this.currentScene.data.id,
            pendingNextSceneId,
            branchOriginSceneId
        )
        if (movieScene === undefined) {
            this.movieState = this.isSkipPending
                ? MovieEngineState.STOPPED
                : MovieEngineState.DONE
            this.isSkipPending = false
            return
        }

        this.currentScene = movieScene
        this.currentSceneState = initialSceneState(
            movieScene,
            this.isFastForward
        )
    }

    private enableFastForward(): void {
        this.isFastForward = true
        if (
            this.currentScene.type === MovieSceneType.IMAGE &&
            this.currentSceneState.type === MovieSceneType.IMAGE
        ) {
            this.currentSceneState = {
                type: MovieSceneType.IMAGE,
                state: MovieSceneImageService.stateAfterCommand(
                    this.currentScene.data,
                    this.currentSceneState.state,
                    MovieSceneImageCommand.FAST_FORWARD
                ),
            }
            this.advanceIfComplete()
            return
        }
        if (
            this.currentScene.type === MovieSceneType.CONVERSATION &&
            this.currentSceneState.type === MovieSceneType.CONVERSATION
        ) {
            this.currentSceneState = {
                type: MovieSceneType.CONVERSATION,
                state: { ...this.currentSceneState.state, isFastForward: true },
            }
        }
    }

    private disableFastForward(): void {
        this.isFastForward = false
        if (this.currentSceneState.type === MovieSceneType.IMAGE) {
            this.currentSceneState = {
                type: MovieSceneType.IMAGE,
                state: {
                    ...this.currentSceneState.state,
                    isFastForward: false,
                },
            }
        }
        if (this.currentSceneState.type === MovieSceneType.CONVERSATION) {
            this.currentSceneState = {
                type: MovieSceneType.CONVERSATION,
                state: {
                    ...this.currentSceneState.state,
                    isFastForward: false,
                },
            }
        }
    }

    private handleSkip(): void {
        if (
            canSkipRemainingScenes(
                this.movie,
                this.currentScene,
                this.currentSceneState
            )
        ) {
            this.movieState = MovieEngineState.STOPPED
            return
        }
        this.isSkipPending = true
        this.enableFastForward()
        this.checkSkipProgress()
    }

    private checkSkipProgress(): void {
        if (!this.isSkipPending || this.movieState !== MovieEngineState.PLAYING)
            return
        if (
            isCurrentlyWaitingForDecision(
                this.currentScene,
                this.currentSceneState
            )
        ) {
            this.disableFastForward()
            return
        }
        if (
            canSkipRemainingScenes(
                this.movie,
                this.currentScene,
                this.currentSceneState
            )
        ) {
            this.movieState = MovieEngineState.STOPPED
            this.isSkipPending = false
        }
    }

    private resumeSkip(): void {
        if (!this.isSkipPending || this.movieState !== MovieEngineState.PLAYING)
            return
        if (
            canSkipRemainingScenes(
                this.movie,
                this.currentScene,
                this.currentSceneState
            )
        ) {
            this.movieState = MovieEngineState.STOPPED
            this.isSkipPending = false
        } else {
            this.enableFastForward()
        }
    }
}

const canSkipRemainingScenes = (
    movie: Movie,
    currentScene: MovieScene,
    currentSceneState: ActiveSceneState
): boolean => {
    const currentIndex = movie.scenes.findIndex(
        (movieScene) => movieScene.data.id === currentScene.data.id
    )
    return movie.scenes.slice(currentIndex).every((movieScene) => {
        if (movieScene.type === MovieSceneType.IMAGE)
            return MovieSceneImageService.canSkip(movieScene.data)
        if (movieScene.type === MovieSceneType.CONVERSATION) {
            const conversationState =
                movieScene.data.id === currentScene.data.id &&
                currentSceneState.type === MovieSceneType.CONVERSATION
                    ? currentSceneState.state
                    : MovieSceneConversationService.initialState(
                          movieScene.data
                      )
            return MovieSceneConversationService.canSkip(
                movieScene.data,
                conversationState
            )
        }
        return false
    })
}

const isCurrentlyWaitingForDecision = (
    movieScene: MovieScene,
    state: ActiveSceneState
): boolean => {
    if (
        movieScene.type !== MovieSceneType.CONVERSATION ||
        state.type !== MovieSceneType.CONVERSATION
    )
        return false
    const { currentLineIndex } = state.state
    return (
        currentLineIndex >= 0 &&
        currentLineIndex < movieScene.data.lines.length &&
        movieScene.data.lines[currentLineIndex].type === "DECISION"
    )
}

const sceneById = (movie: Movie, sceneId: string): MovieScene => {
    const movieScene = movie.scenes.find(
        (movieScene) => movieScene.data.id === sceneId
    )
    if (movieScene === undefined)
        throw new Error(
            `MovieEngine: scene "${sceneId}" not found in movie "${movie.id}"`
        )
    return movieScene
}

const nextScene = (
    movie: Movie,
    currentSceneId: string,
    pendingNextSceneId?: string,
    branchOriginSceneId?: string
): MovieScene | undefined => {
    const currentScene = movie.scenes.find(
        (movieScene) => movieScene.data.id === currentSceneId
    )
    const branchTargetId = pendingNextSceneId ?? currentScene?.data.nextSceneId

    if (branchTargetId !== undefined) {
        return movie.scenes.find(
            (movieScene) => movieScene.data.id === branchTargetId
        )
    }

    if (branchOriginSceneId !== undefined) {
        return nextSceneAfterBranch(movie, branchOriginSceneId)
    }

    const index = movie.scenes.findIndex(
        (movieScene) => movieScene.data.id === currentSceneId
    )
    return movie.scenes[index + 1]
}

const nextSceneAfterBranch = (
    movie: Movie,
    branchOriginSceneId: string
): MovieScene | undefined => {
    const branchOriginScene = movie.scenes.find(
        (movieScene) => movieScene.data.id === branchOriginSceneId
    )

    const branchTargetIds = new Set<string>()
    if (branchOriginScene?.type === MovieSceneType.CONVERSATION) {
        for (const line of branchOriginScene.data.lines) {
            if (line.type !== "DECISION") continue
            for (const option of line.options) {
                if (option.nextSceneId !== undefined) {
                    branchTargetIds.add(option.nextSceneId)
                }
            }
        }
    }

    const branchOriginSceneIndex = movie.scenes.findIndex(
        (movieScene) => movieScene.data.id === branchOriginSceneId
    )

    for (let i = branchOriginSceneIndex + 1; i < movie.scenes.length; i++) {
        if (!branchTargetIds.has(movie.scenes[i].data.id)) {
            return movie.scenes[i]
        }
    }

    return undefined
}

const initialSceneState = (
    movieScene: MovieScene,
    isFastForward: boolean = false
): ActiveSceneState => {
    if (movieScene.type === MovieSceneType.IMAGE) {
        return {
            type: MovieSceneType.IMAGE,
            state: {
                ...MovieSceneImageService.initialState(movieScene.data),
                isFastForward,
            },
        }
    }

    if (movieScene.type === MovieSceneType.CONVERSATION) {
        return {
            type: MovieSceneType.CONVERSATION,
            state: {
                ...MovieSceneConversationService.initialState(movieScene.data),
                isFastForward,
            },
        }
    }

    throw new Error(
        `MovieEngine: unknown scene type "${(movieScene as MovieScene).type}"`
    )
}

const tickedSceneState = (
    movieScene: MovieScene,
    activeSceneState: ActiveSceneState,
    elapsedMs: number
): ActiveSceneState => {
    if (
        movieScene.type === MovieSceneType.IMAGE &&
        activeSceneState.type === MovieSceneType.IMAGE
    ) {
        return {
            type: MovieSceneType.IMAGE,
            state: MovieSceneImageService.tick(
                movieScene.data,
                activeSceneState.state,
                elapsedMs
            ),
        }
    }

    if (
        movieScene.type === MovieSceneType.CONVERSATION &&
        activeSceneState.type === MovieSceneType.CONVERSATION
    ) {
        return {
            type: MovieSceneType.CONVERSATION,
            state: MovieSceneConversationService.tick(
                movieScene.data,
                activeSceneState.state,
                elapsedMs
            ),
        }
    }
    return activeSceneState
}

const sceneStateAfterCommand = (
    movieScene: MovieScene,
    activeSceneState: ActiveSceneState,
    command: TMovieEngineCommand
): ActiveSceneState => {
    if (
        movieScene.type === MovieSceneType.IMAGE &&
        activeSceneState.type === MovieSceneType.IMAGE
    ) {
        const imageCommand =
            MovieSceneImageService.commandFromEngineCommand(command)
        if (imageCommand === undefined) return activeSceneState
        return {
            type: MovieSceneType.IMAGE,
            state: MovieSceneImageService.stateAfterCommand(
                movieScene.data,
                activeSceneState.state,
                imageCommand
            ),
        }
    }
    if (
        movieScene.type === MovieSceneType.CONVERSATION &&
        activeSceneState.type === MovieSceneType.CONVERSATION
    ) {
        const conversationCommand =
            MovieSceneConversationService.commandFromEngineCommand(command)
        if (conversationCommand === undefined) return activeSceneState
        return {
            type: MovieSceneType.CONVERSATION,
            state: MovieSceneConversationService.stateAfterCommand(
                movieScene.data,
                activeSceneState.state,
                conversationCommand
            ),
        }
    }
    return activeSceneState
}

const isSceneComplete = (activeSceneState: ActiveSceneState): boolean => {
    if (activeSceneState.type === MovieSceneType.IMAGE) {
        return MovieSceneImageService.isComplete(activeSceneState.state)
    }
    if (activeSceneState.type === MovieSceneType.CONVERSATION) {
        return MovieSceneConversationService.isComplete(activeSceneState.state)
    }
    return false
}

const sceneStatus = (
    movieScene: MovieScene,
    activeSceneState: ActiveSceneState,
    resourceCollections: ResourceManifestCollection[],
    languageCode: string
): ImageSceneStatus | ConversationSceneStatus => {
    if (
        movieScene.type === MovieSceneType.IMAGE &&
        activeSceneState.type === MovieSceneType.IMAGE
    ) {
        return imageSceneStatus(
            movieScene.data,
            activeSceneState.state,
            resourceCollections,
            languageCode
        )
    }
    if (
        movieScene.type === MovieSceneType.CONVERSATION &&
        activeSceneState.type === MovieSceneType.CONVERSATION
    ) {
        return MovieSceneConversationService.status(
            movieScene.data,
            activeSceneState.state
        )
    }
    throw new Error(
        `MovieEngine: cannot build status for unknown scene type "${(movieScene as MovieScene).type}"`
    )
}

const imageSceneStatus = (
    movieSceneImage: MovieSceneImage,
    movieSceneImageState: MovieSceneImageState,
    resourceCollections: ResourceManifestCollection[],
    languageCode: string
): ImageSceneStatus => {
    const resourceManifestEntry =
        movieSceneImage.resourceManifestEntryId != undefined
            ? resolveResourceManifestEntry(
                  resourceCollections,
                  movieSceneImage.resourceManifestEntryId
              )
            : undefined
    const description =
        resourceManifestEntry !== undefined
            ? ResourceManifestEntryService.getDescription(
                  resourceManifestEntry,
                  languageCode
              )
            : undefined

    return {
        type: "IMAGE",
        sceneId: movieSceneImage.id,
        phase: movieSceneImageState.phase,
        resourceManifestEntryId: movieSceneImage.resourceManifestEntryId,
        description,
        caption: movieSceneImage.caption,
        transitionProgress: transitionProgress(
            movieSceneImage,
            movieSceneImageState
        ),
        autoScrollProgress: MovieSceneImageService.autoScrollProgress(
            movieSceneImage,
            movieSceneImageState
        ),
        manualScrollOffset: movieSceneImageState.manualScrollOffset,
    }
}

const transitionProgress = (
    movieSceneImage: MovieSceneImage,
    movieSceneImageState: MovieSceneImageState
): number => {
    if (
        movieSceneImageState.phase === "INTRO_TRANSITION" &&
        movieSceneImage.introTransition !== undefined
    ) {
        return Math.min(
            1,
            movieSceneImageState.phaseElapsedMs /
                movieSceneImage.introTransition.durationMs
        )
    }
    if (
        movieSceneImageState.phase === "EXIT_TRANSITION" &&
        movieSceneImage.exitTransition !== undefined
    ) {
        return Math.min(
            1,
            movieSceneImageState.phaseElapsedMs /
                movieSceneImage.exitTransition.durationMs
        )
    }
    return 0
}
