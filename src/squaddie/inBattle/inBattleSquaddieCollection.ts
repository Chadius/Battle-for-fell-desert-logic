import {
    type InBattleSquaddie,
    InBattleSquaddieService,
} from "./inBattleSquaddie.ts"
import type { OutOfBattleSquaddie } from "../outOfBattle/outOfBattleSquaddie.ts"
import type { OutOfBattleSquaddieAttributeSheet } from "../outOfBattle/outOfBattleSquaddieAttributeSheet.ts"
import type { AttributeScoreType } from "../../proficiency/attributeScore.ts"
import type {
    SquaddieCondition,
    TSquaddieConditionType,
} from "../../proficiency/squaddieCondition.ts"
import {
    type TProficiencyLevel,
    type TProficiencyType,
} from "../../proficiency/proficiencyLevel.ts"
import type { DamageResult } from "../../squaddieAction/calculate/squaddieActionResult.ts"
import type { SquaddieActionEffect } from "../../squaddieAction/squaddieAction.ts"

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
        damage: { amount: number; type: AttributeScoreType | undefined }
    }): {
        collection: InBattleSquaddieCollection
        damage: DamageResult
    } => {
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
            netEffect: {
                [k in TSquaddieConditionType]?: Omit<
                    SquaddieCondition,
                    "type"
                >[]
            }
        }
    } => {
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
    }): {
        [k in TSquaddieConditionType]?: Omit<
            SquaddieCondition,
            TSquaddieConditionType
        >[]
    } => {
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
    }): {
        collection: InBattleSquaddieCollection
        removedConditions: TSquaddieConditionType[]
    } => {
        throwErrorsIfSquaddieIsUndefined({
            functionName: "reduceConditionByAmount",
            collection,
            inBattleSquaddie,
            outOfBattleSquaddie,
        })

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
        healing: NonNullable<SquaddieActionEffect["healing"]>
        commitChanges: boolean
    }): {
        collection: InBattleSquaddieCollection
        healing: {
            net: number
        }
    } => {
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
        throwErrorsIfSquaddieIsUndefined({
            functionName: "getActionPoints",
            collection,
            inBattleSquaddie,
            outOfBattleSquaddie,
        })

        return InBattleSquaddieService.getActionPoints(inBattleSquaddie)
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
    resetActionPoints: ({
        collection,
        inBattleSquaddie,
        outOfBattleSquaddie,
    }: {
        collection: InBattleSquaddieCollection
        inBattleSquaddie: InBattleSquaddie
        outOfBattleSquaddie: OutOfBattleSquaddie
    }): InBattleSquaddieCollection => {
        throwErrorsIfSquaddieIsUndefined({
            functionName: "resetActionPoints",
            collection,
            inBattleSquaddie,
            outOfBattleSquaddie,
        })

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
    getProficiencyTotalBonus: ({
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
    }): number => {
        throwErrorsIfSquaddieIsUndefined({
            functionName: "getProficiencyTotalBonus",
            collection,
            inBattleSquaddie,
            outOfBattleSquaddie,
        })

        return InBattleSquaddieService.getProficiencyTotalBonus({
            attributeSheet,
            type,
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
        dispelledConditions: {
            [k in TSquaddieConditionType]?: Omit<
                SquaddieCondition,
                TSquaddieConditionType
            >[]
        }
    } => {
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

        return { collection: modifiedCollection, dispelledConditions }
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
        treatedConditions: {
            [k in TSquaddieConditionType]?: Omit<
                SquaddieCondition,
                TSquaddieConditionType
            >[]
        }
    } => {
        throwErrorsIfSquaddieIsUndefined({
            functionName: "treatSquaddieCondition",
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

        return { collection: modifiedCollection, treatedConditions }
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
        collection.byOutOfBattleSquaddieId[outOfBattleSquaddie.id]?.at(
            inBattleSquaddie?.id
        ) != undefined
    )
        return
    throw new Error(
        `[InBattleSquaddieCollectionService:${functionName}] squaddie with id ${outOfBattleSquaddie.id}.${inBattleSquaddie?.id} must be defined`
    )
}
