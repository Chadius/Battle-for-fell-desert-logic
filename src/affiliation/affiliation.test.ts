import { describe, expect, it } from "vitest"
import {
    SquaddieAffiliation,
    SquaddieAffiliationService,
} from "./affiliation.js"

describe("Squaddie Affiliation", () => {
    const friendTests = [
        {
            actor: SquaddieAffiliation.PLAYER,
            target: SquaddieAffiliation.PLAYER,
        },
        {
            actor: SquaddieAffiliation.PLAYER,
            target: SquaddieAffiliation.ALLY,
        },
        {
            actor: SquaddieAffiliation.ALLY,
            target: SquaddieAffiliation.PLAYER,
        },
        {
            actor: SquaddieAffiliation.ALLY,
            target: SquaddieAffiliation.ALLY,
        },
        {
            actor: SquaddieAffiliation.ENEMY,
            target: SquaddieAffiliation.ENEMY,
        },
    ]
    it.each(friendTests)(
        "$actor and $target are friends",
        ({ actor, target }) => {
            expect(
                SquaddieAffiliationService.areFriends({ actor, target })
            ).toBeTruthy()
        }
    )

    const enemyTests = [
        {
            actor: SquaddieAffiliation.PLAYER,
            target: SquaddieAffiliation.ENEMY,
        },
        {
            actor: SquaddieAffiliation.PLAYER,
            target: SquaddieAffiliation.NONE,
        },
        {
            actor: SquaddieAffiliation.ALLY,
            target: SquaddieAffiliation.ENEMY,
        },
        {
            actor: SquaddieAffiliation.ALLY,
            target: SquaddieAffiliation.NONE,
        },
        {
            actor: SquaddieAffiliation.ENEMY,
            target: SquaddieAffiliation.NONE,
        },
        {
            actor: SquaddieAffiliation.NONE,
            target: SquaddieAffiliation.NONE,
        },
        {
            actor: SquaddieAffiliation.NONE,
            target: SquaddieAffiliation.PLAYER,
        },
        {
            actor: SquaddieAffiliation.NONE,
            target: SquaddieAffiliation.ALLY,
        },
        {
            actor: SquaddieAffiliation.NONE,
            target: SquaddieAffiliation.ENEMY,
        },
    ]
    it.each(enemyTests)(
        "$actor and $target are enemies",
        ({ actor, target }) => {
            expect(
                SquaddieAffiliationService.areFriends({ actor, target })
            ).toBeFalsy()
        }
    )
})
