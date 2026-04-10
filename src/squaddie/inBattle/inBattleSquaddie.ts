import type { OutOfBattleSquaddie } from "../outOfBattle/outOfBattleSquaddie"
import type { OutOfBattleSquaddieAttributeSheet } from "../outOfBattle/outOfBattleSquaddieAttributeSheet"
import { type AttributeScoreType } from "../../proficiency/attributeScore"
import {
    type SquaddieCondition,
    SquaddieConditionService,
    SquaddieConditionType,
    type TSquaddieConditionDecaysAt,
    type TSquaddieConditionSource,
    type TSquaddieConditionType,
} from "../../proficiency/squaddieCondition"
import {
    ProficiencyLevel,
    ProficiencyLevelConst,
    ProficiencyType,
    type TProficiencyLevel,
    type TProficiencyType,
} from "../../proficiency/proficiencyLevel"
import type { DamageResult } from "../../squaddieAction/calculate/result/squaddieActionResult"
import type { SquaddieActionEffect } from "../../squaddieAction/squaddieAction"
import type { SquaddieItem } from "../../squaddieItem/squaddieItem"

export const DEFAULT_ACTION_POINTS = 3

export type { BattleSquaddieId } from "./battleSquaddieId"

export interface InBattleSquaddie {
    id: number
    outOfBattleSquaddieId: string
    name: string
    hitPoints: {
        max: number
        current: number
    }
    conditions: Map<TSquaddieConditionType, SquaddieCondition[]>
    actionPoints: {
        current: number
    }
    attackContributionThisTurn: number
    actionIds: {
        natural: string[]
    }
    itemIdsUsed: string[]
}

export type SerializedInBattleSquaddie = Omit<
    InBattleSquaddie,
    "conditions"
> & {
    conditions: { [key: string]: SquaddieCondition[] }
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
            outOfBattleSquaddieId: outOfBattleSquaddie.id,
            name,
            hitPoints: {
                max: attributeSheet.maxHitPoints,
                current: attributeSheet.maxHitPoints,
            },
            conditions: new Map(),
            actionPoints: {
                current: DEFAULT_ACTION_POINTS,
            },
            attackContributionThisTurn: 0,
            actionIds: {
                natural: [...outOfBattleSquaddie.actionIds],
            },
            itemIdsUsed: [],
        }
    },
    calculateConditionAmount: ({
        squaddie,
        conditionType,
    }: {
        squaddie: InBattleSquaddie
        conditionType: TSquaddieConditionType
    }): number => {
        return effectiveConditionAmount(squaddie.conditions.get(conditionType))
    },
    dealDamageToSquaddie({
        squaddie,
        damage,
    }: {
        squaddie: InBattleSquaddie
        damage: {
            amount: number
            type?: AttributeScoreType
        }
    }): {
        squaddie: InBattleSquaddie
        damage: DamageResult
    } {
        const newSquaddie: InBattleSquaddie = clone(squaddie)
        const conditions = getAllConditions(newSquaddie)

        let damageReduction = effectiveConditionAmount(
            conditions.get(SquaddieConditionType.ABSORB)
        )

        drainAbsorbConditionsBySource({
            damage: damage.amount,
            conditions: conditions.get(SquaddieConditionType.ABSORB),
        })
        removePermanentConditionsReducedToZero(conditions)
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
                absorbed: damage.amount - damageTaken,
                willKo: newSquaddie.hitPoints.current <= 0,
                type: damage.type,
            },
        }
    },
    getAllConditions: (
        squaddie: InBattleSquaddie
    ): Map<TSquaddieConditionType, SquaddieCondition[]> =>
        getAllConditions(squaddie),
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
            netEffect: Map<TSquaddieConditionType, SquaddieCondition[]>
        }
    } => {
        const newSquaddie = clone(squaddie)
        const newConditions: SquaddieCondition[] = []

        for (const condition of conditions) {
            const info = updateConditionsIfNewConditionIfNeeded({
                condition,
                squaddieConditions: newSquaddie.conditions,
            })

            if (!info.shouldAddNewCondition) continue

            newSquaddie.conditions.set(
                condition.type,
                info.replacementConditions!
            )
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
        decaysAt,
    }: {
        squaddie: InBattleSquaddie
        decaysAt: TSquaddieConditionDecaysAt
    }): {
        squaddie: InBattleSquaddie
        removedConditions: TSquaddieConditionType[]
    } => {
        const newSquaddie = clone(squaddie)
        reduceEachConditionByOneRound(newSquaddie, decaysAt)
        const removedConditionTypes =
            getAllConditionTypesThatHaveZeroDuration(newSquaddie)

        for (const conditionType of removedConditionTypes) {
            newSquaddie.conditions.delete(conditionType)
        }
        removeAllIndividualConditionsWithZeroDuration(newSquaddie)

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
        healing: NonNullable<SquaddieActionEffect["healing"]>
    }): {
        squaddie: InBattleSquaddie
        healing: {
            net: number
        }
    } => {
        const newSquaddie = clone(squaddie)
        let healingTaken: number
        healingTaken = healing.raw

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
    ): InBattleSquaddie["actionPoints"] => {
        return { current: inBattleSquaddie.actionPoints.current }
    },
    getMaximumActionPoints: (inBattleSquaddie: InBattleSquaddie): number => {
        let maximumActionPoints = DEFAULT_ACTION_POINTS

        const slowedAmount = InBattleSquaddieService.calculateConditionAmount({
            squaddie: inBattleSquaddie,
            conditionType: SquaddieConditionType.SLOWED,
        })

        maximumActionPoints -= slowedAmount

        return Math.max(maximumActionPoints, 0)
    },
    spendActionPoints: ({
        squaddie,
        actionPoints,
    }: {
        squaddie: InBattleSquaddie
        actionPoints: number
    }): { squaddie: InBattleSquaddie; spent: number } => {
        const newSquaddie = clone(squaddie)
        newSquaddie.actionPoints.current = Math.max(
            newSquaddie.actionPoints.current - actionPoints,
            0
        )
        return {
            squaddie: newSquaddie,
            spent:
                squaddie.actionPoints.current -
                newSquaddie.actionPoints.current,
        }
    },
    restoreActionPoints: ({
        squaddie,
        actionPoints,
    }: {
        squaddie: InBattleSquaddie
        actionPoints: number
    }): { squaddie: InBattleSquaddie; restored: number } => {
        const newSquaddie = clone(squaddie)
        const maximumActionPoints =
            InBattleSquaddieService.getMaximumActionPoints(squaddie)

        const newAmount = Math.min(
            newSquaddie.actionPoints.current + actionPoints,
            maximumActionPoints
        )

        const restored = newAmount - newSquaddie.actionPoints.current
        newSquaddie.actionPoints.current = newAmount

        return {
            squaddie: newSquaddie,
            restored,
        }
    },
    resetActionPoints: ({
        squaddie,
    }: {
        squaddie: InBattleSquaddie
    }): InBattleSquaddie => {
        const newSquaddie = clone(squaddie)
        newSquaddie.actionPoints.current =
            InBattleSquaddieService.getMaximumActionPoints(squaddie)
        return newSquaddie
    },
    resetAttackContributionThisTurn: ({
        squaddie,
    }: {
        squaddie: InBattleSquaddie
    }): InBattleSquaddie => {
        const newSquaddie = clone(squaddie)
        newSquaddie.attackContributionThisTurn = 0
        return newSquaddie
    },
    incrementAttackContributionThisTurn: ({
        squaddie,
        amount,
    }: {
        squaddie: InBattleSquaddie
        amount: number
    }): InBattleSquaddie => {
        const newSquaddie = clone(squaddie)
        newSquaddie.attackContributionThisTurn += amount
        return newSquaddie
    },
    getProficiencyLevel: ({
        attributeSheet,
        type,
    }: {
        attributeSheet: OutOfBattleSquaddieAttributeSheet
        type: TProficiencyType
    }): TProficiencyLevel =>
        getProficiencyLevel({
            attributeSheet,
            type,
        }),
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
    }): number =>
        getAttributeScore({
            attributeSheet,
            type,
        }),
    getProficiencyBonus: ({
        squaddie,
        attributeSheet,
        type,
        passiveItems,
    }: {
        squaddie: InBattleSquaddie
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
        const rank = attributeSheet.rank

        let attributeScore = 0
        if (ProficiencyLevelConst.attributeScoreByProficiencyType.has(type)) {
            attributeScore = getAttributeScore({
                attributeSheet,
                type: ProficiencyLevelConst.attributeScoreByProficiencyType.get(
                    type
                )!,
            })
        }

        const proficiencyLevel =
            ProficiencyLevelConst.bonusByProficiencyLevel.get(
                getProficiencyLevel({
                    attributeSheet,
                    type,
                })
            ) ?? 0

        let { conditionBonus, conditionPenalty } = calculateConditionAmount(
            type,
            squaddie
        )

        let passiveItemBonus: number = 0
        let passiveItemPenalty: number = 0
        const itemBonuses: number[] = passiveItems
            .filter((item) => item.passiveProficiencyBonuses.has(type))
            .map((item) => item.passiveProficiencyBonuses.get(type)!)
        if (itemBonuses.length > 0) {
            const maxBonus = Math.max(...itemBonuses)
            if (maxBonus > 0) passiveItemBonus = maxBonus

            const maxPenalty = Math.min(...itemBonuses)
            if (maxPenalty < 0) passiveItemPenalty = maxPenalty
        }

        return {
            total:
                rank +
                attributeScore +
                proficiencyLevel +
                passiveItemBonus +
                passiveItemPenalty +
                conditionBonus +
                conditionPenalty,
            rank,
            attributeScore,
            proficiencyLevel,
            passiveItemBonus,
            passiveItemPenalty,
            conditionBonus,
            conditionPenalty,
        }
    },
    dispelSquaddieConditions: ({
        squaddie,
        conditionTypes,
        amount,
    }: {
        squaddie: InBattleSquaddie
        conditionTypes: {
            all?: boolean
            types?: TSquaddieConditionType[]
        }
        amount: number | undefined
    }): {
        squaddie: InBattleSquaddie
        dispelledConditions: Map<TSquaddieConditionType, SquaddieCondition[]>
    } => {
        const { squaddie: cloneSquaddie, reducedConditions } =
            dispelOrTreatSquaddieConditions({
                squaddie,
                conditionTypes,
                amount,
                action: "dispel",
            })

        return {
            squaddie: cloneSquaddie,
            dispelledConditions: reducedConditions,
        }
    },
    treatSquaddieConditions: ({
        squaddie,
        conditionTypes,
        amount,
    }: {
        squaddie: InBattleSquaddie
        conditionTypes: {
            all?: boolean
            types?: TSquaddieConditionType[]
        }
        amount: number | undefined
    }): {
        squaddie: InBattleSquaddie
        treatedConditions: Map<TSquaddieConditionType, SquaddieCondition[]>
    } => {
        const { squaddie: cloneSquaddie, reducedConditions } =
            dispelOrTreatSquaddieConditions({
                squaddie,
                conditionTypes,
                amount,
                action: "treat",
            })

        return {
            squaddie: cloneSquaddie,
            treatedConditions: reducedConditions,
        }
    },
    useItem: ({
        squaddie,
        item,
    }: {
        squaddie: InBattleSquaddie
        item: SquaddieItem
    }): InBattleSquaddie => {
        const newSquaddie = clone(squaddie)
        newSquaddie.itemIdsUsed.push(item.id)
        return newSquaddie
    },
    serialize: (squaddie: InBattleSquaddie): SerializedInBattleSquaddie =>
        serialize(squaddie),
    deserialize: (serializable: SerializedInBattleSquaddie): InBattleSquaddie =>
        deserialize(serializable),
}

const clone = (original: InBattleSquaddie): InBattleSquaddie => {
    return {
        ...original,
        hitPoints: {
            max: original.hitPoints.max,
            current: original.hitPoints.current,
        },
        conditions: deepCopyConditions(original.conditions),
        actionPoints: {
            current: original.actionPoints.current,
        },
        attackContributionThisTurn: original.attackContributionThisTurn,
        actionIds: {
            natural: [...original.actionIds.natural],
        },
    }
}

const deepCopyConditions = (
    original: Map<TSquaddieConditionType, SquaddieCondition[]>
): Map<TSquaddieConditionType, SquaddieCondition[]> => {
    const copy = new Map<TSquaddieConditionType, SquaddieCondition[]>()
    for (const [conditionType, conditions] of original.entries()) {
        copy.set(
            conditionType,
            conditions.map((c) => SquaddieConditionService.clone(c))
        )
    }
    return copy
}

const updateConditionsIfNewConditionIfNeeded = ({
    condition,
    squaddieConditions,
}: {
    condition: SquaddieCondition
    squaddieConditions: Map<TSquaddieConditionType, SquaddieCondition[]>
}): {
    shouldAddNewCondition: boolean
    replacementConditions:
        | Omit<SquaddieCondition, TSquaddieConditionType>[]
        | undefined
} => {
    const conditionType = condition.type
    if (!squaddieConditions.has(conditionType)) {
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
            existingConditions: squaddieConditions.get(conditionType)!,
        }))
        return {
            shouldAddNewCondition,
            replacementConditions,
        }
    }

    if (condition.amount != undefined && condition.amount.current > 0) {
        ;({
            didAddNewCondition: shouldAddNewCondition,
            simplifiedConditions: replacementConditions,
        } = addNumericalAmountConditionAndSimplify({
            newCondition: condition,
            existingConditions: squaddieConditions.get(conditionType)!,
            isNewConditionPositive: true,
        }))
        return {
            shouldAddNewCondition,
            replacementConditions,
        }
    }

    if (condition.amount != undefined && condition.amount.current < 0) {
        ;({
            didAddNewCondition: shouldAddNewCondition,
            simplifiedConditions: replacementConditions,
        } = addNumericalAmountConditionAndSimplify({
            newCondition: condition,
            existingConditions: squaddieConditions.get(conditionType)!,
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
    const differentSourceConditions = existingConditions.filter(
        (c) => c.source !== binaryCondition.source
    )
    const sameSourceConditions = existingConditions.filter(
        (c) => c.source === binaryCondition.source
    )

    const sameSourceConditionsToKeep = new Set<number>()
    let shouldAddNewCondition = true

    for (let i = 0; i < sameSourceConditions.length; i++) {
        const conditionDuration =
            sameSourceConditions[i].limit.duration?.duration ?? 0
        const newConditionDuration =
            binaryCondition.limit.duration?.duration ?? 0
        const conditionDurationIsAlreadyAccountedFor =
            conditionDuration >= newConditionDuration

        if (conditionDurationIsAlreadyAccountedFor) {
            sameSourceConditionsToKeep.add(i)
            shouldAddNewCondition = false
        }
    }

    let remainingConditions = [
        ...differentSourceConditions,
        ...[...sameSourceConditionsToKeep.keys()].map(
            (key) => sameSourceConditions[key]
        ),
    ]
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
    const differentSourceConditions = existingConditions.filter(
        (c) => c.source !== newCondition.source
    )
    const sameSourceConditions = existingConditions.filter(
        (c) => c.source === newCondition.source
    )

    const sameSourceConditionsToKeep = new Set<number>()
    let shouldAddNewCondition = true

    for (let i = 0; i < sameSourceConditions.length; i++) {
        const conditionDuration =
            sameSourceConditions[i].limit.duration?.duration ?? 0
        const newConditionDuration = newCondition.limit.duration?.duration ?? 0
        const conditionDurationIsAlreadyAccountedFor =
            conditionDuration >= newConditionDuration

        const conditionAmount = sameSourceConditions[i].amount?.current ?? 0
        const newConditionAmount = newCondition.amount?.current ?? 0
        const conditionAmountIsAlreadyAccountedFor = isNewConditionPositive
            ? conditionAmount >= newConditionAmount
            : conditionAmount <= newConditionAmount

        const doesExistingConditionHaveTheSameAmountAndLongerDuration =
            conditionAmount == newConditionAmount &&
            conditionDurationIsAlreadyAccountedFor
        const doesExistingConditionHaveTheSameDurationAndMoreExtremeAmount =
            conditionDuration == newConditionDuration &&
            conditionAmountIsAlreadyAccountedFor

        const doesExistingConditionDominateNewCondition =
            conditionAmountIsAlreadyAccountedFor &&
            conditionDurationIsAlreadyAccountedFor

        if (
            doesExistingConditionHaveTheSameAmountAndLongerDuration ||
            doesExistingConditionHaveTheSameDurationAndMoreExtremeAmount ||
            doesExistingConditionDominateNewCondition
        ) {
            sameSourceConditionsToKeep.add(i)
            shouldAddNewCondition = false
            continue
        }

        if (
            conditionAmount != newConditionAmount &&
            (conditionDuration != newConditionDuration ||
                (sameSourceConditions[i].limit.duration == undefined &&
                    newCondition.limit.duration == undefined))
        ) {
            sameSourceConditionsToKeep.add(i)
        }
    }

    let remainingConditions = [
        ...differentSourceConditions,
        ...[...sameSourceConditionsToKeep.keys()].map(
            (key) => sameSourceConditions[key]
        ),
    ]
    if (shouldAddNewCondition) {
        remainingConditions.push(newCondition)
    }
    return {
        simplifiedConditions: remainingConditions,
        didAddNewCondition: shouldAddNewCondition,
    }
}

const reduceEachConditionByOneRound = (
    newSquaddie: InBattleSquaddie,
    decaysAt: TSquaddieConditionDecaysAt
) => {
    for (const conditionList of newSquaddie.conditions.values()) {
        for (const condition of conditionList) {
            if (condition.limit.duration?.decaysAt === decaysAt) {
                condition.limit.duration.duration -= 1
                if (
                    condition.limit.duration.duration > 0 &&
                    condition.amount?.base != undefined
                ) {
                    condition.amount.current = condition.amount.base
                }
            }
        }
    }
}
const getAllConditionTypesThatHaveZeroDuration = (
    newSquaddie: InBattleSquaddie
) => {
    return Array.from(newSquaddie.conditions.entries())
        .filter(([_, conditionList]) => {
            return conditionList.every(
                (condition) =>
                    condition.limit.duration != undefined &&
                    condition.limit.duration.duration <= 0
            )
        })
        .map(([conditionType, _]) => conditionType)
}
const removeAllIndividualConditionsWithZeroDuration = (
    newSquaddie: InBattleSquaddie
) => {
    for (const conditionType of newSquaddie.conditions.keys()) {
        const filtered: SquaddieCondition[] =
            newSquaddie.conditions
                .get(conditionType)
                ?.filter(
                    (condition) =>
                        condition.limit.duration == undefined ||
                        condition.limit.duration.duration > 0
                ) ?? []
        newSquaddie.conditions.set(conditionType, filtered)
    }
}

const removePermanentConditionsReducedToZero = (
    conditions: Map<TSquaddieConditionType, SquaddieCondition[]>
) => {
    for (const conditionType of conditions.keys()) {
        const filtered = (conditions.get(conditionType) ?? []).filter(
            (condition) =>
                !(
                    condition.limit.duration == undefined &&
                    (condition.amount?.current ?? 1) <= 0
                )
        )
        if (filtered.length === 0) {
            conditions.delete(conditionType)
        } else {
            conditions.set(conditionType, filtered)
        }
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
            case condition.amount != undefined && condition.amount.current < 0:
                condition.amount.current = Math.min(
                    condition.amount.current + amount,
                    0
                )
                break
            case condition.amount != undefined && condition.amount.current > 0:
                condition.amount.current = Math.max(
                    condition.amount.current - amount,
                    0
                )
                break
        }
    }
}

const getAllConditions = (
    squaddie: InBattleSquaddie
): Map<TSquaddieConditionType, SquaddieCondition[]> => {
    if (squaddie == undefined) return new Map()
    return deepCopyConditions(squaddie.conditions)
}

const drainAbsorbConditionsBySource = ({
    conditions,
    damage,
}: {
    conditions: SquaddieCondition[] | undefined
    damage: number
}) => {
    if (!conditions || damage <= 0) return
    let remainingDamage = damage

    const maxBySource = new Map<TSquaddieConditionSource, SquaddieCondition>()
    for (const condition of conditions) {
        const amount = condition.amount?.current ?? 0
        if (amount <= 0) continue
        const existing = maxBySource.get(condition.source)
        if (!existing || amount > (existing.amount?.current ?? 0)) {
            maxBySource.set(condition.source, condition)
        }
    }

    for (const maxCondition of maxBySource.values()) {
        if (remainingDamage <= 0) break
        const sourceAbsorbs = Math.min(
            maxCondition.amount!.current,
            remainingDamage
        )
        maxCondition.amount!.current -= sourceAbsorbs
        remainingDamage -= sourceAbsorbs
    }
}

const effectiveConditionAmount = (
    conditions: Omit<SquaddieCondition, TSquaddieConditionType>[] | undefined
): number => {
    if (conditions == undefined || conditions.length === 0) return 0

    const bySource = new Map<
        TSquaddieConditionSource,
        { maxPos: number; maxNeg: number }
    >()
    for (const condition of conditions) {
        const source = condition.source
        const amount = condition.amount?.current ?? 0
        const existing = bySource.get(source) ?? { maxPos: 0, maxNeg: 0 }
        bySource.set(source, {
            maxPos: Math.max(existing.maxPos, amount, 0),
            maxNeg: Math.min(existing.maxNeg, amount, 0),
        })
    }

    let total = 0
    for (const { maxPos, maxNeg } of bySource.values()) {
        total += maxPos + maxNeg
    }
    return total
}

const getAttributeScore = ({
    attributeSheet,
    type,
}: {
    attributeSheet: OutOfBattleSquaddieAttributeSheet
    type: AttributeScoreType
}): number => {
    return attributeSheet.attributeScores[type]
}

const getProficiencyLevel = ({
    attributeSheet,
    type,
}: {
    attributeSheet: OutOfBattleSquaddieAttributeSheet
    type: TProficiencyType
}): TProficiencyLevel => {
    return (
        attributeSheet.proficiencyLevels.get(type) ?? ProficiencyLevel.UNTRAINED
    )
}

const removeSquaddieConditionsReducedToZeroAmount = (
    clonedConditionsForType: Omit<SquaddieCondition, TSquaddieConditionType>[]
) =>
    clonedConditionsForType.filter(
        (condition) => (condition.amount?.current ?? 0) != 0
    )

const dispelOrTreatSquaddieConditions = ({
    squaddie,
    conditionTypes,
    amount,
    action,
}: {
    squaddie: InBattleSquaddie
    conditionTypes: {
        all?: boolean
        types?: TSquaddieConditionType[]
    }
    amount: number | undefined
    action: "dispel" | "treat"
}): {
    squaddie: InBattleSquaddie
    reducedConditions: Map<TSquaddieConditionType, SquaddieCondition[]>
} => {
    const reducedConditions = new Map<
        TSquaddieConditionType,
        SquaddieCondition[]
    >()

    const cloneSquaddie = clone(squaddie)

    for (const [
        squaddieConditionType,
        squaddieConditionsForType,
    ] of cloneSquaddie.conditions.entries()) {
        const squaddieHasConditionTypeThatMayBeReduced =
            conditionTypes.all ||
            (conditionTypes.types ?? []).includes(squaddieConditionType)

        if (!squaddieHasConditionTypeThatMayBeReduced) {
            continue
        }

        if (
            squaddieConditionsForType == undefined ||
            squaddieConditionsForType.length == 0
        )
            continue

        const { newConditionsForType, reducedConditionsForType } =
            reduceDispelOrTreatSquaddieConditionAmounts(
                squaddieConditionsForType,
                amount,
                action
            )

        if (reducedConditionsForType.length > 0)
            reducedConditions.set(
                squaddieConditionType,
                reducedConditionsForType
            )
        newConditionsForType.push(
            ...removeSquaddieConditionsReducedToZeroAmount(
                reducedConditionsForType
            )
        )

        if (newConditionsForType.length > 0)
            cloneSquaddie.conditions.set(
                squaddieConditionType,
                newConditionsForType
            )
        else cloneSquaddie.conditions.delete(squaddieConditionType)
    }

    return {
        squaddie: cloneSquaddie,
        reducedConditions,
    }
}

const reduceDispelOrTreatSquaddieConditionAmounts = (
    squaddieConditionsForType: Omit<
        SquaddieCondition,
        TSquaddieConditionType
    >[],
    amount: number | undefined,
    action: "dispel" | "treat"
) => {
    const newConditionsForType: SquaddieCondition[] = []
    const reducedConditionsForType: SquaddieCondition[] = []

    for (const condition of squaddieConditionsForType) {
        const conditionIsBinary = SquaddieConditionService.isBinary(condition)

        if (
            action == "treat" &&
            !SquaddieConditionService.isHindering(condition)
        ) {
            newConditionsForType.push(condition)
            continue
        }

        if (
            action == "dispel" &&
            !SquaddieConditionService.isHelpful(condition)
        ) {
            newConditionsForType.push(condition)
            continue
        }

        if (conditionIsBinary) {
            reducedConditionsForType.push(condition)
            continue
        }

        if (amount == undefined) {
            newConditionsForType.push(condition)
            continue
        }

        reduceConditionTypeByAmount({
            conditions: [condition],
            amount,
        })

        reducedConditionsForType.push(condition)
    }
    return { newConditionsForType, reducedConditionsForType }
}

const calculateConditionAmount = (
    type: TProficiencyType,
    squaddie: InBattleSquaddie
): {
    conditionBonus: number
    conditionPenalty: number
} => {
    let conditionBonus: number = 0
    let conditionPenalty: number = 0
    if (type == ProficiencyType.ARMOR) {
        const amount = effectiveConditionAmount(
            squaddie.conditions.get(SquaddieConditionType.ARMOR)
        )
        if (amount > 0) conditionBonus = amount
        if (amount < 0) conditionPenalty = amount
    }
    return { conditionBonus, conditionPenalty }
}

const serialize = (squaddie: InBattleSquaddie): SerializedInBattleSquaddie => {
    const conditions: { [key: string]: SquaddieCondition[] } = {}
    for (const [
        conditionType,
        conditionList,
    ] of squaddie.conditions.entries()) {
        conditions[conditionType] = conditionList.map((c) =>
            SquaddieConditionService.clone(c)
        )
    }

    return {
        id: squaddie.id,
        outOfBattleSquaddieId: squaddie.outOfBattleSquaddieId,
        name: squaddie.name,
        hitPoints: {
            max: squaddie.hitPoints.max,
            current: squaddie.hitPoints.current,
        },
        conditions,
        actionPoints: {
            current: squaddie.actionPoints.current,
        },
        attackContributionThisTurn: squaddie.attackContributionThisTurn,
        actionIds: {
            natural: [...squaddie.actionIds.natural],
        },
        itemIdsUsed: [...squaddie.itemIdsUsed],
    }
}

const deserialize = (
    serializable: SerializedInBattleSquaddie
): InBattleSquaddie => {
    const conditions = new Map<TSquaddieConditionType, SquaddieCondition[]>()
    for (const [conditionType, conditionList] of Object.entries(
        serializable.conditions
    )) {
        conditions.set(
            conditionType as TSquaddieConditionType,
            conditionList.map((c) => SquaddieConditionService.clone(c))
        )
    }

    return {
        id: serializable.id,
        outOfBattleSquaddieId: serializable.outOfBattleSquaddieId,
        name: serializable.name,
        hitPoints: {
            max: serializable.hitPoints.max,
            current: serializable.hitPoints.current,
        },
        conditions,
        actionPoints: {
            current: serializable.actionPoints.current,
        },
        attackContributionThisTurn:
            serializable.attackContributionThisTurn ?? 0,
        actionIds: {
            natural: [...serializable.actionIds.natural],
        },
        itemIdsUsed: [...serializable.itemIdsUsed],
    }
}
