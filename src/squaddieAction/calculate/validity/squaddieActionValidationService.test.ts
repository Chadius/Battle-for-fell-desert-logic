import { beforeEach, describe, expect, it } from "vitest"
import { SquaddieActionValidationService } from "./squaddieActionValidationService"
import { SquaddieActionManager } from "../../squaddieActionManager"
import { SquaddieActionCollectionService } from "../../squaddieActionCollection"
import { SquaddieActionService } from "../../squaddieAction"
import {
    type BattleSquaddieId,
    InBattleSquaddieManager,
} from "../../../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup"
import { SquaddieAffiliation } from "../../../affiliation/affiliation"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess"
import type { OutOfBattleSquaddieManager } from "../../../squaddie/outOfBattle/outOfBattleSquaddieManager"

describe("SquaddieActionValidationService", () => {
    let squaddieActionManager: SquaddieActionManager
    let inBattleSquaddieManager: InBattleSquaddieManager
    let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    let actor: BattleSquaddieId

    beforeEach(() => {
        const { manager } =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "test-sheet",
            })
        outOfBattleSquaddieManager = manager

        const actorSquaddie = OutOfBattleSquaddieService.new({
            id: "actor",
            name: "Actor",
            actionIds: [],
            attributeSheetId: "test-sheet",
            affiliation: SquaddieAffiliation.PLAYER,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(actorSquaddie)

        const inBattleCollection = InBattleSquaddieCollectionService.new()
        inBattleSquaddieManager = new InBattleSquaddieManager(
            inBattleCollection,
            outOfBattleSquaddieManager
        )

        const { inBattleSquaddieId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor",
            })
        actor = {
            inBattleSquaddieId,
            outOfBattleSquaddieId: "actor",
        }

        squaddieActionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )
    })

    describe("action point validation", () => {
        it("returns valid when squaddie has enough action points", () => {
            const action = SquaddieActionService.new({
                id: "test-action",
                name: "Test Action",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 1 },
                    },
                },
            })
            squaddieActionManager.addOrUpdate(action)

            const result = SquaddieActionValidationService.isActionValid({
                actor,
                action: { id: action.id },
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                },
            })

            expect(result.isValid).toBe(true)
            expect(result.reason).toBeUndefined()
        })

        it("returns invalid with reason when squaddie has insufficient action points", () => {
            inBattleSquaddieManager.spendActionPoints({
                ...actor,
                actionPoints: 1,
            })

            const action = SquaddieActionService.new({
                id: "test-action",
                name: "Test Action",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 3 },
                    },
                },
            })
            squaddieActionManager.addOrUpdate(action)

            const result = SquaddieActionValidationService.isActionValid({
                actor,
                action: { id: action.id },
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                },
            })

            expect(result.isValid).toBe(false)
            expect(result.reason).toBe("Needs 3 action points")
        })

        it("returns valid when squaddie has exactly the required action points", () => {
            const action = SquaddieActionService.new({
                id: "test-action",
                name: "Test Action",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 3 },
                    },
                },
            })
            squaddieActionManager.addOrUpdate(action)

            const result = SquaddieActionValidationService.isActionValid({
                actor,
                action: { id: action.id },
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                },
            })

            expect(result.isValid).toBe(true)
        })

        it("returns valid when action costs 'all' and squaddie can act", () => {
            const action = SquaddieActionService.new({
                id: "test-action",
                name: "Test Action",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: "all" },
                    },
                },
            })
            squaddieActionManager.addOrUpdate(action)

            const result = SquaddieActionValidationService.isActionValid({
                actor,
                action: { id: action.id },
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                },
            })

            expect(result.isValid).toBe(true)
        })

        it("returns invalid when action costs 'all' and squaddie cannot act", () => {
            inBattleSquaddieManager.spendActionPoints({
                ...actor,
                actionPoints: 3,
            })

            const action = SquaddieActionService.new({
                id: "test-action",
                name: "Test Action",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: "all" },
                    },
                },
            })
            squaddieActionManager.addOrUpdate(action)

            const result = SquaddieActionValidationService.isActionValid({
                actor,
                action: { id: action.id },
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                },
            })

            expect(result.isValid).toBe(false)
            expect(result.reason).toBe("Squaddie cannot act")
        })

        it("returns valid when action has no action point cost defined", () => {
            const action = SquaddieActionService.new({
                id: "test-action",
                name: "Test Action",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {},
                },
            })
            squaddieActionManager.addOrUpdate(action)

            const result = SquaddieActionValidationService.isActionValid({
                actor,
                action: { id: action.id },
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                },
            })

            expect(result.isValid).toBe(true)
        })

        it("returns valid when action point cost is 0", () => {
            const action = SquaddieActionService.new({
                id: "test-action",
                name: "Test Action",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 0 },
                    },
                },
            })
            squaddieActionManager.addOrUpdate(action)

            const result = SquaddieActionValidationService.isActionValid({
                actor,
                action: { id: action.id },
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                },
            })

            expect(result.isValid).toBe(true)
        })
    })
})
