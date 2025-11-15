import {
    type OutOfBattleSquaddieCollection,
    OutOfBattleSquaddieCollectionService,
} from "./outOfBattleSquaddieCollection.ts"
import {
    type OutOfBattleSquaddieAttributeSheetCollection,
    OutOfBattleSquaddieAttributeSheetCollectionService,
} from "./outOfBattleSquaddieAttributeSheetCollection.ts"
import { type OutOfBattleSquaddieAttributeSheet } from "./outOfBattleSquaddieAttributeSheet.ts"
import type { OutOfBattleSquaddie } from "./outOfBattleSquaddie.ts"

export class OutOfBattleSquaddieManager {
    squaddieCollection?: OutOfBattleSquaddieCollection
    attributeSheetCollection?: OutOfBattleSquaddieAttributeSheetCollection

    constructor(
        squaddieCollection?: OutOfBattleSquaddieCollection,
        attributeSheetCollection?: OutOfBattleSquaddieAttributeSheetCollection
    ) {
        this.squaddieCollection = squaddieCollection
        this.attributeSheetCollection = attributeSheetCollection
    }

    addOrUpdateAttributeSheet(
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    ) {
        this.throwIfSquaddieCollectionIsUndefined(
            this.addOrUpdateAttributeSheet.name
        )
        this.attributeSheetCollection =
            OutOfBattleSquaddieAttributeSheetCollectionService.addOrUpdateAttributeSheet(
                {
                    collection: this.attributeSheetCollection!,
                    ...attributeSheet,
                }
            )
    }

    getAttributeSheet(attributeId: string): OutOfBattleSquaddieAttributeSheet {
        this.throwIfAttributeSheetCollectionIsUndefined(
            this.getAttributeSheet.name
        )
        return OutOfBattleSquaddieAttributeSheetCollectionService.getAttributeSheet(
            {
                collection: this.attributeSheetCollection!,
                id: attributeId,
            }
        )
    }

    addOrUpdateSquaddie(squaddie: OutOfBattleSquaddie) {
        this.throwIfSquaddieCollectionIsUndefined(this.addOrUpdateSquaddie.name)
        this.squaddieCollection =
            OutOfBattleSquaddieCollectionService.addOrUpdateOutOfBattleSquaddie(
                {
                    collection: this.squaddieCollection!,
                    ...squaddie,
                }
            )
    }

    getRawOutOfBattleSquaddie(id: string): OutOfBattleSquaddie | undefined {
        this.throwIfSquaddieCollectionIsUndefined(
            this.getRawOutOfBattleSquaddie.name
        )
        return OutOfBattleSquaddieCollectionService.getSquaddie({
            collection: this.squaddieCollection!,
            id,
        })
    }

    getSquaddie(squaddieId: string):
        | {
              attributeSheet: OutOfBattleSquaddieAttributeSheet
              squaddie: OutOfBattleSquaddie
          }
        | undefined {
        this.throwIfSquaddieCollectionIsUndefined(this.getSquaddie.name)
        this.throwIfAttributeSheetCollectionIsUndefined(this.getSquaddie.name)
        const rawSquaddie = this.getRawOutOfBattleSquaddie(squaddieId)
        if (rawSquaddie == undefined) return undefined

        const attributeSheetId = rawSquaddie.attributeSheetId
        const attributeSheet = this.getAttributeSheet(attributeSheetId)
        if (attributeSheet == undefined) return undefined

        return {
            attributeSheet,
            squaddie: rawSquaddie,
        }
    }

    deleteSquaddie(id: string) {
        this.throwIfSquaddieCollectionIsUndefined(this.deleteSquaddie.name)
        this.squaddieCollection =
            OutOfBattleSquaddieCollectionService.deleteSquaddie({
                collection: this.squaddieCollection!,
                id,
            })
    }

    deleteAllOrphanedAttributeSheets() {
        this.throwIfSquaddieCollectionIsUndefined(
            this.deleteAllOrphanedAttributeSheets.name
        )
        this.throwIfAttributeSheetCollectionIsUndefined(
            this.deleteAllOrphanedAttributeSheets.name
        )
        const allAttributeIds =
            OutOfBattleSquaddieCollectionService.getAllAttributeIds({
                collection: this.squaddieCollection!,
            })
        this.attributeSheetCollection =
            OutOfBattleSquaddieAttributeSheetCollectionService.onlyKeepTheseAttributeIds(
                {
                    collection: this.attributeSheetCollection!,
                    idsToKeep: allAttributeIds,
                }
            )
    }

    private throwIfSquaddieCollectionIsUndefined(callName: string) {
        if (this.squaddieCollection == undefined)
            throw new Error(
                `[OutOfBattleSquaddieManager.${callName}]: squaddieCollection must be defined`
            )
    }

    private throwIfAttributeSheetCollectionIsUndefined(callName: string) {
        if (this.attributeSheetCollection == undefined)
            throw new Error(
                `[OutOfBattleSquaddieManager.${callName}]: attributeSheetCollection must be defined`
            )
    }
}
