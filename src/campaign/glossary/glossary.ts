import { z } from "zod"
import { glossaryTermSchema } from "./glossaryTerm.js"

export const glossarySchema = z.object({
    terms: z.array(glossaryTermSchema),
})

export type SerializedGlossary = z.infer<typeof glossarySchema>
