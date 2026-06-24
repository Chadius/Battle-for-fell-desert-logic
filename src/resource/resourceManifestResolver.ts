import type { ResourceManifestEntry } from "./resourceManifest"
import {
    ResourceManifestCollectionService,
    type ResourceManifestCollection,
} from "./resourceManifestCollection"

export function resolveResourceManifestEntry(
    collections: ResourceManifestCollection[],
    key: string
): ResourceManifestEntry | undefined {
    for (const collection of collections) {
        const entry = ResourceManifestCollectionService.get(collection, key)
        if (entry != undefined) return entry
    }
    return undefined
}
