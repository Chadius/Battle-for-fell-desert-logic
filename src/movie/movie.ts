import type { MovieSceneConversation } from "./movieSceneConversation.js"
import {
    type MovieScene,
    MovieSceneService,
    MovieSceneType,
} from "./movieScene.js"

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
        ]
        return { isValid: errors.length === 0, errors, warnings: [] }
    },
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
