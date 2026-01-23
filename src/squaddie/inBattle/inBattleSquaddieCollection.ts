import {
    type InBattleSquaddie,
    InBattleSquaddieService,
    type SerializedInBattleSquaddie,
} from "./inBattleSquaddie"
import type { OutOfBattleSquaddie } from "../outOfBattle/outOfBattleSquaddie"
import type { OutOfBattleSquaddieAttributeSheet } from "../outOfBattle/outOfBattleSquaddieAttributeSheet"
import type { AttributeScoreType } from "../../proficiency/attributeScore"
import type {
    SquaddieCondition,
    TSquaddieConditionType,
} from "../../proficiency/squaddieCondition"
import {
    type TProficiencyLevel,
    type TProficiencyType,
} from "../../proficiency/proficiencyLevel"
import type { DamageResult } from "../../squaddieAction/calculate/result/squaddieActionResult"
import type { SquaddieActionEffect } from "../../squaddieAction/squaddieAction"
import type { SquaddieItem } from "../../squaddieItem/squaddieItem"

export interface InBattleSquaddieCollection {
    byOutOfBattleSquaddieId: Map<string, InBattleSquaddie[]>
}

export type SerializedInBattleSquaddieCollection = Omit<
    InBattleSquaddieCollection,
    "byOutOfBattleSquaddieId"
> & {
    byOutOfBattleSquaddieId: { [key: string]: SerializedInBattleSquaddie[] }
}

export const InBattleSquaddieCollectionService = {
    new: (): InBattleSquaddieCollection => ({
        byOutOfBattleSquaddieId: new Map(),
    }),
    getSquaddie: ({
        collection,
        id,
        outOfBattleSquaddieId,
    }: {
        collection: InBattleSquaddieCollection
        id: number
        outOfBattleSquaddieId: string
    }): InBattleSquaddie | undefined => {
        throwIfCollectionIsUndefined(collection, "getSquaddie")
        return collection.byOutOfBattleSquaddieId
            .get(outOfBattleSquaddieId)
            ?.at(id)
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
            outOfBattleSquaddie,
        })

        return { collection: newCollection, inBattleId: nextInBattleId }
    },
    dealDamageToSquaddie: ({
        collection,
        outOfBattleSquaddie,
        inBattleSquaddie,
        commitChanges,
        damage,
    }: {
        collection: InBattleSquaddieCollection
        outOfBattleSquaddie: OutOfBattleSquaddie
        inBattleSquaddie: InBattleSquaddie
        commitChanges: boolean
        damage: { amount: number; type: AttributeScoreType | undefined }
    }): {
        collection: InBattleSquaddieCollection
        damage: DamageResult
    } => {
        throwIfCollectionIsUndefined(collection, "dealDamageToSquaddie")
        const changeSquaddieInfo = InBattleSquaddieService.dealDamageToSquaddie(
            {
                squaddie: inBattleSquaddie,
                damage,
            }
        )

        let modifiedCollection = commitChanges
            ? addOrUpdateSquaddie({
                  collection,
                  inBattleSquaddie: changeSquaddieInfo.squaddie,
                  outOfBattleSquaddie,
              })
            : collection

        return {
            collection: modifiedCollection,
            damage: changeSquaddieInfo.damage,
        }
    },
    addConditionsToSquaddie: ({
        collection,
        outOfBattleSquaddie,
        conditions,
        inBattleSquaddie,
        commitChanges,
    }: {
        collection: InBattleSquaddieCollection
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
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
        throwErrorsIfSquaddieIsUndefined({
            functionName: "addConditionsToSquaddie",
            collection,
            inBattleSquaddie,
            outOfBattleSquaddie,
        })

        const changeSquaddieInfo =
            InBattleSquaddieService.addConditionsToSquaddie({
                squaddie: inBattleSquaddie,
                conditions: conditions,
            })

        let modifiedCollection = commitChanges
            ? addOrUpdateSquaddie({
                  collection,
                  inBattleSquaddie: changeSquaddieInfo.squaddie,
                  outOfBattleSquaddie,
              })
            : collection

        return {
            collection: modifiedCollection,
            changes: changeSquaddieInfo.changes,
        }
    },
    getAllConditions: ({
        collection,
        inBattleSquaddie,
        outOfBattleSquaddie,
    }: {
        collection: InBattleSquaddieCollection
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
    }): Map<TSquaddieConditionType, SquaddieCondition[]> => {
        throwIfCollectionIsUndefined(collection, "getAllConditions")
        throwErrorsIfSquaddieIsUndefined({
            functionName: "getAllConditions",
            collection,
            inBattleSquaddie,
            outOfBattleSquaddie,
        })

        return InBattleSquaddieService.getAllConditions(inBattleSquaddie)
    },
    calculateConditionAmount: ({
        collection,
        inBattleSquaddie,
        outOfBattleSquaddie,
        conditionType,
    }: {
        collection: InBattleSquaddieCollection
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        conditionType: TSquaddieConditionType
    }): number => {
        throwIfCollectionIsUndefined(collection, "calculateConditionAmount")
        throwErrorsIfSquaddieIsUndefined({
            functionName: "calculateConditionAmount",
            collection,
            inBattleSquaddie,
            outOfBattleSquaddie,
        })

        return InBattleSquaddieService.calculateConditionAmount({
            squaddie: inBattleSquaddie,
            conditionType,
        })
    },
    reduceConditionDurationsByOneRound: ({
        collection,
        inBattleSquaddie,
        outOfBattleSquaddie,
        commitChanges,
    }: {
        collection: InBattleSquaddieCollection
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        commitChanges: boolean
    }): {
        collection: InBattleSquaddieCollection
        removedConditions: TSquaddieConditionType[]
    } => {
        throwIfCollectionIsUndefined(
            collection,
            "reduceConditionDurationsByOneRound"
        )
        throwErrorsIfSquaddieIsUndefined({
            functionName: "reduceConditionDurationsByOneRound",
            collection,
            inBattleSquaddie,
            outOfBattleSquaddie,
        })

        const changeSquaddieInfo =
            InBattleSquaddieService.reduceConditionDurationsByOneRound({
                squaddie: inBattleSquaddie,
            })

        let modifiedCollection = commitChanges
            ? addOrUpdateSquaddie({
                  collection,
                  inBattleSquaddie: changeSquaddieInfo.squaddie,
                  outOfBattleSquaddie,
              })
            : collection

        return {
            collection: modifiedCollection,
            removedConditions: changeSquaddieInfo.removedConditions,
        }
    },
    giveHealingToSquaddie: ({
        collection,
        outOfBattleSquaddie,
        healing,
        inBattleSquaddie,
        commitChanges,
    }: {
        collection: InBattleSquaddieCollection
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        healing: NonNullable<SquaddieActionEffect["healing"]>
        commitChanges: boolean
    }): {
        collection: InBattleSquaddieCollection
        healing: {
            net: number
        }
    } => {
        throwIfCollectionIsUndefined(collection, "giveHealingToSquaddie")
        throwErrorsIfSquaddieIsUndefined({
            functionName: "giveHealingToSquaddie",
            collection,
            inBattleSquaddie,
            outOfBattleSquaddie,
        })

        const changeSquaddieInfo =
            InBattleSquaddieService.giveHealingToSquaddie({
                squaddie: inBattleSquaddie,
                healing,
            })

        let modifiedCollection = commitChanges
            ? addOrUpdateSquaddie({
                  collection,
                  inBattleSquaddie: changeSquaddieInfo.squaddie,
                  outOfBattleSquaddie,
              })
            : collection

        return {
            collection: modifiedCollection,
            healing: changeSquaddieInfo.healing,
        }
    },
    getActionPoints: ({
        inBattleSquaddie,
        outOfBattleSquaddie,
        collection,
    }: {
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        collection: InBattleSquaddieCollection
    }): {
        current: number
    } => {
        throwIfCollectionIsUndefined(collection, "getActionPoints")
        throwErrorsIfSquaddieIsUndefined({
            functionName: "getActionPoints",
            collection,
            inBattleSquaddie,
            outOfBattleSquaddie,
        })

        return InBattleSquaddieService.getActionPoints(inBattleSquaddie)
    },
    getMaximumActionPoints: ({
        inBattleSquaddie,
        outOfBattleSquaddie,
        collection,
    }: {
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        collection: InBattleSquaddieCollection
    }): number => {
        throwIfCollectionIsUndefined(collection, "getMaximumActionPoints")
        throwErrorsIfSquaddieIsUndefined({
            functionName: "getMaximumActionPoints",
            collection,
            inBattleSquaddie,
            outOfBattleSquaddie,
        })

        return InBattleSquaddieService.getMaximumActionPoints(inBattleSquaddie)
    },
    spendActionPoints: ({
        collection,
        actionPoints,
        inBattleSquaddie,
        outOfBattleSquaddie,
        commitChanges,
    }: {
        collection: InBattleSquaddieCollection
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        actionPoints: number
        commitChanges: boolean
    }): { collection: InBattleSquaddieCollection; spent: number } => {
        throwIfCollectionIsUndefined(collection, "spendActionPoints")
        throwErrorsIfSquaddieIsUndefined({
            functionName: "spendActionPoints",
            collection,
            inBattleSquaddie,
            outOfBattleSquaddie,
        })

        const { squaddie, spent } = InBattleSquaddieService.spendActionPoints({
            squaddie: inBattleSquaddie,
            actionPoints,
        })

        let modifiedCollection = commitChanges
            ? addOrUpdateSquaddie({
                  collection,
                  inBattleSquaddie: squaddie,
                  outOfBattleSquaddie,
              })
            : collection

        return { collection: modifiedCollection, spent }
    },
    restoreActionPoints: ({
        collection,
        actionPoints,
        inBattleSquaddie,
        outOfBattleSquaddie,
        commitChanges,
    }: {
        collection: InBattleSquaddieCollection
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        actionPoints: number
        commitChanges: boolean
    }): { collection: InBattleSquaddieCollection; restored: number } => {
        throwIfCollectionIsUndefined(collection, "restoreActionPoints")
        throwErrorsIfSquaddieIsUndefined({
            functionName: "restoreActionPoints",
            collection,
            inBattleSquaddie,
            outOfBattleSquaddie,
        })

        const { squaddie, restored } =
            InBattleSquaddieService.restoreActionPoints({
                squaddie: inBattleSquaddie,
                actionPoints,
            })

        let modifiedCollection = commitChanges
            ? addOrUpdateSquaddie({
                  collection,
                  inBattleSquaddie: squaddie,
                  outOfBattleSquaddie,
              })
            : collection

        return { collection: modifiedCollection, restored }
    },
    resetActionPoints: ({
        collection,
        inBattleSquaddie,
        outOfBattleSquaddie,
    }: {
        collection: InBattleSquaddieCollection
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
    }): InBattleSquaddieCollection => {
        throwIfCollectionIsUndefined(collection, "resetActionPoints")
        throwErrorsIfSquaddieIsUndefined({
            functionName: "resetActionPoints",
            collection,
            inBattleSquaddie,
            outOfBattleSquaddie,
        })

        collection.byOutOfBattleSquaddieId.get(outOfBattleSquaddie.id)![
            inBattleSquaddie.id
        ] = InBattleSquaddieService.resetActionPoints({
            squaddie: inBattleSquaddie,
        })
        return collection
    },
    getProficiencyLevel: ({
        collection,
        inBattleSquaddie,
        outOfBattleSquaddie,
        attributeSheet,
        type,
    }: {
        collection: InBattleSquaddieCollection
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        attributeSheet: OutOfBattleSquaddieAttributeSheet
        type: TProficiencyType
    }): TProficiencyLevel => {
        throwIfCollectionIsUndefined(collection, "getProficiencyLevel")
        throwErrorsIfSquaddieIsUndefined({
            functionName: "getProficiencyLevel",
            collection,
            inBattleSquaddie,
            outOfBattleSquaddie,
        })

        return InBattleSquaddieService.getProficiencyLevel({
            attributeSheet,
            type,
        })
    },
    getRank: ({
        collection,
        outOfBattleSquaddie,
        inBattleSquaddie,
        attributeSheet,
    }: {
        collection: InBattleSquaddieCollection
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    }): number => {
        throwIfCollectionIsUndefined(collection, "getRank")
        throwErrorsIfSquaddieIsUndefined({
            functionName: "getRank",
            collection,
            inBattleSquaddie,
            outOfBattleSquaddie,
        })

        return InBattleSquaddieService.getRank({
            attributeSheet,
        })
    },
    getAttributeScore: ({
        collection,
        inBattleSquaddie,
        outOfBattleSquaddie,
        attributeSheet,
        type,
    }: {
        collection: InBattleSquaddieCollection
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        attributeSheet: OutOfBattleSquaddieAttributeSheet
        type: AttributeScoreType
    }) => {
        throwIfCollectionIsUndefined(collection, "getAttributeScore")
        throwErrorsIfSquaddieIsUndefined({
            functionName: "getAttributeScore",
            collection,
            inBattleSquaddie,
            outOfBattleSquaddie,
        })

        return InBattleSquaddieService.getAttributeScore({
            attributeSheet,
            type,
        })
    },
    getProficiencyBonus: ({
        collection,
        inBattleSquaddie,
        outOfBattleSquaddie,
        attributeSheet,
        type,
        passiveItems,
    }: {
        collection: InBattleSquaddieCollection
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
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
        throwErrorsIfSquaddieIsUndefined({
            functionName: "getProficiencyTotalBonus",
            collection,
            inBattleSquaddie,
            outOfBattleSquaddie,
        })

        return InBattleSquaddieService.getProficiencyBonus({
            squaddie: inBattleSquaddie,
            attributeSheet,
            type,
            passiveItems,
        })
    },
    dispelSquaddieConditions: ({
        inBattleSquaddie,
        outOfBattleSquaddie,
        conditionTypes,
        amount,
        commitChanges,
        collection,
    }: {
        collection: InBattleSquaddieCollection
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
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
        throwErrorsIfSquaddieIsUndefined({
            functionName: "dispelSquaddieCondition",
            collection,
            inBattleSquaddie,
            outOfBattleSquaddie,
        })

        const { squaddie, dispelledConditions } =
            InBattleSquaddieService.dispelSquaddieConditions({
                squaddie: inBattleSquaddie,
                conditionTypes,
                amount,
            })

        let modifiedCollection = commitChanges
            ? addOrUpdateSquaddie({
                  collection,
                  inBattleSquaddie: squaddie,
                  outOfBattleSquaddie,
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
        inBattleSquaddie,
        outOfBattleSquaddie,
        conditionTypes,
        amount,
        commitChanges,
        collection,
    }: {
        collection: InBattleSquaddieCollection
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
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
        throwErrorsIfSquaddieIsUndefined({
            functionName: "treatSquaddieConditions",
            collection,
            inBattleSquaddie,
            outOfBattleSquaddie,
        })

        const { squaddie, treatedConditions } =
            InBattleSquaddieService.treatSquaddieConditions({
                squaddie: inBattleSquaddie,
                conditionTypes,
                amount,
            })

        let modifiedCollection = commitChanges
            ? addOrUpdateSquaddie({
                  collection,
                  inBattleSquaddie: squaddie,
                  outOfBattleSquaddie,
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
        inBattleSquaddie,
        outOfBattleSquaddie,
    }: {
        collection: InBattleSquaddieCollection
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        item: SquaddieItem
    }): InBattleSquaddieCollection => {
        throwIfCollectionIsUndefined(collection, "useItem")
        throwErrorsIfSquaddieIsUndefined({
            functionName: "useItem",
            collection,
            inBattleSquaddie,
            outOfBattleSquaddie,
        })

        const squaddie = InBattleSquaddieService.useItem({
            squaddie: inBattleSquaddie,
            item,
        })

        return addOrUpdateSquaddie({
            collection,
            inBattleSquaddie: squaddie,
            outOfBattleSquaddie,
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
    deserialize: (
        serializable: SerializedInBattleSquaddieCollection
    ): InBattleSquaddieCollection => {
        const byOutOfBattleSquaddieId = new Map<string, InBattleSquaddie[]>()
        for (const [
            outOfBattleSquaddieId,
            serializableSquaddies,
        ] of Object.entries(serializable.byOutOfBattleSquaddieId)) {
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
        serializable: SerializedInBattleSquaddieCollection
    }): InBattleSquaddieCollection => {
        throwIfCollectionIsUndefined(
            collection,
            "updateFromSerializedCollection"
        )
        const updatedCollection = clone(collection)

        for (const [
            outOfBattleSquaddieId,
            serializableSquaddies,
        ] of Object.entries(serializable.byOutOfBattleSquaddieId)) {
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
    outOfBattleSquaddie,
}: {
    collection: InBattleSquaddieCollection
    inBattleSquaddie: InBattleSquaddie
    outOfBattleSquaddie: OutOfBattleSquaddie
}): InBattleSquaddieCollection => {
    const newCollection = clone(collection)
    if (!newCollection.byOutOfBattleSquaddieId.has(outOfBattleSquaddie.id)) {
        newCollection.byOutOfBattleSquaddieId.set(outOfBattleSquaddie.id, [])
    }

    const index = newCollection.byOutOfBattleSquaddieId
        .get(outOfBattleSquaddie.id)!
        .findIndex((squaddie) => squaddie.id === inBattleSquaddie.id)
    if (index >= 0) {
        newCollection.byOutOfBattleSquaddieId.get(outOfBattleSquaddie.id)![
            index
        ] = inBattleSquaddie
    } else {
        newCollection.byOutOfBattleSquaddieId
            .get(outOfBattleSquaddie.id)!
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
    inBattleSquaddie,
    outOfBattleSquaddie,
    functionName,
}: {
    collection: InBattleSquaddieCollection
    inBattleSquaddie: InBattleSquaddie
    outOfBattleSquaddie: OutOfBattleSquaddie
    functionName: string
}) => {
    if (
        !collection.byOutOfBattleSquaddieId.has(outOfBattleSquaddie.id) ||
        collection.byOutOfBattleSquaddieId
            .get(outOfBattleSquaddie.id)!
            .at(inBattleSquaddie?.id) != undefined
    )
        return
    throw new Error(
        `[InBattleSquaddieCollectionService:${functionName}] squaddie with id ${outOfBattleSquaddie.id}.${inBattleSquaddie?.id} must be defined`
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
