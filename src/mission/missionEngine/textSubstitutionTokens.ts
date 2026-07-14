import type { EnumLike } from "../../enum.js"

const missionTextSubstitutionTokenNames = {
    TURN_COUNT: "{TURN_COUNT}",
    // Host-supplied via MissionEngine.getMovieStatus(extraTokens); the engine
    // has no frame loop, so it never computes a value for this token itself.
    TIME_ELAPSED: "{TIME_ELAPSED}",
    DAMAGE_DEALT_BY_PLAYER_TEAM: "{DAMAGE_DEALT_BY_PLAYER_TEAM}",
    DAMAGE_TAKEN_BY_PLAYER_TEAM: "{DAMAGE_TAKEN_BY_PLAYER_TEAM}",
    DAMAGE_ABSORBED_BY_PLAYER_TEAM: "{DAMAGE_ABSORBED_BY_PLAYER_TEAM}",
    HEALING_RECEIVED_BY_PLAYER_TEAM: "{HEALING_RECEIVED_BY_PLAYER_TEAM}",
    CRITICAL_HITS_DEALT_BY_PLAYER_TEAM: "{CRITICAL_HITS_DEALT_BY_PLAYER_TEAM}",
    CRITICAL_HITS_TAKEN_BY_PLAYER_TEAM: "{CRITICAL_HITS_TAKEN_BY_PLAYER_TEAM}",
} as const satisfies Record<string, string>

export type TMissionTextSubstitutionToken = EnumLike<
    typeof missionTextSubstitutionTokenNames
>

export const MissionTextSubstitutionToken = {
    ...missionTextSubstitutionTokenNames,
    AVAILABLE: Object.values(
        missionTextSubstitutionTokenNames
    ) as readonly TMissionTextSubstitutionToken[],
}
