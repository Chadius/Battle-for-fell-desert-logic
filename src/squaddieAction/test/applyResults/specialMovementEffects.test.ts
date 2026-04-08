import { beforeEach, describe, expect, it } from "vitest"
import { MovementEffectType, SquaddieActionService } from "../../squaddieAction"
import { SquaddieActionManager } from "../../squaddieActionManager"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection"
import { SquaddieActionCollectionService } from "../../squaddieActionCollection"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess"
import { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../../../coordinateMap/coordinateMapCollection"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap"
import { SquaddieActionResultCalculator } from "../../calculate/result/squaddieActionResultCalculator"
import { ApplyResultService } from "../../apply/applyResultService"
import { SquaddieAffiliation } from "../../../affiliation/affiliation"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup"
import { OutOfBattleSquaddieManager } from "../../../squaddie/outOfBattle/outOfBattleSquaddieManager"

const createTwoSquaddieMission = ({
    mapRows,
    actorStartCoordinate,
    targetStartCoordinate,
}: {
    mapRows: string[]
    actorStartCoordinate: { row: number; col: number }
    targetStartCoordinate: { row: number; col: number }
}) => {
    const { manager: outOfBattleSquaddieManager } =
        OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
            sheetId: "sharedSheet",
            attributeSheetOptions: { distancePerAction: 3, maxHitPoints: 5 },
        })

    const actorOutOfBattleSquaddie = OutOfBattleSquaddieService.new({
        id: "actor",
        name: "Actor",
        actionIds: [],
        attributeSheetId: "sharedSheet",
        affiliation: SquaddieAffiliation.PLAYER,
    })
    outOfBattleSquaddieManager.addOrUpdateSquaddie(actorOutOfBattleSquaddie)

    const targetOutOfBattleSquaddie = OutOfBattleSquaddieService.new({
        id: "target",
        name: "Target",
        actionIds: [],
        attributeSheetId: "sharedSheet",
        affiliation: SquaddieAffiliation.ENEMY,
    })
    outOfBattleSquaddieManager.addOrUpdateSquaddie(targetOutOfBattleSquaddie)

    const inBattleSquaddieCollection = InBattleSquaddieCollectionService.new()
    const inBattleSquaddieManager = new InBattleSquaddieManager(
        inBattleSquaddieCollection,
        outOfBattleSquaddieManager
    )
    const { inBattleSquaddieId: actorInBattleSquaddieId } =
        inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "actor",
        })
    const { inBattleSquaddieId: targetInBattleSquaddieId } =
        inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "target",
        })

    let mapCollection = CoordinateMapCollectionService.new()
    mapCollection = CoordinateMapCollectionService.addOrUpdate({
        collection: mapCollection,
        map: CoordinateMapService.new({
            id: "map",
            name: "map",
            movementProperties: mapRows,
        }),
    })
    const mapManager = new CoordinateMapCollectionManager(mapCollection)

    mapManager.addSquaddie({
        mapId: "map",
        squaddieId: {
            inBattleSquaddieId: actorInBattleSquaddieId,
            outOfBattleSquaddieId: "actor",
        },
        coordinate: actorStartCoordinate,
    })
    mapManager.addSquaddie({
        mapId: "map",
        squaddieId: {
            inBattleSquaddieId: targetInBattleSquaddieId,
            outOfBattleSquaddieId: "target",
        },
        coordinate: targetStartCoordinate,
    })

    const actionManager = new SquaddieActionManager(
        SquaddieActionCollectionService.new()
    )

    return {
        outOfBattleSquaddieManager:
            outOfBattleSquaddieManager as OutOfBattleSquaddieManager,
        inBattleSquaddieManager,
        mapManager,
        actionManager,
        actorInBattleSquaddieId,
        actorOutOfBattleSquaddieId: actorOutOfBattleSquaddie.id,
        targetInBattleSquaddieId,
        targetOutOfBattleSquaddieId: targetOutOfBattleSquaddie.id,
    }
}

describe("Special movement effects", () => {
    describe("ACTOR_CHOSEN_SPECIAL_TRAVERSAL (Leap)", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let mapManager: CoordinateMapCollectionManager
        let actionManager: SquaddieActionManager
        let actorInBattleSquaddieId: number
        let actorOutOfBattleSquaddieId: string

        beforeEach(() => {
            ;({
                inBattleSquaddieManager,
                mapManager,
                actionManager,
                actorInBattleSquaddieId,
                actorOutOfBattleSquaddieId,
            } = createTwoSquaddieMission({
                mapRows: ["1 - 1 1 1 "],
                actorStartCoordinate: { row: 0, col: 0 },
                targetStartCoordinate: { row: 0, col: 4 },
            }))
        })

        it("normal movement obeys squaddie movement", () => {
            const normalMoveAction = SquaddieActionService.new({
                id: "normalMove",
                name: "Normal Move",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        movement: {
                            movementType: MovementEffectType.ACTOR_CHOSEN,
                        },
                    },
                },
            })
            actionManager.addOrUpdate(normalMoveAction)

            const results = SquaddieActionResultCalculator.calculateResult({
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager: actionManager,
                    coordinateMapCollectionManager: mapManager,
                },
                actor: {
                    inBattleSquaddieId: actorInBattleSquaddieId,
                    outOfBattleSquaddieId: actorOutOfBattleSquaddieId,
                },
                targets: [],
                map: { mapId: "map" },
                action: {
                    id: normalMoveAction.id,
                    decisions: {
                        desiredMovementDestination: { row: 0, col: 2 },
                    },
                },
            })

            const movementResult = results.find((r) => r.movement != undefined)
            expect(movementResult).toBeDefined()
            expect(movementResult!.movement!.expectedPath.steps).toHaveLength(1)
        })

        it("Action can override squaddie traversal", () => {
            const leapAction = SquaddieActionService.new({
                id: "leap",
                name: "Leap",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        movement: {
                            movementType:
                                MovementEffectType.ACTOR_CHOSEN_SPECIAL_TRAVERSAL,
                            traversal: { skipOverPits: true },
                        },
                    },
                },
            })
            actionManager.addOrUpdate(leapAction)

            const results = SquaddieActionResultCalculator.calculateResult({
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager: actionManager,
                    coordinateMapCollectionManager: mapManager,
                },
                actor: {
                    inBattleSquaddieId: actorInBattleSquaddieId,
                    outOfBattleSquaddieId: actorOutOfBattleSquaddieId,
                },
                targets: [],
                map: { mapId: "map" },
                action: {
                    id: leapAction.id,
                    decisions: {
                        desiredMovementDestination: { row: 0, col: 2 },
                    },
                },
            })

            const movementResult = results.find((r) => r.movement != undefined)
            expect(movementResult).toBeDefined()
            expect(
                movementResult!.movement!.expectedPath.steps.length
            ).toBeGreaterThan(1)
            expect(movementResult!.movement!.expectedPath.steps.at(-1)).toEqual(
                expect.objectContaining({ row: 0, col: 2 })
            )

            ApplyResultService.applyResultsToSquaddies({
                inBattleSquaddieManager,
                results,
                map: { mapId: "map", manager: mapManager },
            })

            const actorCoordinate = CoordinateMapService.getSquaddieCoordinate({
                map: mapManager.getMapById("map"),
                squaddieId: {
                    inBattleSquaddieId: actorInBattleSquaddieId,
                    outOfBattleSquaddieId: actorOutOfBattleSquaddieId,
                },
            })
            expect(actorCoordinate).toEqual(
                expect.objectContaining({ row: 0, col: 2 })
            )
        })
    })

    describe("TELEPORT_TO_ACTOR_CHOSEN (Rescue)", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let mapManager: CoordinateMapCollectionManager
        let actionManager: SquaddieActionManager
        let actorInBattleSquaddieId: number
        let actorOutOfBattleSquaddieId: string
        let targetInBattleSquaddieId: number
        let targetOutOfBattleSquaddieId: string

        beforeEach(() => {
            ;({
                inBattleSquaddieManager,
                mapManager,
                actionManager,
                actorInBattleSquaddieId,
                actorOutOfBattleSquaddieId,
                targetInBattleSquaddieId,
                targetOutOfBattleSquaddieId,
            } = createTwoSquaddieMission({
                mapRows: ["1 1 1 1 1 "],
                actorStartCoordinate: { row: 0, col: 0 },
                targetStartCoordinate: { row: 0, col: 2 },
            }))
        })

        const calculateRescueResults = () => {
            const rescueAction = SquaddieActionService.new({
                id: "rescue",
                name: "Rescue",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 1 },
                    },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        movement: {
                            movementType:
                                MovementEffectType.TELEPORT_TO_ACTOR_CHOSEN,
                        },
                    },
                },
            })
            actionManager.addOrUpdate(rescueAction)

            return SquaddieActionResultCalculator.calculateResult({
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager: actionManager,
                    coordinateMapCollectionManager: mapManager,
                },
                actor: {
                    inBattleSquaddieId: actorInBattleSquaddieId,
                    outOfBattleSquaddieId: actorOutOfBattleSquaddieId,
                },
                targets: [
                    {
                        inBattleSquaddieId: targetInBattleSquaddieId,
                        outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
                    },
                ],
                map: { mapId: "map" },
                action: {
                    id: rescueAction.id,
                    decisions: {
                        desiredMovementDestination: { row: 0, col: 4 },
                    },
                },
            })
        }

        it("teleports the target to the actor's chosen destination", () => {
            const results = calculateRescueResults()

            const targetMovementResult = results.find(
                (r) =>
                    r.outOfBattleSquaddieId === targetOutOfBattleSquaddieId &&
                    r.movement != undefined
            )
            expect(targetMovementResult).toBeDefined()
            expect(
                targetMovementResult!.movement!.expectedPath.steps.at(-1)
            ).toEqual(expect.objectContaining({ row: 0, col: 4 }))

            const actorMovementResult = results.find(
                (r) =>
                    r.outOfBattleSquaddieId === actorOutOfBattleSquaddieId &&
                    r.movement != undefined
            )
            expect(actorMovementResult).toBeUndefined()

            ApplyResultService.applyResultsToSquaddies({
                inBattleSquaddieManager,
                results,
                map: { mapId: "map", manager: mapManager },
            })

            const targetCoordinate = CoordinateMapService.getSquaddieCoordinate(
                {
                    map: mapManager.getMapById("map"),
                    squaddieId: {
                        inBattleSquaddieId: targetInBattleSquaddieId,
                        outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
                    },
                }
            )
            expect(targetCoordinate).toEqual(
                expect.objectContaining({ row: 0, col: 4 })
            )
        })

        it("actor stays put", () => {
            const results = calculateRescueResults()

            const actorMovementResult = results.find(
                (r) =>
                    r.outOfBattleSquaddieId === actorOutOfBattleSquaddieId &&
                    r.movement != undefined
            )
            expect(actorMovementResult).toBeUndefined()

            ApplyResultService.applyResultsToSquaddies({
                inBattleSquaddieManager,
                results,
                map: { mapId: "map", manager: mapManager },
            })

            const actorCoordinate = CoordinateMapService.getSquaddieCoordinate({
                map: mapManager.getMapById("map"),
                squaddieId: {
                    inBattleSquaddieId: actorInBattleSquaddieId,
                    outOfBattleSquaddieId: actorOutOfBattleSquaddieId,
                },
            })
            expect(actorCoordinate).toEqual(
                expect.objectContaining({ row: 0, col: 0 })
            )
        })

        describe("multiple targets scatter placement", () => {
            // Uses a 1-row 5-cell map.
            // On such a map, the only on-map ring-1 neighbor of col 4 is col 3 (LEFT direction);
            // all other ring-1 hex directions point off-map.
            let multiTargetInBattleSquaddieManager: InBattleSquaddieManager
            let multiTargetMapManager: CoordinateMapCollectionManager
            let multiTargetActionManager: SquaddieActionManager
            let multiActorInBattleSquaddieId: number
            let multiActorOutOfBattleSquaddieId: string
            let firstTargetInBattleSquaddieId: number
            let firstTargetOutOfBattleSquaddieId: string
            let secondTargetInBattleSquaddieId: number
            let secondTargetOutOfBattleSquaddieId: string

            beforeEach(() => {
                const {
                    outOfBattleSquaddieManager,
                    inBattleSquaddieManager: iBSM,
                    mapManager: mM,
                    actionManager: aM,
                    actorInBattleSquaddieId: aId,
                    actorOutOfBattleSquaddieId: aOBId,
                    targetInBattleSquaddieId: t1Id,
                    targetOutOfBattleSquaddieId: t1OBId,
                } = createTwoSquaddieMission({
                    mapRows: ["1 1 1 1 1 "],
                    actorStartCoordinate: { row: 0, col: 0 },
                    targetStartCoordinate: { row: 0, col: 1 },
                })

                multiTargetInBattleSquaddieManager = iBSM
                multiTargetMapManager = mM
                multiTargetActionManager = aM
                multiActorInBattleSquaddieId = aId
                multiActorOutOfBattleSquaddieId = aOBId
                firstTargetInBattleSquaddieId = t1Id
                firstTargetOutOfBattleSquaddieId = t1OBId

                // Add a second target to the existing managers
                const secondTargetOutOfBattle = OutOfBattleSquaddieService.new({
                    id: "secondTarget",
                    name: "Second Target",
                    actionIds: [],
                    attributeSheetId: "sharedSheet",
                    affiliation: SquaddieAffiliation.PLAYER,
                })
                outOfBattleSquaddieManager.addOrUpdateSquaddie(
                    secondTargetOutOfBattle
                )
                secondTargetOutOfBattleSquaddieId = secondTargetOutOfBattle.id
                const { inBattleSquaddieId: t2Id } =
                    multiTargetInBattleSquaddieManager.createNewSquaddie({
                        outOfBattleSquaddieId: secondTargetOutOfBattle.id,
                    })
                secondTargetInBattleSquaddieId = t2Id
                multiTargetMapManager.addSquaddie({
                    mapId: "map",
                    squaddieId: {
                        inBattleSquaddieId: t2Id,
                        outOfBattleSquaddieId: secondTargetOutOfBattle.id,
                    },
                    coordinate: { row: 0, col: 2 },
                })
            })

            const calculateMultiTargetRescue = ({
                destination,
            }: {
                destination: { row: number; col: number }
            }) => {
                const rescueAction = SquaddieActionService.new({
                    id: "multiRescue",
                    name: "Multi Rescue",
                    effectOnActor: {
                        [DegreeOfSuccess.SUCCESS]: {
                            actionPoints: { spent: 1 },
                        },
                    },
                    effectOnTarget: {
                        [DegreeOfSuccess.SUCCESS]: {
                            movement: {
                                movementType:
                                    MovementEffectType.TELEPORT_TO_ACTOR_CHOSEN,
                            },
                        },
                    },
                })
                multiTargetActionManager.addOrUpdate(rescueAction)

                return SquaddieActionResultCalculator.calculateResult({
                    degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    managers: {
                        inBattleSquaddieManager:
                            multiTargetInBattleSquaddieManager,
                        squaddieActionManager: multiTargetActionManager,
                        coordinateMapCollectionManager: multiTargetMapManager,
                    },
                    actor: {
                        inBattleSquaddieId: multiActorInBattleSquaddieId,
                        outOfBattleSquaddieId: multiActorOutOfBattleSquaddieId,
                    },
                    targets: [
                        {
                            inBattleSquaddieId: firstTargetInBattleSquaddieId,
                            outOfBattleSquaddieId:
                                firstTargetOutOfBattleSquaddieId,
                        },
                        {
                            inBattleSquaddieId: secondTargetInBattleSquaddieId,
                            outOfBattleSquaddieId:
                                secondTargetOutOfBattleSquaddieId,
                        },
                    ],
                    map: { mapId: "map" },
                    action: {
                        id: rescueAction.id,
                        decisions: { desiredMovementDestination: destination },
                    },
                })
            }

            it("first target lands at the exact destination", () => {
                const results = calculateMultiTargetRescue({
                    destination: { row: 0, col: 4 },
                })

                const firstTargetMovement = results.find(
                    (r) =>
                        r.outOfBattleSquaddieId ===
                            firstTargetOutOfBattleSquaddieId &&
                        r.movement != undefined
                )
                expect(firstTargetMovement).toBeDefined()
                expect(
                    firstTargetMovement!.movement!.expectedPath.steps.at(-1)
                ).toEqual(expect.objectContaining({ row: 0, col: 4 }))
            })

            it("second target lands at the only on-map neighbor when anchor is taken", () => {
                const results = calculateMultiTargetRescue({
                    destination: { row: 0, col: 4 },
                })

                const secondTargetMovement = results.find(
                    (r) =>
                        r.outOfBattleSquaddieId ===
                            secondTargetOutOfBattleSquaddieId &&
                        r.movement != undefined
                )
                expect(secondTargetMovement).toBeDefined()
                expect(
                    secondTargetMovement!.movement!.expectedPath.steps.at(-1)
                ).toEqual(expect.objectContaining({ row: 0, col: 3 }))
            })
        })

        describe("second target does not move when no valid coordinate exists", () => {
            let noRoomInBattleSquaddieManager: InBattleSquaddieManager
            let noRoomMapManager: CoordinateMapCollectionManager
            let noRoomActionManager: SquaddieActionManager
            let noRoomActorInBattleSquaddieId: number
            let noRoomActorOutOfBattleSquaddieId: string
            let noRoomFirstTargetInBattleSquaddieId: number
            let noRoomFirstTargetOutOfBattleSquaddieId: string
            let noRoomSecondTargetInBattleSquaddieId: number
            let noRoomSecondTargetOutOfBattleSquaddieId: string

            beforeEach(() => {
                const { manager: noRoomOBManager } =
                    OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                        {
                            sheetId: "sharedSheet",
                            attributeSheetOptions: {
                                distancePerAction: 3,
                                maxHitPoints: 5,
                            },
                        }
                    )

                const actorOB = OutOfBattleSquaddieService.new({
                    id: "noRoomActor",
                    name: "Actor",
                    actionIds: [],
                    attributeSheetId: "sharedSheet",
                    affiliation: SquaddieAffiliation.PLAYER,
                })
                noRoomOBManager.addOrUpdateSquaddie(actorOB)
                noRoomActorOutOfBattleSquaddieId = actorOB.id

                const firstTargetOB = OutOfBattleSquaddieService.new({
                    id: "noRoomFirstTarget",
                    name: "First Target",
                    actionIds: [],
                    attributeSheetId: "sharedSheet",
                    affiliation: SquaddieAffiliation.PLAYER,
                })
                noRoomOBManager.addOrUpdateSquaddie(firstTargetOB)
                noRoomFirstTargetOutOfBattleSquaddieId = firstTargetOB.id

                const secondTargetOB = OutOfBattleSquaddieService.new({
                    id: "noRoomSecondTarget",
                    name: "Second Target",
                    actionIds: [],
                    attributeSheetId: "sharedSheet",
                    affiliation: SquaddieAffiliation.PLAYER,
                })
                noRoomOBManager.addOrUpdateSquaddie(secondTargetOB)
                noRoomSecondTargetOutOfBattleSquaddieId = secondTargetOB.id

                const noRoomCollection = InBattleSquaddieCollectionService.new()
                noRoomInBattleSquaddieManager = new InBattleSquaddieManager(
                    noRoomCollection,
                    noRoomOBManager
                )
                ;({ inBattleSquaddieId: noRoomActorInBattleSquaddieId } =
                    noRoomInBattleSquaddieManager.createNewSquaddie({
                        outOfBattleSquaddieId: actorOB.id,
                    }))
                ;({ inBattleSquaddieId: noRoomFirstTargetInBattleSquaddieId } =
                    noRoomInBattleSquaddieManager.createNewSquaddie({
                        outOfBattleSquaddieId: firstTargetOB.id,
                    }))
                ;({ inBattleSquaddieId: noRoomSecondTargetInBattleSquaddieId } =
                    noRoomInBattleSquaddieManager.createNewSquaddie({
                        outOfBattleSquaddieId: secondTargetOB.id,
                    }))

                let noRoomMapCollection = CoordinateMapCollectionService.new()
                noRoomMapCollection =
                    CoordinateMapCollectionService.addOrUpdate({
                        collection: noRoomMapCollection,
                        map: CoordinateMapService.new({
                            id: "noRoomMap",
                            name: "noRoomMap",
                            movementProperties: ["- 1 -"],
                        }),
                    })
                noRoomMapManager = new CoordinateMapCollectionManager(
                    noRoomMapCollection
                )

                noRoomActionManager = new SquaddieActionManager(
                    SquaddieActionCollectionService.new()
                )
            })

            it("second target has no movement result when only one valid landing cell exists", () => {
                const rescueAction = SquaddieActionService.new({
                    id: "noRoomRescue",
                    name: "No Room Rescue",
                    effectOnActor: {
                        [DegreeOfSuccess.SUCCESS]: {
                            actionPoints: { spent: 1 },
                        },
                    },
                    effectOnTarget: {
                        [DegreeOfSuccess.SUCCESS]: {
                            movement: {
                                movementType:
                                    MovementEffectType.TELEPORT_TO_ACTOR_CHOSEN,
                            },
                        },
                    },
                })
                noRoomActionManager.addOrUpdate(rescueAction)

                const results = SquaddieActionResultCalculator.calculateResult({
                    degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    managers: {
                        inBattleSquaddieManager: noRoomInBattleSquaddieManager,
                        squaddieActionManager: noRoomActionManager,
                        coordinateMapCollectionManager: noRoomMapManager,
                    },
                    actor: {
                        inBattleSquaddieId: noRoomActorInBattleSquaddieId,
                        outOfBattleSquaddieId: noRoomActorOutOfBattleSquaddieId,
                    },
                    targets: [
                        {
                            inBattleSquaddieId:
                                noRoomFirstTargetInBattleSquaddieId,
                            outOfBattleSquaddieId:
                                noRoomFirstTargetOutOfBattleSquaddieId,
                        },
                        {
                            inBattleSquaddieId:
                                noRoomSecondTargetInBattleSquaddieId,
                            outOfBattleSquaddieId:
                                noRoomSecondTargetOutOfBattleSquaddieId,
                        },
                    ],
                    map: { mapId: "noRoomMap" },
                    action: {
                        id: rescueAction.id,
                        decisions: {
                            desiredMovementDestination: { row: 0, col: 1 },
                        },
                    },
                })

                const firstTargetMovement = results.find(
                    (r) =>
                        r.outOfBattleSquaddieId ===
                            noRoomFirstTargetOutOfBattleSquaddieId &&
                        r.movement != undefined
                )
                expect(firstTargetMovement).toBeDefined()
                expect(
                    firstTargetMovement!.movement!.expectedPath.steps.at(-1)
                ).toEqual(expect.objectContaining({ row: 0, col: 1 }))

                const secondTargetMovement = results.find(
                    (r) =>
                        r.outOfBattleSquaddieId ===
                            noRoomSecondTargetOutOfBattleSquaddieId &&
                        r.movement != undefined
                )
                expect(secondTargetMovement).toBeUndefined()
            })
        })
    })

    describe("FORCED_TOWARD_ACTOR (Gravity Pull)", () => {
        let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
        let inBattleSquaddieManager: InBattleSquaddieManager
        let mapManager: CoordinateMapCollectionManager
        let actionManager: SquaddieActionManager
        let actorInBattleSquaddieId: number
        let actorOutOfBattleSquaddieId: string
        let targetInBattleSquaddieId: number
        let targetOutOfBattleSquaddieId: string

        beforeEach(() => {
            ;({
                outOfBattleSquaddieManager,
                inBattleSquaddieManager,
                mapManager,
                actionManager,
                actorInBattleSquaddieId,
                actorOutOfBattleSquaddieId,
                targetInBattleSquaddieId,
                targetOutOfBattleSquaddieId,
            } = createTwoSquaddieMission({
                mapRows: ["1 1 1 1 1 1 "],
                actorStartCoordinate: { row: 0, col: 0 },
                targetStartCoordinate: { row: 0, col: 4 },
            }))
        })

        describe("path is possible", () => {
            const calculateResults = () => {
                const gravityPullAction = SquaddieActionService.new({
                    id: "gravityPull",
                    name: "Gravity Pull",
                    effectOnActor: {
                        [DegreeOfSuccess.SUCCESS]: {
                            actionPoints: { spent: 1 },
                        },
                    },
                    effectOnTarget: {
                        [DegreeOfSuccess.SUCCESS]: {
                            movement: {
                                movementType:
                                    MovementEffectType.FORCED_TOWARD_ACTOR,
                                forcedDistance: 2,
                            },
                        },
                    },
                })
                actionManager.addOrUpdate(gravityPullAction)

                return SquaddieActionResultCalculator.calculateResult({
                    degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager: actionManager,
                        coordinateMapCollectionManager: mapManager,
                    },
                    actor: {
                        inBattleSquaddieId: actorInBattleSquaddieId,
                        outOfBattleSquaddieId: actorOutOfBattleSquaddieId,
                    },
                    targets: [
                        {
                            inBattleSquaddieId: targetInBattleSquaddieId,
                            outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
                        },
                    ],
                    map: { mapId: "map" },
                    action: { id: gravityPullAction.id },
                })
            }

            it("pulls the target two steps closer to the actor", () => {
                const results = calculateResults()

                const targetMovementResult = results.find(
                    (r) =>
                        r.outOfBattleSquaddieId ===
                            targetOutOfBattleSquaddieId &&
                        r.movement != undefined
                )
                expect(targetMovementResult).toBeDefined()
                expect(
                    targetMovementResult!.movement!.expectedPath.steps.at(-1)
                ).toEqual(expect.objectContaining({ row: 0, col: 2 }))

                ApplyResultService.applyResultsToSquaddies({
                    inBattleSquaddieManager,
                    results,
                    map: { mapId: "map", manager: mapManager },
                })

                const targetCoordinate =
                    CoordinateMapService.getSquaddieCoordinate({
                        map: mapManager.getMapById("map"),
                        squaddieId: {
                            inBattleSquaddieId: targetInBattleSquaddieId,
                            outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
                        },
                    })
                expect(targetCoordinate).toEqual(
                    expect.objectContaining({ row: 0, col: 2 })
                )
            })
        })

        it("stops short when the next step toward the actor is impassable", () => {
            const blockerOutOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "blocker",
                name: "Blocker",
                actionIds: [],
                attributeSheetId: "sharedSheet",
                affiliation: SquaddieAffiliation.PLAYER,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                blockerOutOfBattleSquaddie
            )
            const { inBattleSquaddieId: blockerInBattleSquaddieId } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "blocker",
                })
            mapManager.addSquaddie({
                mapId: "map",
                squaddieId: {
                    inBattleSquaddieId: blockerInBattleSquaddieId,
                    outOfBattleSquaddieId: "blocker",
                },
                coordinate: { row: 0, col: 3 },
            })

            const gravityPullAction = SquaddieActionService.new({
                id: "gravityPull",
                name: "Gravity Pull",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 1 },
                    },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        movement: {
                            movementType:
                                MovementEffectType.FORCED_TOWARD_ACTOR,
                            forcedDistance: 2,
                        },
                    },
                },
            })
            actionManager.addOrUpdate(gravityPullAction)

            const results = SquaddieActionResultCalculator.calculateResult({
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager: actionManager,
                    coordinateMapCollectionManager: mapManager,
                },
                actor: {
                    inBattleSquaddieId: actorInBattleSquaddieId,
                    outOfBattleSquaddieId: actorOutOfBattleSquaddieId,
                },
                targets: [
                    {
                        inBattleSquaddieId: targetInBattleSquaddieId,
                        outOfBattleSquaddieId: targetOutOfBattleSquaddieId,
                    },
                ],
                map: { mapId: "map" },
                action: { id: gravityPullAction.id },
            })

            const targetMovementResult = results.find(
                (r) =>
                    r.outOfBattleSquaddieId === targetOutOfBattleSquaddieId &&
                    r.movement != undefined
            )
            expect(targetMovementResult).toBeUndefined()
        })
    })
})
