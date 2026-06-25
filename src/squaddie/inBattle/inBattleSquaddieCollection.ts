import { z } from "zod"
import {
    type BattleSquaddieId,
    type InBattleSquaddie,
    InBattleSquaddieService,
    serializedInBattleSquaddieSchema,
    type SerializedInBattleSquaddie,
} from "./inBattleSquaddie"
import type { OutOfBattleSquaddie } from "../outOfBattle/outOfBattleSquaddie"
import type { OutOfBattleSquaddieAttributeSheet } from "../outOfBattle/outOfBattleSquaddieAttributeSheet"
import type { AttributeScoreType } from "../../proficiency/attributeScore"
import type {
    SquaddieCondition,
    TSquaddieConditionDecaysAt,
    TSquaddieConditionType,
} from "../../proficiency/squaddieCondition"
import {
    type TProficiencyLevel,
    type TProficiencyType,
} from "../../proficiency/proficiencyLevel"
import type { DamageResult } from "../../squaddieAction/calculate/result/squaddieActionResult"
import type { SquaddieItem } from "../../squaddieItem/squaddieItem"
import type { SquaddieActionEffect } from "../../squaddieAction/squaddieActionEffect"
import type { SquaddieAction } from "../../squaddieAction/squaddieAction"

export interface InBattleSquaddieCollection {
    byOutOfBattleSquaddieId: Map<string, InBattleSquaddie[]>
}

export const serializedInBattleSquaddieCollectionSchema = z.object({
    byOutOfBattleSquaddieId: z.record(
        z.string(),
        z.array(serializedInBattleSquaddieSchema)
    ),
})

export type SerializedInBattleSquaddieCollection = z.infer<
    typeof serializedInBattleSquaddieCollectionSchema
>

export const InBattleSquaddieCollectionService = {
    new: (): InBattleSquaddieCollection => ({
        byOutOfBattleSquaddieId: new Map(),
    }),
    getSquaddie: ({
        collection,
        battleSquaddieId,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
    }): InBattleSquaddie | undefined => {
        throwIfCollectionIsUndefined(collection, "getSquaddie")
        return collection.byOutOfBattleSquaddieId
            .get(battleSquaddieId.outOfBattleSquaddieId)
            ?.at(battleSquaddieId.inBattleSquaddieId)
    },
    getSquaddiesByOutOfBattleSquaddieId: ({
        collection,
        outOfBattleSquaddieId,
    }: {
        collection: InBattleSquaddieCollection
        outOfBattleSquaddieId: string
    }): InBattleSquaddie[] => {
        throwIfCollectionIsUndefined(
            collection,
            "getSquaddiesByOutOfBattleSquaddieId"
        )
        return (
            collection.byOutOfBattleSquaddieId.get(outOfBattleSquaddieId) ?? []
        )
    },
    createNewSquaddie({
        collection,
        outOfBattleSquaddie,
        attributeSheet,
    }: {
        collection: InBattleSquaddieCollection
        attributeSheet: OutOfBattleSquaddieAttributeSheet
        outOfBattleSquaddie: OutOfBattleSquaddie
    }): {
        collection: InBattleSquaddieCollection
        inBattleId: number
    } {
        throwIfCollectionIsUndefined(collection, "createNewSquaddie")
        const nextInBattleId =
            collection.byOutOfBattleSquaddieId.get(outOfBattleSquaddie.id)
                ?.length ?? 0

        const newInBattleSquaddie = InBattleSquaddieService.new({
            id: nextInBattleId,
            name: outOfBattleSquaddie.name,
            outOfBattleSquaddie,
            attributeSheet,
        })

        const newCollection = addOrUpdateSquaddie({
            collection,
            inBattleSquaddie: newInBattleSquaddie,
            battleSquaddieId: {
                inBattleSquaddieId: nextInBattleId,
                outOfBattleSquaddieId: outOfBattleSquaddie.id,
            },
        })

        return { collection: newCollection, inBattleId: nextInBattleId }
    },
    dealDamageToSquaddie: ({
        collection,
        battleSquaddieId,
        commitChanges,
        damage,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
        commitChanges: boolean
        damage: { amount: number; type: AttributeScoreType | undefined }
    }): {
        collection: InBattleSquaddieCollection
        damage: DamageResult
    } => {
        throwIfCollectionIsUndefined(collection, "dealDamageToSquaddie")
        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection,
            battleSquaddieId,
        })
        const changeSquaddieInfo = InBattleSquaddieService.dealDamageToSquaddie(
            {
                squaddie: inBattleSquaddie!,
                damage,
            }
        )

        let modifiedCollection = commitChanges
            ? addOrUpdateSquaddie({
                  collection,
                  inBattleSquaddie: changeSquaddieInfo.squaddie,
                  battleSquaddieId,
              })
            : collection

        return {
            collection: modifiedCollection,
            damage: changeSquaddieInfo.damage,
        }
    },
    addConditionsToSquaddie: ({
        collection,
        battleSquaddieId,
        conditions,
        commitChanges,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
        conditions: SquaddieCondition[]
        commitChanges: boolean
    }): {
        collection: InBattleSquaddieCollection
        changes: {
            newConditions: SquaddieCondition[]
            netEffect: Map<
                TSquaddieConditionType,
                Omit<SquaddieCondition, "type">[]
            >
        }
    } => {
        throwIfCollectionIsUndefined(collection, "addConditionsToSquaddie")
        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection,
            battleSquaddieId,
        })
        throwErrorsIfSquaddieIsUndefined({
            functionName: "addConditionsToSquaddie",
            collection,
            battleSquaddieId,
        })

        const changeSquaddieInfo =
            InBattleSquaddieService.addConditionsToSquaddie({
                squaddie: inBattleSquaddie!,
                conditions: conditions,
            })

        let modifiedCollection = commitChanges
            ? addOrUpdateSquaddie({
                  collection,
                  inBattleSquaddie: changeSquaddieInfo.squaddie,
                  battleSquaddieId,
              })
            : collection

        return {
            collection: modifiedCollection,
            changes: changeSquaddieInfo.changes,
        }
    },
    getAllConditions: ({
        collection,
        battleSquaddieId,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
    }): Map<TSquaddieConditionType, SquaddieCondition[]> => {
        throwIfCollectionIsUndefined(collection, "getAllConditions")
        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection,
            battleSquaddieId,
        })
        throwErrorsIfSquaddieIsUndefined({
            functionName: "getAllConditions",
            collection,
            battleSquaddieId,
        })

        return InBattleSquaddieService.getAllConditions(inBattleSquaddie!)
    },
    calculateConditionAmount: ({
        collection,
        battleSquaddieId,
        conditionType,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
        conditionType: TSquaddieConditionType
    }): number => {
        throwIfCollectionIsUndefined(collection, "calculateConditionAmount")
        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection,
            battleSquaddieId,
        })
        throwErrorsIfSquaddieIsUndefined({
            functionName: "calculateConditionAmount",
            collection,
            battleSquaddieId,
        })

        return InBattleSquaddieService.calculateConditionAmount({
            squaddie: inBattleSquaddie!,
            conditionType,
        })
    },
    reduceConditionDurationsByOneRound: ({
        collection,
        battleSquaddieId,
        commitChanges,
        decaysAt,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
        commitChanges: boolean
        decaysAt: TSquaddieConditionDecaysAt
    }): {
        collection: InBattleSquaddieCollection
        removedConditions: TSquaddieConditionType[]
    } => {
        throwIfCollectionIsUndefined(
            collection,
            "reduceConditionDurationsByOneRound"
        )
        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection,
            battleSquaddieId,
        })
        throwErrorsIfSquaddieIsUndefined({
            functionName: "reduceConditionDurationsByOneRound",
            collection,
            battleSquaddieId,
        })

        const changeSquaddieInfo =
            InBattleSquaddieService.reduceConditionDurationsByOneRound({
                squaddie: inBattleSquaddie!,
                decaysAt,
            })

        let modifiedCollection = commitChanges
            ? addOrUpdateSquaddie({
                  collection,
                  inBattleSquaddie: changeSquaddieInfo.squaddie,
                  battleSquaddieId,
              })
            : collection

        return {
            collection: modifiedCollection,
            removedConditions: changeSquaddieInfo.removedConditions,
        }
    },
    giveHealingToSquaddie: ({
        collection,
        battleSquaddieId,
        healing,
        commitChanges,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
        healing: NonNullable<SquaddieActionEffect["healing"]>
        commitChanges: boolean
    }): {
        collection: InBattleSquaddieCollection
        healing: {
            net: number
        }
    } => {
        throwIfCollectionIsUndefined(collection, "giveHealingToSquaddie")
        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection,
            battleSquaddieId,
        })
        throwErrorsIfSquaddieIsUndefined({
            functionName: "giveHealingToSquaddie",
            collection,
            battleSquaddieId,
        })

        const changeSquaddieInfo =
            InBattleSquaddieService.giveHealingToSquaddie({
                squaddie: inBattleSquaddie!,
                healing,
            })

        let modifiedCollection = commitChanges
            ? addOrUpdateSquaddie({
                  collection,
                  inBattleSquaddie: changeSquaddieInfo.squaddie,
                  battleSquaddieId,
              })
            : collection

        return {
            collection: modifiedCollection,
            healing: changeSquaddieInfo.healing,
        }
    },
    getActionPoints: ({
        battleSquaddieId,
        collection,
    }: {
        battleSquaddieId: BattleSquaddieId
        collection: InBattleSquaddieCollection
    }): InBattleSquaddie["actionPoints"] => {
        throwIfCollectionIsUndefined(collection, "getActionPoints")
        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection,
            battleSquaddieId,
        })
        throwErrorsIfSquaddieIsUndefined({
            functionName: "getActionPoints",
            collection,
            battleSquaddieId,
        })

        return InBattleSquaddieService.getActionPoints(inBattleSquaddie!)
    },
    getMaximumActionPoints: ({
        battleSquaddieId,
        collection,
    }: {
        battleSquaddieId: BattleSquaddieId
        collection: InBattleSquaddieCollection
    }): number => {
        throwIfCollectionIsUndefined(collection, "getMaximumActionPoints")
        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection,
            battleSquaddieId,
        })
        throwErrorsIfSquaddieIsUndefined({
            functionName: "getMaximumActionPoints",
            collection,
            battleSquaddieId,
        })

        return InBattleSquaddieService.getMaximumActionPoints(inBattleSquaddie!)
    },
    spendActionPoints: ({
        collection,
        actionPoints,
        battleSquaddieId,
        commitChanges,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
        actionPoints: number
        commitChanges: boolean
    }): { collection: InBattleSquaddieCollection; spent: number } => {
        throwIfCollectionIsUndefined(collection, "spendActionPoints")
        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection,
            battleSquaddieId,
        })
        throwErrorsIfSquaddieIsUndefined({
            functionName: "spendActionPoints",
            collection,
            battleSquaddieId,
        })

        const { squaddie, spent } = InBattleSquaddieService.spendActionPoints({
            squaddie: inBattleSquaddie!,
            actionPoints,
        })

        let modifiedCollection = commitChanges
            ? addOrUpdateSquaddie({
                  collection,
                  inBattleSquaddie: squaddie,
                  battleSquaddieId,
              })
            : collection

        return { collection: modifiedCollection, spent }
    },
    restoreActionPoints: ({
        collection,
        actionPoints,
        battleSquaddieId,
        commitChanges,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
        actionPoints: number
        commitChanges: boolean
    }): { collection: InBattleSquaddieCollection; restored: number } => {
        throwIfCollectionIsUndefined(collection, "restoreActionPoints")
        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection,
            battleSquaddieId,
        })
        throwErrorsIfSquaddieIsUndefined({
            functionName: "restoreActionPoints",
            collection,
            battleSquaddieId,
        })

        const { squaddie, restored } =
            InBattleSquaddieService.restoreActionPoints({
                squaddie: inBattleSquaddie!,
                actionPoints,
            })

        let modifiedCollection = commitChanges
            ? addOrUpdateSquaddie({
                  collection,
                  inBattleSquaddie: squaddie,
                  battleSquaddieId,
              })
            : collection

        return { collection: modifiedCollection, restored }
    },
    getAttackContributionThisTurn: ({
        collection,
        battleSquaddieId,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
    }): number => {
        throwIfCollectionIsUndefined(
            collection,
            "getAttackContributionThisTurn"
        )
        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection,
            battleSquaddieId,
        })
        throwErrorsIfSquaddieIsUndefined({
            functionName: "getAttackContributionThisTurn",
            collection,
            battleSquaddieId,
        })
        return inBattleSquaddie!.attackContributionThisTurn
    },
    incrementAttackContributionThisTurn: ({
        collection,
        battleSquaddieId,
        amount,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
        amount: number
    }): InBattleSquaddieCollection => {
        throwIfCollectionIsUndefined(
            collection,
            "incrementAttackContributionThisTurn"
        )
        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection,
            battleSquaddieId,
        })
        throwErrorsIfSquaddieIsUndefined({
            functionName: "incrementAttackContributionThisTurn",
            collection,
            battleSquaddieId,
        })

        const updatedSquaddie =
            InBattleSquaddieService.incrementAttackContributionThisTurn({
                squaddie: inBattleSquaddie!,
                amount,
            })

        return addOrUpdateSquaddie({
            collection,
            inBattleSquaddie: updatedSquaddie,
            battleSquaddieId,
        })
    },
    resetActionPoints: ({
        collection,
        battleSquaddieId,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
    }): InBattleSquaddieCollection => {
        throwIfCollectionIsUndefined(collection, "resetActionPoints")
        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection,
            battleSquaddieId,
        })
        throwErrorsIfSquaddieIsUndefined({
            functionName: "resetActionPoints",
            collection,
            battleSquaddieId,
        })

        collection.byOutOfBattleSquaddieId.get(
            battleSquaddieId.outOfBattleSquaddieId
        )![battleSquaddieId.inBattleSquaddieId] =
            InBattleSquaddieService.resetActionPoints({
                squaddie: inBattleSquaddie!,
            })
        return collection
    },
    resetAttackContributionThisTurn: ({
        collection,
        battleSquaddieId,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
    }): InBattleSquaddieCollection => {
        throwIfCollectionIsUndefined(
            collection,
            "resetAttackContributionThisTurn"
        )
        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection,
            battleSquaddieId,
        })
        throwErrorsIfSquaddieIsUndefined({
            functionName: "resetAttackContributionThisTurn",
            collection,
            battleSquaddieId,
        })

        collection.byOutOfBattleSquaddieId.get(
            battleSquaddieId.outOfBattleSquaddieId
        )![battleSquaddieId.inBattleSquaddieId] =
            InBattleSquaddieService.resetAttackContributionThisTurn({
                squaddie: inBattleSquaddie!,
            })
        return collection
    },
    getProficiencyLevel: ({
        collection,
        battleSquaddieId,
        attributeSheet,
        type,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
        attributeSheet: OutOfBattleSquaddieAttributeSheet
        type: TProficiencyType
    }): TProficiencyLevel => {
        throwIfCollectionIsUndefined(collection, "getProficiencyLevel")
        throwErrorsIfSquaddieIsUndefined({
            functionName: "getProficiencyLevel",
            collection,
            battleSquaddieId,
        })

        return InBattleSquaddieService.getProficiencyLevel({
            attributeSheet,
            type,
        })
    },
    getRank: ({
        collection,
        battleSquaddieId,
        attributeSheet,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    }): number => {
        throwIfCollectionIsUndefined(collection, "getRank")
        throwErrorsIfSquaddieIsUndefined({
            functionName: "getRank",
            collection,
            battleSquaddieId,
        })

        return InBattleSquaddieService.getRank({
            attributeSheet,
        })
    },
    getAttributeScore: ({
        collection,
        battleSquaddieId,
        attributeSheet,
        type,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
        attributeSheet: OutOfBattleSquaddieAttributeSheet
        type: AttributeScoreType
    }) => {
        throwIfCollectionIsUndefined(collection, "getAttributeScore")
        throwErrorsIfSquaddieIsUndefined({
            functionName: "getAttributeScore",
            collection,
            battleSquaddieId,
        })

        return InBattleSquaddieService.getAttributeScore({
            attributeSheet,
            type,
        })
    },
    getProficiencyBonus: ({
        collection,
        battleSquaddieId,
        attributeSheet,
        type,
        passiveItems,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
        attributeSheet: OutOfBattleSquaddieAttributeSheet
        type: TProficiencyType
        passiveItems: SquaddieItem[]
    }): {
        total: number
        rank: number
        attributeScore: number
        proficiencyLevel: number
        passiveItemBonus: number
        passiveItemPenalty: number
        conditionBonus: number
        conditionPenalty: number
    } => {
        throwIfCollectionIsUndefined(collection, "getProficiencyTotalBonus")
        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection,
            battleSquaddieId,
        })
        throwErrorsIfSquaddieIsUndefined({
            functionName: "getProficiencyTotalBonus",
            collection,
            battleSquaddieId,
        })

        return InBattleSquaddieService.getProficiencyBonus({
            squaddie: inBattleSquaddie!,
            attributeSheet,
            type,
            passiveItems,
        })
    },
    dispelSquaddieConditions: ({
        battleSquaddieId,
        conditionTypes,
        amount,
        commitChanges,
        collection,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
        conditionTypes: {
            all?: boolean
            types?: TSquaddieConditionType[]
        }
        amount: number | undefined
        commitChanges: boolean
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
    } => {
        throwIfCollectionIsUndefined(collection, "dispelledConditions")
        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection,
            battleSquaddieId,
        })
        throwErrorsIfSquaddieIsUndefined({
            functionName: "dispelSquaddieCondition",
            collection,
            battleSquaddieId,
        })

        const { squaddie, dispelledConditions } =
            InBattleSquaddieService.dispelSquaddieConditions({
                squaddie: inBattleSquaddie!,
                conditionTypes,
                amount,
            })

        let modifiedCollection = commitChanges
            ? addOrUpdateSquaddie({
                  collection,
                  inBattleSquaddie: squaddie,
                  battleSquaddieId,
              })
            : collection

        return {
            collection: modifiedCollection,
            dispelledConditions,
            conditionTypes,
            amount,
        }
    },
    treatSquaddieConditions: ({
        battleSquaddieId,
        conditionTypes,
        amount,
        commitChanges,
        collection,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
        conditionTypes: {
            all?: boolean
            types?: TSquaddieConditionType[]
        }
        amount: number | undefined
        commitChanges: boolean
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
    } => {
        throwIfCollectionIsUndefined(collection, "treatSquaddieConditions")
        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection,
            battleSquaddieId,
        })
        throwErrorsIfSquaddieIsUndefined({
            functionName: "treatSquaddieConditions",
            collection,
            battleSquaddieId,
        })

        const { squaddie, treatedConditions } =
            InBattleSquaddieService.treatSquaddieConditions({
                squaddie: inBattleSquaddie!,
                conditionTypes,
                amount,
            })

        let modifiedCollection = commitChanges
            ? addOrUpdateSquaddie({
                  collection,
                  inBattleSquaddie: squaddie,
                  battleSquaddieId,
              })
            : collection

        return {
            collection: modifiedCollection,
            treatedConditions,
            conditionTypes,
            amount,
        }
    },
    useItem: ({
        collection,
        item,
        battleSquaddieId,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
        item: SquaddieItem
    }): InBattleSquaddieCollection => {
        throwIfCollectionIsUndefined(collection, "useItem")
        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection,
            battleSquaddieId,
        })
        throwErrorsIfSquaddieIsUndefined({
            functionName: "useItem",
            collection,
            battleSquaddieId,
        })

        const squaddie = InBattleSquaddieService.useItem({
            squaddie: inBattleSquaddie!,
            item,
        })

        return addOrUpdateSquaddie({
            collection,
            inBattleSquaddie: squaddie,
            battleSquaddieId,
        })
    },
    putActionOnCooldown: ({
        collection,
        battleSquaddieId,
        action,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
        action: SquaddieAction
    }): InBattleSquaddieCollection => {
        throwIfCollectionIsUndefined(collection, "putActionOnCooldown")
        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection,
            battleSquaddieId,
        })
        throwErrorsIfSquaddieIsUndefined({
            functionName: "putActionOnCooldown",
            collection,
            battleSquaddieId,
        })

        const { squaddie } = InBattleSquaddieService.putActionOnCooldown({
            squaddie: inBattleSquaddie!,
            action,
        })

        return addOrUpdateSquaddie({
            collection,
            inBattleSquaddie: squaddie,
            battleSquaddieId,
        })
    },
    recordCooldown: ({
        collection,
        battleSquaddieId,
        actionId,
        turnsRemaining,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
        actionId: string
        turnsRemaining: number
    }): InBattleSquaddieCollection => {
        throwIfCollectionIsUndefined(collection, "recordCooldown")
        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection,
            battleSquaddieId,
        })
        throwErrorsIfSquaddieIsUndefined({
            functionName: "recordCooldown",
            collection,
            battleSquaddieId,
        })

        const { squaddie } = InBattleSquaddieService.recordCooldown({
            squaddie: inBattleSquaddie!,
            actionId,
            turnsRemaining,
        })

        return addOrUpdateSquaddie({
            collection,
            inBattleSquaddie: squaddie,
            battleSquaddieId,
        })
    },
    decrementActionCooldowns: ({
        collection,
        battleSquaddieId,
    }: {
        collection: InBattleSquaddieCollection
        battleSquaddieId: BattleSquaddieId
    }): InBattleSquaddieCollection => {
        throwIfCollectionIsUndefined(collection, "decrementActionCooldowns")
        const inBattleSquaddie = InBattleSquaddieCollectionService.getSquaddie({
            collection,
            battleSquaddieId,
        })
        throwErrorsIfSquaddieIsUndefined({
            functionName: "decrementActionCooldowns",
            collection,
            battleSquaddieId,
        })

        const { squaddie } = InBattleSquaddieService.decrementActionCooldowns({
            squaddie: inBattleSquaddie!,
        })

        return addOrUpdateSquaddie({
            collection,
            inBattleSquaddie: squaddie,
            battleSquaddieId,
        })
    },
    serialize: (
        collection: InBattleSquaddieCollection
    ): SerializedInBattleSquaddieCollection => {
        throwIfCollectionIsUndefined(collection, "serialize")
        const byOutOfBattleSquaddieId: {
            [key: string]: SerializedInBattleSquaddie[]
        } = {}
        for (const [
            outOfBattleSquaddieId,
            inBattleSquaddies,
        ] of collection.byOutOfBattleSquaddieId.entries()) {
            byOutOfBattleSquaddieId[outOfBattleSquaddieId] =
                inBattleSquaddies.map((squaddie) =>
                    InBattleSquaddieService.serialize(squaddie)
                )
        }
        return { byOutOfBattleSquaddieId }
    },
    deserialize: (data: unknown): InBattleSquaddieCollection => {
        const result =
            serializedInBattleSquaddieCollectionSchema.safeParse(data)
        if (!result.success) {
            const details = result.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ")
            throw new Error(
                `[InBattleSquaddieCollectionService.deserialize]: ${details}`
            )
        }
        const byOutOfBattleSquaddieId = new Map<string, InBattleSquaddie[]>()
        for (const [
            outOfBattleSquaddieId,
            serializableSquaddies,
        ] of Object.entries(result.data.byOutOfBattleSquaddieId)) {
            byOutOfBattleSquaddieId.set(
                outOfBattleSquaddieId,
                serializableSquaddies.map((s) =>
                    InBattleSquaddieService.deserialize(s)
                )
            )
        }
        return { byOutOfBattleSquaddieId }
    },
    updateFromSerializedCollection: ({
        collection,
        serializable,
    }: {
        collection: InBattleSquaddieCollection
        serializable: unknown
    }): InBattleSquaddieCollection => {
        const result =
            serializedInBattleSquaddieCollectionSchema.safeParse(serializable)
        if (!result.success) {
            const details = result.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ")
            throw new Error(
                `[InBattleSquaddieCollectionService.updateFromSerializedCollection]: ${details}`
            )
        }
        throwIfCollectionIsUndefined(
            collection,
            "updateFromSerializedCollection"
        )
        const updatedCollection = clone(collection)

        for (const [
            outOfBattleSquaddieId,
            serializableSquaddies,
        ] of Object.entries(result.data.byOutOfBattleSquaddieId)) {
            if (
                !updatedCollection.byOutOfBattleSquaddieId.has(
                    outOfBattleSquaddieId
                )
            ) {
                updatedCollection.byOutOfBattleSquaddieId.set(
                    outOfBattleSquaddieId,
                    []
                )
            }

            const existingSquaddies =
                updatedCollection.byOutOfBattleSquaddieId.get(
                    outOfBattleSquaddieId
                )!

            for (const serializableSquaddie of serializableSquaddies) {
                const existingIndex = existingSquaddies.findIndex(
                    (s) => s.id === serializableSquaddie.id
                )
                const restoredSquaddie =
                    InBattleSquaddieService.deserialize(serializableSquaddie)

                if (existingIndex >= 0) {
                    existingSquaddies[existingIndex] = restoredSquaddie
                } else {
                    existingSquaddies.push(restoredSquaddie)
                }
            }
        }

        return updatedCollection
    },
}

const addOrUpdateSquaddie = ({
    collection,
    inBattleSquaddie,
    battleSquaddieId,
}: {
    collection: InBattleSquaddieCollection
    inBattleSquaddie: InBattleSquaddie
    battleSquaddieId: BattleSquaddieId
}): InBattleSquaddieCollection => {
    const newCollection = clone(collection)
    if (
        !newCollection.byOutOfBattleSquaddieId.has(
            battleSquaddieId.outOfBattleSquaddieId
        )
    ) {
        newCollection.byOutOfBattleSquaddieId.set(
            battleSquaddieId.outOfBattleSquaddieId,
            []
        )
    }

    const index = newCollection.byOutOfBattleSquaddieId
        .get(battleSquaddieId.outOfBattleSquaddieId)!
        .findIndex((squaddie) => squaddie.id === inBattleSquaddie.id)
    if (index >= 0) {
        newCollection.byOutOfBattleSquaddieId.get(
            battleSquaddieId.outOfBattleSquaddieId
        )![index] = inBattleSquaddie
    } else {
        newCollection.byOutOfBattleSquaddieId
            .get(battleSquaddieId.outOfBattleSquaddieId)!
            .push(inBattleSquaddie)
    }

    return newCollection
}

const clone = (
    original: InBattleSquaddieCollection
): InBattleSquaddieCollection => {
    const newByOutOfBattleSquaddieId: Map<string, InBattleSquaddie[]> =
        new Map()
    for (const [
        outOfBattleSquaddieId,
        inBattleSquaddies,
    ] of original.byOutOfBattleSquaddieId.entries()) {
        newByOutOfBattleSquaddieId.set(outOfBattleSquaddieId, [
            ...inBattleSquaddies,
        ])
    }

    return {
        byOutOfBattleSquaddieId: newByOutOfBattleSquaddieId,
    }
}

const throwErrorsIfSquaddieIsUndefined = ({
    collection,
    battleSquaddieId,
    functionName,
}: {
    collection: InBattleSquaddieCollection
    battleSquaddieId: BattleSquaddieId
    functionName: string
}) => {
    if (
        !collection.byOutOfBattleSquaddieId.has(
            battleSquaddieId.outOfBattleSquaddieId
        ) ||
        collection.byOutOfBattleSquaddieId
            .get(battleSquaddieId.outOfBattleSquaddieId)!
            .at(battleSquaddieId.inBattleSquaddieId) != undefined
    )
        return
    throw new Error(
        `[InBattleSquaddieCollectionService:${functionName}] squaddie with id ${battleSquaddieId.outOfBattleSquaddieId}.${battleSquaddieId.inBattleSquaddieId} must be defined`
    )
}

const throwIfCollectionIsUndefined = (
    collection: InBattleSquaddieCollection,
    callName: string
) => {
    if (collection == undefined)
        throw new Error(
            `[InBattleSquaddieCollectionService.${callName}]: collection must be defined`
        )
}
