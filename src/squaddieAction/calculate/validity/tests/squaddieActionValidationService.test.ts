import { beforeEach, describe, expect, it } from "vitest"
import { SquaddieActionValidationService } from "../squaddieActionValidationService"
import { SquaddieActionManager } from "../../../squaddieActionManager"
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
import type { OutOfBattleSquaddieManager } from "../../../../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { CoordinateMapCollectionManager } from "../../../../coordinateMap/coordinateMapManager"
import type { SquaddieActionDecisions } from "../../result/squaddieActionResultCalculator"
import type { OffsetCoordinate } from "../../../../coordinateMap/offsetCoordinate"
import { ActionRange } from "../../../actionRange"
import { CoordinateGeneratorShape } from "../../../../coordinateMap/shape"
import { ProficiencyType } from "../../../../proficiency/proficiencyLevel"
import { ValidationTestSetup } from "../../../../testUtils/validationTestSetup"
import { OutOfBattleSquaddieTestSetup } from "../../../../testUtils/outOfBattleSquaddieTestSetup"
import { InBattleSquaddieCollectionService } from "../../../../squaddie/inBattle/inBattleSquaddieCollection"
import { SquaddieActionCollectionService } from "../../../squaddieActionCollection"
import { CoordinateMapCollectionService } from "../../../../coordinateMap/coordinateMapCollection"
import { CoordinateMapService } from "../../../../coordinateMap/coordinateMap"

describe("SquaddieActionValidationService", () => {
    let squaddieActionManager: SquaddieActionManager
    let inBattleSquaddieManager: InBattleSquaddieManager
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
        inBattleSquaddieManager = setup.inBattleSquaddieManager
        coordinateMapCollectionManager = setup.coordinateMapCollectionManager
        squaddieActionManager = setup.squaddieActionManager
    })

    describe("action point validation", () => {
        const callIsActionValid = (action: SquaddieAction) =>
            SquaddieActionValidationService.isActionValid({
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

            const result = callIsActionValid(action)

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

            const result = callIsActionValid(action)

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

            const result = callIsActionValid(action)

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

            const result = callIsActionValid(action)

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

            const result = callIsActionValid(action)

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

            const result = callIsActionValid(action)

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

            const result = callIsActionValid(action)

            expect(result.isValid).toBe(true)
        })
    })

    describe("movement path validation", () => {
        let movementSquaddieActionManager: SquaddieActionManager
        let movementInBattleSquaddieManager: InBattleSquaddieManager
        let movementOutOfBattleSquaddieManager: OutOfBattleSquaddieManager
        let movementCoordinateMapCollectionManager: CoordinateMapCollectionManager
        let movementActor: BattleSquaddieId
        let moveAction: SquaddieAction
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

            moveAction = SquaddieActionService.new({
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
        })

        const callMoveIsActionValid = (
            decisions?: SquaddieActionDecisions,
            coordinateMapOverride?: CoordinateMapCollectionManager,
            mapIdOverride?: string
        ) =>
            SquaddieActionValidationService.isActionValid({
                actor: movementActor,
                action: { id: moveAction.id, decisions },
                targets: [],
                managers: {
                    inBattleSquaddieManager: movementInBattleSquaddieManager,
                    squaddieActionManager: movementSquaddieActionManager,
                    coordinateMapCollectionManager:
                        coordinateMapOverride ??
                        movementCoordinateMapCollectionManager,
                },
                map: { mapId: mapIdOverride ?? movementMapId },
            })

        it("returns valid with movementPath when movement destination is reachable", () => {
            const decisions: SquaddieActionDecisions = {
                desiredMovementDestination: { row: 0, col: 4 },
            }

            const result = callMoveIsActionValid(decisions)

            expect(result.isValid).toBe(true)
            expect(result.movementPath).toBeDefined()
            expect(result.movementPath?.steps.length).toBeGreaterThan(0)
        })

        it("returns invalid when hex distance exceeds maximum movement", () => {
            const decisions: SquaddieActionDecisions = {
                desiredMovementDestination: { row: 0, col: 7 },
            }

            const result = callMoveIsActionValid(decisions)

            expect(result.isValid).toBe(false)
            expect(result.reason).toBe("Destination is too far away")
            expect(result.movementPath).toBeUndefined()
        })

        it("returns invalid when path cost exceeds maximum even if hex distance is within range", () => {
            const decisions: SquaddieActionDecisions = {
                desiredMovementDestination: { row: 0, col: 5 },
            }

            const result = callMoveIsActionValid(decisions)

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

            const decisions: SquaddieActionDecisions = {
                desiredMovementDestination: { row: 0, col: 2 },
            }

            const result = callMoveIsActionValid(
                decisions,
                wallCoordinateMapManager,
                wallMapId
            )

            expect(result.isValid).toBe(false)
            expect(result.reason).toBe("Destination is blocked")
            expect(result.movementPath).toBeUndefined()
        })

        it("returns valid without movementPath when no destination is provided", () => {
            const result = callMoveIsActionValid()

            expect(result.isValid).toBe(true)
            expect(result.movementPath).toBeUndefined()
        })
    })

    describe("AoE action validation", () => {
        let enemy: BattleSquaddieId
        const aoeMapId = "aoe-test-map"
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
                    id: "aoe-enemy",
                    name: "AoE Enemy",
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

            const { inBattleSquaddieId: enemyId } =
                aoeInBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "aoe-enemy",
                })
            enemy = {
                inBattleSquaddieId: enemyId,
                outOfBattleSquaddieId: "aoe-enemy",
            }

            aoeSquaddieActionManager = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )

            let mapCollection = CoordinateMapCollectionService.new()
            mapCollection = CoordinateMapCollectionService.addOrUpdate({
                collection: mapCollection,
                map: CoordinateMapService.new({
                    id: aoeMapId,
                    name: "AoE Test Map",
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
                squaddieId: enemy,
                coordinate: { row: 0, col: 2 },
            })

            aoeAction = SquaddieActionService.new({
                id: "aoe-attack",
                name: "AoE Attack",
                range: ActionRange.MELEE,
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

        const callAoeIsActionValid = (
            targetCoordinate: OffsetCoordinate,
            targets: BattleSquaddieId[]
        ) =>
            SquaddieActionValidationService.isActionValid({
                actor: aoeActor,
                action: {
                    id: aoeAction.id,
                    decisions: { targetCoordinate },
                },
                targets,
                managers: {
                    inBattleSquaddieManager: aoeInBattleSquaddieManager,
                    squaddieActionManager: aoeSquaddieActionManager,
                    coordinateMapCollectionManager:
                        aoeCoordinateMapCollectionManager,
                },
                map: { mapId: aoeMapId },
            })

        it("isActionValid valid when blast center in range and AoE hits valid target", () => {
            const result = callAoeIsActionValid({ row: 0, col: 1 }, [enemy])

            expect(result.isValid).toBe(true)
        })

        it("isActionValid invalid when blast center out of action range", () => {
            const result = callAoeIsActionValid({ row: 0, col: 5 }, [enemy])

            expect(result.isValid).toBe(false)
            expect(result.reason).toBe("Blast center is out of range")
        })

        it("isActionValid valid for empty-center action when enemy is in AoE radius", () => {
            const result = callAoeIsActionValid({ row: 0, col: 1 }, [enemy])

            expect(result.isValid).toBe(true)
        })

        it("isActionValid invalid when targetCoordinateRequiresTarget: false and NO squaddies are in AoE radius", () => {
            const result = callAoeIsActionValid({ row: 0, col: 1 }, [])

            expect(result.isValid).toBe(false)
            expect(result.reason).toBe("No valid targets in blast radius")
        })

        it("isActionValid invalid when targetCoordinateRequiresTarget: true and no squaddie at center", () => {
            aoeSquaddieActionManager.addOrUpdate(
                SquaddieActionService.new({
                    id: aoeAction.id,
                    name: "AoE Attack",
                    range: ActionRange.MELEE,
                    shape: CoordinateGeneratorShape.BLOOM,
                    areaOfEffectSize: 1,
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
                                raw: 2,
                                targetProficiency: ProficiencyType.ARMOR,
                            },
                        },
                    },
                })
            )

            const result = callAoeIsActionValid({ row: 0, col: 1 }, [enemy])

            expect(result.isValid).toBe(false)
            expect(result.reason).toBe("Target coordinate must have a target")
        })
    })
})
