import { beforeEach, describe, expect, it } from "vitest"
import { SquaddieActionValidationService } from "../squaddieActionValidationService"
import { SquaddieActionManager } from "../../../squaddieActionManager"
import { SquaddieActionCollectionService } from "../../../squaddieActionCollection"
import { SquaddieActionService } from "../../../squaddieAction"
import { InBattleSquaddieManager } from "../../../../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../../../../squaddie/inBattle/inBattleSquaddieCollection"
import { OutOfBattleSquaddieService } from "../../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { OutOfBattleSquaddieTestSetup } from "../../../../testUtils/outOfBattleSquaddieTestSetup"
import { SquaddieAffiliation } from "../../../../affiliation/affiliation"
import { DegreeOfSuccess } from "../../../../degreesOfSuccess/degreeOfSuccess"
import type { OutOfBattleSquaddieManager } from "../../../../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { CoordinateMapCollectionManager } from "../../../../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../../../../coordinateMap/coordinateMapCollection"
import { CoordinateMapService } from "../../../../coordinateMap/coordinateMap"
import { ActionRange } from "../../../actionRange"
import { ProficiencyType } from "../../../../proficiency/proficiencyLevel"
import { CoordinateMovePathService } from "../../../../coordinateMap/path/path"
import type { BattleSquaddieId } from "../../../../squaddie/inBattle/battleSquaddieId"

describe("generateValidSquaddieActions", () => {
    let squaddieActionManager: SquaddieActionManager
    let inBattleSquaddieManager: InBattleSquaddieManager
    let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    let coordinateMapCollectionManager: CoordinateMapCollectionManager
    let actor: BattleSquaddieId
    let ally: BattleSquaddieId
    let enemy: BattleSquaddieId
    const mapId = "test-map"
    const meleeAttackId = "melee-attack"
    const rangedHealId = "ranged-heal"

    beforeEach(() => {
        const { manager } =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "test-sheet",
                attributeSheetOptions: {
                    distancePerAction: 1,
                    maxHitPoints: 10,
                },
            })
        outOfBattleSquaddieManager = manager

        const actorSquaddie = OutOfBattleSquaddieService.new({
            id: "actor",
            name: "Actor",
            actionIds: [meleeAttackId, rangedHealId],
            attributeSheetId: "test-sheet",
            affiliation: SquaddieAffiliation.PLAYER,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(actorSquaddie)

        const allySquaddie = OutOfBattleSquaddieService.new({
            id: "ally",
            name: "Ally",
            actionIds: [],
            attributeSheetId: "test-sheet",
            affiliation: SquaddieAffiliation.ALLY,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(allySquaddie)

        const enemySquaddie = OutOfBattleSquaddieService.new({
            id: "enemy",
            name: "Enemy",
            actionIds: [],
            attributeSheetId: "test-sheet",
            affiliation: SquaddieAffiliation.ENEMY,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(enemySquaddie)

        const inBattleCollection = InBattleSquaddieCollectionService.new()
        inBattleSquaddieManager = new InBattleSquaddieManager(
            inBattleCollection,
            outOfBattleSquaddieManager
        )

        const { inBattleSquaddieId: actorInBattleId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor",
            })
        actor = {
            inBattleSquaddieId: actorInBattleId,
            outOfBattleSquaddieId: "actor",
        }

        const { inBattleSquaddieId: allyInBattleId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "ally",
            })
        ally = {
            inBattleSquaddieId: allyInBattleId,
            outOfBattleSquaddieId: "ally",
        }

        const { inBattleSquaddieId: enemyInBattleId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy",
            })
        enemy = {
            inBattleSquaddieId: enemyInBattleId,
            outOfBattleSquaddieId: "enemy",
        }

        squaddieActionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )

        const meleeAttack = SquaddieActionService.new({
            id: meleeAttackId,
            name: "Melee Attack",
            range: ActionRange.MELEE,
            affiliationRelationship: {
                self: false,
                foe: true,
                friend: false,
            },
            proficiency: ProficiencyType.WEAPON_SIMPLE,
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
        })
        squaddieActionManager.addOrUpdate(meleeAttack)

        const rangedHeal = SquaddieActionService.new({
            id: rangedHealId,
            name: "Ranged Heal",
            range: ActionRange.SHORT,
            affiliationRelationship: {
                self: true,
                foe: false,
                friend: true,
            },
            proficiency: ProficiencyType.SKILL_SOUL,
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: { spent: 1 },
                },
            },
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    healing: {
                        raw: 3,
                    },
                },
            },
        })
        squaddieActionManager.addOrUpdate(rangedHeal)

        let mapCollection = CoordinateMapCollectionService.new()
        mapCollection = CoordinateMapCollectionService.addOrUpdate({
            collection: mapCollection,
            map: CoordinateMapService.new({
                id: mapId,
                name: "Test Map",
                movementProperties: ["1 1 1 1 1 1 1"],
            }),
        })
        coordinateMapCollectionManager = new CoordinateMapCollectionManager(
            mapCollection
        )

        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: actor,
            coordinate: { row: 0, col: 3 },
        })

        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: ally,
            coordinate: { row: 0, col: 6 },
        })

        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: enemy,
            coordinate: { row: 0, col: 0 },
        })

        inBattleSquaddieManager.dealDamageToSquaddie({
            ...ally,
            damage: { amount: 5, type: undefined },
        })
    })

    describe("end turn option", () => {
        it("always includes an end turn option with 0 remaining action points", () => {
            const options =
                SquaddieActionValidationService.generateValidSquaddieActions({
                    actor,
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager,
                        coordinateMapCollectionManager,
                    },
                    map: { mapId },
                })

            const endTurnOption = options.find(
                (opt) => opt.action.id === "default-end-turn"
            )

            expect(endTurnOption).toBeDefined()
            expect(endTurnOption!.action.name).toBe("End Turn")
            expect(endTurnOption!.actionPointsRemaining.current).toBe(0)
            expect(endTurnOption!.decisions).toEqual({})
        })
    })

    describe("movement options", () => {
        it("generates movement options to reachable positions", () => {
            const options =
                SquaddieActionValidationService.generateValidSquaddieActions({
                    actor,
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager,
                        coordinateMapCollectionManager,
                    },
                    map: { mapId },
                })

            const movementOptions = options.filter(
                (opt) => opt.action.id === "default-move"
            )

            expect(movementOptions.length).toBeGreaterThan(0)

            const moveToCol4 = movementOptions.find(
                (opt) =>
                    opt.decisions.targetDestination?.row === 0 &&
                    opt.decisions.targetDestination?.col === 4
            )
            expect(moveToCol4).toBeDefined()
            expect(moveToCol4!.movementPath).toBeDefined()
            expect(moveToCol4!.actionPointsRemaining.current).toBe(2)
        })

        it("calculates correct remaining action points for each movement distance", () => {
            const options =
                SquaddieActionValidationService.generateValidSquaddieActions({
                    actor,
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager,
                        coordinateMapCollectionManager,
                    },
                    map: { mapId },
                })

            const movementOptions = options.filter(
                (opt) => opt.action.id === "default-move"
            )

            const moveDistance1 = movementOptions.find(
                (opt) =>
                    opt.decisions.targetDestination?.col === 4 &&
                    opt.decisions.targetDestination?.row === 0
            )
            expect(moveDistance1!.actionPointsRemaining.current).toBe(2)

            const moveDistance2 = movementOptions.find(
                (opt) =>
                    opt.decisions.targetDestination?.col === 5 &&
                    opt.decisions.targetDestination?.row === 0
            )
            expect(moveDistance2!.actionPointsRemaining.current).toBe(1)
        })

        it("does not generate movement to unreachable positions", () => {
            const options =
                SquaddieActionValidationService.generateValidSquaddieActions({
                    actor,
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager,
                        coordinateMapCollectionManager,
                    },
                    map: { mapId },
                })

            const movementOptions = options.filter(
                (opt) => opt.action.id === "default-move"
            )

            const moveToCol0 = movementOptions.find(
                (opt) =>
                    opt.decisions.targetDestination?.row === 0 &&
                    opt.decisions.targetDestination?.col === 0
            )
            expect(moveToCol0).toBeUndefined()
        })

        it("includes the movement path for each movement option", () => {
            const options =
                SquaddieActionValidationService.generateValidSquaddieActions({
                    actor,
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager,
                        coordinateMapCollectionManager,
                    },
                    map: { mapId },
                })

            const movementOptions = options.filter(
                (opt) => opt.action.id === "default-move"
            )

            for (const moveOption of movementOptions) {
                expect(moveOption.movementPath).toBeDefined()
                expect(
                    CoordinateMovePathService.getNumberOfCoordinates(
                        moveOption.movementPath!
                    )
                ).toBeGreaterThan(0)
                const endCoordinate =
                    CoordinateMovePathService.getEndCoordinate(
                        moveOption.movementPath!
                    )
                expect(endCoordinate).toBeDefined()
                expect(endCoordinate.col).toEqual(
                    moveOption.decisions.targetDestination?.col
                )
                expect(endCoordinate.row).toEqual(
                    moveOption.decisions.targetDestination?.row
                )
            }
        })
    })

    describe("ability options", () => {
        it("generates heal options when wounded ally is in range", () => {
            const options =
                SquaddieActionValidationService.generateValidSquaddieActions({
                    actor,
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager,
                        coordinateMapCollectionManager,
                    },
                    map: { mapId },
                })

            const healOptions = options.filter(
                (opt) => opt.action.id === rangedHealId
            )

            expect(healOptions.length).toBeGreaterThan(0)

            const healAlly = healOptions.find(
                (opt) =>
                    opt.decisions.targetCoordinate?.row === 0 &&
                    opt.decisions.targetCoordinate?.col === 6
            )
            expect(healAlly).toBeDefined()
            expect(healAlly!.actionPointsRemaining.current).toBe(2)
        })

        it("does not generate melee attack options when no enemy is in range", () => {
            const options =
                SquaddieActionValidationService.generateValidSquaddieActions({
                    actor,
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager,
                        coordinateMapCollectionManager,
                    },
                    map: { mapId },
                })

            const meleeOptions = options.filter(
                (opt) => opt.action.id === meleeAttackId
            )

            expect(meleeOptions.length).toBe(0)
        })

        it("does not generate options for actions requiring more action points than available", () => {
            inBattleSquaddieManager.spendActionPoints({
                ...actor,
                actionPoints: 3,
            })

            const options =
                SquaddieActionValidationService.generateValidSquaddieActions({
                    actor,
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager,
                        coordinateMapCollectionManager,
                    },
                    map: { mapId },
                })

            const healOptions = options.filter(
                (opt) => opt.action.id === rangedHealId
            )
            expect(healOptions.length).toBe(0)
        })
    })

    describe("actionPointsOverride", () => {
        it("uses override action points for calculations", () => {
            const options =
                SquaddieActionValidationService.generateValidSquaddieActions({
                    actor,
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager,
                        coordinateMapCollectionManager,
                    },
                    map: { mapId },
                    actionPointsOverride: { current: 1 },
                })

            const movementOptions = options.filter(
                (opt) => opt.action.id === "default-move"
            )

            const maxDistance = Math.max(
                ...movementOptions.map((opt) => {
                    const dest = opt.decisions.targetDestination
                    return Math.abs((dest?.col ?? 3) - 3)
                })
            )
            expect(maxDistance).toBeLessThanOrEqual(1)

            const moveOption = movementOptions.find(
                (opt) =>
                    opt.decisions.targetDestination?.col === 4 &&
                    opt.decisions.targetDestination?.row === 0
            )
            expect(moveOption).toBeDefined()
            expect(moveOption!.actionPointsRemaining.current).toBe(0)
        })
    })
})
