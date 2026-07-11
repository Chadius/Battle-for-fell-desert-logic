import { beforeEach, describe, expect, it } from "vitest"
import {
    MissionEngineTestHarness,
    MissionEngineTestHarnessIds,
} from "../../../testUtils/mission/missionEngineTestHarness.js"
import { SquaddieActionService } from "../../../squaddieAction/squaddieAction.js"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"

describe("cooldownDecay", () => {
    let harness: MissionEngineTestHarness
    let liniId: BattleSquaddieId

    beforeEach(() => {
        harness = new MissionEngineTestHarness()
        liniId = harness.getLiniSquaddieId()
    })

    describe("when a squaddie has an action on cooldown with 2 turns remaining", () => {
        beforeEach(() => {
            harness.advanceToPlayerTurn()
            harness.putActionOnCooldown(
                liniId,
                SquaddieActionService.new({
                    id: "freeze-blast",
                    name: "Freeze Blast",
                    cooldownTurns: 2,
                    effectOnActor: {
                        [DegreeOfSuccess.SUCCESS]: {
                            actionPoints: { spent: 0 },
                        },
                    },
                })
            )
            harness.endSquaddieTurn(liniId)
        })

        it("decrements the cooldown to 1 after the player turn ends", () => {
            expect(
                harness.getActionCooldownRemainingForSquaddie(
                    liniId,
                    "freeze-blast"
                )
            ).toBe(1)
        })
    })

    describe("when a squaddie has an action on cooldown with 1 turn remaining", () => {
        beforeEach(() => {
            harness.advanceToPlayerTurn()
            harness.putActionOnCooldown(
                liniId,
                SquaddieActionService.new({
                    id: "freeze-blast",
                    name: "Freeze Blast",
                    cooldownTurns: 1,
                    effectOnActor: {
                        [DegreeOfSuccess.SUCCESS]: {
                            actionPoints: { spent: 0 },
                        },
                    },
                })
            )
            harness.endSquaddieTurn(liniId)
        })

        it("removes the cooldown after the player turn ends", () => {
            expect(
                harness.getActionCooldownRemainingForSquaddie(
                    liniId,
                    "freeze-blast"
                )
            ).toBeUndefined()
        })
    })

    describe("when a player uses an action with a 2-turn cooldown and a full round completes", () => {
        beforeEach(() => {
            harness.setDebugFlag("enemyAlwaysEndsTheirTurn", true)
            harness.advanceToPlayerTurn()
            harness.readyAction({
                actor: liniId,
                targets: [liniId],
                action: {
                    id: MissionEngineTestHarnessIds.lini.blessingActionId,
                },
            })
            harness.useActionAndGetResults()
            harness.endSquaddieTurn(liniId)
        })

        it("the cooldown is 1 — enemy turn end does not decrement player cooldowns", () => {
            expect(
                harness.getActionCooldownRemainingForSquaddie(
                    liniId,
                    MissionEngineTestHarnessIds.lini.blessingActionId
                )
            ).toBe(1)
        })
    })

    describe("when a player uses an action with a 2-turn cooldown and two full rounds complete", () => {
        beforeEach(() => {
            harness.setDebugFlag("enemyAlwaysEndsTheirTurn", true)
            harness.advanceToPlayerTurn()
            harness.readyAction({
                actor: liniId,
                targets: [liniId],
                action: {
                    id: MissionEngineTestHarnessIds.lini.blessingActionId,
                },
            })
            harness.useActionAndGetResults()
            harness.endSquaddieTurn(liniId)
            harness.endSquaddieTurn(liniId)
        })

        it("the action is available again", () => {
            expect(
                harness.getActionCooldownRemainingForSquaddie(
                    liniId,
                    MissionEngineTestHarnessIds.lini.blessingActionId
                )
            ).toBeUndefined()
        })
    })

    describe("when an action with a cooldown is used", () => {
        beforeEach(() => {
            harness.setDebugFlag("enemyAlwaysEndsTheirTurn", true)
            harness.advanceToPlayerTurn()
            harness.readyAction({
                actor: liniId,
                targets: [liniId],
                action: {
                    id: MissionEngineTestHarnessIds.lini.blessingActionId,
                },
            })
            harness.useActionAndGetResults()
        })

        it("the action is on cooldown for the specified number of turns", () => {
            expect(
                harness.getActionCooldownRemainingForSquaddie(
                    liniId,
                    MissionEngineTestHarnessIds.lini.blessingActionId
                )
            ).toBe(2)
        })
    })
})
