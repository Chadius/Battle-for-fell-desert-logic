import { LocalizedTextService } from "../localization/localizedText.js"

export type ResourceManifestType =
    | "IMAGE"
    | "LEVEL"
    | "DATA"
    | "TEXT"
    | "AUDIO"
    | "VIDEO"

export interface ResourceManifestEntryDescription {
    text: string
}

export interface ResourceManifestEntry {
    id: string
    label: string
    description: Record<string, ResourceManifestEntryDescription>
    type: ResourceManifestType
}

const FALLBACK_LANGUAGE = LocalizedTextService.FALLBACK_LANGUAGE

export const ResourceManifestEntryService = {
    FALLBACK_LANGUAGE,
    new: ({
        id,
        label,
        description,
        type,
    }: {
        id: string
        label: string
        description: Record<string, ResourceManifestEntryDescription>
        type: ResourceManifestType
    }): ResourceManifestEntry => ({
        id,
        label,
        description,
        type,
    }),

    getDescription: (
        entry: ResourceManifestEntry,
        languageCode: string,
        fallback = FALLBACK_LANGUAGE
    ): string =>
        LocalizedTextService.resolve(entry.description, languageCode, fallback),
}
