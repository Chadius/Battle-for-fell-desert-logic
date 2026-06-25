import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngineTestHarness } from "../../../testUtils/mission/missionEngineTestHarness"
import { SquaddieActionService } from "../../../squaddieAction/squaddieAction"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId"

describe("cooldownDecay", () => {
    let harness: MissionEngineTestHarness
    let liniId: BattleSquaddieId

    beforeEach(() => {
        harness = new MissionEngineTestHarness()
        liniId = harness.getLiniSquaddieId()
    })

    describe("when a squaddie has an action on cooldown with 2 turns remaining", () => {
        it("decrements the cooldown to 1 after the player turn ends", () => {
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

            expect(
                harness.getActionCooldownRemainingForSquaddie(
                    liniId,
                    "freeze-blast"
                )
            ).toBe(1)
        })
    })

    describe("when a squaddie has an action on cooldown with 1 turn remaining", () => {
        it("removes the cooldown after the player turn ends", () => {
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

            expect(
                harness.getActionCooldownRemainingForSquaddie(
                    liniId,
                    "freeze-blast"
                )
            ).toBeUndefined()
        })
    })
})
