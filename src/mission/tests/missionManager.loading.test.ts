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
import { OutOfBattleSquaddieManager } from "../../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { OutOfBattleSquaddieCollectionService } from "../../squaddie/outOfBattle/outOfBattleSquaddieCollection"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection"

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

        it("loadMissionStateFromJson sets the missionState after validate", () => {
            const targetManager = new MissionManager({
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
            })
            const serialized = MissionStateService.serialize(
                MissionStateService.new({ id: "mission-1", mapId: "test-map" })
            )
            targetManager.loadMissionStateFromJson(serialized)
            targetManager.validate()
            expect(targetManager.missionState?.id).toBe("mission-1")
        })

        it("loadMissionStateFromJson throws on invalid data", () => {
            expect(() =>
                manager.loadMissionStateFromJson({ invalid: true })
            ).toThrow("MissionStateService.deserialize")
        })

        it("addActionsFromJson loads actions into the squaddieActionManager after validate", () => {
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
            targetManager.validate()
            expect(
                targetManager.squaddieActionManager!.has("attack")
            ).toBeTruthy()
        })

        it("addActionsFromJson returns errors for invalid data", () => {
            const errors = manager.addActionsFromJson([{ notAnAction: true }])
            expect(errors).toHaveLength(1)
            expect(errors[0]).toContain("SquaddieActionService.deserialize")
        })

        it("addActionsFromJson works without a pre-existing squaddieActionManager by staging a new one", () => {
            const empty = new MissionManager()
            expect(() => empty.addActionsFromJson([])).not.toThrow()
            expect(empty.squaddieActionManager).toBeUndefined()
        })

        describe("addSquaddiesFromJson", () => {
            let sourceOutOfBattleSquaddieManager: OutOfBattleSquaddieManager

            beforeEach(() => {
                const { manager, attributeSheet } =
                    OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                        {
                            sheetId: "hero_sheet",
                            attributeSheetOptions: { maxHitPoints: 10 },
                        }
                    )
                manager.addOrUpdateSquaddie(
                    OutOfBattleSquaddieService.new({
                        id: "hero",
                        name: "Hero",
                        affiliation: SquaddieAffiliation.PLAYER,
                        attributeSheetId: attributeSheet.id,
                    })
                )
                sourceOutOfBattleSquaddieManager = manager
            })

            it("loads squaddies into outOfBattleSquaddieManager after validate", () => {
                const targetManager = new MissionManager({
                    missionState: MissionStateService.new({
                        id: "mission-1",
                        mapId: "test-map",
                    }),
                    inBattleSquaddieManager,
                    coordinateMapCollectionManager,
                    squaddieActionManager,
                })
                const errors = targetManager.addSquaddiesFromJson(
                    sourceOutOfBattleSquaddieManager.serializeSquaddies()
                )
                expect(errors).toHaveLength(0)
                targetManager.validate()
                expect(
                    targetManager.outOfBattleSquaddieManager?.getRawOutOfBattleSquaddie(
                        "hero"
                    )
                ).toBeDefined()
            })

            it("returns errors for invalid data", () => {
                const errors = manager.addSquaddiesFromJson([
                    { notASquaddie: true },
                ])
                expect(errors).toHaveLength(1)
            })

            it("works without a pre-existing outOfBattleSquaddieManager", () => {
                const empty = new MissionManager()
                expect(() => empty.addSquaddiesFromJson([])).not.toThrow()
                expect(empty.outOfBattleSquaddieManager).toBeUndefined()
            })
        })

        describe("addAttributeSheetsFromJson", () => {
            let sourceOutOfBattleSquaddieManager: OutOfBattleSquaddieManager

            beforeEach(() => {
                sourceOutOfBattleSquaddieManager =
                    new OutOfBattleSquaddieManager(
                        OutOfBattleSquaddieCollectionService.new(),
                        OutOfBattleSquaddieAttributeSheetCollectionService.new()
                    )
                sourceOutOfBattleSquaddieManager.addOrUpdateAttributeSheet(
                    OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
                        id: "hero_sheet",
                        maxHitPoints: 10,
                    })
                )
            })

            it("loads attribute sheets into outOfBattleSquaddieManager after validate", () => {
                const targetManager = new MissionManager({
                    missionState: MissionStateService.new({
                        id: "mission-1",
                        mapId: "test-map",
                    }),
                    inBattleSquaddieManager,
                    coordinateMapCollectionManager,
                    squaddieActionManager,
                })
                const errors = targetManager.addAttributeSheetsFromJson(
                    sourceOutOfBattleSquaddieManager.serializeAttributeSheets()
                )
                expect(errors).toHaveLength(0)
                targetManager.validate()
                expect(() =>
                    targetManager.outOfBattleSquaddieManager?.getAttributeSheet(
                        "hero_sheet"
                    )
                ).not.toThrow()
            })

            it("returns errors for invalid data", () => {
                const errors = manager.addAttributeSheetsFromJson([
                    { notASheet: true },
                ])
                expect(errors).toHaveLength(1)
            })

            it("works without a pre-existing outOfBattleSquaddieManager", () => {
                const empty = new MissionManager()
                expect(() => empty.addAttributeSheetsFromJson([])).not.toThrow()
                expect(empty.outOfBattleSquaddieManager).toBeUndefined()
            })
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
