import { beforeEach, describe, expect, it } from "vitest"
import { SquaddieActionValidationService } from "../squaddieActionValidationService.js"
import { SquaddieActionManager } from "../../../squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../../../squaddieActionCollection.js"
import {
    DEFAULT_END_TURN_ACTION_ID,
    DEFAULT_MOVE_ACTION_ID,
    SquaddieActionService,
} from "../../../squaddieAction.js"
import { InBattleSquaddieManager } from "../../../../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../../../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { OutOfBattleSquaddieService } from "../../../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { OutOfBattleSquaddieTestSetup } from "../../../../testUtils/outOfBattleSquaddieTestSetup.js"
import { SquaddieAffiliation } from "../../../../affiliation/affiliation.js"
import { DegreeOfSuccess } from "../../../../degreesOfSuccess/degreeOfSuccess.js"
import type { OutOfBattleSquaddieManager } from "../../../../squaddie/outOfBattle/outOfBattleSquaddieManager.js"
import { CoordinateMapCollectionManager } from "../../../../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../../../../coordinateMap/coordinateMapCollection.js"
import { CoordinateMapService } from "../../../../coordinateMap/coordinateMap.js"
import { ActionRange } from "../../../actionRange.js"
import { ProficiencyType } from "../../../../proficiency/proficiencyLevel.js"
import {
    SquaddieConditionDecaysAt,
    SquaddieConditionService,
    SquaddieConditionSource,
    SquaddieConditionType,
} from "../../../../proficiency/squaddieCondition.js"
import type { BattleSquaddieId } from "../../../../squaddie/inBattle/battleSquaddieId.js"

describe("categorizeSquaddieActions", () => {
    let squaddieActionManager: SquaddieActionManager
    let inBattleSquaddieManager: InBattleSquaddieManager
    let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    let coordinateMapCollectionManager: CoordinateMapCollectionManager
    let actor: BattleSquaddieId
    let enemy: BattleSquaddieId
    let ally: BattleSquaddieId
    const mapId = "test-map"
    const meleeAttackId = "melee-attack"
    const rangedHealId = "ranged-heal"
    const healAndProtectActionId = "healAndProtectActionId"

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
            actionIds: [meleeAttackId, rangedHealId],
            attributeSheetId: "test-sheet",
            affiliation: SquaddieAffiliation.PLAYER,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(actorSquaddie)

        const enemySquaddie = OutOfBattleSquaddieService.new({
            id: "enemy",
            actionIds: [],
            attributeSheetId: "test-sheet",
            affiliation: SquaddieAffiliation.ENEMY,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(enemySquaddie)

        const allySquaddie = OutOfBattleSquaddieService.new({
            id: "ally",
            actionIds: [healAndProtectActionId],
            attributeSheetId: "test-sheet",
            affiliation: SquaddieAffiliation.ALLY,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(allySquaddie)

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

        const { inBattleSquaddieId: enemyInBattleId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy",
            })
        enemy = {
            inBattleSquaddieId: enemyInBattleId,
            outOfBattleSquaddieId: "enemy",
        }

        const { inBattleSquaddieId: allyInBattleId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "ally",
            })
        ally = {
            inBattleSquaddieId: allyInBattleId,
            outOfBattleSquaddieId: "ally",
        }

        squaddieActionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )

        const meleeAttack = SquaddieActionService.new({
            id: meleeAttackId,
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

        const healAndProtectAction = SquaddieActionService.new({
            id: healAndProtectActionId,
            range: ActionRange.SELF,
            affiliationRelationship: {
                self: true,
                foe: false,
                friend: false,
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
                    conditions: {
                        add: [
                            SquaddieConditionService.new({
                                type: SquaddieConditionType.ABSORB,
                                amount: { amount: 1 },
                                duration: {
                                    duration: 1,
                                    decaysAt:
                                        SquaddieConditionDecaysAt.TURN_END,
                                },
                                source: SquaddieConditionSource.PHYSICAL,
                            }),
                        ],
                    },
                },
            },
        })
        squaddieActionManager.addOrUpdate(healAndProtectAction)

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
    })

    it("reports action as invalid when squaddie has insufficient action points", () => {
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: actor,
            coordinate: { row: 0, col: 0 },
        })
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: enemy,
            coordinate: { row: 0, col: 1 },
        })

        inBattleSquaddieManager.spendActionPoints({
            ...actor,
            actionPoints: 3,
        })

        const result =
            SquaddieActionValidationService.categorizeSquaddieActions({
                actor,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

        const meleeInvalid = result.invalidActions.find(
            (a) => a.actionId === meleeAttackId
        )
        expect(meleeInvalid).toBeDefined()
        expect(meleeInvalid!.reason).toBe("Needs 1 action points")

        const healInvalid = result.invalidActions.find(
            (a) => a.actionId === rangedHealId
        )
        expect(healInvalid).toBeDefined()
        expect(healInvalid!.reason).toBe("Needs 1 action points")

        const endTurnValid = result.validActions.find(
            (a) => a.actionId === DEFAULT_END_TURN_ACTION_ID
        )
        expect(endTurnValid).toBeDefined()

        const moveInvalid = result.invalidActions.find(
            (a) => a.actionId === DEFAULT_MOVE_ACTION_ID
        )
        expect(moveInvalid).toBeDefined()
        expect(moveInvalid!.reason).toBe("No valid movement destinations")
    })

    it("reports action as invalid when no applicable targets are in range", () => {
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: actor,
            coordinate: { row: 0, col: 0 },
        })
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: enemy,
            coordinate: { row: 0, col: 6 },
        })

        const result =
            SquaddieActionValidationService.categorizeSquaddieActions({
                actor,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

        const meleeInvalid = result.invalidActions.find(
            (a) => a.actionId === meleeAttackId
        )
        expect(meleeInvalid).toBeDefined()
        expect(meleeInvalid!.reason).toBe("No applicable targets in range")
    })

    it("reports action as valid when AP and targets are sufficient", () => {
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: actor,
            coordinate: { row: 0, col: 0 },
        })
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: enemy,
            coordinate: { row: 0, col: 1 },
        })

        const result =
            SquaddieActionValidationService.categorizeSquaddieActions({
                actor,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

        const meleeValid = result.validActions.find(
            (a) => a.actionId === meleeAttackId
        )
        expect(meleeValid).toBeDefined()
        const meleeAimEntry = meleeValid!.aimCoordinateResults.find(
            (e) => e.aimCoordinate.row === 0 && e.aimCoordinate.col === 1
        )
        expect(meleeAimEntry).toBeDefined()
        expect(meleeAimEntry!.targetIds).toContainEqual(
            expect.objectContaining({
                outOfBattleSquaddieId: "enemy",
            })
        )
    })

    it("when the actor is damaged and the enemy is out of melee range, lists melee as invalid and ranged heal as valid", () => {
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: actor,
            coordinate: { row: 0, col: 0 },
        })
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: enemy,
            coordinate: { row: 0, col: 6 },
        })

        inBattleSquaddieManager.dealDamageToSquaddie({
            ...actor,
            damage: { amount: 3, type: undefined },
        })

        const result =
            SquaddieActionValidationService.categorizeSquaddieActions({
                actor,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

        const meleeInvalid = result.invalidActions.find(
            (a) => a.actionId === meleeAttackId
        )
        expect(meleeInvalid).toBeDefined()
        expect(meleeInvalid!.reason).toBe("No applicable targets in range")

        const healValid = result.validActions.find(
            (a) => a.actionId === rangedHealId
        )
        expect(healValid).toBeDefined()
        const healAimEntry = healValid!.aimCoordinateResults.find(
            (e) => e.aimCoordinate.row === 0 && e.aimCoordinate.col === 0
        )
        expect(healAimEntry).toBeDefined()
        expect(healAimEntry!.targetIds).toContainEqual(
            expect.objectContaining({
                outOfBattleSquaddieId: "actor",
            })
        )
    })

    it("reports action as invalid when action has no effect on available targets", () => {
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: actor,
            coordinate: { row: 0, col: 0 },
        })
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: enemy,
            coordinate: { row: 0, col: 6 },
        })

        const result =
            SquaddieActionValidationService.categorizeSquaddieActions({
                actor,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

        const meleeInvalid = result.invalidActions.find(
            (a) => a.actionId === meleeAttackId
        )
        expect(meleeInvalid).toBeDefined()
        expect(meleeInvalid!.reason).toBe("No applicable targets in range")

        const healInvalid = result.invalidActions.find(
            (a) => a.actionId === rangedHealId
        )
        expect(healInvalid).toBeDefined()
        expect(healInvalid!.reason).toBe("No targets can be affected")
    })

    it("knows the action is valid if it applies a condition", () => {
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: ally,
            coordinate: { row: 0, col: 0 },
        })

        const result =
            SquaddieActionValidationService.categorizeSquaddieActions({
                actor: ally,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

        const healAndProtectIsValid = result.validActions.find(
            (a) => a.actionId === healAndProtectActionId
        )
        expect(healAndProtectIsValid).toBeDefined()
        const healAndProtectAimEntry =
            healAndProtectIsValid!.aimCoordinateResults.find(
                (e) => e.aimCoordinate.row === 0 && e.aimCoordinate.col === 0
            )
        expect(healAndProtectAimEntry).toBeDefined()
        expect(healAndProtectAimEntry!.targetIds).toContainEqual(
            expect.objectContaining({
                outOfBattleSquaddieId: "ally",
            })
        )
    })

    it("knows the action is invalid if condition will have no effect", () => {
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: ally,
            coordinate: { row: 0, col: 0 },
        })
        inBattleSquaddieManager.addConditionsToSquaddie({
            ...ally,
            conditions: [
                SquaddieConditionService.new({
                    type: SquaddieConditionType.ABSORB,
                    amount: { amount: 2 },
                    duration: {
                        duration: 10,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                    source: SquaddieConditionSource.PHYSICAL,
                }),
            ],
        })

        const result =
            SquaddieActionValidationService.categorizeSquaddieActions({
                actor: ally,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

        const healAndProtectIsInvalid = result.invalidActions.find(
            (a) => a.actionId === healAndProtectActionId
        )
        expect(healAndProtectIsInvalid).toBeDefined()
        expect(healAndProtectIsInvalid!.reason).toBe(
            "No targets can be affected"
        )
    })

    it("EndTurn is always valid", () => {
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: actor,
            coordinate: { row: 0, col: 0 },
        })

        const result =
            SquaddieActionValidationService.categorizeSquaddieActions({
                actor,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

        const endTurnValid = result.validActions.find(
            (a) => a.actionId === DEFAULT_END_TURN_ACTION_ID
        )
        expect(endTurnValid).toBeDefined()
        expect(endTurnValid!.reachableCoordinates).toEqual([])
        expect(endTurnValid!.aimCoordinateResults).toEqual([])
    })

    it("Movement is valid when there are reachable destinations", () => {
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: actor,
            coordinate: { row: 0, col: 3 },
        })

        const result =
            SquaddieActionValidationService.categorizeSquaddieActions({
                actor,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

        const moveValid = result.validActions.find(
            (a) => a.actionId === DEFAULT_MOVE_ACTION_ID
        )
        expect(moveValid).toBeDefined()
        expect(moveValid!.aimCoordinateResults.length).toBeGreaterThan(0)
        moveValid!.aimCoordinateResults.forEach((entry) => {
            expect(entry.targetIds).toEqual([])
        })
    })

    describe("when the actor has an action on cooldown with 2 turns remaining", () => {
        beforeEach(() => {
            const cooldownAction = SquaddieActionService.new({
                id: meleeAttackId,
                cooldownTurns: 2,
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
            squaddieActionManager.addOrUpdate(cooldownAction)
            inBattleSquaddieManager.recordCooldown({
                battleSquaddieId: actor,
                actionId: meleeAttackId,
                turnsRemaining: 2,
            })
        })

        it("lists the action in invalidActions with the cooldown reason", () => {
            const result =
                SquaddieActionValidationService.categorizeSquaddieActions({
                    actor,
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager,
                        coordinateMapCollectionManager,
                    },
                    map: { mapId },
                })

            expect(result.invalidActions).toContainEqual(
                expect.objectContaining({
                    actionId: meleeAttackId,
                    reason: "Cannot be used for 2 turns",
                })
            )
        })
    })

    it("Movement is invalid when surrounded with no reachable destinations", () => {
        let smallMapCollection = CoordinateMapCollectionService.new()
        smallMapCollection = CoordinateMapCollectionService.addOrUpdate({
            collection: smallMapCollection,
            map: CoordinateMapService.new({
                id: "small-map",
                name: "Small Map",
                movementProperties: ["1"],
            }),
        })
        const smallMapManager = new CoordinateMapCollectionManager(
            smallMapCollection
        )
        smallMapManager.addSquaddie({
            mapId: "small-map",
            squaddieId: actor,
            coordinate: { row: 0, col: 0 },
        })

        const result =
            SquaddieActionValidationService.categorizeSquaddieActions({
                actor,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager: smallMapManager,
                },
                map: { mapId: "small-map" },
            })

        const moveInvalid = result.invalidActions.find(
            (a) => a.actionId === DEFAULT_MOVE_ACTION_ID
        )
        expect(moveInvalid).toBeDefined()
        expect(moveInvalid!.reason).toBe("No valid movement destinations")
    })
})
