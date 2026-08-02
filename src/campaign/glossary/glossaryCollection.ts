import { type GlossaryTerm } from "./glossaryTerm.js"
import { glossarySchema } from "./glossary.js"

export interface GlossaryCollection {
    termById: Map<string, GlossaryTerm>
}

export const GlossaryCollectionService = {
    new: (): GlossaryCollection => constructNewCollection(),

    deserializeAll: (
        data: unknown
    ): { collection: GlossaryCollection; errors: string[] } => {
        const collection = constructNewCollection()
        const errors: string[] = []

        const result = glossarySchema.safeParse(data)
        if (!result.success) {
            const details = result.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ")
            errors.push(
                `[GlossaryCollectionService.deserializeAll]: ${details}`
            )
            return { collection, errors }
        }

        for (const rawTerm of result.data.terms) {
            if (collection.termById.has(rawTerm.termId)) {
                errors.push(
                    `[GlossaryCollectionService.deserializeAll]: duplicate termId "${rawTerm.termId}"`
                )
                continue
            }
            collection.termById.set(rawTerm.termId, rawTerm)
        }
        return { collection, errors }
    },

    addOrUpdate: ({
        collection,
        glossaryTerm,
    }: {
        collection: GlossaryCollection
        glossaryTerm: GlossaryTerm
    }): GlossaryCollection => {
        throwIfCollectionIsUndefined(collection, "addOrUpdate")
        const newCollection = clone(collection)
        newCollection.termById.set(glossaryTerm.termId, glossaryTerm)
        return newCollection
    },

    get: ({
        collection,
        termId,
    }: {
        collection: GlossaryCollection
        termId: string
    }): GlossaryTerm | undefined => {
        throwIfCollectionIsUndefined(collection, "get")
        return collection.termById.get(termId)
    },

    has: ({
        collection,
        termId,
    }: {
        collection: GlossaryCollection
        termId: string
    }): boolean => {
        throwIfCollectionIsUndefined(collection, "has")
        return collection.termById.has(termId)
    },

    termIds: ({ collection }: { collection: GlossaryCollection }): string[] => {
        throwIfCollectionIsUndefined(collection, "termIds")
        return Array.from(collection.termById.keys())
    },
}

const constructNewCollection = (): GlossaryCollection => ({
    termById: new Map(),
})

const clone = (original: GlossaryCollection): GlossaryCollection => ({
    termById: new Map(original.termById),
})

const throwIfCollectionIsUndefined = (
    collection: GlossaryCollection,
    callName: string
) => {
    if (collection == undefined)
        throw new Error(
            `[GlossaryCollectionService.${callName}]: collection must be defined`
        )
}
