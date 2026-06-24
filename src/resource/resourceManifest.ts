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

const FALLBACK_LANGUAGE = "en-us"

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
    ): string => {
        if (entry.description[languageCode]) {
            return entry.description[languageCode].text
        }

        const fallbackEntry = entry.description[fallback]

        if (fallback !== FALLBACK_LANGUAGE && fallbackEntry !== undefined) {
            return fallbackEntry.text
        }

        if (fallbackEntry !== undefined) {
            return `${languageCode} MISSING: ${fallbackEntry.text}`
        }
        return `${languageCode} MISSING:`
    },
}
