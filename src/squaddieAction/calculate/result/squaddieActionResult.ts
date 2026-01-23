import type { AttributeScoreType } from "../../../proficiency/attributeScore"
import type {
    SquaddieCondition,
    TSquaddieConditionType,
} from "../../../proficiency/squaddieCondition"
import type { CoordinateMovePath } from "../../../coordinateMap/path/path"

export type DamageResult = {
    net: number
    raw: number
    absorbed: number
    willKo: boolean
    type: AttributeScoreType | undefined
}

export type HealingResult = {
    net: number
    raw: number
}

export type ConditionAddResult = SquaddieCondition[]

export interface SquaddieActionResult {
    inBattleSquaddieId: number
    outOfBattleSquaddieId: string
    actionPoints?: {
        spent: number
        restore?: {
            net: number
            raw: number
        }
    }
    damage?: DamageResult
    healing?: HealingResult
    conditionsAdded?: ConditionAddResult
    dispel?: {
        dispelledConditions?: Map<
            TSquaddieConditionType,
            Omit<SquaddieCondition, "type">[]
        >
        conditionTypes: {
            all?: boolean
            types?: TSquaddieConditionType[]
        }
        amount: number | undefined
    }
    treat?: {
        treatedConditions?: Map<
            TSquaddieConditionType,
            Omit<SquaddieCondition, "type">[]
        >
        conditionTypes: {
            all?: boolean
            types?: TSquaddieConditionType[]
        }
        amount: number | undefined
    }
    movement?: {
        expectedPath: CoordinateMovePath
    }
}

export type SerializableSquaddieActionResult = Omit<
    SquaddieActionResult,
    "dispel" | "treat"
> & {
    dispel?: Omit<
        NonNullable<SquaddieActionResult["dispel"]>,
        "dispelledConditions"
    > & {
        dispelledConditions?: {
            [key: string]: Omit<SquaddieCondition, "type">[]
        }
    }
    treat?: Omit<
        NonNullable<SquaddieActionResult["treat"]>,
        "treatedConditions"
    > & {
        treatedConditions?: {
            [key: string]: Omit<SquaddieCondition, "type">[]
        }
    }
}

export const SquaddieActionResultService = {
    clone: (original: SquaddieActionResult): SquaddieActionResult => {
        let cloned: SquaddieActionResult = {
            inBattleSquaddieId: original.inBattleSquaddieId,
            outOfBattleSquaddieId: original.outOfBattleSquaddieId,
        }

        cloned = cloneActionPoints(original, cloned)
        cloned = cloneDamage(original, cloned)
        cloned = cloneHealing(original, cloned)
        cloned = cloneConditionsAdded(original, cloned)
        cloned = cloneDispel(original, cloned)
        cloned = cloneTreat(original, cloned)
        cloned = cloneMovement(original, cloned)

        return cloned
    },

    serialize: (
        result: SquaddieActionResult
    ): SerializableSquaddieActionResult => {
        let serializable: SerializableSquaddieActionResult = {
            inBattleSquaddieId: result.inBattleSquaddieId,
            outOfBattleSquaddieId: result.outOfBattleSquaddieId,
        }

        serializable = convertActionPointsToSerializable(result, serializable)
        serializable = convertDamageToSerializable(result, serializable)
        serializable = convertHealingToSerializable(result, serializable)
        serializable = convertConditionsAddedToSerializable(
            result,
            serializable
        )
        serializable = convertDispelToSerializable(result, serializable)
        serializable = convertTreatToSerializable(result, serializable)
        serializable = convertMovementToSerializable(result, serializable)

        return serializable
    },

    deserialize: (
        serialized: SerializableSquaddieActionResult
    ): SquaddieActionResult => {
        let result: SquaddieActionResult = {
            inBattleSquaddieId: serialized.inBattleSquaddieId,
            outOfBattleSquaddieId: serialized.outOfBattleSquaddieId,
        }

        result = convertActionPointsFromSerializable(serialized, result)
        result = convertDamageFromSerializable(serialized, result)
        result = convertHealingFromSerializable(serialized, result)
        result = convertConditionsAddedFromSerializable(serialized, result)
        result = convertDispelFromSerializable(serialized, result)
        result = convertTreatFromSerializable(serialized, result)
        result = convertMovementFromSerializable(serialized, result)

        return result
    },
}

const cloneActionPoints = (
    original: SquaddieActionResult,
    cloned: SquaddieActionResult
): SquaddieActionResult => {
    if (!original.actionPoints) return cloned

    cloned.actionPoints = {
        spent: original.actionPoints.spent,
        restore: original.actionPoints.restore
            ? { ...original.actionPoints.restore }
            : undefined,
    }
    return cloned
}

const cloneDamage = (
    original: SquaddieActionResult,
    cloned: SquaddieActionResult
): SquaddieActionResult => {
    if (!original.damage) return cloned

    cloned.damage = { ...original.damage }
    return cloned
}

const cloneHealing = (
    original: SquaddieActionResult,
    cloned: SquaddieActionResult
): SquaddieActionResult => {
    if (!original.healing) return cloned

    cloned.healing = { ...original.healing }
    return cloned
}

const cloneConditionsAdded = (
    original: SquaddieActionResult,
    cloned: SquaddieActionResult
): SquaddieActionResult => {
    if (!original.conditionsAdded) return cloned

    cloned.conditionsAdded = original.conditionsAdded.map((c) => ({ ...c }))
    return cloned
}

const cloneDispel = (
    original: SquaddieActionResult,
    cloned: SquaddieActionResult
): SquaddieActionResult => {
    if (!original.dispel) return cloned

    cloned.dispel = {
        conditionTypes: { ...original.dispel.conditionTypes },
        amount: original.dispel.amount,
    }

    if (original.dispel.dispelledConditions) {
        cloned.dispel.dispelledConditions = new Map()
        for (const [key, value] of original.dispel.dispelledConditions) {
            cloned.dispel.dispelledConditions.set(
                key,
                value.map((v) => ({ ...v }))
            )
        }
    }

    return cloned
}

const cloneTreat = (
    original: SquaddieActionResult,
    cloned: SquaddieActionResult
): SquaddieActionResult => {
    if (!original.treat) return cloned

    cloned.treat = {
        conditionTypes: { ...original.treat.conditionTypes },
        amount: original.treat.amount,
    }

    if (original.treat.treatedConditions) {
        cloned.treat.treatedConditions = new Map()
        for (const [key, value] of original.treat.treatedConditions) {
            cloned.treat.treatedConditions.set(
                key,
                value.map((v) => ({ ...v }))
            )
        }
    }

    return cloned
}

const cloneMovement = (
    original: SquaddieActionResult,
    cloned: SquaddieActionResult
): SquaddieActionResult => {
    if (!original.movement) return cloned

    cloned.movement = {
        expectedPath: {
            steps: original.movement.expectedPath.steps.map((step) => ({
                ...step,
            })),
            movementInstruction:
                original.movement.expectedPath.movementInstruction?.map(
                    (instruction) => ({
                        start: { ...instruction.start },
                        end: { ...instruction.end },
                        moveType: instruction.moveType,
                    })
                ),
        },
    }
    return cloned
}

const convertActionPointsToSerializable = (
    result: SquaddieActionResult,
    serializable: SerializableSquaddieActionResult
): SerializableSquaddieActionResult => {
    if (!result.actionPoints) return serializable

    serializable.actionPoints = {
        spent: result.actionPoints.spent,
        restore: result.actionPoints.restore
            ? { ...result.actionPoints.restore }
            : undefined,
    }
    return serializable
}

const convertDamageToSerializable = (
    result: SquaddieActionResult,
    serializable: SerializableSquaddieActionResult
): SerializableSquaddieActionResult => {
    if (!result.damage) return serializable

    serializable.damage = { ...result.damage }
    return serializable
}

const convertHealingToSerializable = (
    result: SquaddieActionResult,
    serializable: SerializableSquaddieActionResult
): SerializableSquaddieActionResult => {
    if (!result.healing) return serializable

    serializable.healing = { ...result.healing }
    return serializable
}

const convertConditionsAddedToSerializable = (
    result: SquaddieActionResult,
    serializable: SerializableSquaddieActionResult
): SerializableSquaddieActionResult => {
    if (!result.conditionsAdded) return serializable

    serializable.conditionsAdded = result.conditionsAdded.map((c) => ({ ...c }))
    return serializable
}

const convertDispelToSerializable = (
    result: SquaddieActionResult,
    serializable: SerializableSquaddieActionResult
): SerializableSquaddieActionResult => {
    if (!result.dispel) return serializable

    serializable.dispel = {
        conditionTypes: { ...result.dispel.conditionTypes },
        amount: result.dispel.amount,
    }

    if (result.dispel.dispelledConditions) {
        serializable.dispel.dispelledConditions = {}
        for (const [key, value] of result.dispel.dispelledConditions) {
            serializable.dispel.dispelledConditions[key] = value.map((v) => ({
                ...v,
            }))
        }
    }

    return serializable
}

const convertTreatToSerializable = (
    result: SquaddieActionResult,
    serializable: SerializableSquaddieActionResult
): SerializableSquaddieActionResult => {
    if (!result.treat) return serializable

    serializable.treat = {
        conditionTypes: { ...result.treat.conditionTypes },
        amount: result.treat.amount,
    }

    if (result.treat.treatedConditions) {
        serializable.treat.treatedConditions = {}
        for (const [key, value] of result.treat.treatedConditions) {
            serializable.treat.treatedConditions[key] = value.map((v) => ({
                ...v,
            }))
        }
    }

    return serializable
}

const convertMovementToSerializable = (
    result: SquaddieActionResult,
    serializable: SerializableSquaddieActionResult
): SerializableSquaddieActionResult => {
    if (!result.movement) return serializable

    serializable.movement = {
        expectedPath: {
            steps: result.movement.expectedPath.steps.map((step) => ({
                ...step,
            })),
            movementInstruction:
                result.movement.expectedPath.movementInstruction?.map(
                    (instruction) => ({
                        start: { ...instruction.start },
                        end: { ...instruction.end },
                        moveType: instruction.moveType,
                    })
                ),
        },
    }
    return serializable
}

const convertActionPointsFromSerializable = (
    serialized: SerializableSquaddieActionResult,
    result: SquaddieActionResult
): SquaddieActionResult => {
    if (!serialized.actionPoints) return result

    result.actionPoints = {
        spent: serialized.actionPoints.spent,
        restore: serialized.actionPoints.restore
            ? { ...serialized.actionPoints.restore }
            : undefined,
    }
    return result
}

const convertDamageFromSerializable = (
    serialized: SerializableSquaddieActionResult,
    result: SquaddieActionResult
): SquaddieActionResult => {
    if (!serialized.damage) return result

    result.damage = { ...serialized.damage }
    return result
}

const convertHealingFromSerializable = (
    serialized: SerializableSquaddieActionResult,
    result: SquaddieActionResult
): SquaddieActionResult => {
    if (!serialized.healing) return result

    result.healing = { ...serialized.healing }
    return result
}

const convertConditionsAddedFromSerializable = (
    serialized: SerializableSquaddieActionResult,
    result: SquaddieActionResult
): SquaddieActionResult => {
    if (!serialized.conditionsAdded) return result

    result.conditionsAdded = serialized.conditionsAdded.map((c) => ({ ...c }))
    return result
}

const convertDispelFromSerializable = (
    serialized: SerializableSquaddieActionResult,
    result: SquaddieActionResult
): SquaddieActionResult => {
    if (!serialized.dispel) return result

    result.dispel = {
        conditionTypes: { ...serialized.dispel.conditionTypes },
        amount: serialized.dispel.amount,
    }

    if (serialized.dispel.dispelledConditions) {
        result.dispel.dispelledConditions = new Map()
        for (const [key, value] of Object.entries(
            serialized.dispel.dispelledConditions
        )) {
            result.dispel.dispelledConditions.set(
                key as TSquaddieConditionType,
                value.map((v) => ({
                    ...v,
                })) as Omit<SquaddieCondition, TSquaddieConditionType>[]
            )
        }
    }

    return result
}

const convertTreatFromSerializable = (
    serialized: SerializableSquaddieActionResult,
    result: SquaddieActionResult
): SquaddieActionResult => {
    if (!serialized.treat) return result

    result.treat = {
        conditionTypes: { ...serialized.treat.conditionTypes },
        amount: serialized.treat.amount,
    }

    if (serialized.treat.treatedConditions) {
        result.treat.treatedConditions = new Map()
        for (const [key, value] of Object.entries(
            serialized.treat.treatedConditions
        )) {
            result.treat.treatedConditions.set(
                key as TSquaddieConditionType,
                value.map((v) => ({
                    ...v,
                })) as Omit<SquaddieCondition, TSquaddieConditionType>[]
            )
        }
    }

    return result
}

const convertMovementFromSerializable = (
    serialized: SerializableSquaddieActionResult,
    result: SquaddieActionResult
): SquaddieActionResult => {
    if (!serialized.movement) return result

    result.movement = {
        expectedPath: {
            steps: serialized.movement.expectedPath.steps.map((step) => ({
                ...step,
            })),
            movementInstruction:
                serialized.movement.expectedPath.movementInstruction?.map(
                    (instruction) => ({
                        start: { ...instruction.start },
                        end: { ...instruction.end },
                        moveType: instruction.moveType,
                    })
                ),
        },
    }
    return result
}
