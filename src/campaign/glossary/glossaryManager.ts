import {
    type GlossaryCollection,
    GlossaryCollectionService,
} from "./glossaryCollection.js"
import type { GlossaryTerm, SerializedGlossaryTerm } from "./glossaryTerm.js"
import { LocalizedTextService } from "../../localization/localizedText.js"

export interface ResolvedGlossaryTerm {
    name: string
    definition: string
}

export class GlossaryManager {
    collection?: GlossaryCollection

    constructor(collection?: GlossaryCollection) {
        this.collection = collection
    }

    addOrUpdate(glossaryTerm: GlossaryTerm): void {
        this.throwIfCollectionIsUndefined(this.addOrUpdate.name)
        this.collection = GlossaryCollectionService.addOrUpdate({
            collection: this.collection!,
            glossaryTerm,
        })
    }

    has(termId: string): boolean {
        this.throwIfCollectionIsUndefined(this.has.name)
        return GlossaryCollectionService.has({
            collection: this.collection!,
            termId,
        })
    }

    get(termId: string): GlossaryTerm {
        this.throwIfCollectionIsUndefined(this.get.name)
        const glossaryTerm = GlossaryCollectionService.get({
            collection: this.collection!,
            termId,
        })
        if (glossaryTerm == undefined) {
            throw new Error(
                `[GlossaryManager.${this.get.name}]: no term ${termId} found`
            )
        }
        return glossaryTerm
    }

    remove(termId: string): void {
        this.throwIfCollectionIsUndefined(this.remove.name)
        this.collection = GlossaryCollectionService.remove({
            collection: this.collection!,
            termId,
        })
    }

    serialize(): SerializedGlossaryTerm[] {
        this.throwIfCollectionIsUndefined(this.serialize.name)
        return GlossaryCollectionService.serialize(this.collection!)
    }

    addTermsFromJson(data: unknown): string[] {
        this.throwIfCollectionIsUndefined(this.addTermsFromJson.name)
        const { collection, errors } =
            GlossaryCollectionService.deserializeAll(data)
        for (const glossaryTerm of collection.termById.values()) {
            this.collection = GlossaryCollectionService.addOrUpdate({
                collection: this.collection!,
                glossaryTerm,
            })
        }
        return errors
    }

    resolveTerm(
        termId: string,
        languageCode: string
    ): ResolvedGlossaryTerm | undefined {
        this.throwIfCollectionIsUndefined(this.resolveTerm.name)
        const glossaryTerm = GlossaryCollectionService.get({
            collection: this.collection!,
            termId,
        })
        if (glossaryTerm == undefined) return undefined
        return {
            name: LocalizedTextService.resolve(glossaryTerm.name, languageCode),
            definition: LocalizedTextService.resolve(
                glossaryTerm.definition,
                languageCode
            ),
        }
    }

    private throwIfCollectionIsUndefined(callName: string) {
        if (this.collection == undefined)
            throw new Error(
                `[GlossaryManager.${callName}]: collection must be defined`
            )
    }
}
