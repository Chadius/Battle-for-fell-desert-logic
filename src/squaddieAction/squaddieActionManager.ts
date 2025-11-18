import {
    type SquaddieActionCollection,
    SquaddieActionCollectionService,
} from "./squaddieActionCollection.ts"
import type { SquaddieAction } from "./squaddieAction.ts"

export class SquaddieActionManager {
    collection?: SquaddieActionCollection

    constructor(collection?: SquaddieActionCollection) {
        this.collection = collection
    }

    addOrUpdate(action: SquaddieAction) {
        this.throwIfActionCollectionIsUndefined(this.addOrUpdate.name)
        this.collection = SquaddieActionCollectionService.addOrUpdateAction({
            collection: this.collection!,
            squaddieAction: action,
        })
    }

    get(actionId: string): SquaddieAction {
        this.throwIfActionCollectionIsUndefined(this.get.name)
        return SquaddieActionCollectionService.getAction({
            collection: this.collection!,
            id: actionId,
        })
    }

    remove(actionId: string) {
        this.throwIfActionCollectionIsUndefined(this.remove.name)
        this.collection = SquaddieActionCollectionService.removeAction({
            collection: this.collection!,
            actionId,
        })
    }

    private throwIfActionCollectionIsUndefined(callName: string) {
        if (this.collection == undefined)
            throw new Error(
                `[SquaddieActionManager.${callName}]: collection must be defined`
            )
    }
}
