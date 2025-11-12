import {
    type InBattleSquaddieCollection,
    InBattleSquaddieCollectionService,
} from "./inBattleSquaddieCollection.ts"
import type { OutOfBattleSquaddieManager } from "../outOfBattle/outOfBattleSquaddieManager.ts"
import type { OutOfBattleSquaddie } from "../outOfBattle/outOfBattleSquaddie.ts"
import type { OutOfBattleSquaddieAttributeSheet } from "../outOfBattle/outOfBattleSquaddieAttributeSheet.ts"
import type { InBattleSquaddie } from "./inBattleSquaddie.ts"
import type { AttributeScoreType } from "../../proficiency/attributeScore.ts"
import {
    type SquaddieCondition,
    type TSquaddieConditionType,
} from "../../proficiency/squaddieCondition.ts"

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
              inBattleSquaddieId: number
              outOfBattleSquaddieId: string
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
            inBattleSquaddieId: creationResults.inBattleId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        }
    }

    getSquaddie({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }):
        | {
              inBattleSquaddie: InBattleSquaddie
              outOfBattleSquaddie: OutOfBattleSquaddie
              attributeSheet: OutOfBattleSquaddieAttributeSheet
          }
        | undefined {
        const outOfBattleInfo = this.outOfBattleSquaddieManager.getSquaddie(
            outOfBattleSquaddieId
        )
        if (outOfBattleInfo == undefined) return undefined

        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection: this.inBattleSquaddieCollection,
            id: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleInfo.squaddie.id,
        })
        if (inBattleSquaddie == undefined) return undefined

        return {
            inBattleSquaddie,
            outOfBattleSquaddie: outOfBattleInfo.squaddie,
            attributeSheet: outOfBattleInfo.attributeSheet,
        }
    }

    getHitPoints({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }):
        | {
              current: number
              max: number
          }
        | undefined {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })
        if (squaddieInfo == undefined) return undefined

        return {
            ...squaddieInfo.inBattleSquaddie.hitPoints,
        }
    }

    previewDamageToSquaddie({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        damage,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        damage: { amount: number; type: AttributeScoreType }
    }):
        | {
              net: number
              willKo: boolean
          }
        | undefined {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })
        if (squaddieInfo == undefined) return undefined

        return InBattleSquaddieCollectionService.dealDamageToSquaddie({
            collection: this.inBattleSquaddieCollection,
            inBattleSquaddie: squaddieInfo.inBattleSquaddie,
            outOfBattleSquaddie: squaddieInfo.outOfBattleSquaddie,
            damage,
            commitChanges: false,
        })?.damage
    }

    dealDamageToSquaddie({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        damage,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        damage: { amount: number; type: AttributeScoreType }
    }) {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })
        if (squaddieInfo == undefined) return

        const results = InBattleSquaddieCollectionService.dealDamageToSquaddie({
            collection: this.inBattleSquaddieCollection,
            inBattleSquaddie: squaddieInfo.inBattleSquaddie,
            outOfBattleSquaddie: squaddieInfo.outOfBattleSquaddie,
            damage,
            commitChanges: true,
        })

        if (results == undefined) return undefined
        this.inBattleSquaddieCollection = results.collection
    }

    getSquaddieConditions({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }): {
        [k in TSquaddieConditionType]?: Omit<
            SquaddieCondition,
            TSquaddieConditionType
        >[]
    } {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })
        if (squaddieInfo == undefined) return {}

        return InBattleSquaddieCollectionService.getAllConditions({
            collection: this.inBattleSquaddieCollection,
            ...squaddieInfo,
        })
    }

    calculateConditionAmountForSquaddie({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        conditionType,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        conditionType: TSquaddieConditionType
    }): number {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })
        if (squaddieInfo == undefined) return 0

        return InBattleSquaddieCollectionService.calculateConditionAmount({
            collection: this.inBattleSquaddieCollection,
            ...squaddieInfo,
            conditionType,
        })
    }

    previewAddConditionsToSquaddie({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        conditions,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        conditions: SquaddieCondition[]
    }):
        | {
              newConditions: SquaddieCondition[]
              netEffect: {
                  [k in TSquaddieConditionType]?: Omit<
                      SquaddieCondition,
                      "type"
                  >[]
              }
          }
        | undefined {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })
        if (squaddieInfo == undefined) return undefined

        return InBattleSquaddieCollectionService.previewAddConditionsToSquaddie(
            {
                collection: this.inBattleSquaddieCollection,
                inBattleSquaddie: squaddieInfo.inBattleSquaddie,
                outOfBattleSquaddie: squaddieInfo.outOfBattleSquaddie,
                conditions: conditions,
                commitChanges: false,
            }
        )?.changes
    }

    addConditionsToSquaddie({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        conditions,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        conditions: SquaddieCondition[]
    }) {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })
        if (squaddieInfo == undefined) return

        const results =
            InBattleSquaddieCollectionService.previewAddConditionsToSquaddie({
                collection: this.inBattleSquaddieCollection,
                inBattleSquaddie: squaddieInfo.inBattleSquaddie,
                outOfBattleSquaddie: squaddieInfo.outOfBattleSquaddie,
                conditions: conditions,
                commitChanges: true,
            })

        if (results == undefined) return
        this.inBattleSquaddieCollection = results.collection
    }

    reduceConditionDurationsByOneRound({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }) {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })
        if (squaddieInfo == undefined) return

        const results =
            InBattleSquaddieCollectionService.reduceConditionDurationsByOneRound(
                {
                    collection: this.inBattleSquaddieCollection,
                    inBattleSquaddie: squaddieInfo.inBattleSquaddie,
                    outOfBattleSquaddie: squaddieInfo.outOfBattleSquaddie,
                    commitChanges: true,
                }
            )

        if (results == undefined) return
        this.inBattleSquaddieCollection = results.collection
    }

    reduceConditionByAmount({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        conditionType,
        amount,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        conditionType: TSquaddieConditionType
        amount?: number
    }) {
        amount ??= 1
        if (amount <= 0) return
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })
        if (squaddieInfo == undefined) return
        const results =
            InBattleSquaddieCollectionService.reduceConditionByAmount({
                collection: this.inBattleSquaddieCollection,
                inBattleSquaddie: squaddieInfo.inBattleSquaddie,
                outOfBattleSquaddie: squaddieInfo.outOfBattleSquaddie,
                conditionType,
                amount,
                commitChanges: true,
            })
        if (results == undefined) return
        this.inBattleSquaddieCollection = results.collection
    }

    previewHealingToSquaddie({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        healing,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        healing: {
            amount: number
            type: AttributeScoreType
        }
    }):
        | {
              net: number
          }
        | undefined {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })
        if (squaddieInfo == undefined) return undefined

        return InBattleSquaddieCollectionService.giveHealingToSquaddie({
            collection: this.inBattleSquaddieCollection,
            inBattleSquaddie: squaddieInfo.inBattleSquaddie,
            outOfBattleSquaddie: squaddieInfo.outOfBattleSquaddie,
            healing,
            commitChanges: false,
        })?.healing
    }

    giveHealingToSquaddie({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        healing,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        healing: {
            amount: number
            type: AttributeScoreType
        }
    }) {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })
        if (squaddieInfo == undefined) return

        const results = InBattleSquaddieCollectionService.giveHealingToSquaddie(
            {
                collection: this.inBattleSquaddieCollection,
                inBattleSquaddie: squaddieInfo.inBattleSquaddie,
                outOfBattleSquaddie: squaddieInfo.outOfBattleSquaddie,
                healing,
                commitChanges: true,
            }
        )

        if (results == undefined) return
        this.inBattleSquaddieCollection = results.collection
    }

    getActionPoints({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }):
        | {
              normal: number
          }
        | undefined {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })
        if (squaddieInfo == undefined) return undefined

        return InBattleSquaddieCollectionService.getActionPoints({
            ...squaddieInfo,
            collection: this.inBattleSquaddieCollection,
        })
    }

    spendActionPoints({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        actionPoints,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        actionPoints: number
    }) {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })
        if (squaddieInfo == undefined) return

        this.inBattleSquaddieCollection =
            InBattleSquaddieCollectionService.spendActionPoints({
                collection: this.inBattleSquaddieCollection,
                ...squaddieInfo,
                actionPoints,
            })
    }

    resetActionPoints({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }) {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })
        if (squaddieInfo == undefined) return

        this.inBattleSquaddieCollection =
            InBattleSquaddieCollectionService.resetActionPoints({
                collection: this.inBattleSquaddieCollection,
                ...squaddieInfo,
            })
    }
}
