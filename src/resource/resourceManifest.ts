import { z } from "zod"
import {
    LocalizedTextService,
    localizedTextSchema,
} from "../localization/localizedText.js"

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

export const resourceManifestEntrySchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    description: localizedTextSchema,
    type: z.enum(RESOURCE_MANIFEST_TYPES),
})

export type SerializedResourceManifestEntry = z.infer<
    typeof resourceManifestEntrySchema
>

const FALLBACK_LANGUAGE_CODE = LocalizedTextService.FALLBACK_LANGUAGE_CODE

export const ResourceManifestEntryService = {
    FALLBACK_LANGUAGE_CODE,
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
        fallbackLanguageCode = FALLBACK_LANGUAGE_CODE
    ): string =>
        LocalizedTextService.resolve(
            entry.description,
            languageCode,
            fallbackLanguageCode
        ),
}
