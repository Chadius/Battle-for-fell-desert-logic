import type { ResourceManifestEntry } from "./resourceManifest.js"
import {
    ResourceManifestCollectionService,
    type ResourceManifestCollection,
} from "./resourceManifestCollection.js"

export function resolveResourceManifestEntry(
    collections: ResourceManifestCollection[],
    key: string
): ResourceManifestEntry | undefined {
    for (const resourceManifestCollection of collections) {
        const resourceManifestEntry = ResourceManifestCollectionService.get(
            resourceManifestCollection,
            key
        )
        if (resourceManifestEntry != undefined) return resourceManifestEntry
    }
    return undefined
}
