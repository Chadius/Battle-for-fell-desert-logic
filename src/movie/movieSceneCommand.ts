export const MovieSceneCommand = {
    CONFIRM: "CONFIRM",
    FAST_FORWARD: "FAST_FORWARD",
} as const satisfies Record<string, string>

export type TMovieSceneCommand =
    (typeof MovieSceneCommand)[keyof typeof MovieSceneCommand]
