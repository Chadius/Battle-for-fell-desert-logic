import { LocalizedTextService } from "../localization/localizedText.js"

export type ResourceManifestType = "IMAGE" | "LEVEL" | "DATA" | "TEXT"

export interface ResourceManifestEntryDescription {
    text: string
}

export interface ResourceManifestEntry {
    id: string
    label: string
    description: Record<string, ResourceManifestEntryDescription>
    filepath: string
    format: string
    type: ResourceManifestType
}

const FALLBACK_LANGUAGE = LocalizedTextService.FALLBACK_LANGUAGE

export const ResourceManifestEntryService = {
    FALLBACK_LANGUAGE,
    new: ({
        id,
        label,
        description,
        filepath,
        format,
        type,
    }: {
        id: string
        label: string
        description: Record<string, ResourceManifestEntryDescription>
        filepath: string
        format: string
        type: ResourceManifestType
    }): ResourceManifestEntry => ({
        id,
        label,
        description,
        filepath,
        format,
        type,
    }),

    getDescription: (
        entry: ResourceManifestEntry,
        languageCode: string,
        fallback = FALLBACK_LANGUAGE
    ): string =>
        LocalizedTextService.resolve(entry.description, languageCode, fallback),
}
