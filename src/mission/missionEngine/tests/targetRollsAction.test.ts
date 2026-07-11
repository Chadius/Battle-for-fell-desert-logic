import { describe, expect, it } from "vitest"
import { RollGenerator } from "../../../squaddieAction/calculate/roll/rollGenerator.js"
import {
    MissionEngineTestHarness,
    MissionEngineTestHarnessIds,
} from "../../../testUtils/mission/missionEngineTestHarness.js"
import { SquaddieIdConverterService } from "../../../squaddie/idConverterService.js"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.js"
import type { ActionResult } from "../../actionResult.js"

function advanceHarnessToPlayerTurn(harness: MissionEngineTestHarness): void {
    harness.transitionToNextPhase()
    harness.transitionToNextPhase()
}

function useSolarSphereAndGetResult(rollQueue: number[]): {
    actionResult: ActionResult
    demonKey: string
} {
    const harness = new MissionEngineTestHarness(new RollGenerator(rollQueue))
    advanceHarnessToPlayerTurn(harness)

    const liniId = harness.getLiniSquaddieId()
    const demonId = harness.getSlitherDemonSquaddieId()
    const demonKey = SquaddieIdConverterService.squaddieIdToKey(demonId)

    const coordinateMapManager =
        harness.missionManager!.coordinateMapCollectionManager!
    coordinateMapManager.removeSquaddie({
        mapId: MissionEngineTestHarnessIds.mapId,
        squaddieId: demonId,
    })
    coordinateMapManager.addSquaddie({
        mapId: MissionEngineTestHarnessIds.mapId,
        squaddieId: demonId,
        coordinate: { row: 0, col: 2 },
    })

    harness.readyAction({
        actor: liniId,
        targets: [demonId],
        action: { id: MissionEngineTestHarnessIds.lini.solarSphereActionId },
    })

    return { actionResult: harness.useActionAndGetResults(), demonKey }
}

describe("Solar Sphere — TARGETS_ROLL_TO_RESIST", () => {
    describe("actorRoll is undefined because targets roll independently", () => {
        it("actorRoll is undefined on the returned ActionResult", () => {
            const { actionResult } = useSolarSphereAndGetResult([5, 4])

            expect(actionResult.actorRoll).toBeUndefined()
        })
    })

    describe("each target carries the roll it made", () => {
        it("targetRoll on the target result matches the supplied roll", () => {
            const { actionResult, demonKey } = useSolarSphereAndGetResult([
                5, 4,
            ])

            expect(actionResult.targetResults[demonKey].targetRoll).toEqual([
                5, 4,
            ])
        })
    })

    describe("degree of success matches the target roll result", () => {
        it("SUCCESS when the target roll is high enough (5, 4 → degreeValue 0)", () => {
            const { actionResult, demonKey } = useSolarSphereAndGetResult([
                5, 4,
            ])

            expect(actionResult.targetResults[demonKey].degreeOfSuccess).toBe(
                DegreeOfSuccess.SUCCESS
            )
        })

        it("FAILURE when the target roll is too low (3, 3 → degreeValue -3)", () => {
            const { actionResult, demonKey } = useSolarSphereAndGetResult([
                3, 3,
            ])

            expect(actionResult.targetResults[demonKey].degreeOfSuccess).toBe(
                DegreeOfSuccess.FAILURE
            )
        })
    })
})
