import type { TSquaddieAffiliation } from "../affiliation/affiliation"
import { SquaddieAffiliation } from "../affiliation/affiliation"
import type { BattleSquaddieId } from "../squaddie/inBattle/inBattleSquaddieManager"
import { SquaddieIdConverterService } from "../squaddie/idConverterService"

export const TurnControllerType = {
    HUMAN: "HUMAN",
    AI: "AI",
} as const
export type TTurnControllerType =
    (typeof TurnControllerType)[keyof typeof TurnControllerType]

const defaultControllerTypeByAffiliation: Record<
    TSquaddieAffiliation,
    TTurnControllerType
> = {
    [SquaddieAffiliation.PLAYER]: TurnControllerType.HUMAN,
    [SquaddieAffiliation.ALLY]: TurnControllerType.AI,
    [SquaddieAffiliation.ENEMY]: TurnControllerType.AI,
    [SquaddieAffiliation.NONE]: TurnControllerType.AI,
}

export const TurnControllerService = {
    getControllerTypeForSquaddie({
        battleSquaddieId,
        affiliation,
        squaddieOverrides,
        affiliationOverrides,
    }: {
        battleSquaddieId: BattleSquaddieId
        affiliation: TSquaddieAffiliation
        squaddieOverrides?: Record<string, TTurnControllerType>
        affiliationOverrides?: Partial<
            Record<TSquaddieAffiliation, TTurnControllerType>
        >
    }): TTurnControllerType {
        if (squaddieOverrides != undefined) {
            const squaddieKey =
                SquaddieIdConverterService.squaddieIdToKey(battleSquaddieId)
            if (squaddieKey in squaddieOverrides) {
                return squaddieOverrides[squaddieKey]
            }
        }

        return (
            affiliationOverrides?.[affiliation] ??
            defaultControllerTypeByAffiliation[affiliation]
        )
    },
}
