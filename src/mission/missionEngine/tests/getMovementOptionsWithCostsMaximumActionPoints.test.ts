import { describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine.js"
import { MissionEngineTestHarness } from "../../../testUtils/mission/missionEngineTestHarness.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"
import {
    SquaddieConditionDecaysAt,
    SquaddieConditionService,
    SquaddieConditionSource,
    SquaddieConditionType,
} from "../../../proficiency/squaddieCondition.js"

const startPlayerTurn = () => {
    const harness = new MissionEngineTestHarness()
    const missionEngine = new MissionEngine(harness.missionManager)
    missionEngine.transitionToNextPhase()
    missionEngine.transitionToNextPhase()
    const slitherDemonId = harness.getSlitherDemonSquaddieId()
    return { harness, missionEngine, slitherDemonId }
}

const startPlayerTurnWithSpentEnemy = () => {
    const started = startPlayerTurn()
    started.harness.exhaustActionPoints(started.slitherDemonId)
    return started
}

const applySlowed = (
    harness: MissionEngineTestHarness,
    squaddieId: BattleSquaddieId,
    amount: number
) => {
    harness.missionManager!.inBattleSquaddieManager!.addConditionsToSquaddie({
        ...squaddieId,
        conditions: [
            SquaddieConditionService.new({
                type: SquaddieConditionType.SLOWED,
                amount: { amount },
                duration: {
                    duration: 2,
                    decaysAt: SquaddieConditionDecaysAt.TURN_END,
                },
                source: SquaddieConditionSource.PHYSICAL,
            }),
        ],
    })
}

const highestActionPointCost = (options: Array<{ actionPointCost: number }>) =>
    Math.max(...options.map((option) => option.actionPointCost))

describe("previewing the movement range of a squaddie whose turn it isn't", () => {
    describe("when the squaddie has already spent its action points", () => {
        it("offers no movement under the default query", () => {
            const { missionEngine, slitherDemonId } =
                startPlayerTurnWithSpentEnemy()

            const options =
                missionEngine.getMovementOptionsWithCosts(slitherDemonId)

            expect(options).toHaveLength(0)
        })

        it("offers movement up to its maximum action points under the maximum query", () => {
            const { missionEngine, slitherDemonId } =
                startPlayerTurnWithSpentEnemy()
            const maximumActionPoints =
                missionEngine.getSquaddieInfo(
                    slitherDemonId
                ).maximumActionPoints

            const options = missionEngine.getMovementOptionsWithCosts(
                slitherDemonId,
                { actionPoints: "maximum" }
            )

            expect(highestActionPointCost(options)).toBe(maximumActionPoints)
        })
    })

    describe("when explicitly asking for the current action-point budget", () => {
        it("matches the default query", () => {
            const { missionEngine, slitherDemonId } = startPlayerTurn()

            const explicitlyCurrent = missionEngine.getMovementOptionsWithCosts(
                slitherDemonId,
                { actionPoints: "current" }
            )

            expect(explicitlyCurrent).toEqual(
                missionEngine.getMovementOptionsWithCosts(slitherDemonId)
            )
        })
    })

    describe("when the squaddie is SLOWED", () => {
        it("previews the reach of its reduced maximum action points", () => {
            const { harness, missionEngine, slitherDemonId } =
                startPlayerTurnWithSpentEnemy()
            applySlowed(harness, slitherDemonId, 2)
            const slowedMaximumActionPoints =
                missionEngine.getSquaddieInfo(
                    slitherDemonId
                ).maximumActionPoints

            const options = missionEngine.getMovementOptionsWithCosts(
                slitherDemonId,
                { actionPoints: "maximum" }
            )

            expect(highestActionPointCost(options)).toBe(
                slowedMaximumActionPoints
            )
        })
    })
})
