import type { EnumLike } from "../enum"

export const SquaddieAffiliation = {
    PLAYER: "PLAYER",
    ENEMY: "ENEMY",
    ALLY: "ALLY",
    NONE: "NONE",
} as const satisfies Record<string, string>
export type TSquaddieAffiliation = EnumLike<typeof SquaddieAffiliation>

const friendlyAffiliations = {
    [SquaddieAffiliation.PLAYER]: new Set<TSquaddieAffiliation>([
        SquaddieAffiliation.PLAYER,
        SquaddieAffiliation.ALLY,
    ]),
    [SquaddieAffiliation.ALLY]: new Set<TSquaddieAffiliation>([
        SquaddieAffiliation.PLAYER,
        SquaddieAffiliation.ALLY,
    ]),
    [SquaddieAffiliation.ENEMY]: new Set<TSquaddieAffiliation>([
        SquaddieAffiliation.ENEMY,
    ]),
    [SquaddieAffiliation.NONE]: new Set<TSquaddieAffiliation>([]),
}

export const SquaddieAffiliationService = {
    areFriends: ({
        actor,
        target,
    }: {
        actor: TSquaddieAffiliation
        target: TSquaddieAffiliation
    }): boolean => {
        return friendlyAffiliations[actor].has(target)
    },
}
