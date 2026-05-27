import { beforeEach, describe, expect, it } from "vitest"
import { MissionManager } from "../missionManager"
import { MissionStateService } from "../missionState"
import { MissionDeploymentService } from "../missionDeployment"
import { SquaddieAffiliation } from "../../affiliation/affiliation"
import { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager"
import { OutOfBattleSquaddieService } from "../../squaddie/outOfBattle/outOfBattleSquaddie"
import { InBattleSquaddieCollectionService } from "../../squaddie/inBattle/inBattleSquaddieCollection"
import { AttributeScore } from "../../proficiency/attributeScore"
import { OutOfBattleSquaddieTestSetup } from "../../testUtils/outOfBattleSquaddieTestSetup"
import { SquaddieActionManager } from "../../squaddieAction/squaddieActionManager"
import { SquaddieActionCollectionService } from "../../squaddieAction/squaddieActionCollection"
import { SquaddieActionService } from "../../squaddieAction/squaddieAction"
import { ProficiencyType } from "../../proficiency/proficiencyLevel"
import { CoordinateMapCollectionManager } from "../../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../../coordinateMap/coordinateMapCollection"
import { CoordinateMapService } from "../../coordinateMap/coordinateMap"
import { ActionRange } from "../../squaddieAction/actionRange"
import { CoordinateGeneratorShape } from "../../coordinateMap/shape"
import { DegreeOfSuccess } from "../../degreesOfSuccess/degreeOfSuccess"

describe("MissionManager", () => {
    describe("deployRequiredSquaddies", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let coordinateMapCollectionManager: CoordinateMapCollectionManager
        let liniSquaddieId: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
        let demonSquaddieId: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }

        beforeEach(() => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "lini_sheet",
                        attributeSheetOptions: { maxHitPoints: 5 },
                    }
                )

            const demonSheet =
                OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
                    id: "demon_sheet",
                    maxHitPoints: 2,
                })
            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(demonSheet)

            const lini = OutOfBattleSquaddieService.new({
                id: "lini",
                name: "Lini",
                affiliation: SquaddieAffiliation.PLAYER,
                attributeSheetId: "lini_sheet",
            })
            const demon = OutOfBattleSquaddieService.new({
                id: "slither-demon",
                name: "Slither Demon",
                affiliation: SquaddieAffiliation.ENEMY,
                attributeSheetId: "demon_sheet",
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(lini)
            outOfBattleSquaddieManager.addOrUpdateSquaddie(demon)

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )
            liniSquaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "lini",
            })
            demonSquaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "slither-demon",
            })

            const map = CoordinateMapService.new({
                id: "deploy_map",
                name: "deploy map",
                movementProperties: ["1 1 1 1 1 "],
            })
            coordinateMapCollectionManager = new CoordinateMapCollectionManager(
                CoordinateMapCollectionService.new()
            )
            coordinateMapCollectionManager.addOrUpdate({ map })
        })

        it("places squaddies at their deployment coordinates", () => {
            const missionState = MissionStateService.new({
                id: "mission-deploy",
                mapId: "deploy_map",
                deployments: {
                    required: [
                        MissionDeploymentService.new({
                            id: "lini-start",
                            outOfBattleSquaddieId: "lini",
                            coordinates: [{ row: 0, col: 0 }],
                        }),
                        MissionDeploymentService.new({
                            id: "demon-start",
                            outOfBattleSquaddieId: "slither-demon",
                            coordinates: [{ row: 0, col: 4 }],
                        }),
                    ],
                },
            })
            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
            })

            manager.deployRequiredSquaddies()

            expect(
                coordinateMapCollectionManager.getSquaddieCoordinate({
                    mapId: "deploy_map",
                    squaddieId: liniSquaddieId,
                })
            ).toEqual({ row: 0, col: 0 })
            expect(
                coordinateMapCollectionManager.getSquaddieCoordinate({
                    mapId: "deploy_map",
                    squaddieId: demonSquaddieId,
                })
            ).toEqual({ row: 0, col: 4 })
        })

        it("deploys multiple instances from one deployment object at different coordinates", () => {
            const secondDemonId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "slither-demon",
            })
            const missionState = MissionStateService.new({
                id: "mission-deploy",
                mapId: "deploy_map",
                deployments: {
                    required: [
                        MissionDeploymentService.new({
                            id: "demons",
                            outOfBattleSquaddieId: "slither-demon",
                            coordinates: [
                                { row: 0, col: 1 },
                                { row: 0, col: 2 },
                            ],
                        }),
                    ],
                },
            })
            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
            })

            manager.deployRequiredSquaddies()

            expect(
                coordinateMapCollectionManager.getSquaddieCoordinate({
                    mapId: "deploy_map",
                    squaddieId: demonSquaddieId,
                })
            ).toEqual({ row: 0, col: 1 })
            expect(
                coordinateMapCollectionManager.getSquaddieCoordinate({
                    mapId: "deploy_map",
                    squaddieId: secondDemonId,
                })
            ).toEqual({ row: 0, col: 2 })
        })

        it("marks all deployed squaddies as complete", () => {
            const missionState = MissionStateService.new({
                id: "mission-deploy",
                mapId: "deploy_map",
                deployments: {
                    required: [
                        MissionDeploymentService.new({
                            id: "lini-start",
                            outOfBattleSquaddieId: "lini",
                            coordinates: [{ row: 0, col: 0 }],
                        }),
                    ],
                },
            })
            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
            })

            manager.deployRequiredSquaddies()

            expect(
                MissionStateService.getPendingDeployments(manager.missionState!)
            ).toHaveLength(0)
        })

        it("skips squaddies that have already been deployed", () => {
            const liniDeployment = MissionDeploymentService.new({
                id: "lini-start",
                outOfBattleSquaddieId: "lini",
                coordinates: [{ row: 0, col: 0 }],
            })
            let missionState = MissionStateService.new({
                id: "mission-deploy",
                mapId: "deploy_map",
                deployments: { required: [liniDeployment] },
            })
            missionState = MissionStateService.markDeploymentComplete(
                missionState,
                liniDeployment.id
            )
            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
            })

            manager.deployRequiredSquaddies()

            expect(
                coordinateMapCollectionManager.getSquaddieCoordinate({
                    mapId: "deploy_map",
                    squaddieId: liniSquaddieId,
                })
            ).toBeUndefined()
        })

        it("throws when no inBattleSquaddie exists for the outOfBattleSquaddieId", () => {
            const missionState = MissionStateService.new({
                id: "mission-deploy",
                mapId: "deploy_map",
                deployments: {
                    required: [
                        MissionDeploymentService.new({
                            id: "unknown-start",
                            outOfBattleSquaddieId: "unknown-squaddie",
                            coordinates: [{ row: 0, col: 0 }],
                        }),
                    ],
                },
            })
            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
            })

            expect(() => manager.deployRequiredSquaddies()).toThrow(
                'no inBattleSquaddie found for outOfBattleSquaddieId "unknown-squaddie"'
            )
        })
    })

    describe("delegation loading methods", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let coordinateMapCollectionManager: CoordinateMapCollectionManager
        let squaddieActionManager: SquaddieActionManager
        let manager: MissionManager
        let attackAction: ReturnType<typeof SquaddieActionService.new>

        beforeEach(() => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "actor_sheet",
                        attributeSheetOptions: { maxHitPoints: 8 },
                    }
                )
            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "actor",
                    name: "Actor",
                    affiliation: SquaddieAffiliation.PLAYER,
                    attributeSheetId: "actor_sheet",
                })
            )
            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor",
            })

            attackAction = SquaddieActionService.new({
                id: "attack",
                name: "Attack",
                attribute: AttributeScore.BODY,
                proficiency: ProficiencyType.WEAPON_MARTIAL,
                targeting: {
                    range: ActionRange.MELEE,
                    shape: CoordinateGeneratorShape.BLOOM,
                    affiliationRelationship: {
                        self: false,
                        foe: true,
                        friend: false,
                    },
                },
                effectOnActor: { [DegreeOfSuccess.SUCCESS]: {} },
            })
            squaddieActionManager = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )
            squaddieActionManager.addOrUpdate(attackAction)

            coordinateMapCollectionManager = new CoordinateMapCollectionManager(
                CoordinateMapCollectionService.new()
            )
            coordinateMapCollectionManager.addOrUpdate({
                map: CoordinateMapService.new({
                    id: "test-map",
                    name: "Test Map",
                    movementProperties: ["1 1 1 1 1"],
                }),
            })

            manager = new MissionManager({
                missionState: MissionStateService.new({
                    id: "mission-1",
                    mapId: "test-map",
                }),
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
            })
        })

        it("addSquaddiesFromJson loads squaddies into the inBattleSquaddieManager", () => {
            const targetManager = new MissionManager({
                missionState: MissionStateService.new({
                    id: "mission-1",
                    mapId: "test-map",
                }),
                inBattleSquaddieManager: new InBattleSquaddieManager(
                    InBattleSquaddieCollectionService.new()
                ),
                coordinateMapCollectionManager,
                squaddieActionManager,
            })
            const serialized = inBattleSquaddieManager.serialize()
            const errors = targetManager.addSquaddiesFromJson(serialized)
            expect(errors).toHaveLength(0)
            const reSerialized =
                targetManager.inBattleSquaddieManager!.serialize()
            expect(
                Object.keys(reSerialized.byOutOfBattleSquaddieId)
            ).toHaveLength(1)
        })

        it("addSquaddiesFromJson returns errors for invalid data", () => {
            const errors = manager.addSquaddiesFromJson({ invalid: true })
            expect(errors).toHaveLength(1)
            expect(errors[0]).toContain("InBattleSquaddieCollectionService")
        })

        it("addMapsFromJson loads maps into the coordinateMapCollectionManager", () => {
            const targetManager = new MissionManager({
                missionState: MissionStateService.new({
                    id: "mission-1",
                    mapId: "test-map",
                }),
                inBattleSquaddieManager,
                coordinateMapCollectionManager:
                    new CoordinateMapCollectionManager(
                        CoordinateMapCollectionService.new()
                    ),
                squaddieActionManager,
            })
            const serialized = coordinateMapCollectionManager.serialize()
            const errors = targetManager.addMapsFromJson(serialized)
            expect(errors).toHaveLength(0)
            expect(
                targetManager.coordinateMapCollectionManager!.getMapById(
                    "test-map"
                ).id
            ).toBe("test-map")
        })

        it("addMapsFromJson returns errors for invalid data", () => {
            const errors = manager.addMapsFromJson([{ id: "" }])
            expect(errors).toHaveLength(1)
            expect(errors[0]).toContain("CoordinateMapService.deserialize")
        })

        it("addActionsFromJson loads actions into the squaddieActionManager", () => {
            const targetManager = new MissionManager({
                missionState: MissionStateService.new({
                    id: "mission-1",
                    mapId: "test-map",
                }),
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager: new SquaddieActionManager(
                    SquaddieActionCollectionService.new()
                ),
            })
            const serialized = squaddieActionManager.serialize()
            const errors = targetManager.addActionsFromJson(serialized)
            expect(errors).toHaveLength(0)
            expect(
                targetManager.squaddieActionManager!.has("attack")
            ).toBeTruthy()
        })

        it("addActionsFromJson returns errors for invalid data", () => {
            const errors = manager.addActionsFromJson([{ notAnAction: true }])
            expect(errors).toHaveLength(1)
            expect(errors[0]).toContain("SquaddieActionService.deserialize")
        })

        it("throws if sub-manager is undefined when calling delegation methods", () => {
            const empty = new MissionManager()
            expect(() => empty.addSquaddiesFromJson({})).toThrow(
                "inBattleSquaddieManager must be defined"
            )
            expect(() => empty.addMapsFromJson([])).toThrow(
                "coordinateMapCollectionManager must be defined"
            )
            expect(() => empty.addActionsFromJson([])).toThrow(
                "squaddieActionManager must be defined"
            )
        })
    })

    describe("validate", () => {
        it("returns isValid true when all components are present and map exists", () => {
            const coordinateMapCollectionManager =
                new CoordinateMapCollectionManager(
                    CoordinateMapCollectionService.new()
                )
            coordinateMapCollectionManager.addOrUpdate({
                map: CoordinateMapService.new({
                    id: "mission-map",
                    name: "Mission Map",
                    movementProperties: ["1 1 1"],
                }),
            })
            const manager = new MissionManager({
                missionState: MissionStateService.new({
                    id: "m1",
                    mapId: "mission-map",
                }),
                inBattleSquaddieManager: new InBattleSquaddieManager(
                    InBattleSquaddieCollectionService.new()
                ),
                coordinateMapCollectionManager,
                squaddieActionManager: new SquaddieActionManager(
                    SquaddieActionCollectionService.new()
                ),
            })
            const result = manager.validate()
            expect(result.isValid).toBeTruthy()
            expect(result.errors).toHaveLength(0)
        })

        it("reports all missing components", () => {
            const result = new MissionManager().validate()
            expect(result.isValid).toBeFalsy()
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

        it("reports when the mission map is not loaded", () => {
            const manager = new MissionManager({
                missionState: MissionStateService.new({
                    id: "m1",
                    mapId: "missing-map",
                }),
                inBattleSquaddieManager: new InBattleSquaddieManager(
                    InBattleSquaddieCollectionService.new()
                ),
                coordinateMapCollectionManager:
                    new CoordinateMapCollectionManager(
                        CoordinateMapCollectionService.new()
                    ),
                squaddieActionManager: new SquaddieActionManager(
                    SquaddieActionCollectionService.new()
                ),
            })
            const result = manager.validate()
            expect(result.isValid).toBeFalsy()
            expect(result.errors).toContain(
                'map "missing-map" not found in coordinateMapCollectionManager'
            )
        })
    })
})
