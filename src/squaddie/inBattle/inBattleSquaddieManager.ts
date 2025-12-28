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
import {
    ProficiencyLevel,
    type TProficiencyLevel,
    type TProficiencyType,
} from "../../proficiency/proficiencyLevel.ts"
import type { SquaddieActionEffect } from "../../squaddieAction/squaddieAction.ts"
import type { SquaddieItemManager } from "../../squaddieItem/squaddieItemManager.ts"
import type { SquaddieItem } from "../../squaddieItem/squaddieItem.ts"
import type { TSquaddieAffiliation } from "../outOfBattle/affiliation.ts"
import type { DamageResult } from "../../squaddieAction/calculate/result/squaddieActionResult.ts"

export class InBattleSquaddieManager {
    inBattleSquaddieCollection?: InBattleSquaddieCollection
    outOfBattleSquaddieManager?: OutOfBattleSquaddieManager
    squaddieItemManager?: SquaddieItemManager

    constructor(
        inBattleSquaddieCollection?: InBattleSquaddieCollection,
        outOfBattleSquaddieManager?: OutOfBattleSquaddieManager
    ) {
        this.inBattleSquaddieCollection = inBattleSquaddieCollection
        this.outOfBattleSquaddieManager = outOfBattleSquaddieManager
    }

    setSquaddieItemManager(squaddieItemManager: SquaddieItemManager) {
        this.squaddieItemManager = squaddieItemManager
    }

    createNewSquaddie({
        outOfBattleSquaddieId,
    }: {
        outOfBattleSquaddieId: string
    }): {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    } {
        this.throwIfInBattleSquaddieCollectionIsUndefined(
            this.createNewSquaddie.name
        )
        const outOfBattleSquaddieInfo = this.getOutOfBattleSquaddieInfo(
            this.createNewSquaddie.name,
            outOfBattleSquaddieId
        )

        const creationResults =
            InBattleSquaddieCollectionService.createNewSquaddie({
                collection: this.inBattleSquaddieCollection!,
                attributeSheet: outOfBattleSquaddieInfo.attributeSheet,
                outOfBattleSquaddie: outOfBattleSquaddieInfo.squaddie,
            })

        this.inBattleSquaddieCollection = creationResults.collection
        return {
            inBattleSquaddieId: creationResults.inBattleId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        }
    }

    doesSquaddieExist({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }): boolean {
        try {
            this.getSquaddie({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            })
        } catch {
            return false
        }
        return true
    }

    getSquaddie({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }): {
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    } {
        this.throwIfOutOfBattleSquaddieManagerIsUndefined(this.getSquaddie.name)
        this.throwIfInBattleSquaddieCollectionIsUndefined(this.getSquaddie.name)

        const outOfBattleInfo = this.outOfBattleSquaddieManager!.getSquaddie(
            outOfBattleSquaddieId
        )
        if (outOfBattleInfo == undefined)
            throw new Error(
                `[InBattleSquaddieManager.${this.getSquaddie.name}]: no outOfBattleSquaddie found for ${outOfBattleSquaddieId}`
            )

        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection: this.inBattleSquaddieCollection!,
            id: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleInfo.squaddie.id,
        })
        if (inBattleSquaddie == undefined)
            throw new Error(
                `[InBattleSquaddieManager.${this.getSquaddie.name}]: no inBattleSquaddie found for ${outOfBattleSquaddieId}.${inBattleSquaddieId}`
            )

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
    }): {
        current: number
        max: number
    } {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })

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
        damage: { amount: number; type: AttributeScoreType | undefined }
    }): DamageResult {
        const info = this.damageSquaddie({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
            damage,
            commitChanges: false,
            callName: this.previewDamageToSquaddie.name,
        })

        return info.damage
    }

    dealDamageToSquaddie({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        damage,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        damage: { amount: number; type: AttributeScoreType | undefined }
    }) {
        const info = this.damageSquaddie({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
            damage,
            commitChanges: true,
            callName: this.dealDamageToSquaddie.name,
        })

        this.inBattleSquaddieCollection = info.collection
    }

    private damageSquaddie({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        damage,
        commitChanges,
        callName,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        damage: { amount: number; type: AttributeScoreType | undefined }
        commitChanges: boolean
        callName: string
    }): {
        collection: InBattleSquaddieCollection
        damage: DamageResult
    } {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })
        this.throwIfInBattleSquaddieCollectionIsUndefined(callName)

        return InBattleSquaddieCollectionService.dealDamageToSquaddie({
            collection: this.inBattleSquaddieCollection!,
            inBattleSquaddie: squaddieInfo.inBattleSquaddie,
            outOfBattleSquaddie: squaddieInfo.outOfBattleSquaddie,
            damage,
            commitChanges,
        })
    }

    getSquaddieConditions({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }): Map<TSquaddieConditionType, SquaddieCondition[]> {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })
        if (squaddieInfo == undefined) return new Map()

        return InBattleSquaddieCollectionService.getAllConditions({
            collection: this.inBattleSquaddieCollection!,
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

        return InBattleSquaddieCollectionService.calculateConditionAmount({
            collection: this.inBattleSquaddieCollection!,
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
    }): {
        newConditions: SquaddieCondition[]
        netEffect: Map<
            TSquaddieConditionType,
            Omit<SquaddieCondition, "type">[]
        >
    } {
        const info = this.addConditions({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
            conditions: conditions,
            commitChanges: false,
            callName: this.addConditionsToSquaddie.name,
        })

        return info.changes
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
        const info = this.addConditions({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
            conditions,
            commitChanges: true,
            callName: this.addConditionsToSquaddie.name,
        })

        this.inBattleSquaddieCollection = info.collection
    }

    private addConditions({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        conditions,
        commitChanges,
        callName,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        conditions: SquaddieCondition[]
        commitChanges: boolean
        callName: string
    }): {
        collection: InBattleSquaddieCollection
        changes: {
            newConditions: SquaddieCondition[]
            netEffect: Map<
                TSquaddieConditionType,
                Omit<SquaddieCondition, "type">[]
            >
        }
    } {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })
        this.throwIfInBattleSquaddieCollectionIsUndefined(callName)

        return InBattleSquaddieCollectionService.addConditionsToSquaddie({
            collection: this.inBattleSquaddieCollection!,
            inBattleSquaddie: squaddieInfo.inBattleSquaddie,
            outOfBattleSquaddie: squaddieInfo.outOfBattleSquaddie,
            conditions,
            commitChanges,
        })
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
                    collection: this.inBattleSquaddieCollection!,
                    inBattleSquaddie: squaddieInfo.inBattleSquaddie,
                    outOfBattleSquaddie: squaddieInfo.outOfBattleSquaddie,
                    commitChanges: true,
                }
            )

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
        healing: NonNullable<SquaddieActionEffect["healing"]>
    }): {
        net: number
    } {
        const info = this.giveHealing({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
            healing,
            commitChanges: false,
        })
        return info.healing
    }

    giveHealingToSquaddie({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        healing,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        healing: NonNullable<SquaddieActionEffect["healing"]>
    }) {
        const info = this.giveHealing({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
            healing,
            commitChanges: true,
        })
        this.inBattleSquaddieCollection = info.collection
    }

    private giveHealing({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        healing,
        commitChanges,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        healing: NonNullable<SquaddieActionEffect["healing"]>
        commitChanges: boolean
    }): {
        collection: InBattleSquaddieCollection
        healing: {
            net: number
        }
    } {
        this.throwIfInBattleSquaddieCollectionIsUndefined(this.giveHealing.name)
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })
        return InBattleSquaddieCollectionService.giveHealingToSquaddie({
            collection: this.inBattleSquaddieCollection!,
            inBattleSquaddie: squaddieInfo.inBattleSquaddie,
            outOfBattleSquaddie: squaddieInfo.outOfBattleSquaddie,
            healing,
            commitChanges,
        })
    }

    getActionPoints({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }): {
        current: number
    } {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })

        return InBattleSquaddieCollectionService.getActionPoints({
            ...squaddieInfo,
            collection: this.inBattleSquaddieCollection!,
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

        this.inBattleSquaddieCollection =
            InBattleSquaddieCollectionService.spendActionPoints({
                commitChanges: true,
                collection: this.inBattleSquaddieCollection!,
                ...squaddieInfo,
                actionPoints,
            }).collection
    }

    previewSpendActionPoints({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        actionPoints,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        actionPoints: number
    }): { spent: number } {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })

        return {
            spent: InBattleSquaddieCollectionService.spendActionPoints({
                commitChanges: false,
                collection: this.inBattleSquaddieCollection!,
                ...squaddieInfo,
                actionPoints,
            }).spent,
        }
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
                collection: this.inBattleSquaddieCollection!,
                ...squaddieInfo,
            })
    }

    getProficiencyLevel({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        type,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        type: TProficiencyType
    }): TProficiencyLevel {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })
        if (squaddieInfo == undefined) return ProficiencyLevel.UNTRAINED

        return InBattleSquaddieCollectionService.getProficiencyLevel({
            collection: this.inBattleSquaddieCollection!,
            ...squaddieInfo,
            type,
        })
    }

    getRank({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }): number {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })
        if (squaddieInfo == undefined) return -1

        return InBattleSquaddieCollectionService.getRank({
            collection: this.inBattleSquaddieCollection!,
            ...squaddieInfo,
        })
    }

    getAttributeScore({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        type,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        type: AttributeScoreType
    }): number {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })
        if (squaddieInfo == undefined) return -1

        return InBattleSquaddieCollectionService.getAttributeScore({
            collection: this.inBattleSquaddieCollection!,
            ...squaddieInfo,
            type,
        })
    }

    getProficiencyBonus({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        type,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        type: TProficiencyType
    }): {
        total: number
        rank: number
        attributeScore: number
        proficiencyLevel: number
        passiveItemBonus: number
        passiveItemPenalty: number
        conditionBonus: number
        conditionPenalty: number
    } {
        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })

        let passiveItems: SquaddieItem[] = []
        if (this.squaddieItemManager) {
            passiveItems = [
                ...this.getPassiveItemIds({
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                }).keys(),
            ].map((itemId: string) => this.squaddieItemManager!.get(itemId))
        }

        return InBattleSquaddieCollectionService.getProficiencyBonus({
            collection: this.inBattleSquaddieCollection!,
            ...squaddieInfo,
            type,
            passiveItems,
        })
    }

    private getOutOfBattleSquaddieInfo(
        callName: string,
        outOfBattleSquaddieId: string
    ) {
        this.throwIfOutOfBattleSquaddieManagerIsUndefined(callName)
        const outOfBattleSquaddieInfo =
            this.outOfBattleSquaddieManager!.getSquaddie(outOfBattleSquaddieId)
        if (outOfBattleSquaddieInfo == undefined)
            throw new Error(
                `[InBattleSquaddieManager.${callName}]: outOfBattleSquaddie ${outOfBattleSquaddieId} not found`
            )
        return outOfBattleSquaddieInfo
    }

    previewDispelConditions({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        conditionTypes,
        amount,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        conditionTypes: {
            all?: boolean
            types?: TSquaddieConditionType[]
        }
        amount: number | undefined
    }): {
        dispelledConditions: Map<
            TSquaddieConditionType,
            Omit<SquaddieCondition, TSquaddieConditionType>[]
        >
        conditionTypes: {
            all?: boolean
            types?: TSquaddieConditionType[]
        }
        amount: number | undefined
    } {
        const info = this.dispelSquaddieConditions({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
            conditionTypes,
            amount,
            commitChanges: false,
            callName: this.previewDispelConditions.name,
        })
        return {
            dispelledConditions: info.dispelledConditions,
            conditionTypes,
            amount,
        }
    }

    dispelConditions({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        conditionTypes,
        amount,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        conditionTypes: {
            all?: boolean
            types?: TSquaddieConditionType[]
        }
        amount: number | undefined
    }) {
        const info = this.dispelSquaddieConditions({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
            conditionTypes,
            amount,
            commitChanges: true,
            callName: this.dispelConditions.name,
        })
        this.inBattleSquaddieCollection = info.collection
    }

    private dispelSquaddieConditions({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        conditionTypes,
        amount,
        commitChanges,
        callName,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        conditionTypes: {
            all?: boolean
            types?: TSquaddieConditionType[]
        }
        amount: number | undefined
        commitChanges: boolean
        callName: string
    }): {
        collection: InBattleSquaddieCollection
        dispelledConditions: Map<
            TSquaddieConditionType,
            Omit<SquaddieCondition, TSquaddieConditionType>[]
        >
        conditionTypes: {
            all?: boolean
            types?: TSquaddieConditionType[]
        }
        amount: number | undefined
    } {
        this.throwIfInBattleSquaddieCollectionIsUndefined(callName)
        this.throwIfOutOfBattleSquaddieManagerIsUndefined(callName)

        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })

        return InBattleSquaddieCollectionService.dispelSquaddieConditions({
            collection: this.inBattleSquaddieCollection!,
            inBattleSquaddie: squaddieInfo.inBattleSquaddie,
            outOfBattleSquaddie: squaddieInfo.outOfBattleSquaddie,
            conditionTypes,
            amount,
            commitChanges,
        })
    }

    previewTreatConditions({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        conditionTypes,
        amount,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        conditionTypes: {
            all?: boolean
            types?: TSquaddieConditionType[]
        }
        amount: number | undefined
    }): {
        collection: InBattleSquaddieCollection
        treatedConditions: Map<
            TSquaddieConditionType,
            Omit<SquaddieCondition, TSquaddieConditionType>[]
        >
        conditionTypes: {
            all?: boolean
            types?: TSquaddieConditionType[]
        }
        amount: number | undefined
    } {
        return this.treatSquaddieConditions({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
            conditionTypes,
            amount,
            commitChanges: false,
            callName: this.previewTreatConditions.name,
        })
    }

    treatConditions({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        conditionTypes,
        amount,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        conditionTypes: {
            all?: boolean
            types?: TSquaddieConditionType[]
        }
        amount: number | undefined
    }) {
        const info = this.treatSquaddieConditions({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
            conditionTypes,
            amount,
            commitChanges: true,
            callName: this.treatConditions.name,
        })
        this.inBattleSquaddieCollection = info.collection
    }

    private treatSquaddieConditions({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        conditionTypes,
        amount,
        commitChanges,
        callName,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        conditionTypes: {
            all?: boolean
            types?: TSquaddieConditionType[]
        }
        amount: number | undefined
        commitChanges: boolean
        callName: string
    }): {
        collection: InBattleSquaddieCollection
        treatedConditions: Map<
            TSquaddieConditionType,
            Omit<SquaddieCondition, TSquaddieConditionType>[]
        >
        conditionTypes: {
            all?: boolean
            types?: TSquaddieConditionType[]
        }
        amount: number | undefined
    } {
        this.throwIfInBattleSquaddieCollectionIsUndefined(callName)
        this.throwIfOutOfBattleSquaddieManagerIsUndefined(callName)

        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })

        return InBattleSquaddieCollectionService.treatSquaddieConditions({
            collection: this.inBattleSquaddieCollection!,
            inBattleSquaddie: squaddieInfo.inBattleSquaddie,
            outOfBattleSquaddie: squaddieInfo.outOfBattleSquaddie,
            conditionTypes,
            amount,
            commitChanges,
        })
    }

    getAllSquaddieItemIds({
        outOfBattleSquaddieId,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }): string[] {
        this.throwIfOutOfBattleSquaddieManagerIsUndefined(
            this.getAllSquaddieItemIds.name
        )

        return this.outOfBattleSquaddieManager!.getItemIds({
            squaddieId: outOfBattleSquaddieId,
        })
    }

    getConsumableItems({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }): Map<string, { numberOfUses: number }> {
        this.throwIfSquaddieItemManagerIsUndefined(this.getConsumableItems.name)

        const squaddieItems = this.getAllSquaddieItemIds({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
        })

        const { inBattleSquaddie } = this.getSquaddie({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
        })
        const alreadyConsumedItems = new Map<string, number>()
        for (const itemId of inBattleSquaddie.itemIdsUsed) {
            alreadyConsumedItems.set(
                itemId,
                (alreadyConsumedItems.get(itemId) ?? 0) + 1
            )
        }

        const mapEntries: [string, { numberOfUses: number }][] = squaddieItems
            .map((itemId) => this.squaddieItemManager!.get(itemId))
            .filter((item) => item.numberOfUses != undefined)
            .map((item) => [
                item.id,
                {
                    numberOfUses:
                        item.numberOfUses! -
                        (alreadyConsumedItems.get(item.id) ?? 0),
                },
            ])

        return new Map(mapEntries)
    }

    useItem({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        itemId,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        itemId: string
    }): void {
        this.throwIfSquaddieItemManagerIsUndefined(this.useItem.name)

        this.throwIfInBattleSquaddieCollectionIsUndefined(this.useItem.name)
        this.throwIfOutOfBattleSquaddieManagerIsUndefined(this.useItem.name)

        const squaddieInfo = this.getSquaddie({
            inBattleSquaddieId: inBattleSquaddieId,
            outOfBattleSquaddieId: outOfBattleSquaddieId,
        })

        const item = this.squaddieItemManager!.get(itemId)

        this.inBattleSquaddieCollection =
            InBattleSquaddieCollectionService.useItem({
                collection: this.inBattleSquaddieCollection!,
                inBattleSquaddie: squaddieInfo.inBattleSquaddie,
                outOfBattleSquaddie: squaddieInfo.outOfBattleSquaddie,
                item,
            })
    }

    getPassiveItemIds({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }): Map<
        string,
        { passiveProficiencyBonuses: Map<TProficiencyType, number> }
    > {
        this.throwIfSquaddieItemManagerIsUndefined(this.getPassiveItemIds.name)
        const squaddieItems = this.getAllSquaddieItemIds({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
        })

        const mapEntries: [
            string,
            { passiveProficiencyBonuses: Map<TProficiencyType, number> },
        ][] = squaddieItems
            .map((itemId) => this.squaddieItemManager!.get(itemId))
            .filter((item) => item.passiveProficiencyBonuses.size > 0)
            .map((item) => [
                item.id,
                {
                    passiveProficiencyBonuses: new Map(
                        item.passiveProficiencyBonuses
                    ),
                },
            ])
        return new Map(mapEntries)
    }

    getSquaddieMovementInfo({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }): {
        movementPerAction: number
        totalActionPoints: number
        maximumMovementCost: number
        skipOverPits: boolean
        moveThroughWalls: boolean
        stopOnSquaddies: boolean
    } {
        this.throwIfOutOfBattleSquaddieManagerIsUndefined(
            this.getSquaddieMovementInfo.name
        )

        const actionPoints = this.getActionPoints({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
        })
        const outOfBattleMovementInfo =
            this.outOfBattleSquaddieManager!.getSquaddieMovementInfo({
                squaddieId: outOfBattleSquaddieId,
            })

        let maximumMovementCost =
            actionPoints.current * outOfBattleMovementInfo.movementPerAction

        return {
            totalActionPoints: actionPoints.current,
            maximumMovementCost,
            ...outOfBattleMovementInfo,
        }
    }

    calculateActionPointsForMovement({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        movementCost,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        movementCost: number
    }): number {
        const movementInfo = this.getSquaddieMovementInfo({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
        })

        return Math.ceil(movementCost / movementInfo.movementPerAction)
    }

    getSquaddieAffiliation({
        outOfBattleSquaddieId,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
    }): TSquaddieAffiliation {
        this.throwIfOutOfBattleSquaddieManagerIsUndefined(
            this.getSquaddieAffiliation.name
        )
        return this.outOfBattleSquaddieManager!.getSquaddieAffiliation(
            outOfBattleSquaddieId
        )
    }

    private throwIfInBattleSquaddieCollectionIsUndefined(callName: string) {
        if (this.inBattleSquaddieCollection == undefined)
            throw new Error(
                `[InBattleSquaddieManager.${callName}]: inBattleSquaddieCollection must be defined`
            )
    }
    private throwIfOutOfBattleSquaddieManagerIsUndefined(callName: string) {
        if (this.outOfBattleSquaddieManager == undefined)
            throw new Error(
                `[InBattleSquaddieManager.${callName}]: outOfBattleSquaddieManager must be defined`
            )
    }
    private throwIfSquaddieItemManagerIsUndefined(callName: string) {
        if (this.squaddieItemManager == undefined)
            throw new Error(
                `[InBattleSquaddieManager.${callName}]: squaddieItemManager must be defined`
            )
    }
}
