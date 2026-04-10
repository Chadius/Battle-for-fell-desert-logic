import { beforeEach, describe, expect, it } from "vitest"
import { MissionAffiliationTurn } from "../../missionTurn"
import { MissionEngineTestHarness } from "../../../testUtils/mission/missionEngineTestHarness"
import {
    SquaddieConditionDecaysAt,
    SquaddieConditionService,
    SquaddieConditionSource,
    SquaddieConditionType,
    type TSquaddieConditionDecaysAt,
} from "../../../proficiency/squaddieCondition"
import type { SerializedSquaddieActionResult } from "../../../squaddieAction/calculate/result/squaddieActionResult"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId"

function advanceHarnessToPlayerTurn(harness: MissionEngineTestHarness): void {
    harness.transitionToNextPhase()
    harness.transitionToNextPhase()
}

describe("conditionDecay", () => {
    let harness: MissionEngineTestHarness
    let liniId: BattleSquaddieId
    let slitherDemonId: BattleSquaddieId

    beforeEach(() => {
        harness = new MissionEngineTestHarness()
        liniId = harness.getLiniSquaddieId()
        slitherDemonId = harness.getSlitherDemonSquaddieId()
    })

    const addArmorCondition = (
        squaddieId: BattleSquaddieId,
        duration:
            | { duration: number; decaysAt: TSquaddieConditionDecaysAt }
            | undefined,
        amount: number
    ) =>
        harness.missionManager!.inBattleSquaddieManager!.addConditionsToSquaddie(
            {
                ...squaddieId,
                conditions: [
                    SquaddieConditionService.new({
                        type: SquaddieConditionType.ARMOR,
                        amount,
                        duration,
                        source: SquaddieConditionSource.PHYSICAL,
                    }),
                ],
            }
        )

    const getArmorAmount = (squaddieId: BattleSquaddieId) =>
        harness.missionManager!.inBattleSquaddieManager!.calculateConditionAmountForSquaddie(
            {
                ...squaddieId,
                conditionType: SquaddieConditionType.ARMOR,
            }
        )

    describe("removes a condition when its duration reaches zero", () => {
        it("ARMOR with duration 1 is gone after player turn ends", () => {
            advanceHarnessToPlayerTurn(harness)

            addArmorCondition(
                liniId,
                { duration: 1, decaysAt: SquaddieConditionDecaysAt.TURN_END },
                2
            )

            harness.endSquaddieTurn(liniId)

            expect(getArmorAmount(liniId)).toBe(0)
        })
    })

    describe("reduces condition duration by one after one turn cycle", () => {
        it("ARMOR with duration 2 has duration 1 after player turn ends", () => {
            advanceHarnessToPlayerTurn(harness)

            addArmorCondition(
                liniId,
                { duration: 2, decaysAt: SquaddieConditionDecaysAt.TURN_END },
                2
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
            expect(armorConditions![0].limit.duration).toEqual({
                duration: 1,
                decaysAt: SquaddieConditionDecaysAt.TURN_END,
            })
        })
    })

    describe("does not decay a permanent condition", () => {
        it("ARMOR with undefined duration is unchanged after player turn ends", () => {
            advanceHarnessToPlayerTurn(harness)

            addArmorCondition(liniId, undefined, 2)

            harness.endSquaddieTurn(liniId)

            expect(getArmorAmount(liniId)).toBe(2)
        })
    })

    describe("transitionToNextPhase returns expired conditions in dispel results", () => {
        it("includes the expired ARMOR condition in the SerializedSquaddieActionResult when transitioning out of PLAYER_TURN_END", () => {
            advanceHarnessToPlayerTurn(harness)

            addArmorCondition(
                liniId,
                { duration: 1, decaysAt: SquaddieConditionDecaysAt.TURN_END },
                2
            )

            harness.endSquaddieTurn(liniId)

            const summary = harness.getInMissionSummary()
            expect(summary.recentPhaseTransitions).toContain(
                MissionAffiliationTurn.PLAYER_TURN_END
            )

            expect(getArmorAmount(liniId)).toBe(0)
        })
    })

    describe("TURN_START decay timing", () => {
        it("a TURN_START condition is not removed after PLAYER_TURN_END but is removed after the next PLAYER_TURN_START", () => {
            advanceHarnessToPlayerTurn(harness)

            addArmorCondition(
                liniId,
                { duration: 1, decaysAt: SquaddieConditionDecaysAt.TURN_START },
                2
            )

            harness.endSquaddieTurn(liniId)

            expect(getArmorAmount(liniId)).toBe(2)

            harness.endSquaddieTurn(slitherDemonId)

            expect(getArmorAmount(liniId)).toBe(0)
        })

        it("a TURN_END condition survives PLAYER_TURN_START and decays only at PLAYER_TURN_END", () => {
            advanceHarnessToPlayerTurn(harness)

            addArmorCondition(
                liniId,
                { duration: 1, decaysAt: SquaddieConditionDecaysAt.TURN_END },
                2
            )

            harness.endSquaddieTurn(liniId)

            expect(getArmorAmount(liniId)).toBe(0)

            harness.endSquaddieTurn(slitherDemonId)

            expect(getArmorAmount(liniId)).toBe(0)
        })
    })

    describe("getRecentTransitionResults reflects condition decay from manual transitionToNextPhase", () => {
        it("includes the expired ARMOR condition in recentTransitionResults when manually transitioning out of PLAYER_TURN_START", () => {
            harness.transitionToNextPhase()

            addArmorCondition(
                liniId,
                { duration: 1, decaysAt: SquaddieConditionDecaysAt.TURN_START },
                2
            )

            harness.transitionToNextPhase()

            const recentResults: SerializedSquaddieActionResult[] =
                harness.getRecentTransitionResults()
            expect(recentResults.length).toBeGreaterThan(0)

            const dispelResult = recentResults.find(
                (r) => r.dispel != undefined
            )
            expect(dispelResult).toBeDefined()
            expect(
                dispelResult!.dispel!.dispelledConditions![
                    SquaddieConditionType.ARMOR
                ]
            ).toBeDefined()

            const summary = harness.getInMissionSummary()
            expect(summary.recentPhaseTransitions).toContain(
                MissionAffiliationTurn.PLAYER_TURN
            )
        })
    })

    describe("decays conditions for the correct affiliation only", () => {
        it("PLAYER ARMOR expires while ENEMY ARMOR is unaffected after player turn ends", () => {
            advanceHarnessToPlayerTurn(harness)

            addArmorCondition(
                liniId,
                { duration: 1, decaysAt: SquaddieConditionDecaysAt.TURN_END },
                2
            )
            addArmorCondition(
                slitherDemonId,
                { duration: 1, decaysAt: SquaddieConditionDecaysAt.TURN_END },
                2
            )

            harness.endSquaddieTurn(liniId)

            expect(getArmorAmount(liniId)).toBe(0)
            expect(getArmorAmount(slitherDemonId)).toBe(2)
        })
    })
})
