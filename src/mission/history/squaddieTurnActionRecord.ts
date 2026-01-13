import type { SquaddieAction } from "../../squaddieAction/squaddieAction"
import type { SquaddieActionResult } from "../../squaddieAction/calculate/result/squaddieActionResult"
import type {
    SquaddieCondition,
    TSquaddieConditionType,
} from "../../proficiency/squaddieCondition"

export interface SerializableSquaddieActionResult {
    inBattleSquaddieId: number
    outOfBattleSquaddieId: string
    actionPoints?: {
        spent: number
        restore?: {
            net: number
            raw: number
        }
    }
    damage?: {
        net: number
        raw: number
        absorbed: number
        willKo: boolean
        type: string | undefined
    }
    healing?: {
        net: number
        raw: number
    }
    conditionsAdded?: SquaddieCondition[]
    dispel?: {
        dispelledConditions?: {
            [key: string]: Omit<SquaddieCondition, "type">[]
        }
        conditionTypes: {
            all?: boolean
            types?: TSquaddieConditionType[]
        }
        amount: number | undefined
    }
    treat?: {
        treatedConditions?: {
            [key: string]: Omit<SquaddieCondition, "type">[]
        }
        conditionTypes: {
            all?: boolean
            types?: TSquaddieConditionType[]
        }
        amount: number | undefined
    }
    movement?: {
        expectedPath: {
            steps: Array<{
                row: number
                col: number
                moveType: string
                moveCost: number
            }>
            movementInstruction?: Array<{
                start: { row: number; col: number }
                end: { row: number; col: number }
                moveType: string
            }>
        }
    }
}

export interface SquaddieTurnActionRecord {
    action: {
        id: string
        name: string
    }
    results: SerializableSquaddieActionResult[]
}

export const SquaddieTurnActionRecordService = {
    new: ({
        action,
        results,
    }: {
        action: SquaddieAction
        results: SquaddieActionResult[]
    }): SquaddieTurnActionRecord => {
        throwIfActionDataIsInvalid(action, "new")

        if (!results || results.length === 0) {
            throw new Error(
                "[SquaddieTurnActionRecordService.new]: results must have at least one entry"
            )
        }

        results.forEach((result) => {
            throwIfResultIsInvalid(result, "new")
        })

        return {
            action: {
                id: action.id,
                name: action.name,
            },
            results: results.map(convertSquaddieActionResultToSerializable),
        }
    },

    createFromJSON: (data: {
        action: { id: string; name: string }
        results: SerializableSquaddieActionResult[]
    }): SquaddieTurnActionRecord => {
        throwIfActionDataIsInvalid(data.action, "createFromJSON")

        if (!data.results || data.results.length === 0) {
            throw new Error(
                "[ActionHistoryEntryService.createFromJSON]: results must have at least one entry"
            )
        }

        data.results.forEach((result) => {
            throwIfResultIsInvalid(result, "createFromJSON")
        })

        return {
            action: { ...data.action },
            results: data.results.map((result) => ({ ...result })),
        }
    },

    getActionId: (entry: SquaddieTurnActionRecord): string => {
        throwIfEntryIsUndefined(entry, "getActionId")
        return entry.action.id
    },

    getActionName: (entry: SquaddieTurnActionRecord): string => {
        throwIfEntryIsUndefined(entry, "getActionName")
        return entry.action.name
    },

    getResults: (
        entry: SquaddieTurnActionRecord
    ): SerializableSquaddieActionResult[] => {
        throwIfEntryIsUndefined(entry, "getResults")
        return entry.results.map((result) => ({ ...result }))
    },
}

const convertSquaddieActionResultToSerializable = (
    result: SquaddieActionResult
): SerializableSquaddieActionResult => {
    let serializable: SerializableSquaddieActionResult = {
        inBattleSquaddieId: result.inBattleSquaddieId,
        outOfBattleSquaddieId: result.outOfBattleSquaddieId,
    }

    serializable = convertSquaddieActionResultActionPointsToSerializable(
        result,
        serializable
    )
    serializable = convertSquaddieActionResultDamageToSerializable(
        result,
        serializable
    )
    serializable = convertSquaddieActionResultHealingToSerializable(
        result,
        serializable
    )
    serializable = convertSquaddieActionResultConditionsAddedToSerializable(
        result,
        serializable
    )
    serializable = convertSquaddieActionResultDispelToSerializable(
        result,
        serializable
    )
    serializable = convertSquaddieActionResultTreatToSerializable(
        result,
        serializable
    )
    serializable = convertSquaddieActionResultMovementToSerializable(
        result,
        serializable
    )

    return serializable
}

const convertSquaddieActionResultDamageToSerializable = (
    result: SquaddieActionResult,
    serializable: SerializableSquaddieActionResult
): SerializableSquaddieActionResult => {
    if (!result.damage) return serializable

    serializable.damage = {
        net: result.damage.net,
        raw: result.damage.raw,
        absorbed: result.damage.absorbed,
        willKo: result.damage.willKo,
        type: result.damage.type,
    }
    return serializable
}

const convertSquaddieActionResultActionPointsToSerializable = (
    result: SquaddieActionResult,
    serializable: SerializableSquaddieActionResult
): SerializableSquaddieActionResult => {
    if (!result.actionPoints) return serializable

    serializable.actionPoints = {
        spent: result.actionPoints.spent,
        restore: result.actionPoints.restore
            ? {
                  net: result.actionPoints.restore.net,
                  raw: result.actionPoints.restore.raw,
              }
            : undefined,
    }
    return serializable
}

const convertSquaddieActionResultHealingToSerializable = (
    result: SquaddieActionResult,
    serializable: SerializableSquaddieActionResult
): SerializableSquaddieActionResult => {
    if (!result.healing) return serializable
    serializable.healing = {
        net: result.healing.net,
        raw: result.healing.raw,
    }
    return serializable
}

const convertSquaddieActionResultConditionsAddedToSerializable = (
    result: SquaddieActionResult,
    serializable: SerializableSquaddieActionResult
): SerializableSquaddieActionResult => {
    if (!result.conditionsAdded) return serializable

    serializable.conditionsAdded = [...result.conditionsAdded]
    return serializable
}

const convertSquaddieActionResultDispelToSerializable = (
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
            serializable.dispel.dispelledConditions[key] = [...value]
        }
    }

    return serializable
}

const convertSquaddieActionResultTreatToSerializable = (
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
            serializable.treat.treatedConditions[key] = [...value]
        }
    }

    return serializable
}

const convertSquaddieActionResultMovementToSerializable = (
    result: SquaddieActionResult,
    serializable: SerializableSquaddieActionResult
): SerializableSquaddieActionResult => {
    if (!result.movement) return serializable

    serializable.movement = {
        expectedPath: {
            steps: result.movement.expectedPath.steps.map((step) => ({
                row: step.row,
                col: step.col,
                moveType: step.moveType,
                moveCost: step.moveCost,
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

const throwIfEntryIsUndefined = (
    entry: SquaddieTurnActionRecord,
    callName: string
) => {
    if (entry == undefined)
        throw new Error(
            `[ActionHistoryEntryService.${callName}]: entry must be defined`
        )
}

const throwIfActionDataIsInvalid = (
    action: { id: string; name: string },
    callName: string
) => {
    if (action?.id == undefined || action?.name == undefined)
        throw new Error(
            `[ActionHistoryEntryService.${callName}]: action must have id and name`
        )
}

const throwIfResultIsInvalid = (
    result: SquaddieActionResult | SerializableSquaddieActionResult,
    callName: string
) => {
    if (
        result?.inBattleSquaddieId == undefined ||
        result?.outOfBattleSquaddieId == undefined
    )
        throw new Error(
            `[ActionHistoryEntryService.${callName}]: result must have squaddie IDs`
        )
}
