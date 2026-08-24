import {
    ResourceManifestCollectionService,
    type ResourceManifestCollection,
} from "./resourceManifestCollection.js"
import { ResourceManifestMediaEntryService } from "./resourceManifestMedia.js"
import {
    ResourceManifestMediaCollectionService,
    type ResourceManifestMediaCollection,
} from "./resourceManifestMediaCollection.js"

// Campaign resource files are written as { "data": [entry, ...] }, keyed by nothing but each
// entry's own id. Unwrap that envelope here so callers can pass the parsed file straight through.
export function loadResourceManifestFromJSON(json: unknown): {
    collection: ResourceManifestCollection
    errors: string[]
} {
    const entries =
        typeof json === "object" && json !== null && "data" in json
            ? (json as { data: unknown }).data
            : json

    return ResourceManifestCollectionService.addEntriesFromJson(
        ResourceManifestCollectionService.new(),
        entries
    )
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
