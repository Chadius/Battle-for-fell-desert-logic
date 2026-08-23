import { z } from "zod"
import {
    resourceManifestEntrySchema,
    type ResourceManifestEntry,
} from "./resourceManifest.js"

export interface ResourceManifestCollection {
    entriesByKey: Map<string, ResourceManifestEntry>
}

const resourceManifestJsonSchema = z.record(
    z.string(),
    resourceManifestEntrySchema
)

export type SerializedResourceManifest = z.infer<
    typeof resourceManifestJsonSchema
>

export const ResourceManifestCollectionService = {
    new: (): ResourceManifestCollection => ({
        entriesByKey: new Map(),
    }),

    addEntriesFromJson: (
        resourceManifestCollection: ResourceManifestCollection,
        data: unknown
    ): { collection: ResourceManifestCollection; errors: string[] } => {
        const result = resourceManifestJsonSchema.safeParse(data)
        if (!result.success) {
            const details = result.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ")
            return {
                collection: resourceManifestCollection,
                errors: [
                    `[ResourceManifestCollectionService.addEntriesFromJson]: ${details}`,
                ],
            }
        }

        let updatedResourceManifestCollection = resourceManifestCollection
        for (const [key, resourceManifestEntry] of Object.entries(
            result.data
        )) {
            updatedResourceManifestCollection =
                ResourceManifestCollectionService.add(
                    updatedResourceManifestCollection,
                    key,
                    resourceManifestEntry
                )
        }
        return { collection: updatedResourceManifestCollection, errors: [] }
    },

    add: (
        resourceManifestCollection: ResourceManifestCollection,
        key: string,
        resourceManifestEntry: ResourceManifestEntry
    ): ResourceManifestCollection => ({
        entriesByKey: new Map(resourceManifestCollection.entriesByKey).set(
            key,
            resourceManifestEntry
        ),
    }),

    get: (
        resourceManifestCollection: ResourceManifestCollection,
        key: string
    ): ResourceManifestEntry | undefined =>
        resourceManifestCollection.entriesByKey.get(key),

    has: (
        resourceManifestCollection: ResourceManifestCollection,
        key: string
    ): boolean => resourceManifestCollection.entriesByKey.has(key),

    keys: (
        resourceManifestCollection: ResourceManifestCollection
    ): string[] => [...resourceManifestCollection.entriesByKey.keys()],
}
