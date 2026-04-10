import type { EnumLike } from "../enum"
import type { TSquaddieAffiliation } from "../affiliation/affiliation"
import { SquaddieIdConverterService } from "../squaddie/idConverterService"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import type { BattleSquaddieId } from "../squaddie/inBattle/battleSquaddieId"

export const MissionObjectiveCriteriaType = {
    SQUADDIES_DEFEATED: "SQUADDIES_DEFEATED",
} as const satisfies Record<string, string>

export type TMissionObjectiveCriteriaType = EnumLike<
    typeof MissionObjectiveCriteriaType
>

export interface SquaddiesDefeatedCriteria {
    type: typeof MissionObjectiveCriteriaType.SQUADDIES_DEFEATED
    affiliations?: Set<TSquaddieAffiliation>
    outOfBattleSquaddieIds?: Set<string>
    battleSquaddieIds?: Set<string>
}

export type MissionObjectiveCriteria = SquaddiesDefeatedCriteria

export const MissionObjectiveCriteriaService = {
    newSquaddiesDefeatedCriteria: ({
        affiliations,
        outOfBattleSquaddieIds,
        battleSquaddieIds,
    }: {
        affiliations?: TSquaddieAffiliation[]
        outOfBattleSquaddieIds?: string[]
        battleSquaddieIds?: BattleSquaddieId[]
    }): SquaddiesDefeatedCriteria => {
        const hasAffiliations =
            affiliations != undefined && affiliations.length > 0
        const hasOutOfBattleIds =
            outOfBattleSquaddieIds != undefined &&
            outOfBattleSquaddieIds.length > 0
        const hasBattleIds =
            battleSquaddieIds != undefined && battleSquaddieIds.length > 0

        if (!hasAffiliations && !hasOutOfBattleIds && !hasBattleIds) {
            throw new Error(
                "[MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria]: at least one filter must be provided"
            )
        }

        return {
            type: MissionObjectiveCriteriaType.SQUADDIES_DEFEATED,
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

    createFromJSON: (data: {
        type: string
        affiliations?: string[]
        outOfBattleSquaddieIds?: string[]
        battleSquaddieIds?: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }[]
    }): MissionObjectiveCriteria => {
        if (data.type === MissionObjectiveCriteriaType.SQUADDIES_DEFEATED) {
            return MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                {
                    affiliations: data.affiliations as TSquaddieAffiliation[],
                    outOfBattleSquaddieIds: data.outOfBattleSquaddieIds,
                    battleSquaddieIds: data.battleSquaddieIds,
                }
            )
        }

        throw new Error(
            `[MissionObjectiveCriteriaService.createFromJSON]: invalid criteria type: ${data.type}`
        )
    },

    isSatisfied: (
        criteria: MissionObjectiveCriteria,
        inBattleSquaddieManager: InBattleSquaddieManager
    ): boolean => {
        if (criteria.type === MissionObjectiveCriteriaType.SQUADDIES_DEFEATED) {
            return isSquaddiesDefeatedSatisfied(
                criteria,
                inBattleSquaddieManager
            )
        }

        return false
    },
}

const isSquaddiesDefeatedSatisfied = (
    criteria: SquaddiesDefeatedCriteria,
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

        if (
            criteria.outOfBattleSquaddieIds &&
            criteria.outOfBattleSquaddieIds.size > 0
        ) {
            if (
                !criteria.outOfBattleSquaddieIds.has(
                    squaddie.outOfBattleSquaddieId
                )
            ) {
                return false
            }
        }

        if (criteria.battleSquaddieIds && criteria.battleSquaddieIds.size > 0) {
            const squaddieKey =
                SquaddieIdConverterService.squaddieIdToKey(squaddie)
            if (!criteria.battleSquaddieIds.has(squaddieKey)) {
                return false
            }
        }

        return true
    })

    if (matchingSquaddies.length === 0) {
        return false
    }

    return matchingSquaddies.every((battleSquaddieId) =>
        inBattleSquaddieManager.isSquaddieDefeated(battleSquaddieId)
    )
}
