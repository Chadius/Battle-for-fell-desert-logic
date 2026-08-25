import type { LocalizedText } from "../localization/localizedText.js"
import { LocalizedTextService } from "../localization/localizedText.js"

export const MovieSceneConversationCommand = {
    CONFIRM: "CONFIRM",
    COMPLETE_SCENE: "COMPLETE_SCENE",
} as const satisfies Record<string, string>

export type TMovieSceneConversationCommand =
    (typeof MovieSceneConversationCommand)[keyof typeof MovieSceneConversationCommand]

export interface DialogLine {
    type: "DIALOG"
    speakerId?: string
    text: LocalizedText
    portrait?: { resourceManifestEntryId: string; position: "LEFT" | "RIGHT" }
    dialogPosition?: "LEFT" | "CENTER" | "RIGHT"
}

export interface DecisionOption {
    decisionId: string
    text: LocalizedText
    nextSceneId?: string
}

export interface DecisionLine {
    type: "DECISION"
    prompt: LocalizedText
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
    lineIndex: number
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
    speakerId: string | undefined
    text: string
    portrait:
        | {
              resourceManifestEntryId: string
              position: "LEFT" | "RIGHT"
              description: string | undefined
          }
        | undefined
    dialogPosition: "LEFT" | "CENTER" | "RIGHT"
    isWaitingForDecision: boolean
    decisions: { decisionId: string; text: string }[]
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
        | { isValid: false; message: string } => {
        const currentLine =
            movieSceneConversation.lines[
                movieSceneConversationState.currentLineIndex
            ]
        if (currentLine.type !== "DECISION") {
            return { isValid: false, message: "Current line is not a DECISION" }
        }
        const option = currentLine.options.find(
            (o) => o.decisionId === decisionId
        )
        if (option === undefined) {
            return {
                isValid: false,
                message: `Unknown decisionId: "${decisionId}"`,
            }
        }

        const record: DecisionRecord = {
            sceneId: movieSceneConversation.id,
            lineIndex: movieSceneConversationState.currentLineIndex,
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
        movieSceneConversationState: MovieSceneConversationState,
        languageCode: string = LocalizedTextService.FALLBACK_LANGUAGE
    ): ConversationSceneStatus => {
        const line =
            movieSceneConversation.lines[
                movieSceneConversationState.currentLineIndex
            ]
        if (line.type === "DIALOG") {
            return {
                type: "CONVERSATION",
                sceneId: movieSceneConversation.id,
                speakerId: line.speakerId,
                text: LocalizedTextService.resolve(line.text, languageCode),
                portrait:
                    line.portrait !== undefined
                        ? { ...line.portrait, description: undefined }
                        : undefined,
                dialogPosition: line.dialogPosition ?? "LEFT",
                isWaitingForDecision: false,
                decisions: [],
            }
        }
        return {
            type: "CONVERSATION",
            sceneId: movieSceneConversation.id,
            speakerId: undefined,
            text: LocalizedTextService.resolve(line.prompt, languageCode),
            portrait: undefined,
            dialogPosition: "LEFT",
            isWaitingForDecision: true,
            decisions: line.options.map((option) => ({
                decisionId: option.decisionId,
                text: LocalizedTextService.resolve(option.text, languageCode),
            })),
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
