import type { EnumLike } from "../enum"

export const MissionAffiliationTurn = {
    TURN_START: "TURN_START",
    PLAYER_TURN_START: "PLAYER_TURN_START",
    PLAYER_TURN: "PLAYER_TURN",
    PLAYER_TURN_END: "PLAYER_TURN_END",
    ALLY_TURN_START: "ALLY_TURN_START",
    ALLY_TURN: "ALLY_TURN",
    ALLY_TURN_END: "ALLY_TURN_END",
    ENEMY_TURN_START: "ENEMY_TURN_START",
    ENEMY_TURN: "ENEMY_TURN",
    ENEMY_TURN_END: "ENEMY_TURN_END",
    NONE_AFFILIATION_TURN_START: "NONE_AFFILIATION_TURN_START",
    NONE_AFFILIATION_TURN: "NONE_AFFILIATION_TURN",
    NONE_AFFILIATION_TURN_END: "NONE_AFFILIATION_TURN_END",
    TURN_END: "TURN_END",
} as const satisfies Record<string, string>
export type TMissionAffiliationTurn = EnumLike<typeof MissionAffiliationTurn>

export interface MissionTurn {
    turnCount: number
    missionAffiliationTurn: TMissionAffiliationTurn
}

export const MissionTurnService = {
    new: ({
        turnCount = 0,
        missionAffiliationTurn = MissionAffiliationTurn.TURN_START,
    }: {
        turnCount?: number
        missionAffiliationTurn?: TMissionAffiliationTurn
    } = {}): MissionTurn => {
        return {
            turnCount,
            missionAffiliationTurn,
        }
    },
}
