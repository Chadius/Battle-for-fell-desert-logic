import {
    ResourceManifestEntryService,
    type ResourceManifestType,
} from "./resourceManifest"
import {
    ResourceManifestCollectionService,
    type ResourceManifestCollection,
} from "./resourceManifestCollection"

const VALID_TYPES: ResourceManifestType[] = ["IMAGE", "LEVEL", "DATA", "TEXT"]

export type ResourceManifestRawJSON = Record<
    string,
    {
        id: string
        label: string
        description: Record<string, { text: string }>
        filepath: string
        format: string
        type: string
    }
>

export function loadResourceManifestFromJSON(
    json: ResourceManifestRawJSON
): ResourceManifestCollection {
    let resourceManifestCollection = ResourceManifestCollectionService.new()

    for (const [key, raw] of Object.entries(json)) {
        if (!VALID_TYPES.includes(raw.type as ResourceManifestType)) {
            throw new Error(
                `[loadResourceManifestFromJSON] Unknown resource type "${raw.type}" for key "${key}". Valid types: ${VALID_TYPES.join(", ")}`
            )
        }

        const entry = ResourceManifestEntryService.new({
            id: raw.id,
            label: raw.label,
            description: raw.description,
            filepath: raw.filepath,
            format: raw.format,
            type: raw.type as ResourceManifestType,
        })

        resourceManifestCollection = ResourceManifestCollectionService.add(
            resourceManifestCollection,
            key,
            entry
        )
    }

    return resourceManifestCollection
}
