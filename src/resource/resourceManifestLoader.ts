import {
    type ResourceManifestCollection,
    ResourceManifestCollectionService,
} from "./resourceManifestCollection.js"
import {
    type ResourceManifestMediaCollection,
    ResourceManifestMediaCollectionService,
} from "./resourceManifestMediaCollection.js"

const dataFromCampaignEnvelope = (json: unknown): unknown =>
    typeof json === "object" && json !== null && "data" in json
        ? (json as { data: unknown }).data
        : json

export function loadResourceManifestFromJSON(json: unknown): {
    collection: ResourceManifestCollection
    errors: string[]
} {
    return ResourceManifestCollectionService.addEntriesFromJson(
        ResourceManifestCollectionService.new(),
        dataFromCampaignEnvelope(json)
    )
}

export function loadResourceManifestMediaFromJSON(json: unknown): {
    collection: ResourceManifestMediaCollection
    errors: string[]
} {
    return ResourceManifestMediaCollectionService.addEntriesFromJson(
        ResourceManifestMediaCollectionService.new(),
        dataFromCampaignEnvelope(json)
    )
}
