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
import { ThrowErrorIfUndefined } from "../../throwErrorIfUndefined.ts"

export class OutOfBattleSquaddieManager {
    squaddieCollection: OutOfBattleSquaddieCollection
    attributeSheetCollection: OutOfBattleSquaddieAttributeSheetCollection

    constructor(
        squaddieCollection: OutOfBattleSquaddieCollection,
        attributeSheetCollection: OutOfBattleSquaddieAttributeSheetCollection
    ) {
        this.squaddieCollection = squaddieCollection
        this.attributeSheetCollection = attributeSheetCollection
    }

    addOrUpdateAttributeSheet(
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    ) {
        ThrowErrorIfUndefined({
            className: "OutOfBattleSquaddieManager",
            value: this.attributeSheetCollection,
            functionName: "addOrUpdateAttributeSheet",
            fieldName: `attributeSheetCollection`,
        })
        this.attributeSheetCollection =
            OutOfBattleSquaddieAttributeSheetCollectionService.addOrUpdateAttributeSheet(
                {
                    collection: this.attributeSheetCollection,
                    ...attributeSheet,
                }
            )
    }

    getAttributeSheet(attributeId: string): OutOfBattleSquaddieAttributeSheet {
        ThrowErrorIfUndefined({
            className: "OutOfBattleSquaddieManager",
            value: this.attributeSheetCollection,
            functionName: "getAttributeSheet",
            fieldName: `attributeSheetCollection`,
        })
        return OutOfBattleSquaddieAttributeSheetCollectionService.getAttributeSheet(
            {
                collection: this.attributeSheetCollection,
                id: attributeId,
            }
        )
    }

    addOrUpdateSquaddie(squaddie: OutOfBattleSquaddie) {
        ThrowErrorIfUndefined({
            className: "OutOfBattleSquaddieManager",
            value: this.squaddieCollection,
            functionName: "addOrUpdateSquaddie",
            fieldName: `squaddieCollection`,
        })
        this.squaddieCollection =
            OutOfBattleSquaddieCollectionService.addOrUpdateOutOfBattleSquaddie(
                {
                    collection: this.squaddieCollection,
                    ...squaddie,
                }
            )
    }

    getRawOutOfBattleSquaddie(id: string): OutOfBattleSquaddie | undefined {
        ThrowErrorIfUndefined({
            className: "OutOfBattleSquaddieManager",
            value: this.squaddieCollection,
            functionName: "getRawOutOfBattleSquaddie",
            fieldName: `squaddieCollection`,
        })
        return OutOfBattleSquaddieCollectionService.getSquaddie({
            collection: this.squaddieCollection,
            id,
        })
    }

    getSquaddie(squaddieId: string):
        | {
              attributeSheet: OutOfBattleSquaddieAttributeSheet
              squaddie: OutOfBattleSquaddie
          }
        | undefined {
        ThrowErrorIfUndefined({
            className: "OutOfBattleSquaddieManager",
            value: this.squaddieCollection,
            functionName: "getSquaddie",
            fieldName: `squaddieCollection`,
        })

        ThrowErrorIfUndefined({
            className: "OutOfBattleSquaddieManager",
            value: this.attributeSheetCollection,
            functionName: "getSquaddie",
            fieldName: `attributeSheetCollection`,
        })
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
        this.squaddieCollection =
            OutOfBattleSquaddieCollectionService.deleteSquaddie({
                collection: this.squaddieCollection,
                id,
            })
    }

    deleteAllOrphanedAttributeSheets() {
        ThrowErrorIfUndefined({
            className: "OutOfBattleSquaddieManager",
            value: this.squaddieCollection,
            functionName: "deleteAllOrphanedAttributeSheets",
            fieldName: `squaddieCollection`,
        })
        ThrowErrorIfUndefined({
            className: "OutOfBattleSquaddieManager",
            value: this.attributeSheetCollection,
            functionName: "deleteAllOrphanedAttributeSheets",
            fieldName: `attributeSheetCollection`,
        })
        const allAttributeIds =
            OutOfBattleSquaddieCollectionService.getAllAttributeIds({
                collection: this.squaddieCollection,
            })
        this.attributeSheetCollection =
            OutOfBattleSquaddieAttributeSheetCollectionService.onlyKeepTheseAttributeIds(
                {
                    collection: this.attributeSheetCollection,
                    idsToKeep: allAttributeIds,
                }
            )
    }
}
