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
import { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../../../coordinateMap/coordinateMapCollection"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap"
import { ActionRange } from "../../actionRange"
import type { SquaddieActionDecisions } from "../result/squaddieActionResultCalculator"

describe("SquaddieActionValidationService", () => {
    let squaddieActionManager: SquaddieActionManager
    let inBattleSquaddieManager: InBattleSquaddieManager
    let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    let coordinateMapCollectionManager: CoordinateMapCollectionManager
    let actor: BattleSquaddieId
    const mapId = "test-map"

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

        let mapCollection = CoordinateMapCollectionService.new()
        mapCollection = CoordinateMapCollectionService.addOrUpdate({
            collection: mapCollection,
            map: CoordinateMapService.new({
                id: mapId,
                name: "Test Map",
                movementProperties: [
                    "1 1 1 1 1 1 1 1 1 1 ",
                    " 1 1 1 1 1 1 1 1 1 1",
                    "1 1 1 1 1 1 1 1 1 1 ",
                ],
            }),
        })
        coordinateMapCollectionManager = new CoordinateMapCollectionManager(
            mapCollection
        )

        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: actor,
            coordinate: { row: 0, col: 0 },
        })
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
                targets: [],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
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
                targets: [],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
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
                targets: [],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
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
                targets: [],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
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
                targets: [],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
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
                targets: [],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
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
                targets: [],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

            expect(result.isValid).toBe(true)
        })
    })

    describe("target range validation", () => {
        it("returns valid when action targets self (affiliationRelationship.self = true)", () => {
            const action = SquaddieActionService.new({
                id: "self-heal",
                name: "Self Heal",
                range: ActionRange.SELF,
                affiliationRelationship: {
                    self: true,
                    foe: false,
                    friend: false,
                },
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
                targets: [actor],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

            expect(result.isValid).toBe(true)
        })

        it("returns valid when foe target is in range", () => {
            const enemySquaddie = OutOfBattleSquaddieService.new({
                id: "enemy",
                name: "Enemy",
                actionIds: [],
                attributeSheetId: "test-sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(enemySquaddie)
            const { inBattleSquaddieId: enemyInBattleId } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy",
                })
            const enemy: BattleSquaddieId = {
                inBattleSquaddieId: enemyInBattleId,
                outOfBattleSquaddieId: "enemy",
            }
            coordinateMapCollectionManager.addSquaddie({
                mapId,
                squaddieId: enemy,
                coordinate: { row: 0, col: 1 },
            })

            const action = SquaddieActionService.new({
                id: "melee-attack",
                name: "Melee Attack",
                range: ActionRange.MELEE,
                affiliationRelationship: {
                    self: false,
                    foe: true,
                    friend: false,
                },
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
                targets: [enemy],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

            expect(result.isValid).toBe(true)
        })

        it("returns invalid with 'No targets are in range' when foe target is out of range", () => {
            const enemySquaddie = OutOfBattleSquaddieService.new({
                id: "enemy",
                name: "Enemy",
                actionIds: [],
                attributeSheetId: "test-sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(enemySquaddie)
            const { inBattleSquaddieId: enemyInBattleId } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy",
                })
            const enemy: BattleSquaddieId = {
                inBattleSquaddieId: enemyInBattleId,
                outOfBattleSquaddieId: "enemy",
            }
            coordinateMapCollectionManager.addSquaddie({
                mapId,
                squaddieId: enemy,
                coordinate: { row: 0, col: 5 },
            })

            const action = SquaddieActionService.new({
                id: "melee-attack",
                name: "Melee Attack",
                range: ActionRange.MELEE,
                affiliationRelationship: {
                    self: false,
                    foe: true,
                    friend: false,
                },
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
                targets: [enemy],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

            expect(result.isValid).toBe(false)
            expect(result.reason).toBe("No targets are in range")
        })

        it("returns valid when friend target is in range (for healing actions)", () => {
            const allySquaddie = OutOfBattleSquaddieService.new({
                id: "ally",
                name: "Ally",
                actionIds: [],
                attributeSheetId: "test-sheet",
                affiliation: SquaddieAffiliation.ALLY,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(allySquaddie)
            const { inBattleSquaddieId: allyInBattleId } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "ally",
                })
            const ally: BattleSquaddieId = {
                inBattleSquaddieId: allyInBattleId,
                outOfBattleSquaddieId: "ally",
            }
            coordinateMapCollectionManager.addSquaddie({
                mapId,
                squaddieId: ally,
                coordinate: { row: 0, col: 1 },
            })

            const action = SquaddieActionService.new({
                id: "heal-ally",
                name: "Heal Ally",
                range: ActionRange.MELEE,
                affiliationRelationship: {
                    self: false,
                    foe: false,
                    friend: true,
                },
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
                targets: [ally],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

            expect(result.isValid).toBe(true)
        })

        it("returns invalid when targeting foe but only friends provided", () => {
            const allySquaddie = OutOfBattleSquaddieService.new({
                id: "ally",
                name: "Ally",
                actionIds: [],
                attributeSheetId: "test-sheet",
                affiliation: SquaddieAffiliation.ALLY,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(allySquaddie)
            const { inBattleSquaddieId: allyInBattleId } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "ally",
                })
            const ally: BattleSquaddieId = {
                inBattleSquaddieId: allyInBattleId,
                outOfBattleSquaddieId: "ally",
            }
            coordinateMapCollectionManager.addSquaddie({
                mapId,
                squaddieId: ally,
                coordinate: { row: 0, col: 1 },
            })

            const action = SquaddieActionService.new({
                id: "melee-attack",
                name: "Melee Attack",
                range: ActionRange.MELEE,
                affiliationRelationship: {
                    self: false,
                    foe: true,
                    friend: false,
                },
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
                targets: [ally],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

            expect(result.isValid).toBe(false)
            expect(result.reason).toBe("No targets are in range")
        })

        it("returns valid when at least one target is in range (multiple targets)", () => {
            const enemy1Squaddie = OutOfBattleSquaddieService.new({
                id: "enemy1",
                name: "Enemy 1",
                actionIds: [],
                attributeSheetId: "test-sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(enemy1Squaddie)
            const { inBattleSquaddieId: enemy1InBattleId } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy1",
                })
            const enemy1: BattleSquaddieId = {
                inBattleSquaddieId: enemy1InBattleId,
                outOfBattleSquaddieId: "enemy1",
            }
            coordinateMapCollectionManager.addSquaddie({
                mapId,
                squaddieId: enemy1,
                coordinate: { row: 0, col: 5 },
            })

            const enemy2Squaddie = OutOfBattleSquaddieService.new({
                id: "enemy2",
                name: "Enemy 2",
                actionIds: [],
                attributeSheetId: "test-sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(enemy2Squaddie)
            const { inBattleSquaddieId: enemy2InBattleId } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy2",
                })
            const enemy2: BattleSquaddieId = {
                inBattleSquaddieId: enemy2InBattleId,
                outOfBattleSquaddieId: "enemy2",
            }
            coordinateMapCollectionManager.addSquaddie({
                mapId,
                squaddieId: enemy2,
                coordinate: { row: 0, col: 1 },
            })

            const action = SquaddieActionService.new({
                id: "melee-attack",
                name: "Melee Attack",
                range: ActionRange.MELEE,
                affiliationRelationship: {
                    self: false,
                    foe: true,
                    friend: false,
                },
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
                targets: [enemy1, enemy2],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

            expect(result.isValid).toBe(true)
        })

        it("returns invalid when all targets are out of range", () => {
            const enemy1Squaddie = OutOfBattleSquaddieService.new({
                id: "enemy1",
                name: "Enemy 1",
                actionIds: [],
                attributeSheetId: "test-sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(enemy1Squaddie)
            const { inBattleSquaddieId: enemy1InBattleId } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy1",
                })
            const enemy1: BattleSquaddieId = {
                inBattleSquaddieId: enemy1InBattleId,
                outOfBattleSquaddieId: "enemy1",
            }
            coordinateMapCollectionManager.addSquaddie({
                mapId,
                squaddieId: enemy1,
                coordinate: { row: 0, col: 5 },
            })

            const enemy2Squaddie = OutOfBattleSquaddieService.new({
                id: "enemy2",
                name: "Enemy 2",
                actionIds: [],
                attributeSheetId: "test-sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(enemy2Squaddie)
            const { inBattleSquaddieId: enemy2InBattleId } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy2",
                })
            const enemy2: BattleSquaddieId = {
                inBattleSquaddieId: enemy2InBattleId,
                outOfBattleSquaddieId: "enemy2",
            }
            coordinateMapCollectionManager.addSquaddie({
                mapId,
                squaddieId: enemy2,
                coordinate: { row: 0, col: 6 },
            })

            const action = SquaddieActionService.new({
                id: "melee-attack",
                name: "Melee Attack",
                range: ActionRange.MELEE,
                affiliationRelationship: {
                    self: false,
                    foe: true,
                    friend: false,
                },
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
                targets: [enemy1, enemy2],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

            expect(result.isValid).toBe(false)
            expect(result.reason).toBe("No targets are in range")
        })
    })

    describe("movement path validation", () => {
        let movementSquaddieActionManager: SquaddieActionManager
        let movementInBattleSquaddieManager: InBattleSquaddieManager
        let movementOutOfBattleSquaddieManager: OutOfBattleSquaddieManager
        let movementCoordinateMapCollectionManager: CoordinateMapCollectionManager
        let movementActor: BattleSquaddieId
        const movementMapId = "movement-test-map"

        beforeEach(() => {
            ;({ manager: movementOutOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "movement-sheet",
                        attributeSheetOptions: {
                            distancePerAction: 2,
                        },
                    }
                ))

            const movementActorSquaddie = OutOfBattleSquaddieService.new({
                id: "movement-actor",
                name: "Movement Actor",
                actionIds: [],
                attributeSheetId: "movement-sheet",
                affiliation: SquaddieAffiliation.PLAYER,
            })
            movementOutOfBattleSquaddieManager.addOrUpdateSquaddie(
                movementActorSquaddie
            )

            const inBattleCollection = InBattleSquaddieCollectionService.new()
            movementInBattleSquaddieManager = new InBattleSquaddieManager(
                inBattleCollection,
                movementOutOfBattleSquaddieManager
            )

            const { inBattleSquaddieId } =
                movementInBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "movement-actor",
                })
            movementActor = {
                inBattleSquaddieId,
                outOfBattleSquaddieId: "movement-actor",
            }

            movementSquaddieActionManager = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )

            let mapCollection = CoordinateMapCollectionService.new()
            mapCollection = CoordinateMapCollectionService.addOrUpdate({
                collection: mapCollection,
                map: CoordinateMapService.new({
                    id: movementMapId,
                    name: "Movement Test Map",
                    movementProperties: ["1 2 2 1 1 1 1 1"],
                }),
            })
            movementCoordinateMapCollectionManager =
                new CoordinateMapCollectionManager(mapCollection)

            movementCoordinateMapCollectionManager.addSquaddie({
                mapId: movementMapId,
                squaddieId: movementActor,
                coordinate: { row: 0, col: 0 },
            })
        })

        it("returns valid with movementPath when movement destination is reachable", () => {
            const moveAction = SquaddieActionService.new({
                id: "move-action",
                name: "Move Action",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: {
                            spent: 0,
                            additional: { movementPathActionPointCost: true },
                        },
                        movement: { moveToSelectedDestination: true },
                    },
                },
            })
            movementSquaddieActionManager.addOrUpdate(moveAction)

            const decisions: SquaddieActionDecisions = {
                desiredMovementDestination: { row: 0, col: 4 },
            }

            const result = SquaddieActionValidationService.isActionValid({
                actor: movementActor,
                action: { id: moveAction.id, decisions },
                targets: [],
                managers: {
                    inBattleSquaddieManager: movementInBattleSquaddieManager,
                    squaddieActionManager: movementSquaddieActionManager,
                    coordinateMapCollectionManager:
                        movementCoordinateMapCollectionManager,
                },
                map: { mapId: movementMapId },
            })

            expect(result.isValid).toBe(true)
            expect(result.movementPath).toBeDefined()
            expect(result.movementPath?.steps.length).toBeGreaterThan(0)
        })

        it("returns invalid when hex distance exceeds maximum movement", () => {
            const moveAction = SquaddieActionService.new({
                id: "move-action",
                name: "Move Action",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: {
                            spent: 0,
                            additional: { movementPathActionPointCost: true },
                        },
                        movement: { moveToSelectedDestination: true },
                    },
                },
            })
            movementSquaddieActionManager.addOrUpdate(moveAction)

            const decisions: SquaddieActionDecisions = {
                desiredMovementDestination: { row: 0, col: 7 },
            }

            const result = SquaddieActionValidationService.isActionValid({
                actor: movementActor,
                action: { id: moveAction.id, decisions },
                targets: [],
                managers: {
                    inBattleSquaddieManager: movementInBattleSquaddieManager,
                    squaddieActionManager: movementSquaddieActionManager,
                    coordinateMapCollectionManager:
                        movementCoordinateMapCollectionManager,
                },
                map: { mapId: movementMapId },
            })

            expect(result.isValid).toBe(false)
            expect(result.reason).toBe("Destination is too far away")
            expect(result.movementPath).toBeUndefined()
        })

        it("returns invalid when path cost exceeds maximum even if hex distance is within range", () => {
            const moveAction = SquaddieActionService.new({
                id: "move-action",
                name: "Move Action",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: {
                            spent: 0,
                            additional: { movementPathActionPointCost: true },
                        },
                        movement: { moveToSelectedDestination: true },
                    },
                },
            })
            movementSquaddieActionManager.addOrUpdate(moveAction)

            const decisions: SquaddieActionDecisions = {
                desiredMovementDestination: { row: 0, col: 5 },
            }

            const result = SquaddieActionValidationService.isActionValid({
                actor: movementActor,
                action: { id: moveAction.id, decisions },
                targets: [],
                managers: {
                    inBattleSquaddieManager: movementInBattleSquaddieManager,
                    squaddieActionManager: movementSquaddieActionManager,
                    coordinateMapCollectionManager:
                        movementCoordinateMapCollectionManager,
                },
                map: { mapId: movementMapId },
            })

            expect(result.isValid).toBe(false)
            expect(result.reason).toBe("Destination is blocked")
            expect(result.movementPath).toBeUndefined()
        })

        it("returns invalid when wall blocks path to destination", () => {
            let wallMapCollection = CoordinateMapCollectionService.new()
            const wallMapId = "wall-map"
            wallMapCollection = CoordinateMapCollectionService.addOrUpdate({
                collection: wallMapCollection,
                map: CoordinateMapService.new({
                    id: wallMapId,
                    name: "Wall Map",
                    movementProperties: ["1 x 1"],
                }),
            })
            const wallCoordinateMapManager = new CoordinateMapCollectionManager(
                wallMapCollection
            )
            wallCoordinateMapManager.addSquaddie({
                mapId: wallMapId,
                squaddieId: movementActor,
                coordinate: { row: 0, col: 0 },
            })

            const moveAction = SquaddieActionService.new({
                id: "move-action",
                name: "Move Action",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: {
                            spent: 0,
                            additional: { movementPathActionPointCost: true },
                        },
                        movement: { moveToSelectedDestination: true },
                    },
                },
            })
            movementSquaddieActionManager.addOrUpdate(moveAction)

            const decisions: SquaddieActionDecisions = {
                desiredMovementDestination: { row: 0, col: 2 },
            }

            const result = SquaddieActionValidationService.isActionValid({
                actor: movementActor,
                action: { id: moveAction.id, decisions },
                targets: [],
                managers: {
                    inBattleSquaddieManager: movementInBattleSquaddieManager,
                    squaddieActionManager: movementSquaddieActionManager,
                    coordinateMapCollectionManager: wallCoordinateMapManager,
                },
                map: { mapId: wallMapId },
            })

            expect(result.isValid).toBe(false)
            expect(result.reason).toBe("Destination is blocked")
            expect(result.movementPath).toBeUndefined()
        })

        it("returns valid without movementPath when no destination is provided", () => {
            const moveAction = SquaddieActionService.new({
                id: "move-action",
                name: "Move Action",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: {
                            spent: 0,
                            additional: { movementPathActionPointCost: true },
                        },
                        movement: { moveToSelectedDestination: true },
                    },
                },
            })
            movementSquaddieActionManager.addOrUpdate(moveAction)

            const result = SquaddieActionValidationService.isActionValid({
                actor: movementActor,
                action: { id: moveAction.id },
                targets: [],
                managers: {
                    inBattleSquaddieManager: movementInBattleSquaddieManager,
                    squaddieActionManager: movementSquaddieActionManager,
                    coordinateMapCollectionManager:
                        movementCoordinateMapCollectionManager,
                },
                map: { mapId: movementMapId },
            })

            expect(result.isValid).toBe(true)
            expect(result.movementPath).toBeUndefined()
        })
    })
})
