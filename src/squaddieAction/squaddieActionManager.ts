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
        this.collection = SquaddieActionCollectionService.addOrUpdate({
            collection: this.collection!,
            squaddieAction: action,
        })
    }

    has(id: string): boolean {
        this.throwIfActionCollectionIsUndefined(this.has.name)
        return SquaddieActionCollectionService.has({
            collection: this.collection!,
            id,
        })
    }

    get(actionId: string): SquaddieAction {
        this.throwIfActionCollectionIsUndefined(this.get.name)
        const action = SquaddieActionCollectionService.get({
            collection: this.collection!,
            id: actionId,
        })
        if (action == undefined)
            throw new Error(
                `[SquaddieActionManager.${this.get.name}] No action ${actionId} was found`
            )
        return action
    }

    remove(actionId: string) {
        this.throwIfActionCollectionIsUndefined(this.remove.name)
        this.collection = SquaddieActionCollectionService.remove({
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
