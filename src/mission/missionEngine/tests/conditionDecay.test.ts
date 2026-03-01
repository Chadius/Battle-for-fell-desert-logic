import { describe, expect, it } from "vitest"
import { MissionAffiliationTurn } from "../../missionTurn"
import { MissionEngineTestHarness } from "../../../testUtils/mission/missionEngineTestHarness"
import {
    SquaddieConditionService,
    SquaddieConditionType,
} from "../../../proficiency/squaddieCondition"

function advanceHarnessToPlayerTurn(harness: MissionEngineTestHarness): void {
    harness.transitionToNextPhase()
    harness.transitionToNextPhase()
}

describe("conditionDecay", () => {
    describe("removes a condition when its duration reaches zero", () => {
        it("ARMOR with duration 1 is gone after player turn ends", () => {
            const harness = new MissionEngineTestHarness()
            advanceHarnessToPlayerTurn(harness)
            const liniId = harness.getLiniSquaddieId()

            harness.missionManager!.inBattleSquaddieManager!.addConditionsToSquaddie(
                {
                    ...liniId,
                    conditions: [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.ARMOR,
                            amount: 2,
                            duration: 1,
                        }),
                    ],
                }
            )

            harness.endSquaddieTurn(liniId)

            const conditionAmount =
                harness.missionManager!.inBattleSquaddieManager!.calculateConditionAmountForSquaddie(
                    {
                        ...liniId,
                        conditionType: SquaddieConditionType.ARMOR,
                    }
                )
            expect(conditionAmount).toBe(0)
        })
    })

    describe("reduces condition duration by one after one turn cycle", () => {
        it("ARMOR with duration 2 has duration 1 after player turn ends", () => {
            const harness = new MissionEngineTestHarness()
            advanceHarnessToPlayerTurn(harness)
            const liniId = harness.getLiniSquaddieId()

            harness.missionManager!.inBattleSquaddieManager!.addConditionsToSquaddie(
                {
                    ...liniId,
                    conditions: [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.ARMOR,
                            amount: 2,
                            duration: 2,
                        }),
                    ],
                }
            )

            harness.endSquaddieTurn(liniId)

            const activeConditions =
                harness.missionManager!.inBattleSquaddieManager!.getSquaddieConditions(
                    liniId
                )
            const armorConditions = activeConditions.get(
                SquaddieConditionType.ARMOR
            )
            expect(armorConditions).toBeDefined()
            expect(armorConditions![0].limit.duration).toBe(1)
        })
    })

    describe("does not decay a permanent condition", () => {
        it("ARMOR with undefined duration is unchanged after player turn ends", () => {
            const harness = new MissionEngineTestHarness()
            advanceHarnessToPlayerTurn(harness)
            const liniId = harness.getLiniSquaddieId()

            harness.missionManager!.inBattleSquaddieManager!.addConditionsToSquaddie(
                {
                    ...liniId,
                    conditions: [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.ARMOR,
                            amount: 2,
                            duration: undefined,
                        }),
                    ],
                }
            )

            harness.endSquaddieTurn(liniId)

            const conditionAmount =
                harness.missionManager!.inBattleSquaddieManager!.calculateConditionAmountForSquaddie(
                    {
                        ...liniId,
                        conditionType: SquaddieConditionType.ARMOR,
                    }
                )
            expect(conditionAmount).toBe(2)
        })
    })

    describe("transitionToNextPhase returns expired conditions in dispel results", () => {
        it("includes the expired ARMOR condition in the SerializedSquaddieActionResult when transitioning out of PLAYER_TURN_END", () => {
            const harness = new MissionEngineTestHarness()
            advanceHarnessToPlayerTurn(harness)
            const liniId = harness.getLiniSquaddieId()

            harness.missionManager!.inBattleSquaddieManager!.addConditionsToSquaddie(
                {
                    ...liniId,
                    conditions: [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.ARMOR,
                            amount: 2,
                            duration: 1,
                        }),
                    ],
                }
            )

            harness.endSquaddieTurn(liniId)

            const summary = harness.getInMissionSummary()
            expect(summary.recentPhaseTransitions).toContain(
                MissionAffiliationTurn.PLAYER_TURN_END
            )

            const conditionAmount =
                harness.missionManager!.inBattleSquaddieManager!.calculateConditionAmountForSquaddie(
                    {
                        ...liniId,
                        conditionType: SquaddieConditionType.ARMOR,
                    }
                )
            expect(conditionAmount).toBe(0)
        })
    })

    describe("decays conditions for the correct affiliation only", () => {
        it("PLAYER ARMOR expires while ENEMY ARMOR is unaffected after player turn ends", () => {
            const harness = new MissionEngineTestHarness()
            advanceHarnessToPlayerTurn(harness)
            const liniId = harness.getLiniSquaddieId()
            const slitherDemonId = harness.getSlitherDemonSquaddieId()

            harness.missionManager!.inBattleSquaddieManager!.addConditionsToSquaddie(
                {
                    ...liniId,
                    conditions: [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.ARMOR,
                            amount: 2,
                            duration: 1,
                        }),
                    ],
                }
            )
            harness.missionManager!.inBattleSquaddieManager!.addConditionsToSquaddie(
                {
                    ...slitherDemonId,
                    conditions: [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.ARMOR,
                            amount: 2,
                            duration: 1,
                        }),
                    ],
                }
            )

            harness.endSquaddieTurn(liniId)

            const liniArmorAmount =
                harness.missionManager!.inBattleSquaddieManager!.calculateConditionAmountForSquaddie(
                    {
                        ...liniId,
                        conditionType: SquaddieConditionType.ARMOR,
                    }
                )
            expect(liniArmorAmount).toBe(0)

            const demonArmorAmount =
                harness.missionManager!.inBattleSquaddieManager!.calculateConditionAmountForSquaddie(
                    {
                        ...slitherDemonId,
                        conditionType: SquaddieConditionType.ARMOR,
                    }
                )
            expect(demonArmorAmount).toBe(2)
        })
    })
})
