import { describe, expect, it } from "vitest"
import {
    type MissionManagerValidationInput,
    MissionManagerValidationService,
} from "./missionManagerValidationService.js"
import { MissionStateService } from "./missionState.js"
import { MissionDeploymentService } from "./missionDeployment.js"
import { CoordinateMapCollectionManager } from "../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../coordinateMap/coordinateMapCollection.js"
import { CoordinateMapService } from "../coordinateMap/coordinateMap.js"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../squaddie/inBattle/inBattleSquaddieCollection.js"
import { InBattleSquaddieService } from "../squaddie/inBattle/inBattleSquaddie.js"
import { OutOfBattleSquaddieManager } from "../squaddie/outOfBattle/outOfBattleSquaddieManager.js"
import { OutOfBattleSquaddieCollectionService } from "../squaddie/outOfBattle/outOfBattleSquaddieCollection.js"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection.js"
import { OutOfBattleSquaddieAttributeSheetService } from "../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet.js"
import { OutOfBattleSquaddieService } from "../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { SquaddieActionManager } from "../squaddieAction/squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../squaddieAction/squaddieActionCollection.js"
import { SquaddieActionService } from "../squaddieAction/squaddieAction.js"
import { SquaddieItemManager } from "../squaddieItem/squaddieItemManager.js"
import { SquaddieItemCollectionService } from "../squaddieItem/squaddieItemCollection.js"
import { SquaddieItemService } from "../squaddieItem/squaddieItem.js"
import { SquaddieAffiliation } from "../affiliation/affiliation.js"
import { AttributeScore } from "../proficiency/attributeScore.js"
import { ActionRange } from "../squaddieAction/actionRange.js"
import { DegreeOfSuccess } from "../degreesOfSuccess/degreeOfSuccess.js"
import { CoordinateGeneratorShape } from "../coordinateMap/shape.js"
import { ProficiencyType } from "../proficiency/proficiencyLevel.js"

const TEST_IDS = {
    mapId: "test-map",
    squaddieId: "test-squaddie",
    attributeSheetId: "test-sheet",
    actionId: "test-action",
    itemId: "test-item",
}

const buildCoordinateMapCollectionManager =
    (): CoordinateMapCollectionManager => {
        const map = CoordinateMapService.new({
            id: TEST_IDS.mapId,
            name: "Test Map",
            movementProperties: ["1 1"],
        })
        const manager = new CoordinateMapCollectionManager(
            CoordinateMapCollectionService.new()
        )
        manager.addOrUpdate({ map })
        return manager
    }

const buildSquaddieActionManager = (): SquaddieActionManager => {
    const manager = new SquaddieActionManager(
        SquaddieActionCollectionService.new()
    )
    manager.addOrUpdate(
        SquaddieActionService.new({
            id: TEST_IDS.actionId,
            name: "Test Action",
            attribute: AttributeScore.BODY,
            proficiency: ProficiencyType.WEAPON_SIMPLE,
            range: ActionRange.MELEE,
            shape: CoordinateGeneratorShape.BLOOM,
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    damage: {
                        raw: 1,
                        targetProficiency: ProficiencyType.ARMOR,
                    },
                },
            },
        })
    )
    return manager
}

const buildOutOfBattleSquaddieManager = (): OutOfBattleSquaddieManager => {
    const manager = new OutOfBattleSquaddieManager(
        OutOfBattleSquaddieCollectionService.new(),
        OutOfBattleSquaddieAttributeSheetCollectionService.new()
    )

    const attributeSheet = OutOfBattleSquaddieAttributeSheetService.new({
        id: TEST_IDS.attributeSheetId,
        maxHitPoints: 5,
        movement: { movementPointsPerAction: 2 },
        attributeScores: {
            [AttributeScore.BODY]: 0,
            [AttributeScore.MIND]: 0,
            [AttributeScore.SOUL]: 0,
        },
        rank: 0,
    })
    manager.addOrUpdateAttributeSheet(attributeSheet)

    const squaddie = OutOfBattleSquaddieService.new({
        id: TEST_IDS.squaddieId,
        name: "Test Squaddie",
        attributeSheetId: TEST_IDS.attributeSheetId,
        actionIds: [TEST_IDS.actionId],
        affiliation: SquaddieAffiliation.PLAYER,
    })
    manager.addOrUpdateSquaddie(squaddie)

    return manager
}

const buildInBattleSquaddieManager = (
    outOfBattleSquaddieManager: OutOfBattleSquaddieManager
): InBattleSquaddieManager => {
    const manager = new InBattleSquaddieManager(
        InBattleSquaddieCollectionService.new(),
        outOfBattleSquaddieManager
    )
    manager.createNewSquaddie({ outOfBattleSquaddieId: TEST_IDS.squaddieId })
    return manager
}

const buildValidInput = (): MissionManagerValidationInput => {
    const outOfBattleSquaddieManager = buildOutOfBattleSquaddieManager()
    return {
        missionState: MissionStateService.new({
            id: "test-mission",
            mapId: TEST_IDS.mapId,
        }),
        coordinateMapCollectionManager: buildCoordinateMapCollectionManager(),
        squaddieActionManager: buildSquaddieActionManager(),
        inBattleSquaddieManager: buildInBattleSquaddieManager(
            outOfBattleSquaddieManager
        ),
    }
}

const injectOrphanedInBattleSquaddie = (
    inBattleSquaddieManager: InBattleSquaddieManager,
    outOfBattleSquaddieId: string,
    inBattleSquaddie: ReturnType<typeof InBattleSquaddieService.new>
): void => {
    inBattleSquaddieManager.inBattleSquaddieCollection!.byOutOfBattleSquaddieId.set(
        outOfBattleSquaddieId,
        [inBattleSquaddie]
    )
}

describe("MissionManagerValidationService", () => {
    describe("validate", () => {
        it("returns no errors when all managers and references are present", () => {
            const result =
                MissionManagerValidationService.validate(buildValidInput())

            expect(result.errors).toHaveLength(0)
        })

        it("returns errors when required managers are missing", () => {
            const result = MissionManagerValidationService.validate({})

            expect(result.errors).toContain("missionState must be defined")
            expect(result.errors).toContain(
                "inBattleSquaddieManager must be defined"
            )
            expect(result.errors).toContain(
                "coordinateMapCollectionManager must be defined"
            )
            expect(result.errors).toContain(
                "squaddieActionManager must be defined"
            )
        })

        it("returns an error when the mission map is not loaded", () => {
            const input = buildValidInput()
            input.missionState = MissionStateService.new({
                id: "test-mission",
                mapId: "missing-map",
            })

            const result = MissionManagerValidationService.validate(input)

            expect(result.errors).toContain(
                `map "missing-map" not found in coordinateMapCollectionManager`
            )
        })

        it("returns an error when an inBattleSquaddie references a missing outOfBattleSquaddie", () => {
            const input = buildValidInput()
            const missingOutOfBattleId = "nonexistent-squaddie"
            const fakeInBattleSquaddie = InBattleSquaddieService.new({
                id: 0,
                name: "Ghost",
                outOfBattleSquaddie: OutOfBattleSquaddieService.new({
                    id: missingOutOfBattleId,
                    name: "Ghost",
                    attributeSheetId: "ghost-sheet",
                    actionIds: [],
                    affiliation: SquaddieAffiliation.ENEMY,
                }),
                attributeSheet: OutOfBattleSquaddieAttributeSheetService.new({
                    id: "ghost-sheet",
                    maxHitPoints: 1,
                    movement: { movementPointsPerAction: 1 },
                    attributeScores: {
                        [AttributeScore.BODY]: 0,
                        [AttributeScore.MIND]: 0,
                        [AttributeScore.SOUL]: 0,
                    },
                    rank: 0,
                }),
            })
            injectOrphanedInBattleSquaddie(
                input.inBattleSquaddieManager!,
                missingOutOfBattleId,
                fakeInBattleSquaddie
            )

            const result = MissionManagerValidationService.validate(input)

            expect(result.errors).toContain(
                `[MissionManagerValidationService.validate]: outOfBattleSquaddie "${missingOutOfBattleId}" not found`
            )
        })

        it("returns an error when an outOfBattleSquaddie references a missing attributeSheet", () => {
            const input = buildValidInput()
            const outOfBattleSquaddieManager =
                input.inBattleSquaddieManager!.outOfBattleSquaddieManager!
            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "orphaned-squaddie",
                    name: "Orphaned",
                    attributeSheetId: "missing-sheet",
                    actionIds: [],
                    affiliation: SquaddieAffiliation.ENEMY,
                })
            )
            const fakeInBattleSquaddie = InBattleSquaddieService.new({
                id: 0,
                name: "Orphaned",
                outOfBattleSquaddie: OutOfBattleSquaddieService.new({
                    id: "orphaned-squaddie",
                    name: "Orphaned",
                    attributeSheetId: "missing-sheet",
                    actionIds: [],
                    affiliation: SquaddieAffiliation.ENEMY,
                }),
                attributeSheet: OutOfBattleSquaddieAttributeSheetService.new({
                    id: "missing-sheet",
                    maxHitPoints: 1,
                    movement: { movementPointsPerAction: 1 },
                    attributeScores: {
                        [AttributeScore.BODY]: 0,
                        [AttributeScore.MIND]: 0,
                        [AttributeScore.SOUL]: 0,
                    },
                    rank: 0,
                }),
            })
            injectOrphanedInBattleSquaddie(
                input.inBattleSquaddieManager!,
                "orphaned-squaddie",
                fakeInBattleSquaddie
            )

            const result = MissionManagerValidationService.validate(input)

            expect(result.errors).toContain(
                `[MissionManagerValidationService.validate]: attributeSheet "missing-sheet" for outOfBattleSquaddie "orphaned-squaddie" not found`
            )
        })

        it("returns an error when an outOfBattleSquaddie references a missing action", () => {
            const input = buildValidInput()
            const rawSquaddie =
                input.inBattleSquaddieManager!.outOfBattleSquaddieManager!.getRawOutOfBattleSquaddie(
                    TEST_IDS.squaddieId
                )!
            rawSquaddie.actionIds.push("missing-action")

            const result = MissionManagerValidationService.validate(input)

            expect(result.errors).toContain(
                `[MissionManagerValidationService.validate]: action "missing-action" referenced by outOfBattleSquaddie "${TEST_IDS.squaddieId}" not found in squaddieActionManager`
            )
        })

        it("returns an error when an attributeSheet references an item not in squaddieItemManager", () => {
            const input = buildValidInput()
            const outOfBattleSquaddieManager =
                input.inBattleSquaddieManager!.outOfBattleSquaddieManager!

            const originalSheet = outOfBattleSquaddieManager.getAttributeSheet(
                TEST_IDS.attributeSheetId
            )
            const sheetWithItem =
                OutOfBattleSquaddieAttributeSheetService.addItem({
                    attributeSheet: originalSheet,
                    itemId: "missing-item",
                })
            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(sheetWithItem)

            const squaddieItemManager = new SquaddieItemManager(
                SquaddieItemCollectionService.new()
            )
            input.inBattleSquaddieManager!.setSquaddieItemManager(
                squaddieItemManager
            )

            const result = MissionManagerValidationService.validate(input)

            expect(result.errors).toContain(
                `[MissionManagerValidationService.validate]: item "missing-item" referenced by attributeSheet "${TEST_IDS.attributeSheetId}" not found in squaddieItemManager`
            )
        })

        it("returns an error when an inBattleSquaddie has used an item not in squaddieItemManager", () => {
            const input = buildValidInput()
            const inBattleSquaddieCollection =
                input.inBattleSquaddieManager!.inBattleSquaddieCollection!
            const inBattleSquaddie =
                inBattleSquaddieCollection.byOutOfBattleSquaddieId
                    .get(TEST_IDS.squaddieId)
                    ?.find((s) => s.id === 0)
            if (inBattleSquaddie === undefined)
                throw new Error(
                    "test setup: expected in-battle squaddie with id 0"
                )
            inBattleSquaddie.itemIdsUsed.push("missing-used-item")

            const squaddieItemManager = new SquaddieItemManager(
                SquaddieItemCollectionService.new()
            )
            input.inBattleSquaddieManager!.setSquaddieItemManager(
                squaddieItemManager
            )

            const result = MissionManagerValidationService.validate(input)

            expect(result.errors).toContain(
                `[MissionManagerValidationService.validate]: item "missing-used-item" used by inBattleSquaddie "${TEST_IDS.squaddieId}.0" not found in squaddieItemManager`
            )
        })

        it("collects multiple errors when multiple references are missing", () => {
            const input = buildValidInput()
            const rawSquaddie =
                input.inBattleSquaddieManager!.outOfBattleSquaddieManager!.getRawOutOfBattleSquaddie(
                    TEST_IDS.squaddieId
                )!
            rawSquaddie.actionIds.push("missing-action-1", "missing-action-2")

            const result = MissionManagerValidationService.validate(input)

            expect(result.errors).toContain(
                `[MissionManagerValidationService.validate]: action "missing-action-1" referenced by outOfBattleSquaddie "${TEST_IDS.squaddieId}" not found in squaddieActionManager`
            )
            expect(result.errors).toContain(
                `[MissionManagerValidationService.validate]: action "missing-action-2" referenced by outOfBattleSquaddie "${TEST_IDS.squaddieId}" not found in squaddieActionManager`
            )
        })

        it("returns no errors with an item that exists in both attributeSheet and squaddieItemManager", () => {
            const input = buildValidInput()
            const outOfBattleSquaddieManager =
                input.inBattleSquaddieManager!.outOfBattleSquaddieManager!

            const originalSheet = outOfBattleSquaddieManager.getAttributeSheet(
                TEST_IDS.attributeSheetId
            )
            const sheetWithItem =
                OutOfBattleSquaddieAttributeSheetService.addItem({
                    attributeSheet: originalSheet,
                    itemId: TEST_IDS.itemId,
                })
            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(sheetWithItem)

            const squaddieItemManager = new SquaddieItemManager(
                SquaddieItemCollectionService.new()
            )
            squaddieItemManager.addOrUpdate(
                SquaddieItemService.new({
                    id: TEST_IDS.itemId,
                    name: "Test Item",
                })
            )
            input.inBattleSquaddieManager!.setSquaddieItemManager(
                squaddieItemManager
            )

            const result = MissionManagerValidationService.validate(input)

            expect(result.errors).toHaveLength(0)
        })

        describe("deployment coordinate validation", () => {
            const buildMapWithObstacles =
                (): CoordinateMapCollectionManager => {
                    // Row 0: normal normal pit(-)  wall(x)
                    const map = CoordinateMapService.new({
                        id: TEST_IDS.mapId,
                        name: "Obstacle Map",
                        movementProperties: ["1 1 - x"],
                    })
                    const manager = new CoordinateMapCollectionManager(
                        CoordinateMapCollectionService.new()
                    )
                    manager.addOrUpdate({ map })
                    return manager
                }

            it("passes when deployment coordinates are all on normal terrain", () => {
                const deployment = MissionDeploymentService.new({
                    id: "deploy-1",
                    outOfBattleSquaddieId: TEST_IDS.squaddieId,
                    coordinates: [{ row: 0, col: 0 }],
                })
                const input = buildValidInput()
                input.coordinateMapCollectionManager = buildMapWithObstacles()
                input.missionState = MissionStateService.new({
                    id: "test-mission",
                    mapId: TEST_IDS.mapId,
                    deployments: { required: [deployment] },
                })

                const result = MissionManagerValidationService.validate(input)

                expect(result.errors).toHaveLength(0)
            })

            it("returns an error when a deployment coordinate is a pit", () => {
                const deployment = MissionDeploymentService.new({
                    id: "deploy-pit",
                    outOfBattleSquaddieId: TEST_IDS.squaddieId,
                    coordinates: [{ row: 0, col: 2 }],
                })
                const input = buildValidInput()
                input.coordinateMapCollectionManager = buildMapWithObstacles()
                input.missionState = MissionStateService.new({
                    id: "test-mission",
                    mapId: TEST_IDS.mapId,
                    deployments: { required: [deployment] },
                })

                const result = MissionManagerValidationService.validate(input)

                expect(result.errors).toContain(
                    `[MissionManagerValidationService.validate]: deployment "deploy-pit" coordinate (row 0, col 2) is not a valid stopping point`
                )
            })

            it("returns an error when a deployment coordinate is a wall", () => {
                const deployment = MissionDeploymentService.new({
                    id: "deploy-wall",
                    outOfBattleSquaddieId: TEST_IDS.squaddieId,
                    coordinates: [{ row: 0, col: 3 }],
                })
                const input = buildValidInput()
                input.coordinateMapCollectionManager = buildMapWithObstacles()
                input.missionState = MissionStateService.new({
                    id: "test-mission",
                    mapId: TEST_IDS.mapId,
                    deployments: { required: [deployment] },
                })

                const result = MissionManagerValidationService.validate(input)

                expect(result.errors).toContain(
                    `[MissionManagerValidationService.validate]: deployment "deploy-wall" coordinate (row 0, col 3) is not a valid stopping point`
                )
            })

            it("returns an error when a deployment coordinate is off the map", () => {
                const deployment = MissionDeploymentService.new({
                    id: "deploy-offmap",
                    outOfBattleSquaddieId: TEST_IDS.squaddieId,
                    coordinates: [{ row: 99, col: 99 }],
                })
                const input = buildValidInput()
                input.coordinateMapCollectionManager = buildMapWithObstacles()
                input.missionState = MissionStateService.new({
                    id: "test-mission",
                    mapId: TEST_IDS.mapId,
                    deployments: { required: [deployment] },
                })

                const result = MissionManagerValidationService.validate(input)

                expect(result.errors).toContain(
                    `[MissionManagerValidationService.validate]: deployment "deploy-offmap" coordinate (row 99, col 99) is not a valid stopping point`
                )
            })

            it("reports all invalid coordinates across multiple deployments", () => {
                const deployments = [
                    MissionDeploymentService.new({
                        id: "deploy-a",
                        outOfBattleSquaddieId: TEST_IDS.squaddieId,
                        coordinates: [{ row: 0, col: 2 }],
                    }),
                    MissionDeploymentService.new({
                        id: "deploy-b",
                        outOfBattleSquaddieId: TEST_IDS.squaddieId,
                        coordinates: [{ row: 0, col: 3 }],
                    }),
                ]
                const input = buildValidInput()
                input.coordinateMapCollectionManager = buildMapWithObstacles()
                input.missionState = MissionStateService.new({
                    id: "test-mission",
                    mapId: TEST_IDS.mapId,
                    deployments: { required: deployments },
                })

                const result = MissionManagerValidationService.validate(input)

                expect(result.errors).toContain(
                    `[MissionManagerValidationService.validate]: deployment "deploy-a" coordinate (row 0, col 2) is not a valid stopping point`
                )
                expect(result.errors).toContain(
                    `[MissionManagerValidationService.validate]: deployment "deploy-b" coordinate (row 0, col 3) is not a valid stopping point`
                )
            })
        })
    })
})
