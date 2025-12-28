import type { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager.ts"
import type { SquaddieActionManager } from "../../squaddieActionManager.ts"
import type { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager.ts"
import type { SquaddieActionDecisions } from "../result/squaddieActionResultCalculator.ts"
import {
    DegreeOfSuccess,
    type TDegreeOfSuccess,
} from "../../../degreesOfSuccess/degreeOfSuccess.ts"

export const SquaddieActionForecastCalculator = {
    forecastChanceToHit: ({
        actor,
        targets,
        action,
        inBattleSquaddieManager,
        map,
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
        const chances = new Map<string, number>([])
        chances.set(
            getForecastKey({
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                ...actor,
            }),
            36
        )
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
    `${outOfBattleSquaddieId}+++${inBattleSquaddieId}+++${degreeOfSuccess}`
