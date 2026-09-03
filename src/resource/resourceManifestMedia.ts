import { z } from "zod"

export interface ResourceManifestMediaEntry {
    id: string
    filepath: string
    format: string
}

export const resourceManifestMediaEntrySchema = z.object({
    id: z.string().min(1),
    filepath: z.string().min(1),
    format: z.string(),
})

export const ResourceManifestMediaEntryService = {
    new: ({
        id,
        filepath,
        format,
    }: {
        id: string
        filepath: string
        format: string
    }): ResourceManifestMediaEntry => ({
        id,
        filepath,
        format,
    }),
}
