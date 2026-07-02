import { z } from "zod"
import type { EnumLike } from "../enum"
import type { TSquaddieAffiliation } from "../affiliation/affiliation"
import { SquaddieIdConverterService } from "../squaddie/idConverterService"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import type { BattleSquaddieId } from "../squaddie/inBattle/battleSquaddieId"
import { SquaddieConditionService } from "../proficiency/squaddieCondition"
import type { SquaddieActionResult } from "../squaddieAction/calculate/result/squaddieActionResult"
import type { ActionResult } from "./actionResult"

export const MissionObjectiveCriteriaType = {
    ALL_SQUADDIES_DEFEATED: "ALL_SQUADDIES_DEFEATED",
    SPECIFIC_SQUADDIES_INJURED: "SPECIFIC_SQUADDIES_INJURED",
    SPECIFIC_SQUADDIES_DEFEATED: "SPECIFIC_SQUADDIES_DEFEATED",
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

export type MissionObjectiveCriteria =
    | AllSquaddiesDefeatedCriteria
    | SpecificSquaddiesInjuredCriteria
    | SpecificSquaddiesDefeatedCriteria

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

export const missionObjectiveCriteriaSchema = z.discriminatedUnion("type", [
    allSquaddiesDefeatedCriteriaSchema,
    specificSquaddiesInjuredCriteriaSchema,
    specificSquaddiesDefeatedCriteriaSchema,
])

export type SerializedMissionObjectiveCriteria = z.infer<
    typeof missionObjectiveCriteriaSchema
>

export interface MissionObjectiveCriteriaContext {
    actionResult?: ActionResult
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
