import type {
    DialogLine,
    MovieSceneConversation,
} from "./movieSceneConversation"
import {
    type MovieScene,
    MovieSceneService,
    MovieSceneType,
} from "./movieScene"

export interface Movie {
    id: string
    firstSceneId: string
    scenes: MovieScene[]
}

export const MovieService = {
    validate: (
        movie: Movie
    ): { isValid: boolean; errors: string[]; warnings: string[] } => {
        const sceneIds = new Set(
            movie.scenes.map((movieScene) => movieScene.data.id)
        )
        const errors = [
            ...existenceErrors(movie, sceneIds),
            ...conflictErrors(movie),
            ...cycleErrors(movie),
            ...imagePlaceholderErrors(movie),
        ]
        const warnings = [...conversationDialogWarnings(movie)]
        return { isValid: errors.length === 0, errors, warnings }
    },
}

const LONG_SPEAKER_ID_WORD_THRESHOLD = 5

const conversationDialogWarnings = (movie: Movie): string[] => {
    const warnings: string[] = []
    for (const movieScene of movie.scenes) {
        if (movieScene.type !== MovieSceneType.CONVERSATION) continue
        for (let index = 0; index < movieScene.data.lines.length; index++) {
            const conversationLine = movieScene.data.lines[index]
            if (conversationLine.type !== "DIALOG") continue
            const warning = longSpeakerIdWithEmptyTextWarning(
                movieScene.data.id,
                index,
                conversationLine
            )
            if (warning !== undefined) warnings.push(warning)
        }
    }
    return warnings
}

const longSpeakerIdWithEmptyTextWarning = (
    sceneId: string,
    lineIndex: number,
    dialogLine: DialogLine
): string | undefined => {
    if (dialogLine.speakerId === undefined) return undefined
    const wordCount = dialogLine.speakerId.trim().split(/\s+/).length
    if (wordCount <= LONG_SPEAKER_ID_WORD_THRESHOLD) return undefined
    const hasText = Object.values(dialogLine.text).some(
        (entry) => entry.text.length > 0
    )
    if (hasText) return undefined
    return `scene '${sceneId}' line ${lineIndex}: speakerId has ${wordCount} words but text is empty — did you swap speakerId and text?`
}

const cycleErrors = (movie: Movie): string[] => {
    const adjacency = adjacencyMap(movie)
    const visited = new Set<string>()
    const inStack = new Set<string>()
    const inStackOrdered: string[] = []
    const errors: string[] = []

    for (const movieScene of movie.scenes) {
        if (!visited.has(movieScene.data.id)) {
            errors.push(
                ...cycleErrorsFromScene(
                    movieScene.data.id,
                    adjacency,
                    visited,
                    inStack,
                    inStackOrdered,
                    movie
                )
            )
        }
    }
    return errors
}

const adjacencyMap = (movie: Movie): Map<string, string[]> =>
    new Map(
        movie.scenes.map((movieScene) => [
            movieScene.data.id,
            sceneNeighborIds(movieScene),
        ])
    )

const sceneNeighborIds = (movieScene: MovieScene): string[] => {
    const neighborIds: string[] = []
    const nextSceneId = MovieSceneService.getNextSceneId(movieScene)
    if (nextSceneId !== undefined) {
        neighborIds.push(nextSceneId)
    }
    if (movieScene.type === MovieSceneType.CONVERSATION) {
        neighborIds.push(...conversationDecisionNeighborIds(movieScene.data))
    }
    return neighborIds
}

const conversationDecisionNeighborIds = (
    conversation: MovieSceneConversation
): string[] => {
    const neighborIds: string[] = []
    for (const line of conversation.lines) {
        if (line.type !== "DECISION") continue
        for (const option of line.options) {
            if (option.nextSceneId !== undefined) {
                neighborIds.push(option.nextSceneId)
            }
        }
    }
    return neighborIds
}

const isCycleEscapable = (cycleNodes: string[], movie: Movie): boolean => {
    const cycleSet = new Set(cycleNodes)
    return cycleNodes.some((sceneId) =>
        sceneHasEscapeFromCycle(
            movie.scenes.find((movieScene) => movieScene.data.id === sceneId),
            cycleSet
        )
    )
}

const sceneHasEscapeFromCycle = (
    movieScene: MovieScene | undefined,
    cycleSet: Set<string>
): boolean => {
    if (movieScene?.type !== MovieSceneType.CONVERSATION) return false

    for (const line of movieScene.data.lines) {
        if (line.type !== "DECISION") continue

        for (const option of line.options) {
            if (option.nextSceneId === undefined) return true
            if (!cycleSet.has(option.nextSceneId)) return true
        }
    }
    return false
}

const cycleErrorsFromScene = (
    sceneId: string,
    adjacency: Map<string, string[]>,
    visited: Set<string>,
    inStack: Set<string>,
    inStackOrdered: string[],
    movie: Movie
): string[] => {
    const errors: string[] = []
    inStack.add(sceneId)
    inStackOrdered.push(sceneId)

    for (const neighbor of adjacency.get(sceneId) ?? []) {
        if (inStack.has(neighbor)) {
            const cycleStartIndex = inStackOrdered.indexOf(neighbor)
            const cycleNodes = inStackOrdered.slice(cycleStartIndex)
            if (!isCycleEscapable(cycleNodes, movie)) {
                errors.push(
                    `cycle detected involving scenes: ${cycleNodes.join(", ")}`
                )
            }
        } else if (!visited.has(neighbor) && adjacency.has(neighbor)) {
            errors.push(
                ...cycleErrorsFromScene(
                    neighbor,
                    adjacency,
                    visited,
                    inStack,
                    inStackOrdered,
                    movie
                )
            )
        }
    }

    inStackOrdered.pop()
    inStack.delete(sceneId)
    visited.add(sceneId)
    return errors
}

const conflictErrors = (movie: Movie): string[] => {
    const errors: string[] = []
    for (const movieScene of movie.scenes) {
        if (movieScene.type !== MovieSceneType.CONVERSATION) continue
        if (movieScene.data.nextSceneId === undefined) continue

        const hasDecision = movieScene.data.lines.some(
            (line) => line.type === "DECISION"
        )

        if (hasDecision) {
            errors.push(
                `scene '${movieScene.data.id}' has nextSceneId but also contains DECISION lines`
            )
        }
    }
    return errors
}

const imagePlaceholderErrors = (movie: Movie): string[] =>
    movie.scenes.flatMap((movieScene) => {
        if (movieScene.type !== MovieSceneType.IMAGE) return []
        const { id, resourceManifestEntryId, caption } = movieScene.data
        if (!resourceManifestEntryId && !caption) {
            return [
                `scene '${id}' has no resourceManifestEntryId and no caption — add a caption to use it as a placeholder`,
            ]
        }
        return []
    })

const existenceErrors = (movie: Movie, sceneIds: Set<string>): string[] => {
    const errors: string[] = []
    if (!sceneIds.has(movie.firstSceneId)) {
        errors.push(
            `movie '${movie.id}' has firstSceneId '${movie.firstSceneId}' that does not reference any scene`
        )
    }
    errors.push(
        ...movie.scenes.flatMap((movieScene) =>
            sceneExistenceErrors(movieScene, sceneIds)
        )
    )
    return errors
}

const sceneExistenceErrors = (
    movieScene: MovieScene,
    sceneIds: Set<string>
): string[] => {
    const errors: string[] = []
    const nextSceneId = MovieSceneService.getNextSceneId(movieScene)
    if (nextSceneId !== undefined && !sceneIds.has(nextSceneId)) {
        errors.push(
            `scene '${movieScene.data.id}' references unknown nextSceneId '${nextSceneId}'`
        )
    }
    if (movieScene.type === MovieSceneType.CONVERSATION) {
        errors.push(...decisionExistenceErrors(movieScene.data, sceneIds))
    }
    return errors
}

const decisionExistenceErrors = (
    conversation: MovieSceneConversation,
    sceneIds: Set<string>
): string[] => {
    const errors: string[] = []
    for (const line of conversation.lines) {
        if (line.type !== "DECISION") continue
        for (const option of line.options) {
            if (
                option.nextSceneId !== undefined &&
                !sceneIds.has(option.nextSceneId)
            ) {
                errors.push(
                    `scene '${conversation.id}' references unknown nextSceneId '${option.nextSceneId}'`
                )
            }
        }
    }
    return errors
}
