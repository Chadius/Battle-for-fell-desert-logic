import { z } from "zod"
import type { EnumLike } from "../enum.js"
import type { TSquaddieAffiliation } from "../affiliation/affiliation.js"
import { SquaddieIdConverterService } from "../squaddie/idConverterService.js"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager.js"
import type { BattleSquaddieId } from "../squaddie/inBattle/battleSquaddieId.js"
import { SquaddieConditionService } from "../proficiency/squaddieCondition.js"
import type { SquaddieActionResult } from "../squaddieAction/calculate/result/squaddieActionResult.js"
import type { ActionResult } from "./actionResult.js"
import {
    type MissionTurn,
    MissionTurnService,
    type TMissionAffiliationTurn,
} from "./missionTurn.js"

export const MissionObjectiveCriteriaType = {
    ALL_SQUADDIES_DEFEATED: "ALL_SQUADDIES_DEFEATED",
    SPECIFIC_SQUADDIES_INJURED: "SPECIFIC_SQUADDIES_INJURED",
    SPECIFIC_SQUADDIES_DEFEATED: "SPECIFIC_SQUADDIES_DEFEATED",
    PHASE_REACHED: "PHASE_REACHED",
} as const satisfies Record<string, string>

export type TMissionObjectiveCriteriaType = EnumLike<
    typeof MissionObjectiveCriteriaType
>

export interface AllSquaddiesDefeatedCriteria {
    type: typeof MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED
    affiliations?: Set<TSquaddieAffiliation>
    outOfBattleSquaddieIds?: Set<string>
    battleSquaddieIds?: Set<string>
}

export interface SpecificSquaddiesInjuredCriteria {
    type: typeof MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_INJURED
    battleSquaddieIds?: Set<string>
    outOfBattleSquaddieIds?: Set<string>
}

export interface SpecificSquaddiesDefeatedCriteria {
    type: typeof MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_DEFEATED
    battleSquaddieIds?: Set<string>
    outOfBattleSquaddieIds?: Set<string>
}

export interface PhaseReachedCriteria {
    type: typeof MissionObjectiveCriteriaType.PHASE_REACHED
    turnCount: number
    missionAffiliationTurn: TMissionAffiliationTurn
}

export type MissionObjectiveCriteria =
    | AllSquaddiesDefeatedCriteria
    | SpecificSquaddiesInjuredCriteria
    | SpecificSquaddiesDefeatedCriteria
    | PhaseReachedCriteria

const serializedBattleSquaddieIdSchema = z.object({
    inBattleSquaddieId: z.number(),
    outOfBattleSquaddieId: z.string().min(1),
})

const allSquaddiesDefeatedCriteriaSchema = z.object({
    type: z.literal(MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED),
    affiliations: z.array(z.string()).optional(),
    outOfBattleSquaddieIds: z.array(z.string()).optional(),
    battleSquaddieIds: z.array(serializedBattleSquaddieIdSchema).optional(),
})

const specificSquaddiesInjuredCriteriaSchema = z.object({
    type: z.literal(MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_INJURED),
    outOfBattleSquaddieIds: z.array(z.string()).optional(),
    battleSquaddieIds: z.array(serializedBattleSquaddieIdSchema).optional(),
})

const specificSquaddiesDefeatedCriteriaSchema = z.object({
    type: z.literal(MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_DEFEATED),
    outOfBattleSquaddieIds: z.array(z.string()).optional(),
    battleSquaddieIds: z.array(serializedBattleSquaddieIdSchema).optional(),
})

const phaseReachedCriteriaSchema = z.object({
    type: z.literal(MissionObjectiveCriteriaType.PHASE_REACHED),
    turnCount: z.number(),
    missionAffiliationTurn: z.string(),
})

export const missionObjectiveCriteriaSchema = z.discriminatedUnion("type", [
    allSquaddiesDefeatedCriteriaSchema,
    specificSquaddiesInjuredCriteriaSchema,
    specificSquaddiesDefeatedCriteriaSchema,
    phaseReachedCriteriaSchema,
])

export type SerializedMissionObjectiveCriteria = z.infer<
    typeof missionObjectiveCriteriaSchema
>

export interface MissionObjectiveCriteriaContext {
    actionResult?: ActionResult
    missionTurn?: MissionTurn
}

export const MissionObjectiveCriteriaService = {
    newAllSquaddiesDefeatedCriteria: ({
        affiliations,
        outOfBattleSquaddieIds,
        battleSquaddieIds,
    }: {
        affiliations?: TSquaddieAffiliation[]
        outOfBattleSquaddieIds?: string[]
        battleSquaddieIds?: BattleSquaddieId[]
    }): AllSquaddiesDefeatedCriteria => {
        const hasAffiliations =
            affiliations != undefined && affiliations.length > 0
        const hasOutOfBattleIds =
            outOfBattleSquaddieIds != undefined &&
            outOfBattleSquaddieIds.length > 0
        const hasBattleIds =
            battleSquaddieIds != undefined && battleSquaddieIds.length > 0

        if (!hasAffiliations && !hasOutOfBattleIds && !hasBattleIds) {
            throw new Error(
                "[MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria]: at least one filter must be provided"
            )
        }

        return {
            type: MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED,
            affiliations: hasAffiliations ? new Set(affiliations) : undefined,
            outOfBattleSquaddieIds: hasOutOfBattleIds
                ? new Set(outOfBattleSquaddieIds)
                : undefined,
            battleSquaddieIds: hasBattleIds
                ? new Set(
                      battleSquaddieIds.map((id) =>
                          SquaddieIdConverterService.squaddieIdToKey(id)
                      )
                  )
                : undefined,
        }
    },

    newSpecificSquaddiesInjuredCriteria: ({
        battleSquaddieIds,
        outOfBattleSquaddieIds,
    }: {
        battleSquaddieIds?: BattleSquaddieId[]
        outOfBattleSquaddieIds?: string[]
    }): SpecificSquaddiesInjuredCriteria => {
        const validation =
            MissionObjectiveCriteriaService.validateSpecificSquaddiesInjuredCriteriaInput(
                { battleSquaddieIds, outOfBattleSquaddieIds }
            )
        if (!validation.isValid) {
            throw new Error(
                `[MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria]: ${validation.reason}`
            )
        }

        const hasOutOfBattleIds =
            outOfBattleSquaddieIds != undefined &&
            outOfBattleSquaddieIds.length > 0
        const hasBattleIds =
            battleSquaddieIds != undefined && battleSquaddieIds.length > 0

        return {
            type: MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_INJURED,
            outOfBattleSquaddieIds: hasOutOfBattleIds
                ? new Set(outOfBattleSquaddieIds)
                : undefined,
            battleSquaddieIds: hasBattleIds
                ? new Set(
                      battleSquaddieIds.map((id) =>
                          SquaddieIdConverterService.squaddieIdToKey(id)
                      )
                  )
                : undefined,
        }
    },

    validateSpecificSquaddiesInjuredCriteriaInput: ({
        battleSquaddieIds,
        outOfBattleSquaddieIds,
    }: {
        battleSquaddieIds?: BattleSquaddieId[]
        outOfBattleSquaddieIds?: string[]
    }): { isValid: boolean; reason?: string } => {
        return validateSquaddieIdCriteriaInput({
            battleSquaddieIds,
            outOfBattleSquaddieIds,
        })
    },

    newSpecificSquaddiesDefeatedCriteria: ({
        battleSquaddieIds,
        outOfBattleSquaddieIds,
    }: {
        battleSquaddieIds?: BattleSquaddieId[]
        outOfBattleSquaddieIds?: string[]
    }): SpecificSquaddiesDefeatedCriteria => {
        const validation =
            MissionObjectiveCriteriaService.validateSpecificSquaddiesDefeatedCriteriaInput(
                { battleSquaddieIds, outOfBattleSquaddieIds }
            )
        if (!validation.isValid) {
            throw new Error(
                `[MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria]: ${validation.reason}`
            )
        }

        const hasOutOfBattleIds =
            outOfBattleSquaddieIds != undefined &&
            outOfBattleSquaddieIds.length > 0
        const hasBattleIds =
            battleSquaddieIds != undefined && battleSquaddieIds.length > 0

        return {
            type: MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_DEFEATED,
            outOfBattleSquaddieIds: hasOutOfBattleIds
                ? new Set(outOfBattleSquaddieIds)
                : undefined,
            battleSquaddieIds: hasBattleIds
                ? new Set(
                      battleSquaddieIds.map((id) =>
                          SquaddieIdConverterService.squaddieIdToKey(id)
                      )
                  )
                : undefined,
        }
    },

    validateSpecificSquaddiesDefeatedCriteriaInput: ({
        battleSquaddieIds,
        outOfBattleSquaddieIds,
    }: {
        battleSquaddieIds?: BattleSquaddieId[]
        outOfBattleSquaddieIds?: string[]
    }): { isValid: boolean; reason?: string } => {
        return validateSquaddieIdCriteriaInput({
            battleSquaddieIds,
            outOfBattleSquaddieIds,
        })
    },

    newPhaseReachedCriteria: ({
        turnCount,
        missionAffiliationTurn,
    }: {
        turnCount: number
        missionAffiliationTurn: TMissionAffiliationTurn
    }): PhaseReachedCriteria => {
        if (turnCount == undefined) {
            throw new Error(
                "[MissionObjectiveCriteriaService.newPhaseReachedCriteria]: turnCount is required"
            )
        }

        if (turnCount < 0) {
            throw new Error(
                "[MissionObjectiveCriteriaService.newPhaseReachedCriteria]: turnCount must be zero or greater"
            )
        }

        return {
            type: MissionObjectiveCriteriaType.PHASE_REACHED,
            turnCount,
            missionAffiliationTurn,
        }
    },

    serialize: (
        criteria: MissionObjectiveCriteria
    ): SerializedMissionObjectiveCriteria => {
        switch (criteria.type) {
            case MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED:
                return serializeMissionObjectiveCriteriaAllSquaddiesDefeated(
                    criteria
                )
            case MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_INJURED:
            case MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_DEFEATED:
                return serializeSquaddieIdFilterCriteria(criteria)
            case MissionObjectiveCriteriaType.PHASE_REACHED:
                return serializeMissionObjectiveCriteriaPhaseReached(criteria)
            default:
                throw new Error(
                    `[MissionObjectiveCriteriaService.serialize]: unknown criteria type`
                )
        }
    },

    createFromJSON: (data: {
        type: string
        affiliations?: string[]
        outOfBattleSquaddieIds?: string[]
        battleSquaddieIds?: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }[]
        turnCount?: number
        missionAffiliationTurn?: string
    }): MissionObjectiveCriteria => {
        switch (data.type) {
            case MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED:
                return MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {
                        affiliations:
                            data.affiliations as TSquaddieAffiliation[],
                        outOfBattleSquaddieIds: data.outOfBattleSquaddieIds,
                        battleSquaddieIds: data.battleSquaddieIds,
                    }
                )
            case MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_INJURED:
                return MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria(
                    {
                        outOfBattleSquaddieIds: data.outOfBattleSquaddieIds,
                        battleSquaddieIds: data.battleSquaddieIds,
                    }
                )
            case MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_DEFEATED:
                return MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                    {
                        outOfBattleSquaddieIds: data.outOfBattleSquaddieIds,
                        battleSquaddieIds: data.battleSquaddieIds,
                    }
                )
            case MissionObjectiveCriteriaType.PHASE_REACHED:
                if (data.turnCount === undefined) {
                    throw new Error(
                        "[MissionObjectiveCriteriaService.createFromJSON]: turnCount is required for PHASE_REACHED criteria"
                    )
                }
                return MissionObjectiveCriteriaService.newPhaseReachedCriteria({
                    turnCount: data.turnCount,
                    missionAffiliationTurn:
                        data.missionAffiliationTurn as TMissionAffiliationTurn,
                })
            default:
                throw new Error(
                    `[MissionObjectiveCriteriaService.createFromJSON]: invalid criteria type: ${data.type}`
                )
        }
    },

    isSatisfied: (
        criteria: MissionObjectiveCriteria,
        inBattleSquaddieManager: InBattleSquaddieManager,
        context?: MissionObjectiveCriteriaContext
    ): boolean => {
        switch (criteria.type) {
            case MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED:
                return isAllSquaddiesDefeatedSatisfied(
                    criteria,
                    inBattleSquaddieManager
                )
            case MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_INJURED:
                return isSpecificSquaddiesInjuredSatisfied(
                    criteria,
                    context?.actionResult
                )
            case MissionObjectiveCriteriaType.SPECIFIC_SQUADDIES_DEFEATED:
                return isSpecificSquaddiesDefeatedSatisfied(
                    criteria,
                    context?.actionResult
                )
            case MissionObjectiveCriteriaType.PHASE_REACHED:
                return isPhaseReachedSatisfied(criteria, context?.missionTurn)
            default:
                return false
        }
    },
}

const validateSquaddieIdCriteriaInput = ({
    battleSquaddieIds,
    outOfBattleSquaddieIds,
}: {
    battleSquaddieIds?: BattleSquaddieId[]
    outOfBattleSquaddieIds?: string[]
}): { isValid: boolean; reason?: string } => {
    const hasOutOfBattleIds =
        outOfBattleSquaddieIds != undefined && outOfBattleSquaddieIds.length > 0
    const hasBattleIds =
        battleSquaddieIds != undefined && battleSquaddieIds.length > 0

    if (!hasOutOfBattleIds && !hasBattleIds) {
        return {
            isValid: false,
            reason: "at least one of battleSquaddieIds or outOfBattleSquaddieIds must be provided with at least 1 member",
        }
    }

    return { isValid: true }
}

const squaddieMatchesIdSelection = (
    battleSquaddieId: string,
    outOfBattleSquaddieId: string,
    criteria: {
        battleSquaddieIds?: Set<string>
        outOfBattleSquaddieIds?: Set<string>
    }
): boolean => {
    if (
        criteria.outOfBattleSquaddieIds &&
        criteria.outOfBattleSquaddieIds.size > 0
    ) {
        if (!criteria.outOfBattleSquaddieIds.has(outOfBattleSquaddieId))
            return false
    }

    if (criteria.battleSquaddieIds && criteria.battleSquaddieIds.size > 0) {
        if (!criteria.battleSquaddieIds.has(battleSquaddieId)) return false
    }

    return true
}

const isAllSquaddiesDefeatedSatisfied = (
    criteria: AllSquaddiesDefeatedCriteria,
    inBattleSquaddieManager: InBattleSquaddieManager
): boolean => {
    const allSquaddies = inBattleSquaddieManager.getAllSquaddies()

    const matchingSquaddies = allSquaddies.filter((squaddie) => {
        if (criteria.affiliations && criteria.affiliations.size > 0) {
            const affiliation =
                inBattleSquaddieManager.getSquaddieAffiliation(squaddie)
            if (!criteria.affiliations.has(affiliation)) {
                return false
            }
        }

        const battleSquaddieId =
            SquaddieIdConverterService.squaddieIdToKey(squaddie)
        return squaddieMatchesIdSelection(
            battleSquaddieId,
            squaddie.outOfBattleSquaddieId,
            criteria
        )
    })

    if (matchingSquaddies.length === 0) {
        return false
    }

    return matchingSquaddies.every((squaddie) =>
        inBattleSquaddieManager.isSquaddieDefeated(squaddie)
    )
}

const squaddieWasInjuredByResult = (result: SquaddieActionResult): boolean => {
    const tookHPDamage =
        result.damage != undefined &&
        result.damage.net > 0 &&
        !result.damage.willKo

    const receivedHurtfulCondition = result.conditionsAdded?.some((condition) =>
        SquaddieConditionService.isHindering(condition)
    )

    return tookHPDamage || (receivedHurtfulCondition ?? false)
}

const anyTargetResultSatisfiesCriteria = (
    criteria: {
        battleSquaddieIds?: Set<string>
        outOfBattleSquaddieIds?: Set<string>
    },
    actionResult: ActionResult | undefined,
    predicate: (result: SquaddieActionResult) => boolean
): boolean => {
    if (actionResult == undefined) return false
    const actorSquaddieKey = actionResult.actorSquaddieKey
    for (const targetResult of Object.values(actionResult.targetResults)) {
        for (const result of targetResult.squaddieActionResults) {
            const squaddieKey = SquaddieIdConverterService.squaddieIdToKey({
                inBattleSquaddieId: result.inBattleSquaddieId,
                outOfBattleSquaddieId: result.outOfBattleSquaddieId,
            })
            if (squaddieKey === actorSquaddieKey) continue
            if (
                !squaddieMatchesIdSelection(
                    squaddieKey,
                    result.outOfBattleSquaddieId,
                    criteria
                )
            )
                continue
            if (predicate(result)) return true
        }
    }
    return false
}

const squaddieWasKOedByResult = (result: SquaddieActionResult): boolean => {
    return result.damage?.willKo === true
}

const isSpecificSquaddiesInjuredSatisfied = (
    criteria: SpecificSquaddiesInjuredCriteria,
    actionResult?: ActionResult
): boolean =>
    anyTargetResultSatisfiesCriteria(
        criteria,
        actionResult,
        squaddieWasInjuredByResult
    )

const isSpecificSquaddiesDefeatedSatisfied = (
    criteria: SpecificSquaddiesDefeatedCriteria,
    actionResult?: ActionResult
): boolean =>
    anyTargetResultSatisfiesCriteria(
        criteria,
        actionResult,
        squaddieWasKOedByResult
    )

const isPhaseReachedSatisfied = (
    criteria: PhaseReachedCriteria,
    missionTurn?: MissionTurn
): boolean => {
    if (missionTurn == undefined) return false

    if (missionTurn.turnCount !== criteria.turnCount) {
        return missionTurn.turnCount > criteria.turnCount
    }

    const currentPhaseOrder = MissionTurnService.getAffiliationTurnOrder(
        missionTurn.missionAffiliationTurn
    )
    const targetPhaseOrder = MissionTurnService.getAffiliationTurnOrder(
        criteria.missionAffiliationTurn
    )
    if (currentPhaseOrder === undefined || targetPhaseOrder === undefined)
        return false

    return currentPhaseOrder >= targetPhaseOrder
}

const serializeMissionObjectiveCriteriaAllSquaddiesDefeated = (
    criteria: AllSquaddiesDefeatedCriteria
) => {
    return {
        type: criteria.type,
        affiliations: criteria.affiliations
            ? [...criteria.affiliations]
            : undefined,
        outOfBattleSquaddieIds: criteria.outOfBattleSquaddieIds
            ? [...criteria.outOfBattleSquaddieIds]
            : undefined,
        battleSquaddieIds: criteria.battleSquaddieIds
            ? [...criteria.battleSquaddieIds].map((key) =>
                  SquaddieIdConverterService.keyToSquaddieId(key)
              )
            : undefined,
    }
}
const serializeSquaddieIdFilterCriteria = (
    criteria:
        | SpecificSquaddiesInjuredCriteria
        | SpecificSquaddiesDefeatedCriteria
) => {
    return {
        type: criteria.type,
        outOfBattleSquaddieIds: criteria.outOfBattleSquaddieIds
            ? [...criteria.outOfBattleSquaddieIds]
            : undefined,
        battleSquaddieIds: criteria.battleSquaddieIds
            ? [...criteria.battleSquaddieIds].map((key) =>
                  SquaddieIdConverterService.keyToSquaddieId(key)
              )
            : undefined,
    }
}

const serializeMissionObjectiveCriteriaPhaseReached = (
    criteria: PhaseReachedCriteria
) => {
    return {
        type: criteria.type,
        turnCount: criteria.turnCount,
        missionAffiliationTurn: criteria.missionAffiliationTurn,
    }
}
