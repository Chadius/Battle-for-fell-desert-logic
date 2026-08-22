import type { ResourceManifestMediaEntry } from "./resourceManifestMedia.js"

export interface ResourceManifestMediaCollection {
    entriesByKey: Map<string, ResourceManifestMediaEntry>
}

export const ResourceManifestMediaCollectionService = {
    new: (): ResourceManifestMediaCollection => ({
        entriesByKey: new Map(),
    }),

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
