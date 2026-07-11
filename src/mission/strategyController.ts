import type { TSquaddieAffiliation } from "../affiliation/affiliation.js"
import type { BattleSquaddieId } from "../squaddie/inBattle/battleSquaddieId.js"
import { SquaddieIdConverterService } from "../squaddie/idConverterService.js"
import type { AiStrategy } from "./aiStrategy.js"

export interface StrategyControllerOverrides {
    byBattleSquaddieKey?: Record<string, AiStrategy>
    byOutOfBattleSquaddieId?: Record<string, AiStrategy>
    byAffiliation?: Partial<Record<TSquaddieAffiliation, AiStrategy>>
}

export const StrategyControllerService = {
    getStrategyForSquaddie({
        battleSquaddieId,
        affiliation,
        overrides,
    }: {
        battleSquaddieId: BattleSquaddieId
        affiliation: TSquaddieAffiliation
        overrides?: StrategyControllerOverrides
    }): AiStrategy | undefined {
        if (overrides == undefined) return undefined

        if (overrides.byBattleSquaddieKey != undefined) {
            const key =
                SquaddieIdConverterService.squaddieIdToKey(battleSquaddieId)
            if (key in overrides.byBattleSquaddieKey) {
                return overrides.byBattleSquaddieKey[key]
            }
        }

        if (overrides.byOutOfBattleSquaddieId != undefined) {
            const id = battleSquaddieId.outOfBattleSquaddieId
            if (id in overrides.byOutOfBattleSquaddieId) {
                return overrides.byOutOfBattleSquaddieId[id]
            }
        }

        return overrides.byAffiliation?.[affiliation]
    },
}
