import { z } from "zod"
import { type Movie, MovieService } from "./movie"
import { MovieSceneType } from "./movieScene"

const localizedTextSchema = z.record(z.string(), z.object({ text: z.string() }))

const movieSceneTransitionSchema = z.object({
    durationMs: z.number().positive(),
})

const movieSceneAutoScrollSchema = z.object({
    direction: z.enum(["HORIZONTAL", "VERTICAL"]),
    durationMs: z.number().positive(),
})

const imageSceneSchema = z.object({
    type: z.literal(MovieSceneType.IMAGE),
    id: z.string(),
    resourceManifestEntryId: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined),
    nextSceneId: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined),
    caption: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined),
    introTransition: movieSceneTransitionSchema
        .nullish()
        .transform((v) => v ?? undefined),
    exitTransition: movieSceneTransitionSchema
        .nullish()
        .transform((v) => v ?? undefined),
    manualScrollEnabled: z.boolean(),
    autoScroll: movieSceneAutoScrollSchema
        .nullish()
        .transform((v) => v ?? undefined),
})

const decisionOptionSchema = z.object({
    decisionId: z.string(),
    text: localizedTextSchema,
    nextSceneId: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined),
})

const dialogLineSchema = z.object({
    type: z.literal("DIALOG"),
    speakerId: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined),
    text: localizedTextSchema,
    portrait: z
        .object({
            resourceManifestEntryId: z.string(),
            position: z.enum(["LEFT", "RIGHT"]),
        })
        .nullish()
        .transform((v) => v ?? undefined),
    dialogPosition: z
        .enum(["LEFT", "CENTER", "RIGHT"])
        .nullish()
        .transform((v) => v ?? undefined),
})

const decisionLineSchema = z.object({
    type: z.literal("DECISION"),
    prompt: localizedTextSchema,
    options: z.array(decisionOptionSchema),
})

const conversationSceneSchema = z.object({
    type: z.literal(MovieSceneType.CONVERSATION),
    id: z.string(),
    nextSceneId: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined),
    lines: z.array(
        z.discriminatedUnion("type", [dialogLineSchema, decisionLineSchema])
    ),
})

const movieSceneSchema = z.discriminatedUnion("type", [
    imageSceneSchema,
    conversationSceneSchema,
])

const movieSchema = z.object({
    id: z.string(),
    firstSceneId: z.string(),
    scenes: z.array(movieSceneSchema),
})

const parsedSceneToMovieScene = (scene: z.infer<typeof movieSceneSchema>) => {
    if (scene.type === MovieSceneType.IMAGE) {
        return {
            type: MovieSceneType.IMAGE,
            data: {
                id: scene.id,
                resourceManifestEntryId: scene.resourceManifestEntryId,
                nextSceneId: scene.nextSceneId,
                caption: scene.caption,
                introTransition: scene.introTransition,
                exitTransition: scene.exitTransition,
                manualScrollEnabled: scene.manualScrollEnabled,
                autoScroll: scene.autoScroll,
            },
        } as const
    }
    return {
        type: MovieSceneType.CONVERSATION,
        data: {
            id: scene.id,
            nextSceneId: scene.nextSceneId,
            lines: scene.lines,
        },
    } as const
}

const throwIfDuplicateSceneIds = (
    scenes: z.infer<typeof movieSceneSchema>[]
) => {
    const seen = new Set<string>()
    for (const scene of scenes) {
        if (seen.has(scene.id))
            throw new Error(
                `[MovieLoader.loadFromJSON] Duplicate scene id '${scene.id}'`
            )
        seen.add(scene.id)
    }
}

export const MovieLoader = {
    loadFromJSON: (json: unknown): Movie => {
        const result = movieSchema.safeParse(json)
        if (!result.success) {
            const messages = result.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ")
            throw new Error(`[MovieLoader.loadFromJSON]: ${messages}`)
        }
        const { id, firstSceneId, scenes } = result.data
        throwIfDuplicateSceneIds(scenes)
        const movie: Movie = {
            id,
            firstSceneId,
            scenes: scenes.map(parsedSceneToMovieScene),
        }
        const { isValid, errors } = MovieService.validate(movie)
        if (!isValid)
            throw new Error(`[MovieLoader.loadFromJSON]: ${errors.join("; ")}`)
        return movie
    },
}
