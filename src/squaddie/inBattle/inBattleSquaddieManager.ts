import {
    type InBattleSquaddieCollection,
    InBattleSquaddieCollectionService,
    type SerializedInBattleSquaddieCollection,
} from "./inBattleSquaddieCollection.js"
import type { OutOfBattleSquaddieManager } from "../outOfBattle/outOfBattleSquaddieManager.js"
import type { OutOfBattleSquaddie } from "../outOfBattle/outOfBattleSquaddie.js"
import type { OutOfBattleSquaddieAttributeSheet } from "../outOfBattle/outOfBattleSquaddieAttributeSheet.js"
import type { BattleSquaddieId, InBattleSquaddie } from "./inBattleSquaddie.js"
import type { AttributeScoreType } from "../../proficiency/attributeScore.js"
import {
    type SquaddieCondition,
    type TSquaddieConditionDecaysAt,
    type TSquaddieConditionType,
} from "../../proficiency/squaddieCondition.js"
import {
    type TProficiencyLevel,
    type TProficiencyType,
} from "../../proficiency/proficiencyLevel.js"
import type { SquaddieItemManager } from "../../squaddieItem/squaddieItemManager.js"
import type { SquaddieItem } from "../../squaddieItem/squaddieItem.js"
import type { DamageResult } from "../../squaddieAction/calculate/result/squaddieActionResult.js"
import {
    SquaddieAffiliation,
    type TSquaddieAffiliation,
} from "../../affiliation/affiliation.js"
import { type SquaddieInfo, SquaddieInfoService } from "./squaddieInfo.js"
import { type SquaddieMovementInfo } from "../squaddieMovementInfo.js"
import type { SquaddieActionEffect } from "../../squaddieAction/squaddieActionEffect.js"

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
    }): BattleSquaddieId {
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

    doesSquaddieExist(battleSquaddieId: BattleSquaddieId): boolean {
        try {
            this.getSquaddie(battleSquaddieId)
        } catch {
            return false
        }
        return true
    }

    getBattleSquaddieIdsByOutOfBattleSquaddieId(
        outOfBattleSquaddieId: string
    ): BattleSquaddieId[] {
        this.throwIfInBattleSquaddieCollectionIsUndefined(
            this.getBattleSquaddieIdsByOutOfBattleSquaddieId.name
        )
        return InBattleSquaddieCollectionService.getSquaddiesByOutOfBattleSquaddieId(
            {
                collection: this.inBattleSquaddieCollection!,
                outOfBattleSquaddieId,
            }
        ).map((inBattleSquaddie) => ({
            outOfBattleSquaddieId,
            inBattleSquaddieId: inBattleSquaddie.id,
        }))
    }

    getSquaddie(battleSquaddieId: BattleSquaddieId): {
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    } {
        this.throwIfOutOfBattleSquaddieManagerIsUndefined(this.getSquaddie.name)
        this.throwIfInBattleSquaddieCollectionIsUndefined(this.getSquaddie.name)

        const outOfBattleInfo = this.outOfBattleSquaddieManager!.getSquaddie(
            battleSquaddieId.outOfBattleSquaddieId
        )
        if (outOfBattleInfo == undefined)
            throw new Error(
                `[InBattleSquaddieManager.${this.getSquaddie.name}]: no outOfBattleSquaddie found for ${battleSquaddieId.outOfBattleSquaddieId}`
            )

        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection: this.inBattleSquaddieCollection!,
            battleSquaddieId,
        })
        if (inBattleSquaddie == undefined)
            throw new Error(
                `[InBattleSquaddieManager.${this.getSquaddie.name}]: no inBattleSquaddie found for ${battleSquaddieId.outOfBattleSquaddieId}.${battleSquaddieId.inBattleSquaddieId}`
            )

        return {
            inBattleSquaddie,
            outOfBattleSquaddie: outOfBattleInfo.squaddie,
            attributeSheet: outOfBattleInfo.attributeSheet,
        }
    }

    getSquaddieInfo(battleSquaddieId: BattleSquaddieId): SquaddieInfo {
        const hitPoints = this.getHitPoints(battleSquaddieId)

        const actionPoints = this.getActionPoints(battleSquaddieId)

        const maxActionPoints = this.getMaximumActionPoints(battleSquaddieId)

        const affiliation = this.getSquaddieAffiliation(battleSquaddieId)

        const conditions = this.getSquaddieConditions(battleSquaddieId)

        const isDefeated = this.isSquaddieDefeated(battleSquaddieId)

        const canAct = this.canSquaddieAct({
            battleSquaddieId,
        })

        const squaddieInfo = this.getSquaddie(battleSquaddieId)

        const itemIds = this.getAllSquaddieItemIds(battleSquaddieId)

        return SquaddieInfoService.new({
            name: squaddieInfo.inBattleSquaddie.name,
            affiliation,
            currentHitPoints: hitPoints.current,
            maxHitPoints: hitPoints.max,
            currentActionPoints: actionPoints.current,
            maximumActionPoints: maxActionPoints,
            conditions,
            isDefeated,
            canAct,
            items: {
                itemIds,
                itemIdsUsed: squaddieInfo.inBattleSquaddie.itemIdsUsed,
            },
        })
    }

    getHitPoints(battleSquaddieId: BattleSquaddieId): {
        current: number
        max: number
    } {
        const squaddieInfo = this.getSquaddie(battleSquaddieId)

        return {
            ...squaddieInfo.inBattleSquaddie.hitPoints,
        }
    }

    previewDamageToSquaddie(
        params: BattleSquaddieId & {
            damage: { amount: number; type: AttributeScoreType | undefined }
        }
    ): DamageResult {
        const info = this.damageSquaddie({
            ...params,
            commitChanges: false,
            callName: this.previewDamageToSquaddie.name,
        })

        return info.damage
    }

    dealDamageToSquaddie(
        params: BattleSquaddieId & {
            damage: { amount: number; type: AttributeScoreType | undefined }
        }
    ) {
        const info = this.damageSquaddie({
            ...params,
            commitChanges: true,
            callName: this.dealDamageToSquaddie.name,
        })

        this.inBattleSquaddieCollection = info.collection
    }

    private damageSquaddie(
        params: BattleSquaddieId & {
            damage: { amount: number; type: AttributeScoreType | undefined }
            commitChanges: boolean
            callName: string
        }
    ): {
        collection: InBattleSquaddieCollection
        damage: DamageResult
    } {
        this.throwIfInBattleSquaddieCollectionIsUndefined(params.callName)

        return InBattleSquaddieCollectionService.dealDamageToSquaddie({
            collection: this.inBattleSquaddieCollection!,
            battleSquaddieId: params,
            damage: params.damage,
            commitChanges: params.commitChanges,
        })
    }

    getSquaddieConditions(
        battleSquaddieId: BattleSquaddieId
    ): Map<TSquaddieConditionType, SquaddieCondition[]> {
        return InBattleSquaddieCollectionService.getAllConditions({
            collection: this.inBattleSquaddieCollection!,
            battleSquaddieId,
        })
    }

    calculateConditionAmountForSquaddie(
        params: BattleSquaddieId & {
            conditionType: TSquaddieConditionType
        }
    ): number {
        return InBattleSquaddieCollectionService.calculateConditionAmount({
            collection: this.inBattleSquaddieCollection!,
            battleSquaddieId: params,
            conditionType: params.conditionType,
        })
    }

    previewAddConditionsToSquaddie(
        params: BattleSquaddieId & {
            conditions: SquaddieCondition[]
        }
    ): {
        newConditions: SquaddieCondition[]
        netEffect: Map<
            TSquaddieConditionType,
            Omit<SquaddieCondition, "type">[]
        >
    } {
        const info = this.addConditions({
            ...params,
            commitChanges: false,
            callName: this.addConditionsToSquaddie.name,
        })

        return info.changes
    }

    addConditionsToSquaddie(
        params: BattleSquaddieId & {
            conditions: SquaddieCondition[]
        }
    ) {
        const info = this.addConditions({
            ...params,
            commitChanges: true,
            callName: this.addConditionsToSquaddie.name,
        })

        this.inBattleSquaddieCollection = info.collection
    }

    private addConditions(
        params: BattleSquaddieId & {
            conditions: SquaddieCondition[]
            commitChanges: boolean
            callName: string
        }
    ): {
        collection: InBattleSquaddieCollection
        changes: {
            newConditions: SquaddieCondition[]
            netEffect: Map<
                TSquaddieConditionType,
                Omit<SquaddieCondition, "type">[]
            >
        }
    } {
        this.throwIfInBattleSquaddieCollectionIsUndefined(params.callName)

        return InBattleSquaddieCollectionService.addConditionsToSquaddie({
            collection: this.inBattleSquaddieCollection!,
            battleSquaddieId: params,
            conditions: params.conditions,
            commitChanges: params.commitChanges,
        })
    }

    reduceConditionDurationsByOneRound(
        params: BattleSquaddieId & {
            decaysAt: TSquaddieConditionDecaysAt
        }
    ): TSquaddieConditionType[] {
        const results =
            InBattleSquaddieCollectionService.reduceConditionDurationsByOneRound(
                {
                    collection: this.inBattleSquaddieCollection!,
                    battleSquaddieId: params,
                    commitChanges: true,
                    decaysAt: params.decaysAt,
                }
            )

        if (results == undefined) return []
        this.inBattleSquaddieCollection = results.collection
        return results.removedConditions
    }
    previewHealingToSquaddie(
        params: BattleSquaddieId & {
            healing: NonNullable<SquaddieActionEffect["healing"]>
        }
    ): {
        net: number
    } {
        const info = this.giveHealing({
            ...params,
            commitChanges: false,
        })
        return info.healing
    }

    giveHealingToSquaddie(
        params: BattleSquaddieId & {
            healing: NonNullable<SquaddieActionEffect["healing"]>
        }
    ) {
        const info = this.giveHealing({
            ...params,
            commitChanges: true,
        })
        this.inBattleSquaddieCollection = info.collection
    }

    private giveHealing(
        params: BattleSquaddieId & {
            healing: NonNullable<SquaddieActionEffect["healing"]>
            commitChanges: boolean
        }
    ): {
        collection: InBattleSquaddieCollection
        healing: {
            net: number
        }
    } {
        this.throwIfInBattleSquaddieCollectionIsUndefined(this.giveHealing.name)
        return InBattleSquaddieCollectionService.giveHealingToSquaddie({
            collection: this.inBattleSquaddieCollection!,
            battleSquaddieId: params,
            healing: params.healing,
            commitChanges: params.commitChanges,
        })
    }

    getActionPoints(
        battleSquaddieId: BattleSquaddieId
    ): InBattleSquaddie["actionPoints"] {
        return InBattleSquaddieCollectionService.getActionPoints({
            battleSquaddieId,
            collection: this.inBattleSquaddieCollection!,
        })
    }

    getMaximumActionPoints(battleSquaddieId: BattleSquaddieId): number {
        return InBattleSquaddieCollectionService.getMaximumActionPoints({
            battleSquaddieId,
            collection: this.inBattleSquaddieCollection!,
        })
    }

    canSquaddieAct({
        battleSquaddieId,
        actionPoints,
    }: {
        battleSquaddieId: BattleSquaddieId
        actionPoints?: InBattleSquaddie["actionPoints"]
    }): boolean {
        const squaddieInfo = this.getSquaddie(battleSquaddieId)

        if (this.isSquaddieDefeated(battleSquaddieId)) {
            return false
        }
        return (
            (actionPoints ?? squaddieInfo.inBattleSquaddie.actionPoints)
                .current > 0
        )
    }

    isSquaddieDefeated(battleSquaddieId: BattleSquaddieId): boolean {
        const squaddieInfo = this.getSquaddie(battleSquaddieId)

        return squaddieInfo.inBattleSquaddie.hitPoints.current <= 0
    }

    spendActionPoints(
        params: BattleSquaddieId & {
            actionPoints: number
        }
    ) {
        this.inBattleSquaddieCollection =
            InBattleSquaddieCollectionService.spendActionPoints({
                commitChanges: true,
                collection: this.inBattleSquaddieCollection!,
                battleSquaddieId: params,
                actionPoints: params.actionPoints,
            }).collection
    }

    previewSpendActionPoints(
        params: BattleSquaddieId & {
            actionPoints: number
        }
    ): { spent: number } {
        return {
            spent: InBattleSquaddieCollectionService.spendActionPoints({
                commitChanges: false,
                collection: this.inBattleSquaddieCollection!,
                battleSquaddieId: params,
                actionPoints: params.actionPoints,
            }).spent,
        }
    }

    restoreActionPoints(
        params: BattleSquaddieId & {
            actionPoints: number
        }
    ) {
        this.inBattleSquaddieCollection =
            InBattleSquaddieCollectionService.restoreActionPoints({
                commitChanges: true,
                collection: this.inBattleSquaddieCollection!,
                battleSquaddieId: params,
                actionPoints: params.actionPoints,
            }).collection
    }

    previewRestoreActionPoints(
        params: BattleSquaddieId & {
            actionPoints: number
        }
    ): { restored: number } {
        return {
            restored: InBattleSquaddieCollectionService.restoreActionPoints({
                commitChanges: false,
                collection: this.inBattleSquaddieCollection!,
                battleSquaddieId: params,
                actionPoints: params.actionPoints,
            }).restored,
        }
    }

    resetActionPoints(battleSquaddieId: BattleSquaddieId) {
        this.inBattleSquaddieCollection =
            InBattleSquaddieCollectionService.resetActionPoints({
                collection: this.inBattleSquaddieCollection!,
                battleSquaddieId,
            })
    }

    resetAttackContributionThisTurn(battleSquaddieId: BattleSquaddieId) {
        this.inBattleSquaddieCollection =
            InBattleSquaddieCollectionService.resetAttackContributionThisTurn({
                collection: this.inBattleSquaddieCollection!,
                battleSquaddieId,
            })
    }

    getAttackContributionThisTurn(battleSquaddieId: BattleSquaddieId): number {
        return InBattleSquaddieCollectionService.getAttackContributionThisTurn({
            collection: this.inBattleSquaddieCollection!,
            battleSquaddieId,
        })
    }

    incrementAttackContributionThisTurn(
        params: BattleSquaddieId & {
            amount: number
        }
    ) {
        this.inBattleSquaddieCollection =
            InBattleSquaddieCollectionService.incrementAttackContributionThisTurn(
                {
                    collection: this.inBattleSquaddieCollection!,
                    battleSquaddieId: params,
                    amount: params.amount,
                }
            )
    }

    getProficiencyLevel(
        params: BattleSquaddieId & {
            type: TProficiencyType
        }
    ): TProficiencyLevel {
        const squaddieInfo = this.getSquaddie(params)

        return InBattleSquaddieCollectionService.getProficiencyLevel({
            collection: this.inBattleSquaddieCollection!,
            battleSquaddieId: params,
            attributeSheet: squaddieInfo.attributeSheet,
            type: params.type,
        })
    }

    getRank(battleSquaddieId: BattleSquaddieId): number {
        const squaddieInfo = this.getSquaddie(battleSquaddieId)

        return InBattleSquaddieCollectionService.getRank({
            collection: this.inBattleSquaddieCollection!,
            battleSquaddieId,
            attributeSheet: squaddieInfo.attributeSheet,
        })
    }

    getAttributeScore(
        params: BattleSquaddieId & {
            type: AttributeScoreType
        }
    ): number {
        const squaddieInfo = this.getSquaddie(params)

        return InBattleSquaddieCollectionService.getAttributeScore({
            collection: this.inBattleSquaddieCollection!,
            battleSquaddieId: params,
            attributeSheet: squaddieInfo.attributeSheet,
            type: params.type,
        })
    }

    getProficiencyBonus(
        params: BattleSquaddieId & {
            type: TProficiencyType
        }
    ): {
        total: number
        rank: number
        attributeScore: number
        proficiencyLevel: number
        passiveItemBonus: number
        passiveItemPenalty: number
        conditionBonus: number
        conditionPenalty: number
    } {
        const squaddieInfo = this.getSquaddie(params)

        let passiveItems: SquaddieItem[] = []
        if (this.squaddieItemManager) {
            passiveItems = [...this.getPassiveItemIds(params).keys()].map(
                (itemId: string) => this.squaddieItemManager!.get(itemId)
            )
        }

        return InBattleSquaddieCollectionService.getProficiencyBonus({
            collection: this.inBattleSquaddieCollection!,
            battleSquaddieId: params,
            attributeSheet: squaddieInfo.attributeSheet,
            type: params.type,
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

    previewDispelConditions(
        params: BattleSquaddieId & {
            conditionTypes: {
                all?: boolean
                types?: TSquaddieConditionType[]
            }
            amount: number | undefined
        }
    ): {
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
            ...params,
            commitChanges: false,
            callName: this.previewDispelConditions.name,
        })
        return {
            dispelledConditions: info.dispelledConditions,
            conditionTypes: params.conditionTypes,
            amount: params.amount,
        }
    }

    dispelConditions(
        params: BattleSquaddieId & {
            conditionTypes: {
                all?: boolean
                types?: TSquaddieConditionType[]
            }
            amount: number | undefined
        }
    ) {
        const info = this.dispelSquaddieConditions({
            ...params,
            commitChanges: true,
            callName: this.dispelConditions.name,
        })
        this.inBattleSquaddieCollection = info.collection
    }

    private dispelSquaddieConditions(
        params: BattleSquaddieId & {
            conditionTypes: {
                all?: boolean
                types?: TSquaddieConditionType[]
            }
            amount: number | undefined
            commitChanges: boolean
            callName: string
        }
    ): {
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
        this.throwIfInBattleSquaddieCollectionIsUndefined(params.callName)
        this.throwIfOutOfBattleSquaddieManagerIsUndefined(params.callName)

        return InBattleSquaddieCollectionService.dispelSquaddieConditions({
            collection: this.inBattleSquaddieCollection!,
            battleSquaddieId: params,
            conditionTypes: params.conditionTypes,
            amount: params.amount,
            commitChanges: params.commitChanges,
        })
    }

    previewTreatConditions(
        params: BattleSquaddieId & {
            conditionTypes: {
                all?: boolean
                types?: TSquaddieConditionType[]
            }
            amount: number | undefined
        }
    ): {
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
            ...params,
            commitChanges: false,
            callName: this.previewTreatConditions.name,
        })
    }

    treatConditions(
        params: BattleSquaddieId & {
            conditionTypes: {
                all?: boolean
                types?: TSquaddieConditionType[]
            }
            amount: number | undefined
        }
    ) {
        const info = this.treatSquaddieConditions({
            ...params,
            commitChanges: true,
            callName: this.treatConditions.name,
        })
        this.inBattleSquaddieCollection = info.collection
    }

    private treatSquaddieConditions(
        params: BattleSquaddieId & {
            conditionTypes: {
                all?: boolean
                types?: TSquaddieConditionType[]
            }
            amount: number | undefined
            commitChanges: boolean
            callName: string
        }
    ): {
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
        this.throwIfInBattleSquaddieCollectionIsUndefined(params.callName)
        this.throwIfOutOfBattleSquaddieManagerIsUndefined(params.callName)

        return InBattleSquaddieCollectionService.treatSquaddieConditions({
            collection: this.inBattleSquaddieCollection!,
            battleSquaddieId: params,
            conditionTypes: params.conditionTypes,
            amount: params.amount,
            commitChanges: params.commitChanges,
        })
    }

    getAllSquaddieItemIds(battleSquaddieId: BattleSquaddieId): string[] {
        this.throwIfOutOfBattleSquaddieManagerIsUndefined(
            this.getAllSquaddieItemIds.name
        )

        return this.outOfBattleSquaddieManager!.getItemIds({
            squaddieId: battleSquaddieId.outOfBattleSquaddieId,
        })
    }

    getConsumableItems(
        battleSquaddieId: BattleSquaddieId
    ): Map<string, { numberOfUses: number; glossaryTermIds?: string[] }> {
        this.throwIfSquaddieItemManagerIsUndefined(this.getConsumableItems.name)

        const squaddieItems = this.getAllSquaddieItemIds(battleSquaddieId)

        const { inBattleSquaddie } = this.getSquaddie(battleSquaddieId)
        const alreadyConsumedItems = new Map<string, number>()
        for (const itemId of inBattleSquaddie.itemIdsUsed) {
            alreadyConsumedItems.set(
                itemId,
                (alreadyConsumedItems.get(itemId) ?? 0) + 1
            )
        }

        const mapEntries: [
            string,
            { numberOfUses: number; glossaryTermIds?: string[] },
        ][] = squaddieItems
            .map((itemId) => this.squaddieItemManager!.get(itemId))
            .filter((item) => item.numberOfUses != undefined)
            .map((item) => [
                item.id,
                {
                    numberOfUses:
                        item.numberOfUses! -
                        (alreadyConsumedItems.get(item.id) ?? 0),
                    glossaryTermIds: item.glossaryTermIds,
                },
            ])

        return new Map(mapEntries)
    }

    useItem(
        params: BattleSquaddieId & {
            itemId: string
        }
    ): void {
        this.throwIfSquaddieItemManagerIsUndefined(this.useItem.name)

        this.throwIfInBattleSquaddieCollectionIsUndefined(this.useItem.name)
        this.throwIfOutOfBattleSquaddieManagerIsUndefined(this.useItem.name)

        const item = this.squaddieItemManager!.get(params.itemId)

        this.inBattleSquaddieCollection =
            InBattleSquaddieCollectionService.useItem({
                collection: this.inBattleSquaddieCollection!,
                battleSquaddieId: params,
                item,
            })
    }

    recordCooldown({
        battleSquaddieId,
        actionId,
        turnsRemaining,
    }: {
        battleSquaddieId: BattleSquaddieId
        actionId: string
        turnsRemaining: number
    }): void {
        this.throwIfInBattleSquaddieCollectionIsUndefined(
            this.recordCooldown.name
        )

        this.inBattleSquaddieCollection =
            InBattleSquaddieCollectionService.recordCooldown({
                collection: this.inBattleSquaddieCollection!,
                battleSquaddieId,
                actionId,
                turnsRemaining,
            })
    }

    decrementActionCooldowns(battleSquaddieId: BattleSquaddieId): void {
        this.throwIfInBattleSquaddieCollectionIsUndefined(
            this.decrementActionCooldowns.name
        )

        this.inBattleSquaddieCollection =
            InBattleSquaddieCollectionService.decrementActionCooldowns({
                collection: this.inBattleSquaddieCollection!,
                battleSquaddieId,
            })
    }

    getActionCooldown({
        battleSquaddieId,
        actionId,
    }: {
        battleSquaddieId: BattleSquaddieId
        actionId: string
    }): number | undefined {
        this.throwIfInBattleSquaddieCollectionIsUndefined(
            this.getActionCooldown.name
        )
        return this.getSquaddie(
            battleSquaddieId
        ).inBattleSquaddie.actionCooldowns.get(actionId)
    }

    recordActionUse({
        battleSquaddieId,
        actionId,
    }: {
        battleSquaddieId: BattleSquaddieId
        actionId: string
    }): void {
        this.throwIfInBattleSquaddieCollectionIsUndefined(
            this.recordActionUse.name
        )
        this.inBattleSquaddieCollection =
            InBattleSquaddieCollectionService.recordActionUse({
                collection: this.inBattleSquaddieCollection!,
                battleSquaddieId,
                actionId,
            })
    }

    resetActionUsesThisTurn(battleSquaddieId: BattleSquaddieId): void {
        this.throwIfInBattleSquaddieCollectionIsUndefined(
            this.resetActionUsesThisTurn.name
        )
        this.inBattleSquaddieCollection =
            InBattleSquaddieCollectionService.resetActionUsesThisTurn({
                collection: this.inBattleSquaddieCollection!,
                battleSquaddieId,
            })
    }

    getActionUsesThisTurn({
        battleSquaddieId,
        actionId,
    }: {
        battleSquaddieId: BattleSquaddieId
        actionId: string
    }): number {
        this.throwIfInBattleSquaddieCollectionIsUndefined(
            this.getActionUsesThisTurn.name
        )
        return (
            this.getSquaddie(
                battleSquaddieId
            ).inBattleSquaddie.actionUsesThisTurn.get(actionId) ?? 0
        )
    }

    getActionUsesThisMission({
        battleSquaddieId,
        actionId,
    }: {
        battleSquaddieId: BattleSquaddieId
        actionId: string
    }): number {
        this.throwIfInBattleSquaddieCollectionIsUndefined(
            this.getActionUsesThisMission.name
        )
        return (
            this.getSquaddie(
                battleSquaddieId
            ).inBattleSquaddie.actionUsesThisMission.get(actionId) ?? 0
        )
    }

    getPassiveItemIds(
        battleSquaddieId: BattleSquaddieId
    ): Map<
        string,
        { passiveProficiencyBonuses: Map<TProficiencyType, number> }
    > {
        this.throwIfSquaddieItemManagerIsUndefined(this.getPassiveItemIds.name)
        const squaddieItems = this.getAllSquaddieItemIds(battleSquaddieId)

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

    getSquaddieMovementInfo(
        params: BattleSquaddieId & {
            actionPoints?: InBattleSquaddie["actionPoints"]
        }
    ): SquaddieMovementInfo & {
        totalActionPoints: number
        maximumMovementCost: number
    } {
        this.throwIfOutOfBattleSquaddieManagerIsUndefined(
            this.getSquaddieMovementInfo.name
        )

        const actionPoints = params.actionPoints ?? this.getActionPoints(params)
        const outOfBattleMovementInfo =
            this.outOfBattleSquaddieManager!.getSquaddieMovementInfo({
                squaddieId: params.outOfBattleSquaddieId,
            })

        let maximumMovementCost =
            actionPoints.current *
            outOfBattleMovementInfo.movementPointsPerAction

        return {
            totalActionPoints: actionPoints.current,
            maximumMovementCost,
            ...outOfBattleMovementInfo,
        }
    }

    calculateActionPointsForMovement(
        params: BattleSquaddieId & {
            movementCost: number
        }
    ): number {
        const movementInfo = this.getSquaddieMovementInfo(params)

        return Math.ceil(
            params.movementCost / movementInfo.movementPointsPerAction
        )
    }

    getSquaddieAffiliation(
        battleSquaddieId: BattleSquaddieId
    ): TSquaddieAffiliation {
        this.throwIfOutOfBattleSquaddieManagerIsUndefined(
            this.getSquaddieAffiliation.name
        )
        return this.outOfBattleSquaddieManager!.getSquaddieAffiliation(
            battleSquaddieId.outOfBattleSquaddieId
        )
    }

    getAllSquaddiesOfAffiliation(
        affiliation: TSquaddieAffiliation
    ): BattleSquaddieId[] {
        this.throwIfOutOfBattleSquaddieManagerIsUndefined(
            this.getAllSquaddiesOfAffiliation.name
        )
        this.throwIfInBattleSquaddieCollectionIsUndefined(
            this.getAllSquaddiesOfAffiliation.name
        )

        const outOfBattleSquaddies =
            this.outOfBattleSquaddieManager!.getAllWithSquaddieAffiliation(
                affiliation
            )

        const squaddieIds: BattleSquaddieId[] = []
        for (const outOfBattleSquaddie of outOfBattleSquaddies) {
            const inBattleSquaddies =
                InBattleSquaddieCollectionService.getSquaddiesByOutOfBattleSquaddieId(
                    {
                        collection: this.inBattleSquaddieCollection!,
                        outOfBattleSquaddieId: outOfBattleSquaddie.id,
                    }
                )
            for (const inBattleSquaddie of inBattleSquaddies) {
                squaddieIds.push({
                    inBattleSquaddieId: inBattleSquaddie.id,
                    outOfBattleSquaddieId: outOfBattleSquaddie.id,
                })
            }
        }

        return squaddieIds
    }

    getAllSquaddies(): BattleSquaddieId[] {
        const allAffiliations = [
            SquaddieAffiliation.PLAYER,
            SquaddieAffiliation.ALLY,
            SquaddieAffiliation.ENEMY,
            SquaddieAffiliation.NONE,
        ]

        const allSquaddies: BattleSquaddieId[] = []
        for (const affiliation of allAffiliations) {
            const squaddies = this.getAllSquaddiesOfAffiliation(affiliation)
            allSquaddies.push(...squaddies)
        }

        return allSquaddies
    }

    serialize(): SerializedInBattleSquaddieCollection {
        this.throwIfInBattleSquaddieCollectionIsUndefined(this.serialize.name)
        return InBattleSquaddieCollectionService.serialize(
            this.inBattleSquaddieCollection!
        )
    }

    cloneCollection(): InBattleSquaddieCollection {
        this.throwIfInBattleSquaddieCollectionIsUndefined(
            this.cloneCollection.name
        )
        const serializedCollection = this.serialize()
        return InBattleSquaddieCollectionService.deserialize(
            serializedCollection
        )
    }

    addFromJson(data: unknown): string[] {
        try {
            this.inBattleSquaddieCollection =
                InBattleSquaddieCollectionService.deserialize(data)
            return []
        } catch (e) {
            return [e instanceof Error ? e.message : String(e)]
        }
    }

    updateFromJson(data: unknown): string[] {
        this.throwIfInBattleSquaddieCollectionIsUndefined(
            this.updateFromJson.name
        )
        try {
            this.inBattleSquaddieCollection =
                InBattleSquaddieCollectionService.updateFromSerializedCollection(
                    {
                        collection: this.inBattleSquaddieCollection!,
                        serializable: data,
                    }
                )
            return []
        } catch (e) {
            return [e instanceof Error ? e.message : String(e)]
        }
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
