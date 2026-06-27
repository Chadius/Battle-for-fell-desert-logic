import { beforeEach, describe, expect, it } from "vitest"
import { SquaddieActionValidationService } from "../squaddieActionValidationService"
import {
    SquaddieActionService,
    type SquaddieAction,
} from "../../../squaddieAction"
import { DegreeOfSuccess } from "../../../../degreesOfSuccess/degreeOfSuccess"
import { ValidationTestSetup } from "../../../../testUtils/validationTestSetup"
import type { ValidationTestResult } from "../../../../testUtils/validationTestSetup"
import type { BattleSquaddieId } from "../../../../squaddie/inBattle/battleSquaddieId"
import { SquaddieAffiliation } from "../../../../affiliation/affiliation"
import { ActionRange } from "../../../actionRange"
import { ProficiencyType } from "../../../../proficiency/proficiencyLevel"
import { OutOfBattleSquaddieTestSetup } from "../../../../testUtils/outOfBattleSquaddieTestSetup"
import { OutOfBattleSquaddieService } from "../../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { InBattleSquaddieManager } from "../../../../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../../../../squaddie/inBattle/inBattleSquaddieCollection"
import { SquaddieActionManager } from "../../../squaddieActionManager"
import { SquaddieActionCollectionService } from "../../../squaddieActionCollection"
import { CoordinateMapCollectionManager } from "../../../../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../../../../coordinateMap/coordinateMapCollection"
import { CoordinateMapService } from "../../../../coordinateMap/coordinateMap"

describe("usesPerTurn validation", () => {
    let setup: ValidationTestResult
    let actor: BattleSquaddieId

    const actionId = "thunder-strike"
    let limitedAction: SquaddieAction

    beforeEach(() => {
        setup = ValidationTestSetup.create({
            mapMovementProperties: ["1 1 1", " 1 1 1", "1 1 1 "],
            actorPosition: { row: 0, col: 0 },
        })
        actor = setup.actor

        limitedAction = SquaddieActionService.new({
            id: actionId,
            name: "Thunder Strike",
            usesPerTurn: 1,
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
        })
        setup.squaddieActionManager.addOrUpdate(limitedAction)
    })

    describe("isActionValid", () => {
        it("is valid when the action has not been used yet this turn", () => {
            const result = SquaddieActionValidationService.isActionValid({
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
            expect(result.isValid).toBe(true)
        })

        it("is invalid after the action has been used usesPerTurn times", () => {
            setup.inBattleSquaddieManager.recordActionUse({
                battleSquaddieId: actor,
                actionId,
            })

            const result = SquaddieActionValidationService.isActionValid({
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
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain("1 of 1")
        })

        it("is valid when uses remaining exist for an action with usesPerTurn > 1", () => {
            const twoUseAction = SquaddieActionService.new({
                id: "double-strike",
                name: "Double Strike",
                usesPerTurn: 2,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
            })
            setup.squaddieActionManager.addOrUpdate(twoUseAction)
            setup.inBattleSquaddieManager.recordActionUse({
                battleSquaddieId: actor,
                actionId: "double-strike",
            })

            const result = SquaddieActionValidationService.isActionValid({
                actor,
                action: { id: "double-strike" },
                targets: [],
                managers: {
                    inBattleSquaddieManager: setup.inBattleSquaddieManager,
                    squaddieActionManager: setup.squaddieActionManager,
                    coordinateMapCollectionManager:
                        setup.coordinateMapCollectionManager,
                },
                map: { mapId: setup.mapId },
            })
            expect(result.isValid).toBe(true)
        })
    })

    describe("categorizeSquaddieActions", () => {
        let categorizeInBattleSquaddieManager: InBattleSquaddieManager
        let categorizeSquaddieActionManager: SquaddieActionManager
        let categorizeCoordinateMapCollectionManager: CoordinateMapCollectionManager
        let categorizeActor: BattleSquaddieId
        const mapId = "cat-test-map"

        beforeEach(() => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "test-sheet",
                        attributeSheetOptions: { distancePerAction: 1 },
                    }
                )

            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "actor",
                    name: "Actor",
                    actionIds: [actionId],
                    attributeSheetId: "test-sheet",
                    affiliation: SquaddieAffiliation.PLAYER,
                })
            )
            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "enemy",
                    name: "Enemy",
                    actionIds: [],
                    attributeSheetId: "test-sheet",
                    affiliation: SquaddieAffiliation.ENEMY,
                })
            )

            categorizeInBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )
            const { inBattleSquaddieId: actorInBattleId } =
                categorizeInBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "actor",
                })
            categorizeActor = {
                inBattleSquaddieId: actorInBattleId,
                outOfBattleSquaddieId: "actor",
            }
            const { inBattleSquaddieId: enemyInBattleId } =
                categorizeInBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy",
                })
            const enemy: BattleSquaddieId = {
                inBattleSquaddieId: enemyInBattleId,
                outOfBattleSquaddieId: "enemy",
            }

            let mapCollection = CoordinateMapCollectionService.new()
            mapCollection = CoordinateMapCollectionService.addOrUpdate({
                collection: mapCollection,
                map: CoordinateMapService.new({
                    id: mapId,
                    name: "Cat Test Map",
                    movementProperties: ["1 1 1", " 1 1 1", "1 1 1 "],
                }),
            })
            categorizeCoordinateMapCollectionManager =
                new CoordinateMapCollectionManager(mapCollection)
            categorizeCoordinateMapCollectionManager.addSquaddie({
                mapId,
                squaddieId: categorizeActor,
                coordinate: { row: 0, col: 0 },
            })
            categorizeCoordinateMapCollectionManager.addSquaddie({
                mapId,
                squaddieId: enemy,
                coordinate: { row: 0, col: 1 },
            })

            categorizeSquaddieActionManager = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )
            categorizeSquaddieActionManager.addOrUpdate(
                SquaddieActionService.new({
                    id: actionId,
                    name: "Thunder Strike",
                    usesPerTurn: 1,
                    proficiency: ProficiencyType.WEAPON_MARTIAL,
                    effectOnActor: {
                        [DegreeOfSuccess.SUCCESS]: {
                            actionPoints: { spent: 1 },
                        },
                    },
                    effectOnTarget: {
                        [DegreeOfSuccess.SUCCESS]: {
                            damage: {
                                raw: 2,
                                targetProficiency: ProficiencyType.ARMOR,
                            },
                        },
                    },
                    range: ActionRange.MELEE,
                })
            )
        })

        it("includes usesPerTurn on valid actions", () => {
            const validity =
                SquaddieActionValidationService.categorizeSquaddieActions({
                    actor: categorizeActor,
                    managers: {
                        inBattleSquaddieManager:
                            categorizeInBattleSquaddieManager,
                        squaddieActionManager: categorizeSquaddieActionManager,
                        coordinateMapCollectionManager:
                            categorizeCoordinateMapCollectionManager,
                    },
                    map: { mapId },
                })

            const found = validity.validActions.find(
                (a) => a.actionId === actionId
            )
            expect(found).toBeDefined()
            expect(found?.usesPerTurn).toBe(1)
        })

        it("moves action to invalid and includes usesPerTurn when uses are exhausted", () => {
            categorizeInBattleSquaddieManager.recordActionUse({
                battleSquaddieId: categorizeActor,
                actionId,
            })

            const validity =
                SquaddieActionValidationService.categorizeSquaddieActions({
                    actor: categorizeActor,
                    managers: {
                        inBattleSquaddieManager:
                            categorizeInBattleSquaddieManager,
                        squaddieActionManager: categorizeSquaddieActionManager,
                        coordinateMapCollectionManager:
                            categorizeCoordinateMapCollectionManager,
                    },
                    map: { mapId },
                })

            const invalid = validity.invalidActions.find(
                (a) => a.actionId === actionId
            )
            expect(invalid).toBeDefined()
            expect(invalid?.usesPerTurn).toBe(1)
            expect(invalid?.reason).toContain("1 of 1")

            const valid = validity.validActions.find(
                (a) => a.actionId === actionId
            )
            expect(valid).toBeUndefined()
        })
    })
})
