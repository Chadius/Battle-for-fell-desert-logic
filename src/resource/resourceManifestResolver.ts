import type { ResourceManifestEntry } from "./resourceManifest.js"
import {
    ResourceManifestCollectionService,
    type ResourceManifestCollection,
} from "./resourceManifestCollection.js"
import type { ResourceManifestMediaEntry } from "./resourceManifestMedia.js"
import {
    ResourceManifestMediaCollectionService,
    type ResourceManifestMediaCollection,
} from "./resourceManifestMediaCollection.js"

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

export function resolveResourceManifestMedia(
    collections: ResourceManifestMediaCollection[],
    key: string
): ResourceManifestMediaEntry | undefined {
    for (const resourceManifestMediaCollection of collections) {
        const resourceManifestMediaEntry =
            ResourceManifestMediaCollectionService.get(
                resourceManifestMediaCollection,
                key
            )
        if (resourceManifestMediaEntry != undefined)
            return resourceManifestMediaEntry
    }
    return undefined
}
