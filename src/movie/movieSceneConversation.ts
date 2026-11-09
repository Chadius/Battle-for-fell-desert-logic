import {
    type MovieDecisionRejection,
    MovieDecisionRejectionReason,
} from "./movieDecisionRejection.js"

export const MovieSceneConversationCommand = {
    CONFIRM: "CONFIRM",
    COMPLETE_SCENE: "COMPLETE_SCENE",
} as const satisfies Record<string, string>

export type TMovieSceneConversationCommand =
    (typeof MovieSceneConversationCommand)[keyof typeof MovieSceneConversationCommand]

export interface DialogLine {
    type: "DIALOG"
    id: string
}

export interface DecisionOption {
    decisionId: string
    nextSceneId?: string
}

export interface DecisionLine {
    type: "DECISION"
    id: string
    options: DecisionOption[]
}

export type ConversationLine = DialogLine | DecisionLine

export interface MovieSceneConversation {
    id: string
    nextSceneId: string | undefined
    lines: ConversationLine[]
}

export interface DecisionRecord {
    sceneId: string
    lineId: string
    decisionId: string
}

export interface MovieSceneConversationState {
    currentLineIndex: number
    recordedDecisions: DecisionRecord[]
    isFastForward: boolean
    pendingNextSceneId: string | undefined
}

export interface ConversationSceneStatus {
    type: "CONVERSATION"
    sceneId: string
    lineId: string
    isWaitingForDecision: boolean
    decisions: { decisionId: string }[]
}

export const MovieSceneConversationService = {
    new: ({
        id,
        nextSceneId,
        lines,
    }: {
        id: string
        nextSceneId?: string
        lines: ConversationLine[]
    }): MovieSceneConversation => ({ id, nextSceneId, lines }),

    initialState: (
        _movieSceneConversation: MovieSceneConversation
    ): MovieSceneConversationState => ({
        currentLineIndex: 0,
        recordedDecisions: [],
        isFastForward: false,
        pendingNextSceneId: undefined,
    }),

    tick: (
        movieSceneConversation: MovieSceneConversation,
        movieSceneConversationState: MovieSceneConversationState,
        _elapsedMs: number
    ): MovieSceneConversationState => {
        if (!movieSceneConversationState.isFastForward)
            return movieSceneConversationState

        const currentLine =
            movieSceneConversation.lines[
                movieSceneConversationState.currentLineIndex
            ]
        if (currentLine.type === "DECISION") return movieSceneConversationState

        const isLastLine =
            movieSceneConversationState.currentLineIndex >=
            movieSceneConversation.lines.length - 1
        return {
            ...movieSceneConversationState,
            currentLineIndex: isLastLine
                ? -1
                : movieSceneConversationState.currentLineIndex + 1,
        }
    },

    selectDecision: (
        movieSceneConversation: MovieSceneConversation,
        movieSceneConversationState: MovieSceneConversationState,
        decisionId: string
    ):
        | { isValid: true; state: MovieSceneConversationState }
        | { isValid: false; rejection: MovieDecisionRejection } => {
        const currentLine =
            movieSceneConversation.lines[
                movieSceneConversationState.currentLineIndex
            ]
        if (currentLine.type !== "DECISION") {
            return {
                isValid: false,
                rejection: {
                    reason: MovieDecisionRejectionReason.LINE_IS_NOT_A_DECISION,
                },
            }
        }
        const option = currentLine.options.find(
            (o) => o.decisionId === decisionId
        )
        if (option === undefined) {
            return {
                isValid: false,
                rejection: {
                    reason: MovieDecisionRejectionReason.UNKNOWN_DECISION_ID,
                },
            }
        }

        const record: DecisionRecord = {
            sceneId: movieSceneConversation.id,
            lineId: currentLine.id,
            decisionId,
        }
        const isLastLine =
            movieSceneConversationState.currentLineIndex >=
            movieSceneConversation.lines.length - 1
        return {
            isValid: true,
            state: {
                ...movieSceneConversationState,
                currentLineIndex: isLastLine
                    ? -1
                    : movieSceneConversationState.currentLineIndex + 1,
                recordedDecisions: [
                    ...movieSceneConversationState.recordedDecisions,
                    record,
                ],
                pendingNextSceneId: option.nextSceneId,
            },
        }
    },

    commandFromEngineCommand: (
        command: string
    ): TMovieSceneConversationCommand | undefined => {
        const validCommands = new Set<string>(
            Object.values(MovieSceneConversationCommand)
        )
        return validCommands.has(command)
            ? (command as TMovieSceneConversationCommand)
            : undefined
    },

    stateAfterCommand: (
        movieSceneConversation: MovieSceneConversation,
        movieSceneConversationState: MovieSceneConversationState,
        command: TMovieSceneConversationCommand
    ): MovieSceneConversationState => {
        if (command === MovieSceneConversationCommand.COMPLETE_SCENE) {
            return {
                ...movieSceneConversationState,
                currentLineIndex: movieSceneConversation.lines.length - 1,
            }
        }
        if (command !== MovieSceneConversationCommand.CONFIRM)
            return movieSceneConversationState

        const currentLine =
            movieSceneConversation.lines[
                movieSceneConversationState.currentLineIndex
            ]
        if (currentLine.type === "DECISION") return movieSceneConversationState

        const isLastLine =
            movieSceneConversationState.currentLineIndex >=
            movieSceneConversation.lines.length - 1
        return {
            ...movieSceneConversationState,
            currentLineIndex: isLastLine
                ? -1
                : movieSceneConversationState.currentLineIndex + 1,
        }
    },

    status: (
        movieSceneConversation: MovieSceneConversation,
        movieSceneConversationState: MovieSceneConversationState
    ): ConversationSceneStatus => {
        const line =
            movieSceneConversation.lines[
                movieSceneConversationState.currentLineIndex
            ]
        const isWaitingForDecision = line.type === "DECISION"
        return {
            type: "CONVERSATION",
            sceneId: movieSceneConversation.id,
            lineId: line.id,
            isWaitingForDecision,
            decisions: isWaitingForDecision
                ? line.options.map(({ decisionId }) => ({ decisionId }))
                : [],
        }
    },

    canSkip: (
        movieSceneConversation: MovieSceneConversation,
        movieSceneConversationState: MovieSceneConversationState
    ): boolean => {
        const remaining = movieSceneConversation.lines.slice(
            movieSceneConversationState.currentLineIndex
        )
        return remaining.every((line) => line.type === "DIALOG")
    },

    isComplete: (
        movieSceneConversationState: MovieSceneConversationState
    ): boolean => movieSceneConversationState.currentLineIndex === -1,
}
