import { z } from "zod"
import {
    resourceManifestMediaEntrySchema,
    type ResourceManifestMediaEntry,
} from "./resourceManifestMedia.js"

export interface ResourceManifestMediaCollection {
    entriesByKey: Map<string, ResourceManifestMediaEntry>
}

const resourceManifestMediaJsonSchema = z.array(
    resourceManifestMediaEntrySchema
)

export const ResourceManifestMediaCollectionService = {
    new: (): ResourceManifestMediaCollection => ({
        entriesByKey: new Map(),
    }),

    addEntriesFromJson: (
        resourceManifestMediaCollection: ResourceManifestMediaCollection,
        data: unknown
    ): {
        collection: ResourceManifestMediaCollection
        errors: string[]
    } => {
        const result = resourceManifestMediaJsonSchema.safeParse(data)
        if (!result.success) {
            const details = result.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ")
            return {
                collection: resourceManifestMediaCollection,
                errors: [
                    `[ResourceManifestMediaCollectionService.addEntriesFromJson]: ${details}`,
                ],
            }
        }

        let updatedResourceManifestMediaCollection =
            resourceManifestMediaCollection
        for (const resourceManifestMediaEntry of result.data) {
            updatedResourceManifestMediaCollection =
                ResourceManifestMediaCollectionService.add(
                    updatedResourceManifestMediaCollection,
                    resourceManifestMediaEntry.id,
                    resourceManifestMediaEntry
                )
        }
        return {
            collection: updatedResourceManifestMediaCollection,
            errors: [],
        }
    },

    add: (
        resourceManifestMediaCollection: ResourceManifestMediaCollection,
        key: string,
        resourceManifestMediaEntry: ResourceManifestMediaEntry
    ): ResourceManifestMediaCollection => ({
        entriesByKey: new Map(resourceManifestMediaCollection.entriesByKey).set(
            key,
            resourceManifestMediaEntry
        ),
    }),

    get: (
        resourceManifestMediaCollection: ResourceManifestMediaCollection,
        key: string
    ): ResourceManifestMediaEntry | undefined =>
        resourceManifestMediaCollection.entriesByKey.get(key),

    has: (
        resourceManifestMediaCollection: ResourceManifestMediaCollection,
        key: string
    ): boolean => resourceManifestMediaCollection.entriesByKey.has(key),

    keys: (
        resourceManifestMediaCollection: ResourceManifestMediaCollection
    ): string[] => [...resourceManifestMediaCollection.entriesByKey.keys()],
}
