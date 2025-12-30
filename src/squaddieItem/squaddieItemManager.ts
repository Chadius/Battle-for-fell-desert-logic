import {
    type SquaddieItemCollection,
    SquaddieItemCollectionService,
} from "./squaddieItemCollection"
import type { SquaddieItem } from "./squaddieItem"

export class SquaddieItemManager {
    collection?: SquaddieItemCollection

    constructor(collection?: SquaddieItemCollection) {
        this.collection = collection
    }

    addOrUpdate(squaddieItem: SquaddieItem): void {
        this.throwIfCollectionIsUndefined(this.addOrUpdate.name)
        this.collection = SquaddieItemCollectionService.addOrUpdate({
            collection: this.collection!,
            squaddieItem,
        })
    }

    has(squaddieItemId: string): boolean {
        this.throwIfCollectionIsUndefined(this.has.name)
        return SquaddieItemCollectionService.has({
            collection: this.collection!,
            id: squaddieItemId,
        })
    }

    get(squaddieItemId: string): SquaddieItem {
        this.throwIfCollectionIsUndefined(this.get.name)
        const item = SquaddieItemCollectionService.get({
            collection: this.collection!,
            id: squaddieItemId,
        })
        if (item == undefined) {
            throw new Error(
                `[SquaddieItemManager.${this.get.name}]: no item ${squaddieItemId} found`
            )
        }
        return item
    }

    remove(squaddieItemId: string): void {
        this.throwIfCollectionIsUndefined(this.remove.name)
        this.collection = SquaddieItemCollectionService.remove({
            collection: this.collection!,
            id: squaddieItemId,
        })
    }

    private throwIfCollectionIsUndefined(callName: string) {
        if (this.collection == undefined)
            throw new Error(
                `[SquaddieItemManager.${callName}]: collection must be defined`
            )
    }
}
