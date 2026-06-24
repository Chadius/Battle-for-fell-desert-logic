import type { ResourceManifestEntry } from "./resourceManifest"

export interface ResourceManifestCollection {
    entriesByKey: Map<string, ResourceManifestEntry>
}

export const ResourceManifestCollectionService = {
    new: (): ResourceManifestCollection => ({
        entriesByKey: new Map(),
    }),

    add: (
        resourceManifestCollection: ResourceManifestCollection,
        key: string,
        entry: ResourceManifestEntry
    ): ResourceManifestCollection => ({
        entriesByKey: new Map(resourceManifestCollection.entriesByKey).set(
            key,
            entry
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
