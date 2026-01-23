import type { SquaddieActionDecisions } from "../squaddieAction/calculate/result/squaddieActionResultCalculator"

export interface ReadiedAction {
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
        decisions?: SquaddieActionDecisions
    }
}

export type SerializedReadiedAction = ReadiedAction

export const ReadiedActionService = {
    new: ({ actor, targets, action }: ReadiedAction): ReadiedAction => {
        return {
            actor: { ...actor },
            action: {
                id: action.id,
                decisions: { ...action.decisions },
            },
            targets: targets.map((t) => ({ ...t })),
        }
    },
    serialize: (readiedAction: ReadiedAction): SerializedReadiedAction => {
        return ReadiedActionService.new(readiedAction)
    },
    deserialize: (
        serialized: SerializedReadiedAction
    ): SerializedReadiedAction => {
        return ReadiedActionService.new(serialized)
    },
}
