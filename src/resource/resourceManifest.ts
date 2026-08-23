import { z } from "zod"
import { LocalizedTextService } from "../localization/localizedText.js"

export const RESOURCE_MANIFEST_TYPES = [
    "IMAGE",
    "LEVEL",
    "DATA",
    "TEXT",
    "AUDIO",
    "VIDEO",
] as const

export type ResourceManifestType = (typeof RESOURCE_MANIFEST_TYPES)[number]

export interface ResourceManifestEntryDescription {
    text: string
}

export interface ResourceManifestEntry {
    id: string
    label: string
    description: Record<string, ResourceManifestEntryDescription>
    type: ResourceManifestType
}

const localizedTextSchema = z.record(z.string(), z.object({ text: z.string() }))

export const resourceManifestEntrySchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    description: localizedTextSchema,
    type: z.enum(RESOURCE_MANIFEST_TYPES),
})

export type SerializedResourceManifestEntry = z.infer<
    typeof resourceManifestEntrySchema
>

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
