import { beforeEach, describe, expect, it } from "vitest"
import { SquaddieActionValidationService } from "../squaddieActionValidationService"
import {
    type SquaddieAction,
    SquaddieActionService,
} from "../../../squaddieAction"
import {
    type BattleSquaddieId,
    InBattleSquaddieManager,
} from "../../../../squaddie/inBattle/inBattleSquaddieManager"
import { OutOfBattleSquaddieService } from "../../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { SquaddieAffiliation } from "../../../../affiliation/affiliation"
import { DegreeOfSuccess } from "../../../../degreesOfSuccess/degreeOfSuccess"
import { ActionRange } from "../../../actionRange"
import { SquaddieIdConverterService } from "../../../../squaddie/idConverterService"
import { OffsetCoordinateService } from "../../../../coordinateMap/offsetCoordinate"
import { SquaddieActionManager } from "../../../squaddieActionManager"
import type { OutOfBattleSquaddieManager } from "../../../../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { CoordinateMapCollectionManager } from "../../../../coordinateMap/coordinateMapManager"
import { OutOfBattleSquaddieTestSetup } from "../../../../testUtils/outOfBattleSquaddieTestSetup"
import { InBattleSquaddieCollectionService } from "../../../../squaddie/inBattle/inBattleSquaddieCollection"
import { SquaddieActionCollectionService } from "../../../squaddieActionCollection"
import { CoordinateMapCollectionService } from "../../../../coordinateMap/coordinateMapCollection"
import { CoordinateMapService } from "../../../../coordinateMap/coordinateMap"
import { CoordinateGeneratorShape } from "../../../../coordinateMap/shape"
import { ProficiencyType } from "../../../../proficiency/proficiencyLevel"

describe("getAllValidTargetsInRangeOfAction", () => {
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

    it("returns actor at current coordinate for self-only action", () => {
        const selfAction = SquaddieActionService.new({
            id: "self-action",
            name: "Self Action",
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
        squaddieActionManager.addOrUpdate(selfAction)

        const result =
            SquaddieActionValidationService.calculateReachableSquaddiesByCoordinate(
                {
                    actor,
                    action: { id: selfAction.id },
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager,
                        coordinateMapCollectionManager,
                    },
                    map: { mapId },
                }
            )

        const actorCoordinateKey = OffsetCoordinateService.coordinateToKey({
            row: 0,
            col: 0,
        })
        const actorSquaddieKey =
            SquaddieIdConverterService.squaddieIdToKey(actor)

        expect(result.size).toBe(1)
        expect(result.has(actorCoordinateKey)).toBe(true)
        expect(result.get(actorCoordinateKey)!.has(actorSquaddieKey)).toBe(true)
    })

    it("returns actor and nearby ally for self-and-friend melee, excludes distant ally", () => {
        const nearAllySquaddie = OutOfBattleSquaddieService.new({
            id: "near-ally",
            name: "Near Ally",
            actionIds: [],
            attributeSheetId: "test-sheet",
            affiliation: SquaddieAffiliation.ALLY,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(nearAllySquaddie)
        const { inBattleSquaddieId: nearAllyInBattleId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "near-ally",
            })
        const nearAlly: BattleSquaddieId = {
            inBattleSquaddieId: nearAllyInBattleId,
            outOfBattleSquaddieId: "near-ally",
        }
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: nearAlly,
            coordinate: { row: 0, col: 1 },
        })

        const farAllySquaddie = OutOfBattleSquaddieService.new({
            id: "far-ally",
            name: "Far Ally",
            actionIds: [],
            attributeSheetId: "test-sheet",
            affiliation: SquaddieAffiliation.ALLY,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(farAllySquaddie)
        const { inBattleSquaddieId: farAllyInBattleId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "far-ally",
            })
        const farAlly: BattleSquaddieId = {
            inBattleSquaddieId: farAllyInBattleId,
            outOfBattleSquaddieId: "far-ally",
        }
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: farAlly,
            coordinate: { row: 0, col: 3 },
        })

        const meleeHealAction = SquaddieActionService.new({
            id: "melee-heal",
            name: "Melee Heal",
            range: ActionRange.MELEE,
            affiliationRelationship: {
                self: true,
                foe: false,
                friend: true,
            },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: { spent: 1 },
                },
            },
        })
        squaddieActionManager.addOrUpdate(meleeHealAction)

        const result =
            SquaddieActionValidationService.calculateReachableSquaddiesByCoordinate(
                {
                    actor,
                    action: { id: meleeHealAction.id },
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager,
                        coordinateMapCollectionManager,
                    },
                    map: { mapId },
                }
            )

        const actorCoordinateKey = OffsetCoordinateService.coordinateToKey({
            row: 0,
            col: 0,
        })
        const nearAllyCoordinateKey = OffsetCoordinateService.coordinateToKey({
            row: 0,
            col: 1,
        })
        const farAllyCoordinateKey = OffsetCoordinateService.coordinateToKey({
            row: 0,
            col: 3,
        })

        expect(result.size).toBe(2)
        expect(result.has(actorCoordinateKey)).toBe(true)
        expect(result.has(nearAllyCoordinateKey)).toBe(true)
        expect(result.has(farAllyCoordinateKey)).toBe(false)
    })

    it("returns foe only for foe-targeting ranged action, excludes ally and self", () => {
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
            coordinate: { row: 0, col: 2 },
        })

        const shortRangeAttack = SquaddieActionService.new({
            id: "short-attack",
            name: "Short Range Attack",
            range: ActionRange.SHORT,
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
        squaddieActionManager.addOrUpdate(shortRangeAttack)

        const result =
            SquaddieActionValidationService.calculateReachableSquaddiesByCoordinate(
                {
                    actor,
                    action: { id: shortRangeAttack.id },
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager,
                        coordinateMapCollectionManager,
                    },
                    map: { mapId },
                }
            )

        const actorCoordinateKey = OffsetCoordinateService.coordinateToKey({
            row: 0,
            col: 0,
        })
        const allyCoordinateKey = OffsetCoordinateService.coordinateToKey({
            row: 0,
            col: 1,
        })
        const enemyCoordinateKey = OffsetCoordinateService.coordinateToKey({
            row: 0,
            col: 2,
        })
        const enemySquaddieKey =
            SquaddieIdConverterService.squaddieIdToKey(enemy)

        expect(result.size).toBe(1)
        expect(result.has(actorCoordinateKey)).toBe(false)
        expect(result.has(allyCoordinateKey)).toBe(false)
        expect(result.has(enemyCoordinateKey)).toBe(true)
        expect(result.get(enemyCoordinateKey)!.has(enemySquaddieKey)).toBe(true)
    })

    it("returns empty map for non-self action when only actor is on map", () => {
        const meleeAttack = SquaddieActionService.new({
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
        squaddieActionManager.addOrUpdate(meleeAttack)

        const result =
            SquaddieActionValidationService.calculateReachableSquaddiesByCoordinate(
                {
                    actor,
                    action: { id: meleeAttack.id },
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager,
                        coordinateMapCollectionManager,
                    },
                    map: { mapId },
                }
            )

        expect(result.size).toBe(0)
    })

    describe("AoE calculateReachableSquaddiesByCoordinate", () => {
        let enemy1: BattleSquaddieId
        let enemy2: BattleSquaddieId
        const aoeMapId = "aoe-map"
        let aoeSquaddieActionManager: SquaddieActionManager
        let aoeInBattleSquaddieManager: InBattleSquaddieManager
        let aoeCoordinateMapCollectionManager: CoordinateMapCollectionManager
        let aoeActor: BattleSquaddieId
        let aoeAction: SquaddieAction

        beforeEach(() => {
            const { manager: aoeOutOfBattle } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    { sheetId: "aoe-sheet" }
                )

            aoeOutOfBattle.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "aoe-actor",
                    name: "AoE Actor",
                    actionIds: [],
                    attributeSheetId: "aoe-sheet",
                    affiliation: SquaddieAffiliation.PLAYER,
                })
            )
            aoeOutOfBattle.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "enemy-1",
                    name: "Enemy 1",
                    actionIds: [],
                    attributeSheetId: "aoe-sheet",
                    affiliation: SquaddieAffiliation.ENEMY,
                })
            )
            aoeOutOfBattle.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "enemy-2",
                    name: "Enemy 2",
                    actionIds: [],
                    attributeSheetId: "aoe-sheet",
                    affiliation: SquaddieAffiliation.ENEMY,
                })
            )

            const inBattleCollection = InBattleSquaddieCollectionService.new()
            aoeInBattleSquaddieManager = new InBattleSquaddieManager(
                inBattleCollection,
                aoeOutOfBattle
            )

            const { inBattleSquaddieId: actorId } =
                aoeInBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "aoe-actor",
                })
            aoeActor = {
                inBattleSquaddieId: actorId,
                outOfBattleSquaddieId: "aoe-actor",
            }

            const { inBattleSquaddieId: enemy1Id } =
                aoeInBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy-1",
                })
            enemy1 = {
                inBattleSquaddieId: enemy1Id,
                outOfBattleSquaddieId: "enemy-1",
            }

            const { inBattleSquaddieId: enemy2Id } =
                aoeInBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy-2",
                })
            enemy2 = {
                inBattleSquaddieId: enemy2Id,
                outOfBattleSquaddieId: "enemy-2",
            }

            aoeSquaddieActionManager = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )

            let mapCollection = CoordinateMapCollectionService.new()
            mapCollection = CoordinateMapCollectionService.addOrUpdate({
                collection: mapCollection,
                map: CoordinateMapService.new({
                    id: aoeMapId,
                    name: "AoE Map",
                    movementProperties: [
                        "1 1 1 1 1 1 1 1 1 1 ",
                        " 1 1 1 1 1 1 1 1 1 1",
                        "1 1 1 1 1 1 1 1 1 1 ",
                    ],
                }),
            })
            aoeCoordinateMapCollectionManager =
                new CoordinateMapCollectionManager(mapCollection)

            aoeCoordinateMapCollectionManager.addSquaddie({
                mapId: aoeMapId,
                squaddieId: aoeActor,
                coordinate: { row: 0, col: 0 },
            })
            aoeCoordinateMapCollectionManager.addSquaddie({
                mapId: aoeMapId,
                squaddieId: enemy1,
                coordinate: { row: 0, col: 2 },
            })
            aoeCoordinateMapCollectionManager.addSquaddie({
                mapId: aoeMapId,
                squaddieId: enemy2,
                coordinate: { row: 0, col: 3 },
            })

            aoeAction = SquaddieActionService.new({
                id: "aoe-action",
                name: "AoE Action",
                range: ActionRange.SHORT,
                shape: CoordinateGeneratorShape.BLOOM,
                areaOfEffectSize: 1,
                targetCoordinateRequiresTarget: false,
                affiliationRelationship: {
                    self: false,
                    foe: true,
                    friend: false,
                },
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: 2,
                            targetProficiency: ProficiencyType.ARMOR,
                        },
                    },
                },
            })
            aoeSquaddieActionManager.addOrUpdate(aoeAction)
        })

        const calculateReachableSquaddies = () => {
            return SquaddieActionValidationService.calculateReachableSquaddiesByCoordinate(
                {
                    actor: aoeActor,
                    action: { id: aoeAction.id },
                    managers: {
                        inBattleSquaddieManager: aoeInBattleSquaddieManager,
                        squaddieActionManager: aoeSquaddieActionManager,
                        coordinateMapCollectionManager:
                            aoeCoordinateMapCollectionManager,
                    },
                    map: { mapId: aoeMapId },
                }
            )
        }

        it("calculateReachableSquaddiesByCoordinate for size>0 returns blast center coords that would hit valid targets", () => {
            const result = calculateReachableSquaddies()
            const blastCenterKey = OffsetCoordinateService.coordinateToKey({
                row: 0,
                col: 2,
            })
            expect(result.has(blastCenterKey)).toBe(true)
        })

        it("calculateReachableSquaddiesByCoordinate for size>0 groups all AoE squaddies under blast center key", () => {
            const result = calculateReachableSquaddies()
            const blastCenterKey = OffsetCoordinateService.coordinateToKey({
                row: 0,
                col: 2,
            })
            const enemy1Key = SquaddieIdConverterService.squaddieIdToKey(enemy1)
            const enemy2Key = SquaddieIdConverterService.squaddieIdToKey(enemy2)

            expect(result.has(blastCenterKey)).toBe(true)
            expect(result.get(blastCenterKey)!.has(enemy1Key)).toBe(true)
            expect(result.get(blastCenterKey)!.has(enemy2Key)).toBe(true)
        })

        it("calculateReachableSquaddiesByCoordinate for size>0 omits coords where blast hits no valid targets", () => {
            const result = calculateReachableSquaddies()
            const farCoordinateKey = OffsetCoordinateService.coordinateToKey({
                row: 2,
                col: 8,
            })
            expect(result.has(farCoordinateKey)).toBe(false)
        })
    })
})
