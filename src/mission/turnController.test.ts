import { describe, expect, it } from "vitest"
import { TurnControllerService, TurnControllerType } from "./turnController.js"
import { SquaddieAffiliation } from "../affiliation/affiliation.js"
import { SquaddieIdConverterService } from "../squaddie/idConverterService.js"
import type { BattleSquaddieId } from "../squaddie/inBattle/battleSquaddieId.js"

describe("TurnControllerService", () => {
    const playerSquaddieId: BattleSquaddieId = {
        outOfBattleSquaddieId: "player-1",
        inBattleSquaddieId: 1,
    }
    const enemySquaddieId: BattleSquaddieId = {
        outOfBattleSquaddieId: "enemy-1",
        inBattleSquaddieId: 2,
    }

    describe("hard defaults when no overrides are provided", () => {
        it("PLAYER squaddie defaults to HUMAN", () => {
            const result = TurnControllerService.getControllerTypeForSquaddie({
                battleSquaddieId: playerSquaddieId,
                affiliation: SquaddieAffiliation.PLAYER,
            })
            expect(result).toBe(TurnControllerType.HUMAN)
        })

        it("ENEMY squaddie defaults to AI", () => {
            const result = TurnControllerService.getControllerTypeForSquaddie({
                battleSquaddieId: enemySquaddieId,
                affiliation: SquaddieAffiliation.ENEMY,
            })
            expect(result).toBe(TurnControllerType.AI)
        })

        it("ALLY squaddie defaults to AI", () => {
            const allySquaddieId: BattleSquaddieId = {
                outOfBattleSquaddieId: "ally-1",
                inBattleSquaddieId: 3,
            }
            const result = TurnControllerService.getControllerTypeForSquaddie({
                battleSquaddieId: allySquaddieId,
                affiliation: SquaddieAffiliation.ALLY,
            })
            expect(result).toBe(TurnControllerType.AI)
        })

        it("NONE squaddie defaults to AI", () => {
            const noneSquaddieId: BattleSquaddieId = {
                outOfBattleSquaddieId: "none-1",
                inBattleSquaddieId: 4,
            }
            const result = TurnControllerService.getControllerTypeForSquaddie({
                battleSquaddieId: noneSquaddieId,
                affiliation: SquaddieAffiliation.NONE,
            })
            expect(result).toBe(TurnControllerType.AI)
        })
    })

    describe("affiliation override", () => {
        it("PLAYER affiliation overridden to AI (ML training scenario)", () => {
            const result = TurnControllerService.getControllerTypeForSquaddie({
                battleSquaddieId: playerSquaddieId,
                affiliation: SquaddieAffiliation.PLAYER,
                affiliationOverrides: {
                    [SquaddieAffiliation.PLAYER]: TurnControllerType.AI,
                },
            })
            expect(result).toBe(TurnControllerType.AI)
        })

        it("ENEMY affiliation overridden to HUMAN (debug scenario)", () => {
            const result = TurnControllerService.getControllerTypeForSquaddie({
                battleSquaddieId: enemySquaddieId,
                affiliation: SquaddieAffiliation.ENEMY,
                affiliationOverrides: {
                    [SquaddieAffiliation.ENEMY]: TurnControllerType.HUMAN,
                },
            })
            expect(result).toBe(TurnControllerType.HUMAN)
        })
    })

    describe("squaddie override beats affiliation", () => {
        it("specific PLAYER squaddie overridden to AI while affiliation remains HUMAN", () => {
            const squaddieKey =
                SquaddieIdConverterService.squaddieIdToKey(playerSquaddieId)
            const result = TurnControllerService.getControllerTypeForSquaddie({
                battleSquaddieId: playerSquaddieId,
                affiliation: SquaddieAffiliation.PLAYER,
                squaddieOverrides: {
                    [squaddieKey]: TurnControllerType.AI,
                },
            })
            expect(result).toBe(TurnControllerType.AI)
        })

        it("specific ENEMY squaddie overridden to HUMAN while affiliation remains AI", () => {
            const squaddieKey =
                SquaddieIdConverterService.squaddieIdToKey(enemySquaddieId)
            const result = TurnControllerService.getControllerTypeForSquaddie({
                battleSquaddieId: enemySquaddieId,
                affiliation: SquaddieAffiliation.ENEMY,
                squaddieOverrides: {
                    [squaddieKey]: TurnControllerType.HUMAN,
                },
            })
            expect(result).toBe(TurnControllerType.HUMAN)
        })

        it("squaddie override takes priority over affiliation override", () => {
            const squaddieKey =
                SquaddieIdConverterService.squaddieIdToKey(playerSquaddieId)
            const result = TurnControllerService.getControllerTypeForSquaddie({
                battleSquaddieId: playerSquaddieId,
                affiliation: SquaddieAffiliation.PLAYER,
                affiliationOverrides: {
                    [SquaddieAffiliation.PLAYER]: TurnControllerType.AI,
                },
                squaddieOverrides: {
                    [squaddieKey]: TurnControllerType.HUMAN,
                },
            })
            expect(result).toBe(TurnControllerType.HUMAN)
        })
    })
})
