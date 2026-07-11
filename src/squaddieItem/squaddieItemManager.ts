import {
    type SquaddieItemCollection,
    SquaddieItemCollectionService,
} from "./squaddieItemCollection.js"
import {
    type SerializedSquaddieItem,
    type SquaddieItem,
} from "./squaddieItem.js"

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

    serialize(): SerializedSquaddieItem[] {
        this.throwIfCollectionIsUndefined(this.serialize.name)
        return SquaddieItemCollectionService.serialize(this.collection!)
    }

    addItemsFromJson(data: unknown): string[] {
        this.throwIfCollectionIsUndefined(this.addItemsFromJson.name)
        const items = Array.isArray(data) ? data : [data]
        const { collection, errors } =
            SquaddieItemCollectionService.deserializeAll(items)
        for (const squaddieItem of collection.itemById.values()) {
            this.collection = SquaddieItemCollectionService.addOrUpdate({
                collection: this.collection!,
                squaddieItem,
            })
        }
        return errors
    }

    private throwIfCollectionIsUndefined(callName: string) {
        if (this.collection == undefined)
            throw new Error(
                `[SquaddieItemManager.${callName}]: collection must be defined`
            )
    }
}
