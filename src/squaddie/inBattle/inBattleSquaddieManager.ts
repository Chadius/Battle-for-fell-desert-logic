import {
    type InBattleSquaddieCollection,
    InBattleSquaddieCollectionService,
} from "./inBattleSquaddieCollection.ts"
import type { OutOfBattleSquaddieManager } from "../outOfBattle/outOfBattleSquaddieManager.ts"
import type { OutOfBattleSquaddie } from "../outOfBattle/outOfBattleSquaddie.ts"
import type { OutOfBattleSquaddieAttributeSheet } from "../outOfBattle/outOfBattleSquaddieAttributeSheet.ts"
import type { InBattleSquaddie } from "./inBattleSquaddie.ts"

export class InBattleSquaddieManager {
    inBattleSquaddieCollection: InBattleSquaddieCollection
    outOfBattleSquaddieManager: OutOfBattleSquaddieManager

    constructor(
        inBattleSquaddieCollection: InBattleSquaddieCollection,
        outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    ) {
        this.inBattleSquaddieCollection = inBattleSquaddieCollection
        this.outOfBattleSquaddieManager = outOfBattleSquaddieManager
    }

    createNewSquaddie({
        outOfBattleSquaddieId,
    }: {
        outOfBattleSquaddieId: string
    }):
        | {
              inBattle: number
              outOfBattle: string
          }
        | undefined {
        const outOfBattleSquaddieInfo =
            this.outOfBattleSquaddieManager.getSquaddie(outOfBattleSquaddieId)
        if (outOfBattleSquaddieInfo == undefined) return undefined

        const creationResults =
            InBattleSquaddieCollectionService.createNewSquaddie({
                collection: this.inBattleSquaddieCollection,
                attributeSheet: outOfBattleSquaddieInfo.attributeSheet,
                outOfBattleSquaddie: outOfBattleSquaddieInfo.squaddie,
            })

        this.inBattleSquaddieCollection = creationResults.collection
        return {
            inBattle: creationResults.inBattleId,
            outOfBattle: outOfBattleSquaddieId,
        }
    }

    getSquaddie({
        inBattle,
        outOfBattle,
    }: {
        inBattle: number
        outOfBattle: string
    }):
        | {
              inBattleSquaddie: InBattleSquaddie
              outOfBattleSquaddie: OutOfBattleSquaddie
              attributeSheet: OutOfBattleSquaddieAttributeSheet
          }
        | undefined {
        const outOfBattleInfo =
            this.outOfBattleSquaddieManager.getSquaddie(outOfBattle)
        if (outOfBattleInfo == undefined) return undefined

        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection: this.inBattleSquaddieCollection,
            id: inBattle,
            outOfBattleSquaddieId: outOfBattleInfo.squaddie.id,
        })
        if (inBattleSquaddie == undefined) return undefined

        return {
            inBattleSquaddie,
            outOfBattleSquaddie: outOfBattleInfo.squaddie,
            attributeSheet: outOfBattleInfo.attributeSheet,
        }
    }
}
