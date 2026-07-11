import type { MovieSceneImage } from "./movieSceneImage.js"
import type { MovieSceneConversation } from "./movieSceneConversation.js"

export const MovieSceneType = {
    IMAGE: "IMAGE",
    CONVERSATION: "CONVERSATION",
} as const satisfies Record<string, string>

export type TMovieSceneType =
    (typeof MovieSceneType)[keyof typeof MovieSceneType]

export type MovieScene =
    | { type: typeof MovieSceneType.IMAGE; data: MovieSceneImage }
    | { type: typeof MovieSceneType.CONVERSATION; data: MovieSceneConversation }

export const MovieSceneService = {
    getNextSceneId: (scene: MovieScene): string | undefined =>
        scene.data.nextSceneId,
}
