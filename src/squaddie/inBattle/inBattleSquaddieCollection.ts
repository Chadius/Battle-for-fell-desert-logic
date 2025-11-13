import {
    type InBattleSquaddie,
    InBattleSquaddieService,
} from "./inBattleSquaddie.ts"
import type { OutOfBattleSquaddie } from "../outOfBattle/outOfBattleSquaddie.ts"
import type { OutOfBattleSquaddieAttributeSheet } from "../outOfBattle/outOfBattleSquaddieAttributeSheet.ts"
import { ThrowErrorIfUndefined } from "../../throwErrorIfUndefined.ts"
import type { AttributeScoreType } from "../../proficiency/attributeScore.ts"
import type {
    SquaddieCondition,
    TSquaddieConditionType,
} from "../../proficiency/squaddieCondition.ts"
import {
    ProficiencyLevel,
    type TProficiencyLevel,
    type TProficiencyType,
} from "../../proficiency/proficiencyLevel.ts"

export interface InBattleSquaddieCollection {
    byOutOfBattleSquaddieId: {
        [outOfBattleId: string]: InBattleSquaddie[]
    }
}

export const InBattleSquaddieCollectionService = {
    new: (): InBattleSquaddieCollection => ({
        byOutOfBattleSquaddieId: {},
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
        ThrowErrorIfUndefined({
            className: "InBattleSquaddieCollectionService",
            fieldName: "collection",
            functionName: "getSquaddie",
            value: collection,
        })
        return collection.byOutOfBattleSquaddieId[outOfBattleSquaddieId]?.at(id)
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
        ThrowErrorIfUndefined({
            className: "InBattleSquaddieCollectionService",
            fieldName: "collection",
            functionName: "createNewSquaddie",
            value: collection,
        })
        const nextInBattleId =
            collection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id]
                ?.length || 0

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
        damage: { amount: number; type: AttributeScoreType }
    }):
        | {
              collection: InBattleSquaddieCollection
              damage: {
                  net: number
                  willKo: boolean
              }
          }
        | undefined => {
        ThrowErrorIfUndefined({
            className: "InBattleSquaddieCollectionService",
            fieldName: "collection",
            functionName: "dealDamageToSquaddie",
            value: collection,
        })

        if (
            collection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id]?.at(
                inBattleSquaddie?.id
            ) == undefined
        )
            return undefined

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
    previewAddConditionsToSquaddie: ({
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
    }):
        | {
              collection: InBattleSquaddieCollection
              changes: {
                  newConditions: SquaddieCondition[]
                  netEffect: {
                      [k in TSquaddieConditionType]?: Omit<
                          SquaddieCondition,
                          "type"
                      >[]
                  }
              }
          }
        | undefined => {
        ThrowErrorIfUndefined({
            className: "InBattleSquaddieCollectionService",
            fieldName: "collection",
            functionName: "dealDamageToSquaddie",
            value: collection,
        })

        if (
            collection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id]?.at(
                inBattleSquaddie?.id
            ) == undefined
        )
            return undefined

        const changeSquaddieInfo =
            InBattleSquaddieService.addConditionsToSquaddie({
                squaddie: inBattleSquaddie,
                conditions,
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
    }): {
        [k in TSquaddieConditionType]?: Omit<
            SquaddieCondition,
            TSquaddieConditionType
        >[]
    } => {
        ThrowErrorIfUndefined({
            className: "InBattleSquaddieCollectionService",
            fieldName: "collection",
            functionName: "getConditions",
            value: collection,
        })

        if (
            collection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id]?.at(
                inBattleSquaddie?.id
            ) == undefined
        )
            return {}

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
        ThrowErrorIfUndefined({
            className: "InBattleSquaddieCollectionService",
            fieldName: "collection",
            functionName: "getConditions",
            value: collection,
        })

        if (
            collection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id]?.at(
                inBattleSquaddie?.id
            ) == undefined
        )
            return 0

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
    }):
        | {
              collection: InBattleSquaddieCollection
              removedConditions: TSquaddieConditionType[]
          }
        | undefined => {
        ThrowErrorIfUndefined({
            className: "InBattleSquaddieCollectionService",
            fieldName: "collection",
            functionName: "reduceConditionDurationsByOneRound",
            value: collection,
        })

        if (
            collection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id]?.at(
                inBattleSquaddie?.id
            ) == undefined
        )
            return undefined

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
    reduceConditionByAmount: ({
        conditionType,
        amount,
        inBattleSquaddie,
        outOfBattleSquaddie,
        commitChanges,
        collection,
    }: {
        collection: InBattleSquaddieCollection
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        conditionType: TSquaddieConditionType
        amount: number
        commitChanges: boolean
    }):
        | {
              collection: InBattleSquaddieCollection
              removedConditions: TSquaddieConditionType[]
          }
        | undefined => {
        ThrowErrorIfUndefined({
            className: "InBattleSquaddieCollectionService",
            fieldName: "collection",
            functionName: "reduceConditionAmount",
            value: collection,
        })

        if (
            collection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id]?.at(
                inBattleSquaddie?.id
            ) == undefined
        )
            return undefined

        const changeSquaddieInfo =
            InBattleSquaddieService.reduceConditionByAmount({
                squaddie: inBattleSquaddie,
                amount,
                conditionType,
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
        healing: { amount: number; type: AttributeScoreType }
        commitChanges: boolean
    }):
        | {
              collection: InBattleSquaddieCollection
              healing: {
                  net: number
              }
          }
        | undefined => {
        ThrowErrorIfUndefined({
            className: "InBattleSquaddieCollectionService",
            fieldName: "collection",
            functionName: "giveHealingToSquaddie",
            value: collection,
        })

        if (
            collection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id]?.at(
                inBattleSquaddie?.id
            ) == undefined
        )
            return undefined

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
    }):
        | {
              normal: number
          }
        | undefined => {
        ThrowErrorIfUndefined({
            className: "InBattleSquaddieCollectionService",
            fieldName: "collection",
            functionName: "getActionPoints",
            value: collection,
        })

        if (
            collection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id]?.at(
                inBattleSquaddie?.id
            ) == undefined
        )
            return undefined

        return InBattleSquaddieService.getActionPoints(inBattleSquaddie)
    },
    spendActionPoints: ({
        collection,
        actionPoints,
        inBattleSquaddie,
        outOfBattleSquaddie,
    }: {
        collection: InBattleSquaddieCollection
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
        actionPoints: number
    }): InBattleSquaddieCollection => {
        ThrowErrorIfUndefined({
            className: "InBattleSquaddieCollectionService",
            fieldName: "collection",
            functionName: "getActionPoints",
            value: collection,
        })

        if (
            collection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id]?.at(
                inBattleSquaddie?.id
            ) == undefined
        )
            return collection

        collection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id][
            inBattleSquaddie.id
        ] = InBattleSquaddieService.spendActionPoints({
            squaddie: inBattleSquaddie,
            actionPoints,
        })
        return collection
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
        ThrowErrorIfUndefined({
            className: "InBattleSquaddieCollectionService",
            fieldName: "collection",
            functionName: "getActionPoints",
            value: collection,
        })

        if (
            collection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id]?.at(
                inBattleSquaddie?.id
            ) == undefined
        )
            return collection

        collection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id][
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
        ThrowErrorIfUndefined({
            className: "InBattleSquaddieCollectionService",
            fieldName: "collection",
            functionName: "getProficiencyLevel",
            value: collection,
        })

        if (
            collection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id]?.at(
                inBattleSquaddie?.id
            ) == undefined
        )
            return ProficiencyLevel.UNTRAINED

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
        ThrowErrorIfUndefined({
            className: "InBattleSquaddieCollectionService",
            fieldName: "collection",
            functionName: "getRank",
            value: collection,
        })

        if (
            collection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id]?.at(
                inBattleSquaddie?.id
            ) == undefined
        )
            return -1

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
        ThrowErrorIfUndefined({
            className: "InBattleSquaddieCollectionService",
            fieldName: "collection",
            functionName: "getAttributeScore",
            value: collection,
        })

        if (
            collection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id]?.at(
                inBattleSquaddie?.id
            ) == undefined
        )
            return -1

        return InBattleSquaddieService.getAttributeScore({
            attributeSheet,
            type,
        })
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
    newCollection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id] ||= []

    const index = newCollection.byOutOfBattleSquaddieId[
        outOfBattleSquaddie.id
    ].findIndex((squaddie) => squaddie.id === inBattleSquaddie.id)
    if (index >= 0) {
        newCollection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id][index] =
            inBattleSquaddie
    } else {
        newCollection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id].push(
            inBattleSquaddie
        )
    }

    return newCollection
}

const clone = (
    original: InBattleSquaddieCollection
): InBattleSquaddieCollection => {
    return {
        byOutOfBattleSquaddieId: { ...original.byOutOfBattleSquaddieId },
    }
}
