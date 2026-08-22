export interface ResourceManifestMediaEntry {
    id: string
    filepath: string
    format: string
}

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
