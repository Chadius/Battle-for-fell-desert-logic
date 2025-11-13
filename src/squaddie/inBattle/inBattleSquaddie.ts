import type { OutOfBattleSquaddie } from "../outOfBattle/outOfBattleSquaddie.ts"
import type { OutOfBattleSquaddieAttributeSheet } from "../outOfBattle/outOfBattleSquaddieAttributeSheet.ts"
import type { AttributeScoreType } from "../../proficiency/attributeScore.ts"
import {
    type SquaddieCondition,
    SquaddieConditionService,
    SquaddieConditionType,
    type TSquaddieConditionType,
} from "../../proficiency/squaddieCondition.ts"
import { ThrowErrorIfUndefined } from "../../throwErrorIfUndefined.ts"
import {
    ProficiencyLevel,
    type TProficiencyLevel,
    type TProficiencyType,
} from "../../proficiency/proficiencyLevel.ts"

export interface InBattleSquaddie {
    id: number
    outOfBattleId: string
    name: string
    hitPoints: {
        max: number
        current: number
    }
    conditions: {
        [k in TSquaddieConditionType]?: Omit<
            SquaddieCondition,
            TSquaddieConditionType
        >[]
    }
    actionPoints: {
        current: number
    }
    actionIds: {
        natural: number[]
    }
}

export const InBattleSquaddieService = {
    new: ({
        id,
        name,
        outOfBattleSquaddie,
        attributeSheet,
    }: Pick<InBattleSquaddie, "id" | "name"> & {
        outOfBattleSquaddie: OutOfBattleSquaddie
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    }): InBattleSquaddie => {
        return {
            id,
            outOfBattleId: outOfBattleSquaddie.id,
            name,
            hitPoints: {
                max: attributeSheet.maxHitPoints,
                current: attributeSheet.maxHitPoints,
            },
            conditions: {},
            actionPoints: {
                current: 3,
            },
            actionIds: {
                natural: [...outOfBattleSquaddie.actionIds],
            },
        }
    },
    calculateConditionAmount: ({
        squaddie,
        conditionType,
    }: {
        squaddie: InBattleSquaddie
        conditionType: TSquaddieConditionType
    }): number => {
        return sumOfConditionAmount(squaddie.conditions[conditionType])
    },
    dealDamageToSquaddie({
        squaddie,
        damage,
    }: {
        squaddie: InBattleSquaddie
        damage: {
            amount: number
            type: AttributeScoreType
        }
    }): {
        squaddie: InBattleSquaddie
        damage: {
            net: number
            raw: number
            willKo: boolean
        }
    } {
        const newSquaddie: InBattleSquaddie = clone(squaddie)
        const conditions = getAllConditions(newSquaddie)
        let damageReduction = sumOfConditionAmount(
            conditions[SquaddieConditionType.ABSORB]
        )
        reduceConditionTypeByAmount({
            amount: damage.amount,
            conditions: conditions[SquaddieConditionType.ABSORB],
        })
        newSquaddie.conditions = conditions

        let damageTaken: number
        damageTaken = damage.amount - damageReduction
        damageTaken = Math.max(damageTaken, 0)

        newSquaddie.hitPoints.current -= damageTaken
        newSquaddie.hitPoints.current = Math.max(
            newSquaddie.hitPoints.current,
            0
        )
        return {
            squaddie: newSquaddie,
            damage: {
                net: squaddie.hitPoints.current - newSquaddie.hitPoints.current,
                raw: damage.amount,
                willKo: newSquaddie.hitPoints.current <= 0,
            },
        }
    },
    getAllConditions: (
        squaddie: InBattleSquaddie
    ): {
        [k in TSquaddieConditionType]?: Omit<
            SquaddieCondition,
            TSquaddieConditionType
        >[]
    } => getAllConditions(squaddie),
    addConditionsToSquaddie: ({
        squaddie,
        conditions,
    }: {
        squaddie: InBattleSquaddie
        conditions: SquaddieCondition[]
    }): {
        squaddie: InBattleSquaddie
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
        ThrowErrorIfUndefined({
            className: "InBattleSquaddie",
            fieldName: "squaddie",
            functionName: "addConditionsToSquaddie",
            value: squaddie,
        })
        const newSquaddie = clone(squaddie)
        const newConditions: SquaddieCondition[] = []

        for (const condition of conditions) {
            const info = updateConditionsIfNewConditionIfNeeded({
                condition,
                squaddieConditions: newSquaddie.conditions,
            })

            if (!info.shouldAddNewCondition) continue

            newSquaddie.conditions[condition.type] = info.replacementConditions
            newConditions.push(condition)
        }

        return {
            squaddie: newSquaddie,
            changes: {
                newConditions,
                netEffect: deepCopyConditions(newSquaddie.conditions),
            },
        }
    },
    reduceConditionDurationsByOneRound: ({
        squaddie,
    }: {
        squaddie: InBattleSquaddie
    }): {
        squaddie: InBattleSquaddie
        removedConditions: TSquaddieConditionType[]
    } => {
        const newSquaddie = clone(squaddie)
        reduceEachConditionByOneRound(newSquaddie)
        const removedConditionTypes =
            getAllConditionTypesThatHaveZeroDuration(newSquaddie)

        for (const conditionType of removedConditionTypes) {
            delete newSquaddie.conditions[conditionType]
        }
        removeAllIndividualConditionsWithZeroDuration(newSquaddie)

        return {
            squaddie: newSquaddie,
            removedConditions: removedConditionTypes,
        }
    },
    reduceConditionByAmount: ({
        squaddie,
        conditionType,
        amount,
    }: {
        squaddie: InBattleSquaddie
        conditionType: TSquaddieConditionType
        amount: number
    }): {
        squaddie: InBattleSquaddie
        removedConditions: TSquaddieConditionType[]
    } => {
        const newSquaddie = clone(squaddie)
        reduceConditionTypeByAmount({
            conditions: newSquaddie.conditions[conditionType],
            amount,
        })
        const removedConditionTypes =
            getAllConditionTypesThatHaveZeroAmount(newSquaddie)

        for (const conditionType of removedConditionTypes) {
            delete newSquaddie.conditions[conditionType]
        }
        removeAllIndividualConditionsWithZeroAmount(newSquaddie)

        return {
            squaddie: newSquaddie,
            removedConditions: removedConditionTypes,
        }
    },
    giveHealingToSquaddie: ({
        squaddie,
        healing,
    }: {
        squaddie: InBattleSquaddie
        healing: {
            amount: number
            type: AttributeScoreType
        }
    }): {
        squaddie: InBattleSquaddie
        healing: {
            net: number
        }
    } => {
        ThrowErrorIfUndefined({
            className: "InBattleSquaddie",
            fieldName: "squaddie",
            functionName: "giveHealingToSquaddie",
            value: squaddie,
        })

        const newSquaddie = clone(squaddie)
        let healingTaken: number
        healingTaken = healing.amount

        newSquaddie.hitPoints.current = Math.min(
            newSquaddie.hitPoints.current + healingTaken,
            newSquaddie.hitPoints.max
        )

        return {
            squaddie: newSquaddie,
            healing: {
                net: newSquaddie.hitPoints.current - squaddie.hitPoints.current,
            },
        }
    },
    getActionPoints: (
        inBattleSquaddie: InBattleSquaddie
    ):
        | {
              normal: number
          }
        | undefined => {
        return { normal: inBattleSquaddie.actionPoints.current }
    },
    spendActionPoints: ({
        squaddie,
        actionPoints,
    }: {
        squaddie: InBattleSquaddie
        actionPoints: number
    }): InBattleSquaddie => {
        const newSquaddie = clone(squaddie)
        newSquaddie.actionPoints.current = Math.max(
            newSquaddie.actionPoints.current - actionPoints,
            0
        )
        return newSquaddie
    },
    resetActionPoints: ({
        squaddie,
    }: {
        squaddie: InBattleSquaddie
    }): InBattleSquaddie => {
        const newSquaddie = clone(squaddie)
        newSquaddie.actionPoints.current = 3
        return newSquaddie
    },
    getProficiencyLevel: ({
        attributeSheet,
        type,
    }: {
        attributeSheet: OutOfBattleSquaddieAttributeSheet
        type: TProficiencyType
    }): TProficiencyLevel => {
        return (
            attributeSheet.proficiencyLevels[type] ?? ProficiencyLevel.UNTRAINED
        )
    },
    getRank: ({
        attributeSheet,
    }: {
        attributeSheet: OutOfBattleSquaddieAttributeSheet
    }): number => {
        return attributeSheet.rank
    },
    getAttributeScore: ({
        attributeSheet,
        type,
    }: {
        attributeSheet: OutOfBattleSquaddieAttributeSheet
        type: AttributeScoreType
    }): number => {
        return attributeSheet.attributeScores[type]
    },
}

const clone = (original: InBattleSquaddie): InBattleSquaddie => {
    return {
        ...original,
        hitPoints: {
            max: original.hitPoints.max,
            current: original.hitPoints.current,
        },
        conditions: { ...original.conditions },
        actionPoints: {
            current: original.actionPoints.current,
        },
        actionIds: {
            natural: [...original.actionIds.natural],
        },
    }
}

const deepCopyConditions = (original: {
    [k in TSquaddieConditionType]?: Omit<
        SquaddieCondition,
        TSquaddieConditionType
    >[]
}): {
    [k in TSquaddieConditionType]?: Omit<
        SquaddieCondition,
        TSquaddieConditionType
    >[]
} => {
    let copy: {
        [k in TSquaddieConditionType]?: Omit<
            SquaddieCondition,
            TSquaddieConditionType
        >[]
    } = {}
    for (const conditionTypeStr in original) {
        const conditionType = conditionTypeStr as TSquaddieConditionType
        if (conditionType == undefined) continue
        copy[conditionType] = []
        const description = original[conditionType]
        for (const condition of description ?? []) {
            copy[conditionType].push({ ...condition })
        }
    }
    return copy
}

const updateConditionsIfNewConditionIfNeeded = ({
    condition,
    squaddieConditions,
}: {
    condition: SquaddieCondition
    squaddieConditions: {
        [k in TSquaddieConditionType]?: Omit<
            SquaddieCondition,
            TSquaddieConditionType
        >[]
    }
}): {
    shouldAddNewCondition: boolean
    replacementConditions:
        | Omit<SquaddieCondition, TSquaddieConditionType>[]
        | undefined
} => {
    const conditionType = condition.type
    if (squaddieConditions[conditionType] == undefined) {
        return {
            shouldAddNewCondition: true,
            replacementConditions: [
                {
                    ...condition,
                },
            ],
        }
    }

    let shouldAddNewCondition: boolean
    let replacementConditions:
        | Omit<SquaddieCondition, TSquaddieConditionType>[]
        | undefined
    if (SquaddieConditionService.isBinary(condition)) {
        ;({
            didAddNewCondition: shouldAddNewCondition,
            simplifiedConditions: replacementConditions,
        } = addBinaryConditionAndSimplify({
            binaryCondition: condition,
            existingConditions: squaddieConditions[conditionType],
        }))
        return {
            shouldAddNewCondition,
            replacementConditions,
        }
    }

    if (condition.amount != undefined && condition.amount > 0) {
        ;({
            didAddNewCondition: shouldAddNewCondition,
            simplifiedConditions: replacementConditions,
        } = addNumericalAmountConditionAndSimplify({
            newCondition: condition,
            existingConditions: squaddieConditions[conditionType],
            isNewConditionPositive: true,
        }))
        return {
            shouldAddNewCondition,
            replacementConditions,
        }
    }

    if (condition.amount != undefined && condition.amount < 0) {
        ;({
            didAddNewCondition: shouldAddNewCondition,
            simplifiedConditions: replacementConditions,
        } = addNumericalAmountConditionAndSimplify({
            newCondition: condition,
            existingConditions: squaddieConditions[conditionType],
            isNewConditionPositive: false,
        }))
        return {
            shouldAddNewCondition,
            replacementConditions,
        }
    }

    return {
        shouldAddNewCondition: false,
        replacementConditions: [],
    }
}

const addBinaryConditionAndSimplify = ({
    binaryCondition,
    existingConditions,
}: {
    binaryCondition: Omit<SquaddieCondition, TSquaddieConditionType>
    existingConditions: Omit<SquaddieCondition, TSquaddieConditionType>[]
}): {
    simplifiedConditions: Omit<SquaddieCondition, TSquaddieConditionType>[]
    didAddNewCondition: boolean
} => {
    const existingConditionsToKeep = new Set<number>()
    let shouldAddNewCondition = true

    for (let i = 0; i < existingConditions.length; i++) {
        const conditionDuration = existingConditions[i].limit.duration ?? 0
        const newConditionDuration = binaryCondition.limit.duration ?? 0
        const conditionDurationIsAlreadyAccountedFor =
            conditionDuration >= newConditionDuration

        if (conditionDurationIsAlreadyAccountedFor) {
            existingConditionsToKeep.add(i)
            shouldAddNewCondition = false
        }
    }

    let remainingConditions = [...existingConditionsToKeep.keys()].map(
        (key) => existingConditions[key]
    )
    if (shouldAddNewCondition) {
        remainingConditions.push(binaryCondition)
    }
    return {
        simplifiedConditions: remainingConditions,
        didAddNewCondition: shouldAddNewCondition,
    }
}

const addNumericalAmountConditionAndSimplify = ({
    newCondition,
    existingConditions,
    isNewConditionPositive,
}: {
    newCondition: Omit<SquaddieCondition, TSquaddieConditionType>
    existingConditions: Omit<SquaddieCondition, TSquaddieConditionType>[]
    isNewConditionPositive: boolean
}): {
    simplifiedConditions: Omit<SquaddieCondition, TSquaddieConditionType>[]
    didAddNewCondition: boolean
} => {
    const existingConditionsToKeep = new Set<number>()
    let shouldAddNewCondition = true

    for (let i = 0; i < existingConditions.length; i++) {
        const conditionDuration = existingConditions[i].limit.duration ?? 0
        const newConditionDuration = newCondition.limit.duration ?? 0
        const conditionDurationIsAlreadyAccountedFor =
            conditionDuration >= newConditionDuration

        const conditionAmount = existingConditions[i].amount ?? 0
        const newConditionAmount = newCondition.amount ?? 0
        const conditionAmountIsAlreadyAccountedFor = isNewConditionPositive
            ? conditionAmount >= newConditionAmount
            : conditionAmount <= newConditionAmount

        const doesExistingConditionHaveTheSameAmountAndLongerDuration =
            conditionAmount == newConditionAmount &&
            conditionDurationIsAlreadyAccountedFor
        const doesExistingConditionHaveTheSameDurationAndMoreExtremeAmount =
            conditionDuration == newConditionDuration &&
            conditionAmountIsAlreadyAccountedFor

        if (
            doesExistingConditionHaveTheSameAmountAndLongerDuration ||
            doesExistingConditionHaveTheSameDurationAndMoreExtremeAmount
        ) {
            existingConditionsToKeep.add(i)
            shouldAddNewCondition = false
        }

        if (
            conditionAmount != newConditionAmount &&
            conditionDuration != newConditionDuration
        ) {
            existingConditionsToKeep.add(i)
        }
    }

    let remainingConditions = [...existingConditionsToKeep.keys()].map(
        (key) => existingConditions[key]
    )
    if (shouldAddNewCondition) {
        remainingConditions.push(newCondition)
    }
    return {
        simplifiedConditions: remainingConditions,
        didAddNewCondition: shouldAddNewCondition,
    }
}

const reduceEachConditionByOneRound = (newSquaddie: InBattleSquaddie) => {
    for (const conditionList of Object.values(newSquaddie.conditions)) {
        for (const condition of conditionList) {
            if (condition.limit.duration != undefined)
                condition.limit.duration -= 1
        }
    }
}
const getAllConditionTypesThatHaveZeroDuration = (
    newSquaddie: InBattleSquaddie
) => {
    return Object.entries(newSquaddie.conditions)
        .filter(([_, conditionList]) => {
            return conditionList.every(
                (condition) =>
                    condition.limit.duration != undefined &&
                    condition.limit.duration <= 0
            )
        })
        .map(([typeStr, _]) => typeStr as TSquaddieConditionType)
}
const removeAllIndividualConditionsWithZeroDuration = (
    newSquaddie: InBattleSquaddie
) => {
    for (const conditionTypeStr of Object.keys(newSquaddie.conditions)) {
        const conditionType = conditionTypeStr as TSquaddieConditionType
        newSquaddie.conditions[conditionType] = newSquaddie.conditions[
            conditionType
        ]?.filter(
            (condition) =>
                condition.limit.duration == undefined ||
                condition.limit.duration > 0
        )
    }
}

const reduceConditionTypeByAmount = ({
    conditions,
    amount,
}: {
    conditions: Omit<SquaddieCondition, TSquaddieConditionType>[] | undefined
    amount: number
}) => {
    if (amount == 0 || conditions == undefined) return
    for (const condition of conditions) {
        switch (true) {
            case condition.amount != undefined && condition.amount < 0:
                condition.amount = Math.min(condition.amount + amount, 0)
                break
            case condition.amount != undefined && condition.amount > 0:
                condition.amount = Math.max(condition.amount - amount, 0)
                break
        }
    }
}

const getAllConditionTypesThatHaveZeroAmount = (
    newSquaddie: InBattleSquaddie
) => {
    return Object.entries(newSquaddie.conditions)
        .filter(([_, conditionList]) => {
            return conditionList.every((condition) => condition.amount == 0)
        })
        .map(([typeStr, _]) => typeStr as TSquaddieConditionType)
}
const removeAllIndividualConditionsWithZeroAmount = (
    newSquaddie: InBattleSquaddie
) => {
    for (const conditionTypeStr of Object.keys(newSquaddie.conditions)) {
        const conditionType = conditionTypeStr as TSquaddieConditionType
        newSquaddie.conditions[conditionType] = newSquaddie.conditions[
            conditionType
        ]?.filter((condition) => condition.amount != 0)
    }
}

const getAllConditions = (
    squaddie: InBattleSquaddie
): {
    [k in TSquaddieConditionType]?: Omit<
        SquaddieCondition,
        TSquaddieConditionType
    >[]
} => {
    if (squaddie == undefined) return {}
    return deepCopyConditions(squaddie.conditions)
}

const sumOfConditionAmount = (
    conditions: Omit<SquaddieCondition, TSquaddieConditionType>[] | undefined
): number => {
    if (conditions == undefined) return 0

    return conditions.reduce((sum, currentValue) => {
        return sum + (currentValue.amount ?? 0)
    }, 0)
}
