import {
    type ResourceManifestCollection,
    ResourceManifestCollectionService,
} from "./resourceManifestCollection.js"

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
