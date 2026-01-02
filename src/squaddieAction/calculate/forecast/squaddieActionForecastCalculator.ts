import type { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager"
import type { SquaddieActionManager } from "../../squaddieActionManager"
import type { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager"
import type { SquaddieActionDecisions } from "../result/squaddieActionResultCalculator"
import {
    DegreeOfSuccess,
    type TDegreeOfSuccess,
} from "../../../degreesOfSuccess/degreeOfSuccess"
import { SquaddieIdConverterService } from "../../../squaddie/idConverterService"
import { ProbabilityLookup } from "../probabilityLookup"
import { ProficiencyCalculator } from "../proficiencyCalculator"

export const SquaddieActionForecastCalculator = {
    forecastChanceToHit: ({
        actor,
        targets,
        action,
        inBattleSquaddieManager,
    }: {
        inBattleSquaddieManager: InBattleSquaddieManager
        actor: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
        targets: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }[]
        action: {
            id: string
            manager: SquaddieActionManager
            decisions?: SquaddieActionDecisions
        }
        map?: {
            mapId: string
            manager: CoordinateMapCollectionManager
        }
    }): Map<string, number> => {
        const squaddieAction = action.manager.get(action.id)
        const actorProficiencyBonus =
            ProficiencyCalculator.getActorProficiencyBonus({
                actor,
                squaddieAction,
                inBattleSquaddieManager,
            })

        const chances = new Map<string, number>([])

        for (const target of targets) {
            const targetDefensiveBonus =
                ProficiencyCalculator.getTargetDefensiveBonus({
                    target,
                    squaddieAction,
                    inBattleSquaddieManager,
                })

            const modifier = ProficiencyCalculator.calculateModifierDifference({
                actorBonus: actorProficiencyBonus,
                targetDefensiveBonus,
            })
            const rawProbabilities =
                ProbabilityLookup.calculateChanceOfDegreeOfSuccessBasedOnSuccessBonus(
                    modifier
                )

            const probabilities = redistributeProbabilities({
                probabilities: rawProbabilities,
                supportedDegrees: squaddieAction.degreesOfSuccess,
            })

            for (const [degreeOfSuccess, probability] of probabilities) {
                const forecastKey = getForecastKey({
                    degreeOfSuccess,
                    ...target,
                })
                chances.set(forecastKey, probability)
            }
        }
        return chances
    },
    getForecastKey: ({
        inBattleSquaddieId,
        outOfBattleSquaddieId,
        degreeOfSuccess,
    }: {
        inBattleSquaddieId: number
        outOfBattleSquaddieId: string
        degreeOfSuccess: TDegreeOfSuccess
    }): string =>
        getForecastKey({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
            degreeOfSuccess,
        }),
}

const getForecastKey = ({
    inBattleSquaddieId,
    outOfBattleSquaddieId,
    degreeOfSuccess,
}: {
    inBattleSquaddieId: number
    outOfBattleSquaddieId: string
    degreeOfSuccess: TDegreeOfSuccess
}): string =>
    `${SquaddieIdConverterService.squaddieIdToKey({ inBattleSquaddieId, outOfBattleSquaddieId })}+++${degreeOfSuccess}`

const redistributeProbabilities = ({
    probabilities,
    supportedDegrees,
}: {
    probabilities: Map<TDegreeOfSuccess, number>
    supportedDegrees: TDegreeOfSuccess[]
}): Map<TDegreeOfSuccess, number> => {
    const redistributedProbabilities = new Map<TDegreeOfSuccess, number>()

    let criticalChance = probabilities.get(DegreeOfSuccess.CRITICAL) ?? 0
    let successChance = probabilities.get(DegreeOfSuccess.SUCCESS) ?? 0
    let failureChance = probabilities.get(DegreeOfSuccess.FAILURE) ?? 0
    let botchChance = probabilities.get(DegreeOfSuccess.BOTCH) ?? 0

    if (!supportedDegrees.includes(DegreeOfSuccess.CRITICAL)) {
        successChance += criticalChance
        criticalChance = 0
    }

    if (!supportedDegrees.includes(DegreeOfSuccess.BOTCH)) {
        failureChance += botchChance
        botchChance = 0
    }

    if (!supportedDegrees.includes(DegreeOfSuccess.FAILURE)) {
        successChance += failureChance
        failureChance = 0
    }

    for (const degree of supportedDegrees) {
        if (degree === DegreeOfSuccess.CRITICAL) {
            redistributedProbabilities.set(degree, criticalChance)
        } else if (degree === DegreeOfSuccess.SUCCESS) {
            redistributedProbabilities.set(degree, successChance)
        } else if (degree === DegreeOfSuccess.FAILURE) {
            redistributedProbabilities.set(degree, failureChance)
        } else if (degree === DegreeOfSuccess.BOTCH) {
            redistributedProbabilities.set(degree, botchChance)
        }
    }

    return redistributedProbabilities
}
