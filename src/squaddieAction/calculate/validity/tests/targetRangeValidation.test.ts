import { beforeEach, describe, expect, it } from "vitest"
import { SquaddieActionService } from "../../../squaddieAction"
import { ActionRange } from "../../../actionRange"
import { DegreeOfSuccess } from "../../../../degreesOfSuccess/degreeOfSuccess"
import { SquaddieActionValidationService } from "../squaddieActionValidationService"
import { OutOfBattleSquaddieService } from "../../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { SquaddieAffiliation } from "../../../../affiliation/affiliation"
import { InBattleSquaddieManager } from "../../../../squaddie/inBattle/inBattleSquaddieManager"
import { SquaddieActionManager } from "../../../squaddieActionManager"
import type { OutOfBattleSquaddieManager } from "../../../../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { CoordinateMapCollectionManager } from "../../../../coordinateMap/coordinateMapManager"
import { ValidationTestSetup } from "../../../../testUtils/validationTestSetup"
import { OutOfBattleSquaddieTestSetup } from "../../../../testUtils/outOfBattleSquaddieTestSetup"
import { InBattleSquaddieCollectionService } from "../../../../squaddie/inBattle/inBattleSquaddieCollection"
import { SquaddieActionCollectionService } from "../../../squaddieActionCollection"
import { CoordinateMapCollectionService } from "../../../../coordinateMap/coordinateMapCollection"
import { CoordinateMapService } from "../../../../coordinateMap/coordinateMap"
import type { BattleSquaddieId } from "../../../../squaddie/inBattle/battleSquaddieId"

describe("targetRangeValidation", () => {
    let squaddieActionManager: SquaddieActionManager
    let inBattleSquaddieManager: InBattleSquaddieManager
    let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    let coordinateMapCollectionManager: CoordinateMapCollectionManager
    let actor: BattleSquaddieId
    const mapId = "test-map"

    beforeEach(() => {
        const setup = ValidationTestSetup.create({
            mapMovementProperties: [
                "1 1 1 1 1 1 1 1 1 1 ",
                " 1 1 1 1 1 1 1 1 1 1",
                "1 1 1 1 1 1 1 1 1 1 ",
            ],
            actorPosition: { row: 0, col: 0 },
        })
        actor = setup.actor
        outOfBattleSquaddieManager = setup.outOfBattleSquaddieManager
        inBattleSquaddieManager = setup.inBattleSquaddieManager
        coordinateMapCollectionManager = setup.coordinateMapCollectionManager
        squaddieActionManager = setup.squaddieActionManager
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

        it("returns invalid with 'All targets must be in range' when foe target is out of range", () => {
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
            expect(result.reason).toBe("All targets must be in range")
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
            expect(result.reason).toBe("All targets must be in range")
        })

        it("returns invalid when one of multiple targets is out of range (all targets must be valid)", () => {
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

            expect(result.isValid).toBe(false)
            expect(result.reason).toBe("All targets must be in range")
        })

        it("returns valid when all targets are in range (multiple targets)", () => {
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
                coordinate: { row: 0, col: 1 },
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
                coordinate: { row: 1, col: 0 },
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
            expect(result.reason).toBe("All targets must be in range")
        })
    })

    describe("target range validation with pathfinding", () => {
        let pathfindingSquaddieActionManager: SquaddieActionManager
        let pathfindingInBattleSquaddieManager: InBattleSquaddieManager
        let pathfindingOutOfBattleSquaddieManager: OutOfBattleSquaddieManager
        let pathfindingCoordinateMapCollectionManager: CoordinateMapCollectionManager
        let pathfindingActor: BattleSquaddieId
        const pathfindingMapId = "pathfinding-test-map"

        beforeEach(() => {
            ;({ manager: pathfindingOutOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "pathfinding-sheet",
                    }
                ))

            const pathfindingActorSquaddie = OutOfBattleSquaddieService.new({
                id: "pathfinding-actor",
                name: "Pathfinding Actor",
                actionIds: [],
                attributeSheetId: "pathfinding-sheet",
                affiliation: SquaddieAffiliation.PLAYER,
            })
            pathfindingOutOfBattleSquaddieManager.addOrUpdateSquaddie(
                pathfindingActorSquaddie
            )

            const inBattleCollection = InBattleSquaddieCollectionService.new()
            pathfindingInBattleSquaddieManager = new InBattleSquaddieManager(
                inBattleCollection,
                pathfindingOutOfBattleSquaddieManager
            )

            const { inBattleSquaddieId } =
                pathfindingInBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "pathfinding-actor",
                })
            pathfindingActor = {
                inBattleSquaddieId,
                outOfBattleSquaddieId: "pathfinding-actor",
            }

            pathfindingSquaddieActionManager = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )

            let mapCollection = CoordinateMapCollectionService.new()
            mapCollection = CoordinateMapCollectionService.addOrUpdate({
                collection: mapCollection,
                map: CoordinateMapService.new({
                    id: pathfindingMapId,
                    name: "Pathfinding Test Map",
                    movementProperties: ["1 2 2 - 2 x 1 "],
                }),
            })
            pathfindingCoordinateMapCollectionManager =
                new CoordinateMapCollectionManager(mapCollection)
        })

        it("valid when target is reachable within range", () => {
            pathfindingCoordinateMapCollectionManager.addSquaddie({
                mapId: pathfindingMapId,
                squaddieId: pathfindingActor,
                coordinate: { row: 0, col: 0 },
            })

            const enemySquaddie = OutOfBattleSquaddieService.new({
                id: "enemy",
                name: "Enemy",
                actionIds: [],
                attributeSheetId: "pathfinding-sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            pathfindingOutOfBattleSquaddieManager.addOrUpdateSquaddie(
                enemySquaddie
            )
            const { inBattleSquaddieId: enemyInBattleId } =
                pathfindingInBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy",
                })
            const enemy: BattleSquaddieId = {
                inBattleSquaddieId: enemyInBattleId,
                outOfBattleSquaddieId: "enemy",
            }
            pathfindingCoordinateMapCollectionManager.addSquaddie({
                mapId: pathfindingMapId,
                squaddieId: enemy,
                coordinate: { row: 0, col: 1 },
            })

            const action = SquaddieActionService.new({
                id: "reach-attack",
                name: "Reach Attack",
                range: ActionRange.REACH,
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
            pathfindingSquaddieActionManager.addOrUpdate(action)

            const result = SquaddieActionValidationService.isActionValid({
                actor: pathfindingActor,
                action: { id: action.id },
                targets: [enemy],
                managers: {
                    inBattleSquaddieManager: pathfindingInBattleSquaddieManager,
                    squaddieActionManager: pathfindingSquaddieActionManager,
                    coordinateMapCollectionManager:
                        pathfindingCoordinateMapCollectionManager,
                },
                map: { mapId: pathfindingMapId },
            })

            expect(result.isValid).toBe(true)
        })

        it("invalid when target is unreachable due to path cost exceeding range", () => {
            pathfindingCoordinateMapCollectionManager.addSquaddie({
                mapId: pathfindingMapId,
                squaddieId: pathfindingActor,
                coordinate: { row: 0, col: 0 },
            })

            const enemySquaddie = OutOfBattleSquaddieService.new({
                id: "enemy",
                name: "Enemy",
                actionIds: [],
                attributeSheetId: "pathfinding-sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            pathfindingOutOfBattleSquaddieManager.addOrUpdateSquaddie(
                enemySquaddie
            )
            const { inBattleSquaddieId: enemyInBattleId } =
                pathfindingInBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy",
                })
            const enemy: BattleSquaddieId = {
                inBattleSquaddieId: enemyInBattleId,
                outOfBattleSquaddieId: "enemy",
            }
            pathfindingCoordinateMapCollectionManager.addSquaddie({
                mapId: pathfindingMapId,
                squaddieId: enemy,
                coordinate: { row: 0, col: 2 },
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
            pathfindingSquaddieActionManager.addOrUpdate(action)

            const result = SquaddieActionValidationService.isActionValid({
                actor: pathfindingActor,
                action: { id: action.id },
                targets: [enemy],
                managers: {
                    inBattleSquaddieManager: pathfindingInBattleSquaddieManager,
                    squaddieActionManager: pathfindingSquaddieActionManager,
                    coordinateMapCollectionManager:
                        pathfindingCoordinateMapCollectionManager,
                },
                map: { mapId: pathfindingMapId },
            })

            expect(result.isValid).toBe(false)
            expect(result.reason).toBe("All targets must be in range")
        })

        it("valid when action crosses over pits", () => {
            pathfindingCoordinateMapCollectionManager.addSquaddie({
                mapId: pathfindingMapId,
                squaddieId: pathfindingActor,
                coordinate: { row: 0, col: 2 },
            })

            const enemySquaddie = OutOfBattleSquaddieService.new({
                id: "enemy",
                name: "Enemy",
                actionIds: [],
                attributeSheetId: "pathfinding-sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            pathfindingOutOfBattleSquaddieManager.addOrUpdateSquaddie(
                enemySquaddie
            )
            const { inBattleSquaddieId: enemyInBattleId } =
                pathfindingInBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy",
                })
            const enemy: BattleSquaddieId = {
                inBattleSquaddieId: enemyInBattleId,
                outOfBattleSquaddieId: "enemy",
            }
            pathfindingCoordinateMapCollectionManager.addSquaddie({
                mapId: pathfindingMapId,
                squaddieId: enemy,
                coordinate: { row: 0, col: 4 },
            })

            const action = SquaddieActionService.new({
                id: "reach-attack",
                name: "Reach Attack",
                range: ActionRange.REACH,
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
            pathfindingSquaddieActionManager.addOrUpdate(action)

            const result = SquaddieActionValidationService.isActionValid({
                actor: pathfindingActor,
                action: { id: action.id },
                targets: [enemy],
                managers: {
                    inBattleSquaddieManager: pathfindingInBattleSquaddieManager,
                    squaddieActionManager: pathfindingSquaddieActionManager,
                    coordinateMapCollectionManager:
                        pathfindingCoordinateMapCollectionManager,
                },
                map: { mapId: pathfindingMapId },
            })

            expect(result.isValid).toBe(true)
        })

        it("invalid when wall blocks path", () => {
            pathfindingCoordinateMapCollectionManager.addSquaddie({
                mapId: pathfindingMapId,
                squaddieId: pathfindingActor,
                coordinate: { row: 0, col: 4 },
            })

            const enemySquaddie = OutOfBattleSquaddieService.new({
                id: "enemy",
                name: "Enemy",
                actionIds: [],
                attributeSheetId: "pathfinding-sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            pathfindingOutOfBattleSquaddieManager.addOrUpdateSquaddie(
                enemySquaddie
            )
            const { inBattleSquaddieId: enemyInBattleId } =
                pathfindingInBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy",
                })
            const enemy: BattleSquaddieId = {
                inBattleSquaddieId: enemyInBattleId,
                outOfBattleSquaddieId: "enemy",
            }
            pathfindingCoordinateMapCollectionManager.addSquaddie({
                mapId: pathfindingMapId,
                squaddieId: enemy,
                coordinate: { row: 0, col: 6 },
            })

            const action = SquaddieActionService.new({
                id: "reach-attack",
                name: "Reach Attack",
                range: ActionRange.REACH,
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
            pathfindingSquaddieActionManager.addOrUpdate(action)

            const result = SquaddieActionValidationService.isActionValid({
                actor: pathfindingActor,
                action: { id: action.id },
                targets: [enemy],
                managers: {
                    inBattleSquaddieManager: pathfindingInBattleSquaddieManager,
                    squaddieActionManager: pathfindingSquaddieActionManager,
                    coordinateMapCollectionManager:
                        pathfindingCoordinateMapCollectionManager,
                },
                map: { mapId: pathfindingMapId },
            })

            expect(result.isValid).toBe(false)
            expect(result.reason).toBe("All targets must be in range")
        })

        it("invalid when one of multiple targets is unreachable due to pathfinding", () => {
            pathfindingCoordinateMapCollectionManager.addSquaddie({
                mapId: pathfindingMapId,
                squaddieId: pathfindingActor,
                coordinate: { row: 0, col: 4 },
            })

            const enemy1Squaddie = OutOfBattleSquaddieService.new({
                id: "enemy1",
                name: "Enemy 1",
                actionIds: [],
                attributeSheetId: "pathfinding-sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            pathfindingOutOfBattleSquaddieManager.addOrUpdateSquaddie(
                enemy1Squaddie
            )
            const { inBattleSquaddieId: enemy1InBattleId } =
                pathfindingInBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy1",
                })
            const enemy1: BattleSquaddieId = {
                inBattleSquaddieId: enemy1InBattleId,
                outOfBattleSquaddieId: "enemy1",
            }
            pathfindingCoordinateMapCollectionManager.addSquaddie({
                mapId: pathfindingMapId,
                squaddieId: enemy1,
                coordinate: { row: 0, col: 2 },
            })

            const enemy2Squaddie = OutOfBattleSquaddieService.new({
                id: "enemy2",
                name: "Enemy 2",
                actionIds: [],
                attributeSheetId: "pathfinding-sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            pathfindingOutOfBattleSquaddieManager.addOrUpdateSquaddie(
                enemy2Squaddie
            )
            const { inBattleSquaddieId: enemy2InBattleId } =
                pathfindingInBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy2",
                })
            const enemy2: BattleSquaddieId = {
                inBattleSquaddieId: enemy2InBattleId,
                outOfBattleSquaddieId: "enemy2",
            }
            pathfindingCoordinateMapCollectionManager.addSquaddie({
                mapId: pathfindingMapId,
                squaddieId: enemy2,
                coordinate: { row: 0, col: 6 },
            })

            const action = SquaddieActionService.new({
                id: "reach-attack",
                name: "Reach Attack",
                range: ActionRange.REACH,
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
            pathfindingSquaddieActionManager.addOrUpdate(action)

            const result = SquaddieActionValidationService.isActionValid({
                actor: pathfindingActor,
                action: { id: action.id },
                targets: [enemy1, enemy2],
                managers: {
                    inBattleSquaddieManager: pathfindingInBattleSquaddieManager,
                    squaddieActionManager: pathfindingSquaddieActionManager,
                    coordinateMapCollectionManager:
                        pathfindingCoordinateMapCollectionManager,
                },
                map: { mapId: pathfindingMapId },
            })

            expect(result.isValid).toBe(false)
            expect(result.reason).toBe("All targets must be in range")
        })
    })
})
