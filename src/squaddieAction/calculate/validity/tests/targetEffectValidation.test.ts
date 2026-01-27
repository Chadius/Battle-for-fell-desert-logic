import { beforeEach, describe, expect, it } from "vitest"
import { SquaddieActionValidationService } from "../squaddieActionValidationService"
import { SquaddieActionManager } from "../../../squaddieActionManager"
import { SquaddieActionCollectionService } from "../../../squaddieActionCollection"
import {
    type SquaddieAction,
    SquaddieActionService,
} from "../../../squaddieAction"
import {
    type BattleSquaddieId,
    InBattleSquaddieManager,
} from "../../../../squaddie/inBattle/inBattleSquaddieManager"
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
import { SquaddieConditionType } from "../../../../proficiency/squaddieCondition"
import { ProficiencyType } from "../../../../proficiency/proficiencyLevel"

describe("target effect validation", () => {
    let effectSquaddieActionManager: SquaddieActionManager
    let effectInBattleSquaddieManager: InBattleSquaddieManager
    let effectOutOfBattleSquaddieManager: OutOfBattleSquaddieManager
    let effectCoordinateMapCollectionManager: CoordinateMapCollectionManager
    let effectActor: BattleSquaddieId
    const effectMapId = "effect-test-map"
    let healAction: SquaddieAction
    let attackAction: SquaddieAction

    beforeEach(() => {
        ;({ manager: effectOutOfBattleSquaddieManager } =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "effect-sheet",
            }))

        const effectActorSquaddie = OutOfBattleSquaddieService.new({
            id: "effect-actor",
            name: "Effect Actor",
            actionIds: [],
            attributeSheetId: "effect-sheet",
            affiliation: SquaddieAffiliation.PLAYER,
        })
        effectOutOfBattleSquaddieManager.addOrUpdateSquaddie(
            effectActorSquaddie
        )

        const inBattleCollection = InBattleSquaddieCollectionService.new()
        effectInBattleSquaddieManager = new InBattleSquaddieManager(
            inBattleCollection,
            effectOutOfBattleSquaddieManager
        )

        const { inBattleSquaddieId } =
            effectInBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "effect-actor",
            })
        effectActor = {
            inBattleSquaddieId,
            outOfBattleSquaddieId: "effect-actor",
        }

        effectSquaddieActionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )

        let mapCollection = CoordinateMapCollectionService.new()
        mapCollection = CoordinateMapCollectionService.addOrUpdate({
            collection: mapCollection,
            map: CoordinateMapService.new({
                id: effectMapId,
                name: "Effect Test Map",
                movementProperties: ["1 1 1 1 1 ", " 1 1 1 1 1"],
            }),
        })
        effectCoordinateMapCollectionManager =
            new CoordinateMapCollectionManager(mapCollection)

        effectCoordinateMapCollectionManager.addSquaddie({
            mapId: effectMapId,
            squaddieId: effectActor,
            coordinate: { row: 0, col: 0 },
        })

        healAction = SquaddieActionService.new({
            id: "heal",
            name: "Heal",
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
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    healing: { raw: 5 },
                },
            },
        })

        attackAction = SquaddieActionService.new({
            id: "attack",
            name: "Attack",
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
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    damage: {
                        raw: 5,
                        targetProficiency: ProficiencyType.ARMOR,
                    },
                },
            },
        })
    })

    it("returns invalid when healing action targets squaddie at full HP", () => {
        const allySquaddie = OutOfBattleSquaddieService.new({
            id: "ally",
            name: "Ally",
            actionIds: [],
            attributeSheetId: "effect-sheet",
            affiliation: SquaddieAffiliation.ALLY,
        })
        effectOutOfBattleSquaddieManager.addOrUpdateSquaddie(allySquaddie)
        const { inBattleSquaddieId: allyInBattleId } =
            effectInBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "ally",
            })
        const ally: BattleSquaddieId = {
            inBattleSquaddieId: allyInBattleId,
            outOfBattleSquaddieId: "ally",
        }
        effectCoordinateMapCollectionManager.addSquaddie({
            mapId: effectMapId,
            squaddieId: ally,
            coordinate: { row: 0, col: 1 },
        })

        effectSquaddieActionManager.addOrUpdate(healAction)

        const result = SquaddieActionValidationService.isActionValid({
            actor: effectActor,
            action: { id: healAction.id },
            targets: [ally],
            managers: {
                inBattleSquaddieManager: effectInBattleSquaddieManager,
                squaddieActionManager: effectSquaddieActionManager,
                coordinateMapCollectionManager:
                    effectCoordinateMapCollectionManager,
            },
            map: { mapId: effectMapId },
        })

        expect(result.isValid).toBe(false)
        expect(result.reason).toBe("No targets can be affected")
    })

    it("returns valid when healing action targets squaddie below full HP", () => {
        const allySquaddie = OutOfBattleSquaddieService.new({
            id: "ally",
            name: "Ally",
            actionIds: [],
            attributeSheetId: "effect-sheet",
            affiliation: SquaddieAffiliation.ALLY,
        })
        effectOutOfBattleSquaddieManager.addOrUpdateSquaddie(allySquaddie)
        const { inBattleSquaddieId: allyInBattleId } =
            effectInBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "ally",
            })
        const ally: BattleSquaddieId = {
            inBattleSquaddieId: allyInBattleId,
            outOfBattleSquaddieId: "ally",
        }
        effectCoordinateMapCollectionManager.addSquaddie({
            mapId: effectMapId,
            squaddieId: ally,
            coordinate: { row: 0, col: 1 },
        })

        effectInBattleSquaddieManager.dealDamageToSquaddie({
            ...ally,
            damage: { amount: 3, type: undefined },
        })

        effectSquaddieActionManager.addOrUpdate(healAction)

        const result = SquaddieActionValidationService.isActionValid({
            actor: effectActor,
            action: { id: healAction.id },
            targets: [ally],
            managers: {
                inBattleSquaddieManager: effectInBattleSquaddieManager,
                squaddieActionManager: effectSquaddieActionManager,
                coordinateMapCollectionManager:
                    effectCoordinateMapCollectionManager,
            },
            map: { mapId: effectMapId },
        })

        expect(result.isValid).toBe(true)
    })

    it("returns invalid when damage action targets squaddie with 0 HP", () => {
        const enemySquaddie = OutOfBattleSquaddieService.new({
            id: "enemy",
            name: "Enemy",
            actionIds: [],
            attributeSheetId: "effect-sheet",
            affiliation: SquaddieAffiliation.ENEMY,
        })
        effectOutOfBattleSquaddieManager.addOrUpdateSquaddie(enemySquaddie)
        const { inBattleSquaddieId: enemyInBattleId } =
            effectInBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy",
            })
        const enemy: BattleSquaddieId = {
            inBattleSquaddieId: enemyInBattleId,
            outOfBattleSquaddieId: "enemy",
        }
        effectCoordinateMapCollectionManager.addSquaddie({
            mapId: effectMapId,
            squaddieId: enemy,
            coordinate: { row: 0, col: 1 },
        })

        effectInBattleSquaddieManager.dealDamageToSquaddie({
            ...enemy,
            damage: { amount: 100, type: undefined },
        })

        effectSquaddieActionManager.addOrUpdate(attackAction)

        const result = SquaddieActionValidationService.isActionValid({
            actor: effectActor,
            action: { id: attackAction.id },
            targets: [enemy],
            managers: {
                inBattleSquaddieManager: effectInBattleSquaddieManager,
                squaddieActionManager: effectSquaddieActionManager,
                coordinateMapCollectionManager:
                    effectCoordinateMapCollectionManager,
            },
            map: { mapId: effectMapId },
        })

        expect(result.isValid).toBe(false)
        expect(result.reason).toBe("No targets can be affected")
    })

    it("returns valid when damage action targets squaddie with HP remaining", () => {
        const enemySquaddie = OutOfBattleSquaddieService.new({
            id: "enemy",
            name: "Enemy",
            actionIds: [],
            attributeSheetId: "effect-sheet",
            affiliation: SquaddieAffiliation.ENEMY,
        })
        effectOutOfBattleSquaddieManager.addOrUpdateSquaddie(enemySquaddie)
        const { inBattleSquaddieId: enemyInBattleId } =
            effectInBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy",
            })
        const enemy: BattleSquaddieId = {
            inBattleSquaddieId: enemyInBattleId,
            outOfBattleSquaddieId: "enemy",
        }
        effectCoordinateMapCollectionManager.addSquaddie({
            mapId: effectMapId,
            squaddieId: enemy,
            coordinate: { row: 0, col: 1 },
        })

        effectSquaddieActionManager.addOrUpdate(attackAction)

        const result = SquaddieActionValidationService.isActionValid({
            actor: effectActor,
            action: { id: attackAction.id },
            targets: [enemy],
            managers: {
                inBattleSquaddieManager: effectInBattleSquaddieManager,
                squaddieActionManager: effectSquaddieActionManager,
                coordinateMapCollectionManager:
                    effectCoordinateMapCollectionManager,
            },
            map: { mapId: effectMapId },
        })

        expect(result.isValid).toBe(true)
    })

    it("returns invalid when dispel targets squaddie with no dispellable conditions", () => {
        const allySquaddie = OutOfBattleSquaddieService.new({
            id: "ally",
            name: "Ally",
            actionIds: [],
            attributeSheetId: "effect-sheet",
            affiliation: SquaddieAffiliation.ALLY,
        })
        effectOutOfBattleSquaddieManager.addOrUpdateSquaddie(allySquaddie)
        const { inBattleSquaddieId: allyInBattleId } =
            effectInBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "ally",
            })
        const ally: BattleSquaddieId = {
            inBattleSquaddieId: allyInBattleId,
            outOfBattleSquaddieId: "ally",
        }
        effectCoordinateMapCollectionManager.addSquaddie({
            mapId: effectMapId,
            squaddieId: ally,
            coordinate: { row: 0, col: 1 },
        })

        const dispelAction = SquaddieActionService.new({
            id: "dispel",
            name: "Dispel",
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
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    conditions: {
                        dispel: {
                            all: false,
                            types: [SquaddieConditionType.ARMOR],
                            amount: undefined,
                        },
                    },
                },
            },
        })
        effectSquaddieActionManager.addOrUpdate(dispelAction)

        const result = SquaddieActionValidationService.isActionValid({
            actor: effectActor,
            action: { id: dispelAction.id },
            targets: [ally],
            managers: {
                inBattleSquaddieManager: effectInBattleSquaddieManager,
                squaddieActionManager: effectSquaddieActionManager,
                coordinateMapCollectionManager:
                    effectCoordinateMapCollectionManager,
            },
            map: { mapId: effectMapId },
        })

        expect(result.isValid).toBe(false)
        expect(result.reason).toBe("No targets can be affected")
    })

    it("returns valid when target has conditions that can be dispelled", () => {
        const allySquaddie = OutOfBattleSquaddieService.new({
            id: "ally",
            name: "Ally",
            actionIds: [],
            attributeSheetId: "effect-sheet",
            affiliation: SquaddieAffiliation.ALLY,
        })
        effectOutOfBattleSquaddieManager.addOrUpdateSquaddie(allySquaddie)
        const { inBattleSquaddieId: allyInBattleId } =
            effectInBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "ally",
            })
        const ally: BattleSquaddieId = {
            inBattleSquaddieId: allyInBattleId,
            outOfBattleSquaddieId: "ally",
        }
        effectCoordinateMapCollectionManager.addSquaddie({
            mapId: effectMapId,
            squaddieId: ally,
            coordinate: { row: 0, col: 1 },
        })

        effectInBattleSquaddieManager.addConditionsToSquaddie({
            ...ally,
            conditions: [
                {
                    type: SquaddieConditionType.ARMOR,
                    amount: 2,
                    limit: { duration: undefined },
                },
            ],
        })

        const dispelAction = SquaddieActionService.new({
            id: "dispel",
            name: "Dispel",
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
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    conditions: {
                        dispel: {
                            all: false,
                            types: [SquaddieConditionType.ARMOR],
                            amount: 2,
                        },
                    },
                },
            },
        })
        effectSquaddieActionManager.addOrUpdate(dispelAction)

        const result = SquaddieActionValidationService.isActionValid({
            actor: effectActor,
            action: { id: dispelAction.id },
            targets: [ally],
            managers: {
                inBattleSquaddieManager: effectInBattleSquaddieManager,
                squaddieActionManager: effectSquaddieActionManager,
                coordinateMapCollectionManager:
                    effectCoordinateMapCollectionManager,
            },
            map: { mapId: effectMapId },
        })

        expect(result.isValid).toBe(true)
    })

    it("returns invalid when treat targets squaddie with no treatable conditions", () => {
        const allySquaddie = OutOfBattleSquaddieService.new({
            id: "ally",
            name: "Ally",
            actionIds: [],
            attributeSheetId: "effect-sheet",
            affiliation: SquaddieAffiliation.ALLY,
        })
        effectOutOfBattleSquaddieManager.addOrUpdateSquaddie(allySquaddie)
        const { inBattleSquaddieId: allyInBattleId } =
            effectInBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "ally",
            })
        const ally: BattleSquaddieId = {
            inBattleSquaddieId: allyInBattleId,
            outOfBattleSquaddieId: "ally",
        }
        effectCoordinateMapCollectionManager.addSquaddie({
            mapId: effectMapId,
            squaddieId: ally,
            coordinate: { row: 0, col: 1 },
        })

        const treatAction = SquaddieActionService.new({
            id: "treat",
            name: "Treat",
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
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    conditions: {
                        treat: {
                            all: false,
                            types: [SquaddieConditionType.SLOWED],
                            amount: undefined,
                        },
                    },
                },
            },
        })
        effectSquaddieActionManager.addOrUpdate(treatAction)

        const result = SquaddieActionValidationService.isActionValid({
            actor: effectActor,
            action: { id: treatAction.id },
            targets: [ally],
            managers: {
                inBattleSquaddieManager: effectInBattleSquaddieManager,
                squaddieActionManager: effectSquaddieActionManager,
                coordinateMapCollectionManager:
                    effectCoordinateMapCollectionManager,
            },
            map: { mapId: effectMapId },
        })

        expect(result.isValid).toBe(false)
        expect(result.reason).toBe("No targets can be affected")
    })

    it("returns valid when target has conditions that can be treated", () => {
        const allySquaddie = OutOfBattleSquaddieService.new({
            id: "ally",
            name: "Ally",
            actionIds: [],
            attributeSheetId: "effect-sheet",
            affiliation: SquaddieAffiliation.ALLY,
        })
        effectOutOfBattleSquaddieManager.addOrUpdateSquaddie(allySquaddie)
        const { inBattleSquaddieId: allyInBattleId } =
            effectInBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "ally",
            })
        const ally: BattleSquaddieId = {
            inBattleSquaddieId: allyInBattleId,
            outOfBattleSquaddieId: "ally",
        }
        effectCoordinateMapCollectionManager.addSquaddie({
            mapId: effectMapId,
            squaddieId: ally,
            coordinate: { row: 0, col: 1 },
        })

        effectInBattleSquaddieManager.addConditionsToSquaddie({
            ...ally,
            conditions: [
                {
                    type: SquaddieConditionType.SLOWED,
                    amount: 2,
                    limit: { duration: undefined },
                },
            ],
        })

        const treatAction = SquaddieActionService.new({
            id: "treat",
            name: "Treat",
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
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    conditions: {
                        treat: {
                            all: false,
                            types: [SquaddieConditionType.SLOWED],
                            amount: 2,
                        },
                    },
                },
            },
        })
        effectSquaddieActionManager.addOrUpdate(treatAction)

        const result = SquaddieActionValidationService.isActionValid({
            actor: effectActor,
            action: { id: treatAction.id },
            targets: [ally],
            managers: {
                inBattleSquaddieManager: effectInBattleSquaddieManager,
                squaddieActionManager: effectSquaddieActionManager,
                coordinateMapCollectionManager:
                    effectCoordinateMapCollectionManager,
            },
            map: { mapId: effectMapId },
        })

        expect(result.isValid).toBe(true)
    })

    it("returns valid when condition can be added to target", () => {
        const enemySquaddie = OutOfBattleSquaddieService.new({
            id: "enemy",
            name: "Enemy",
            actionIds: [],
            attributeSheetId: "effect-sheet",
            affiliation: SquaddieAffiliation.ENEMY,
        })
        effectOutOfBattleSquaddieManager.addOrUpdateSquaddie(enemySquaddie)
        const { inBattleSquaddieId: enemyInBattleId } =
            effectInBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy",
            })
        const enemy: BattleSquaddieId = {
            inBattleSquaddieId: enemyInBattleId,
            outOfBattleSquaddieId: "enemy",
        }
        effectCoordinateMapCollectionManager.addSquaddie({
            mapId: effectMapId,
            squaddieId: enemy,
            coordinate: { row: 0, col: 1 },
        })

        const slowAction = SquaddieActionService.new({
            id: "slow",
            name: "Slow",
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
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    conditions: {
                        add: [
                            {
                                type: SquaddieConditionType.SLOWED,
                                amount: 2,
                                limit: { duration: undefined },
                            },
                        ],
                    },
                },
            },
        })
        effectSquaddieActionManager.addOrUpdate(slowAction)

        const result = SquaddieActionValidationService.isActionValid({
            actor: effectActor,
            action: { id: slowAction.id },
            targets: [enemy],
            managers: {
                inBattleSquaddieManager: effectInBattleSquaddieManager,
                squaddieActionManager: effectSquaddieActionManager,
                coordinateMapCollectionManager:
                    effectCoordinateMapCollectionManager,
            },
            map: { mapId: effectMapId },
        })

        expect(result.isValid).toBe(true)
    })

    it("returns valid when no targets provided (action may affect actor only)", () => {
        const selfBuffAction = SquaddieActionService.new({
            id: "self-buff",
            name: "Self Buff",
            range: ActionRange.SELF,
            affiliationRelationship: {
                self: true,
                foe: false,
                friend: false,
            },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: { spent: 1 },
                    conditions: {
                        add: [
                            {
                                type: SquaddieConditionType.ARMOR,
                                amount: 2,
                                limit: { duration: undefined },
                            },
                        ],
                    },
                },
            },
        })
        effectSquaddieActionManager.addOrUpdate(selfBuffAction)

        const result = SquaddieActionValidationService.isActionValid({
            actor: effectActor,
            action: { id: selfBuffAction.id },
            targets: [],
            managers: {
                inBattleSquaddieManager: effectInBattleSquaddieManager,
                squaddieActionManager: effectSquaddieActionManager,
                coordinateMapCollectionManager:
                    effectCoordinateMapCollectionManager,
            },
            map: { mapId: effectMapId },
        })

        expect(result.isValid).toBe(true)
    })

    it("returns valid when action has no effectOnTarget defined", () => {
        const selfOnlyAction = SquaddieActionService.new({
            id: "self-only",
            name: "Self Only",
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
        effectSquaddieActionManager.addOrUpdate(selfOnlyAction)

        const result = SquaddieActionValidationService.isActionValid({
            actor: effectActor,
            action: { id: selfOnlyAction.id },
            targets: [effectActor],
            managers: {
                inBattleSquaddieManager: effectInBattleSquaddieManager,
                squaddieActionManager: effectSquaddieActionManager,
                coordinateMapCollectionManager:
                    effectCoordinateMapCollectionManager,
            },
            map: { mapId: effectMapId },
        })

        expect(result.isValid).toBe(true)
    })

    it("returns valid when at least one of multiple targets can be affected", () => {
        const ally1Squaddie = OutOfBattleSquaddieService.new({
            id: "ally1",
            name: "Ally 1",
            actionIds: [],
            attributeSheetId: "effect-sheet",
            affiliation: SquaddieAffiliation.ALLY,
        })
        effectOutOfBattleSquaddieManager.addOrUpdateSquaddie(ally1Squaddie)
        const { inBattleSquaddieId: ally1InBattleId } =
            effectInBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "ally1",
            })
        const ally1: BattleSquaddieId = {
            inBattleSquaddieId: ally1InBattleId,
            outOfBattleSquaddieId: "ally1",
        }
        effectCoordinateMapCollectionManager.addSquaddie({
            mapId: effectMapId,
            squaddieId: ally1,
            coordinate: { row: 0, col: 1 },
        })

        const ally2Squaddie = OutOfBattleSquaddieService.new({
            id: "ally2",
            name: "Ally 2",
            actionIds: [],
            attributeSheetId: "effect-sheet",
            affiliation: SquaddieAffiliation.ALLY,
        })
        effectOutOfBattleSquaddieManager.addOrUpdateSquaddie(ally2Squaddie)
        const { inBattleSquaddieId: ally2InBattleId } =
            effectInBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "ally2",
            })
        const ally2: BattleSquaddieId = {
            inBattleSquaddieId: ally2InBattleId,
            outOfBattleSquaddieId: "ally2",
        }
        effectCoordinateMapCollectionManager.addSquaddie({
            mapId: effectMapId,
            squaddieId: ally2,
            coordinate: { row: 1, col: 0 },
        })

        effectInBattleSquaddieManager.dealDamageToSquaddie({
            ...ally1,
            damage: { amount: 3, type: undefined },
        })

        const healAction = SquaddieActionService.new({
            id: "mass-heal",
            name: "Mass Heal",
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
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    healing: { raw: 5 },
                },
            },
        })
        effectSquaddieActionManager.addOrUpdate(healAction)

        const result = SquaddieActionValidationService.isActionValid({
            actor: effectActor,
            action: { id: healAction.id },
            targets: [ally1, ally2],
            managers: {
                inBattleSquaddieManager: effectInBattleSquaddieManager,
                squaddieActionManager: effectSquaddieActionManager,
                coordinateMapCollectionManager:
                    effectCoordinateMapCollectionManager,
            },
            map: { mapId: effectMapId },
        })

        expect(result.isValid).toBe(true)
    })
})
