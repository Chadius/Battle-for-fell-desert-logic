import { beforeEach, describe, expect, it } from "vitest"
import {
    MissionEngineTestHarness,
    MissionEngineTestHarnessIds,
} from "../../../testUtils/mission/missionEngineTestHarness"
import { RollGenerator } from "../../../squaddieAction/calculate/roll/rollGenerator"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId"
import { SquaddieIdConverterService } from "../../../squaddie/idConverterService"
import type { ActionResult } from "../../actionResult"
import { ChallengeModifierType } from "../../../squaddieAction/calculate/challengeModifier/challengeModifierSetting"

const GUARANTEED_MISS: [number, number] = [1, 1]

function placeSlitherDemonAdjacentToLini(
    harness: MissionEngineTestHarness
): void {
    const demonId = harness.getSlitherDemonSquaddieId()
    const coordinateMapManager =
        harness.missionManager!.coordinateMapCollectionManager!
    coordinateMapManager.removeSquaddie({
        mapId: MissionEngineTestHarnessIds.mapId,
        squaddieId: demonId,
    })
    coordinateMapManager.addSquaddie({
        mapId: MissionEngineTestHarnessIds.mapId,
        squaddieId: demonId,
        coordinate: { row: 0, col: 1 },
    })
}

function getDemonTargetResult(
    results: ActionResult,
    demonId: BattleSquaddieId
) {
    return results.targetResults[
        SquaddieIdConverterService.squaddieIdToKey(demonId)
    ]
}

describe("Training Wheels challenge modifier — engine wiring", () => {
    it("has no challenge modifier setting by default", () => {
        const harness = new MissionEngineTestHarness()
        expect(harness.getChallengeModifierSetting()).toBeUndefined()
    })

    describe("setChallengeModifier", () => {
        it("enables the modifier when set to true", () => {
            const harness = new MissionEngineTestHarness()

            harness.setChallengeModifier(
                ChallengeModifierType.TRAINING_WHEELS,
                true
            )

            expect(
                harness.getChallengeModifierSetting()?.[
                    ChallengeModifierType.TRAINING_WHEELS
                ]
            ).toBe(true)
        })

        it("disables a previously enabled modifier when set to false", () => {
            const harness = new MissionEngineTestHarness()
            harness.setChallengeModifier(
                ChallengeModifierType.TRAINING_WHEELS,
                true
            )

            harness.setChallengeModifier(
                ChallengeModifierType.TRAINING_WHEELS,
                false
            )

            expect(
                harness.getChallengeModifierSetting()?.[
                    ChallengeModifierType.TRAINING_WHEELS
                ]
            ).toBe(false)
        })
    })

    describe("when Lini attacks the Slither Demon with a guaranteed-miss roll", () => {
        let harness: MissionEngineTestHarness
        let liniId: BattleSquaddieId
        let demonId: BattleSquaddieId

        beforeEach(() => {
            harness = new MissionEngineTestHarness(
                new RollGenerator(GUARANTEED_MISS)
            )
            placeSlitherDemonAdjacentToLini(harness)
            harness.advanceToPlayerTurn()
            liniId = harness.getLiniSquaddieId()
            demonId = harness.getSlitherDemonSquaddieId()
        })

        it("deals no damage when the modifier is off", () => {
            harness.readyAction({
                actor: liniId,
                targets: [demonId],
                action: {
                    id: MissionEngineTestHarnessIds.lini.scimitarActionId,
                },
            })

            const results = harness.useActionAndGetResults()

            expect(
                getDemonTargetResult(
                    results,
                    demonId
                ).squaddieActionResults.some((r) => r.damage)
            ).toBe(false)
        })

        it("forces a critical hit when the modifier is on", () => {
            harness.setChallengeModifier(
                ChallengeModifierType.TRAINING_WHEELS,
                true
            )
            harness.readyAction({
                actor: liniId,
                targets: [demonId],
                action: {
                    id: MissionEngineTestHarnessIds.lini.scimitarActionId,
                },
            })

            const results = harness.useActionAndGetResults()

            expect(getDemonTargetResult(results, demonId).degreeOfSuccess).toBe(
                DegreeOfSuccess.CRITICAL
            )
        })

        it("forces a critical hit when the trainingWheels debug flag is on, even without the modifier set", () => {
            harness.setDebugFlag("trainingWheels", true)
            harness.readyAction({
                actor: liniId,
                targets: [demonId],
                action: {
                    id: MissionEngineTestHarnessIds.lini.scimitarActionId,
                },
            })

            const results = harness.useActionAndGetResults()

            expect(getDemonTargetResult(results, demonId).degreeOfSuccess).toBe(
                DegreeOfSuccess.CRITICAL
            )
        })
    })
})
