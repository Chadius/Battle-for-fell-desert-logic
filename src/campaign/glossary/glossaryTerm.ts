import { z } from "zod"
import type { LocalizedText } from "../../localization/localizedText.js"

export interface GlossaryTerm {
    termId: string
    name: LocalizedText
    definition: LocalizedText
    iconResourceKey?: string
}

const localizedTextSchema = z.record(z.string(), z.object({ text: z.string() }))

export const glossaryTermSchema = z.object({
    termId: z.string().min(1),
    name: localizedTextSchema,
    definition: localizedTextSchema,
    iconResourceKey: z.string().optional(),
})

export type SerializedGlossaryTerm = z.infer<typeof glossaryTermSchema>

export const GlossaryTermService = {
    new: ({
        termId,
        name,
        definition,
        iconResourceKey,
    }: {
        termId: string
        name: LocalizedText
        definition: LocalizedText
        iconResourceKey?: string
    }): GlossaryTerm => ({ termId, name, definition, iconResourceKey }),

    serialize: (glossaryTerm: GlossaryTerm): SerializedGlossaryTerm => ({
        termId: glossaryTerm.termId,
        name: glossaryTerm.name,
        definition: glossaryTerm.definition,
        iconResourceKey: glossaryTerm.iconResourceKey,
    }),

    deserialize: (data: unknown): GlossaryTerm => {
        const result = glossaryTermSchema.safeParse(data)
        if (!result.success) {
            const details = result.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ")
            throw new Error(`[GlossaryTermService.deserialize]: ${details}`)
        }
        return result.data
    },
}
