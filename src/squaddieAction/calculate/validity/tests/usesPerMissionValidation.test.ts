import { beforeEach, describe, expect, it } from "vitest"
import { SquaddieActionValidationService } from "../squaddieActionValidationService.js"
import { SquaddieActionService } from "../../../squaddieAction.js"
import { DegreeOfSuccess } from "../../../../degreesOfSuccess/degreeOfSuccess.js"
import { ValidationTestSetup } from "../../../../testUtils/validationTestSetup.js"
import type { ValidationTestResult } from "../../../../testUtils/validationTestSetup.js"
import type { BattleSquaddieId } from "../../../../squaddie/inBattle/battleSquaddieId.js"

describe("usesPerMission validation", () => {
    let setup: ValidationTestResult
    let actor: BattleSquaddieId

    const actionId = "warcry"

    beforeEach(() => {
        setup = ValidationTestSetup.create({
            mapMovementProperties: ["1 1 1", " 1 1 1", "1 1 1 "],
            actorPosition: { row: 0, col: 0 },
        })
        actor = setup.actor

        setup.squaddieActionManager.addOrUpdate(
            SquaddieActionService.new({
                id: actionId,
                name: "Warcry",
                usesPerMission: 3,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
            })
        )
    })

    const checkValidity = () =>
        SquaddieActionValidationService.isActionValid({
            actor,
            action: { id: actionId },
            targets: [],
            managers: {
                inBattleSquaddieManager: setup.inBattleSquaddieManager,
                squaddieActionManager: setup.squaddieActionManager,
                coordinateMapCollectionManager:
                    setup.coordinateMapCollectionManager,
            },
            map: { mapId: setup.mapId },
        })

    describe("checking whether the mission-wide use limit blocks the action", () => {
        it("is valid when the action has not been used yet this mission", () => {
            expect(checkValidity().isValid).toBe(true)
        })

        it("is valid on the same turn after some uses remain", () => {
            setup.inBattleSquaddieManager.recordActionUse({
                battleSquaddieId: actor,
                actionId,
            })

            expect(checkValidity().isValid).toBe(true)
        })

        it("allows repeated uses within the same turn while under the mission limit", () => {
            setup.inBattleSquaddieManager.recordActionUse({
                battleSquaddieId: actor,
                actionId,
            })
            setup.inBattleSquaddieManager.recordActionUse({
                battleSquaddieId: actor,
                actionId,
            })

            expect(checkValidity().isValid).toBe(true)
        })

        it("is invalid once the mission-wide limit is reached, even across turns", () => {
            for (let turn = 0; turn < 3; turn++) {
                setup.inBattleSquaddieManager.recordActionUse({
                    battleSquaddieId: actor,
                    actionId,
                })
                setup.inBattleSquaddieManager.resetActionUsesThisTurn(actor)
            }

            const result = checkValidity()

            expect(result.isValid).toBe(false)
            expect(result.reason).toContain("3 of 3")
        })
    })
})
