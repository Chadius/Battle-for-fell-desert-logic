import {
    type OutOfBattleSquaddieCollection,
    OutOfBattleSquaddieCollectionService,
} from "./outOfBattleSquaddieCollection"
import {
    type OutOfBattleSquaddieAttributeSheetCollection,
    OutOfBattleSquaddieAttributeSheetCollectionService,
} from "./outOfBattleSquaddieAttributeSheetCollection"
import { type OutOfBattleSquaddieAttributeSheet } from "./outOfBattleSquaddieAttributeSheet"
import type { OutOfBattleSquaddie } from "./outOfBattleSquaddie"
import { type SquaddieMovementInfo } from "../squaddieMovementInfo"
import type { TSquaddieAffiliation } from "../../affiliation/affiliation"

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
                    attributeSheet,
                }
            )
    }

    getAttributeSheet(attributeId: string): OutOfBattleSquaddieAttributeSheet {
        this.throwIfAttributeSheetCollectionIsUndefined(
            this.getAttributeSheet.name
        )
        let attributeSheet =
            OutOfBattleSquaddieAttributeSheetCollectionService.getAttributeSheet(
                {
                    collection: this.attributeSheetCollection!,
                    id: attributeId,
                }
            )
        if (attributeSheet == undefined) {
            const callName = "getAttributeSheet"
            throw new Error(
                `[OutOfBattleSquaddieManager.${callName}]: no attributeSheet ${attributeId} found`
            )
        }
        return attributeSheet
    }

    addOrUpdateSquaddie(squaddie: OutOfBattleSquaddie) {
        this.throwIfSquaddieCollectionIsUndefined(this.addOrUpdateSquaddie.name)
        this.squaddieCollection =
            OutOfBattleSquaddieCollectionService.addOrUpdateOutOfBattleSquaddie(
                {
                    collection: this.squaddieCollection!,
                    outOfBattleSquaddie: squaddie,
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
        try {
            return {
                attributeSheet: this.getAttributeSheet(attributeSheetId),
                squaddie: rawSquaddie,
            }
        } catch {
            return undefined
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

    getItemCapacity({
        attributeSheetId,
        squaddieId,
    }:
        | {
              attributeSheetId: string
              squaddieId?: never
          }
        | {
              attributeSheetId?: never
              squaddieId: string
          }): number {
        this.throwIfAttributeSheetCollectionIsUndefined(
            this.getItemCapacity.name
        )

        this.getAttributeSheetFromSquaddieOrAttributeSheet({
            attributeSheetId,
            squaddieId,
        })

        return OutOfBattleSquaddieAttributeSheetCollectionService.getItemCapacity(
            {
                collection: this.attributeSheetCollection!,
                id: this.getAttributeSheetFromSquaddieOrAttributeSheet({
                    attributeSheetId,
                    squaddieId,
                }).id,
            }
        )
    }

    getItemIds({
        attributeSheetId,
        squaddieId,
    }:
        | {
              attributeSheetId: string
              squaddieId?: never
          }
        | {
              attributeSheetId?: never
              squaddieId: string
          }): string[] {
        this.throwIfAttributeSheetCollectionIsUndefined(this.getItemIds.name)

        return OutOfBattleSquaddieAttributeSheetCollectionService.getItemIds({
            collection: this.attributeSheetCollection!,
            id: this.getAttributeSheetFromSquaddieOrAttributeSheet({
                attributeSheetId,
                squaddieId,
            }).id,
        })
    }

    addItem({
        attributeSheetId,
        squaddieId,
        itemId,
    }:
        | {
              attributeSheetId: string
              squaddieId?: never
              itemId: string
          }
        | {
              attributeSheetId?: never
              squaddieId: string
              itemId: string
          }): void {
        this.throwIfAttributeSheetCollectionIsUndefined(this.addItem.name)

        this.attributeSheetCollection =
            OutOfBattleSquaddieAttributeSheetCollectionService.addItem({
                collection: this.attributeSheetCollection!,
                attributeSheetId:
                    this.getAttributeSheetFromSquaddieOrAttributeSheet({
                        attributeSheetId,
                        squaddieId,
                    }).id,
                itemId,
            })
    }

    reorderItemSlots({
        attributeSheetId,
        squaddieId,
        itemSlotA,
        itemSlotB,
    }:
        | {
              attributeSheetId: string
              squaddieId?: never
              itemSlotA: number
              itemSlotB: number
          }
        | {
              attributeSheetId?: never
              squaddieId: string
              itemSlotA: number
              itemSlotB: number
          }): void {
        this.throwIfAttributeSheetCollectionIsUndefined(
            this.reorderItemSlots.name
        )
        this.attributeSheetCollection =
            OutOfBattleSquaddieAttributeSheetCollectionService.reorderItemSlots(
                {
                    collection: this.attributeSheetCollection!,
                    attributeSheetId:
                        this.getAttributeSheetFromSquaddieOrAttributeSheet({
                            attributeSheetId,
                            squaddieId,
                        }).id,
                    itemSlotA,
                    itemSlotB,
                }
            )
    }

    removeItem({
        squaddieId,
        attributeSheetId,
        itemId,
    }:
        | {
              attributeSheetId: string
              squaddieId?: never
              itemId: string
          }
        | {
              attributeSheetId?: never
              squaddieId: string
              itemId: string
          }): void {
        this.throwIfAttributeSheetCollectionIsUndefined(
            this.reorderItemSlots.name
        )
        this.attributeSheetCollection =
            OutOfBattleSquaddieAttributeSheetCollectionService.removeItem({
                collection: this.attributeSheetCollection!,
                attributeSheetId:
                    this.getAttributeSheetFromSquaddieOrAttributeSheet({
                        attributeSheetId,
                        squaddieId,
                    }).id,
                itemId,
            })
    }

    getSquaddieMovementInfo({
        squaddieId,
    }: {
        squaddieId: string
    }): SquaddieMovementInfo {
        this.throwIfAttributeSheetCollectionIsUndefined(
            this.getSquaddieMovementInfo.name
        )
        this.throwIfSquaddieCollectionIsUndefined(
            this.getSquaddieMovementInfo.name
        )

        const attributeSheet =
            this.getAttributeSheetFromSquaddieOrAttributeSheet({ squaddieId })

        return OutOfBattleSquaddieAttributeSheetCollectionService.getSquaddieMovementInfo(
            {
                collection: this.attributeSheetCollection!,
                attributeSheetId: attributeSheet.id,
            }
        )
    }

    getSquaddieAffiliation(
        outOfBattleSquaddieId: string
    ): TSquaddieAffiliation {
        this.throwIfSquaddieCollectionIsUndefined(
            this.getSquaddieAffiliation.name
        )
        const outOfBattleSquaddie: OutOfBattleSquaddie | undefined =
            OutOfBattleSquaddieCollectionService.getSquaddie({
                collection: this.squaddieCollection!,
                id: outOfBattleSquaddieId,
            })
        if (outOfBattleSquaddie == undefined) {
            throw new Error(
                `[OutOfBattleSquaddieManager.${this.getSquaddieAffiliation.name}]: outOfBattleSquaddieId ${outOfBattleSquaddieId} not found`
            )
        }
        return outOfBattleSquaddie.affiliation
    }

    getAllWithSquaddieAffiliation(
        squaddieAffiliation: TSquaddieAffiliation
    ): OutOfBattleSquaddie[] {
        this.throwIfAttributeSheetCollectionIsUndefined(
            this.getAllWithSquaddieAffiliation.name
        )
        this.throwIfSquaddieCollectionIsUndefined(
            this.getAllWithSquaddieAffiliation.name
        )

        return OutOfBattleSquaddieCollectionService.getAllWithSquaddieAffiliation(
            {
                collection: this.squaddieCollection!,
                squaddieAffiliation,
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
    private getAttributeSheetFromSquaddieOrAttributeSheet({
        attributeSheetId,
        squaddieId,
    }: {
        attributeSheetId?: string
        squaddieId?: string
    }): OutOfBattleSquaddieAttributeSheet {
        if (attributeSheetId == undefined && squaddieId != undefined) {
            attributeSheetId = OutOfBattleSquaddieCollectionService.getSquaddie(
                {
                    collection: this.squaddieCollection!,
                    id: squaddieId,
                }
            )?.attributeSheetId
        }

        if (attributeSheetId == undefined) {
            throw new Error(
                "[OutOfBattleSquaddieManager]: attributeSheetId must be defined"
            )
        }

        const attributeSheet =
            OutOfBattleSquaddieAttributeSheetCollectionService.getAttributeSheet(
                {
                    collection: this.attributeSheetCollection!,
                    id: attributeSheetId,
                }
            )

        if (attributeSheet == undefined) {
            throw new Error(
                "[OutOfBattleSquaddieManager]: attributeSheet must be defined"
            )
        }

        return attributeSheet
    }
}
