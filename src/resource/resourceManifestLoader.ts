import {
    ResourceManifestEntryService,
    type ResourceManifestType,
} from "./resourceManifest.js"
import {
    ResourceManifestCollectionService,
    type ResourceManifestCollection,
} from "./resourceManifestCollection.js"
import { ResourceManifestMediaEntryService } from "./resourceManifestMedia.js"
import {
    ResourceManifestMediaCollectionService,
    type ResourceManifestMediaCollection,
} from "./resourceManifestMediaCollection.js"

const VALID_TYPES: ResourceManifestType[] = ["IMAGE", "LEVEL", "DATA", "TEXT"]

export type ResourceManifestRawJSON = Record<
    string,
    {
        id: string
        label: string
        description: Record<string, { text: string }>
        type: string
    }
>

export function loadResourceManifestFromJSON(
    json: ResourceManifestRawJSON
): ResourceManifestCollection {
    let resourceManifestCollection = ResourceManifestCollectionService.new()

    for (const [key, rawEntry] of Object.entries(json)) {
        if (!VALID_TYPES.includes(rawEntry.type as ResourceManifestType)) {
            throw new Error(
                `[loadResourceManifestFromJSON] Unknown resource type "${rawEntry.type}" for key "${key}". Valid types: ${VALID_TYPES.join(", ")}`
            )
        }

        const resourceManifestEntry = ResourceManifestEntryService.new({
            id: rawEntry.id,
            label: rawEntry.label,
            description: rawEntry.description,
            type: rawEntry.type as ResourceManifestType,
        })

        resourceManifestCollection = ResourceManifestCollectionService.add(
            resourceManifestCollection,
            key,
            resourceManifestEntry
        )
    }

    return resourceManifestCollection
}

export type ResourceManifestMediaRawJSON = Record<
    string,
    { id: string; filepath: string; format: string }
>

export function loadResourceManifestMediaFromJSON(
    json: ResourceManifestMediaRawJSON
): ResourceManifestMediaCollection {
    let resourceManifestMediaCollection =
        ResourceManifestMediaCollectionService.new()

    for (const [key, rawMediaEntry] of Object.entries(json)) {
        const resourceManifestMediaEntry =
            ResourceManifestMediaEntryService.new({
                id: rawMediaEntry.id,
                filepath: rawMediaEntry.filepath,
                format: rawMediaEntry.format,
            })

        resourceManifestMediaCollection =
            ResourceManifestMediaCollectionService.add(
                resourceManifestMediaCollection,
                key,
                resourceManifestMediaEntry
            )
    }

    return resourceManifestMediaCollection
}
