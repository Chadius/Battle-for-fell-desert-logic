import { beforeEach, describe, expect, it } from "vitest"
import { MissionManager } from "../missionManager.js"
import { MissionStateService } from "../missionState.js"
import { SquaddieAffiliation } from "../../affiliation/affiliation.js"
import { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager.js"
import { OutOfBattleSquaddieService } from "../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { InBattleSquaddieCollectionService } from "../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { OutOfBattleSquaddieTestSetup } from "../../testUtils/outOfBattleSquaddieTestSetup.js"
import { SquaddieActionManager } from "../../squaddieAction/squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../../squaddieAction/squaddieActionCollection.js"
import { SquaddieActionService } from "../../squaddieAction/squaddieAction.js"
import { ProficiencyType } from "../../proficiency/proficiencyLevel.js"
import { CoordinateMapCollectionManager } from "../../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../../coordinateMap/coordinateMapCollection.js"
import { CoordinateMapService } from "../../coordinateMap/coordinateMap.js"
import { RollGenerator } from "../../squaddieAction/calculate/roll/rollGenerator.js"
import { ActionRange } from "../../squaddieAction/actionRange.js"
import { CoordinateGeneratorShape } from "../../coordinateMap/shape.js"
import type { BattleSquaddieId } from "../../squaddie/inBattle/battleSquaddieId.js"

describe("MissionManager", () => {
    describe("resolveAoeTargets", () => {
        describe("LINE action hits every enemy along the line", () => {
            let missionManager: MissionManager
            let actorId: BattleSquaddieId
            let enemyAId: BattleSquaddieId
            let enemyBId: BattleSquaddieId
            let enemyCId: BattleSquaddieId

            const createLineAction = () =>
                SquaddieActionService.new({
                    id: "slash",
                    name: "Slash",
                    range: ActionRange.LONG,
                    shape: CoordinateGeneratorShape.LINE,
                    areaOfEffectSize: 0,
                    affiliationRelationship: {
                        self: false,
                        foe: true,
                        friend: false,
                    },
                    effectOnActor: {
                        SUCCESS: { actionPoints: { spent: 1 } },
                    },
                    effectOnTarget: {
                        SUCCESS: {
                            damage: {
                                raw: 2,
                                targetProficiency: ProficiencyType.SKILL_BODY,
                            },
                        },
                    },
                })

            beforeEach(() => {
                const { manager: outOfBattleSquaddieManager } =
                    OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                        {
                            sheetId: "line_sheet",
                            attributeSheetOptions: {
                                maxHitPoints: 10,
                                items: { maxCapacity: 0 },
                            },
                        }
                    )

                outOfBattleSquaddieManager.addOrUpdateSquaddie(
                    OutOfBattleSquaddieService.new({
                        id: "actor",
                        name: "Actor",
                        affiliation: SquaddieAffiliation.PLAYER,
                        attributeSheetId: "line_sheet",
                    })
                )
                outOfBattleSquaddieManager.addOrUpdateSquaddie(
                    OutOfBattleSquaddieService.new({
                        id: "enemy-a",
                        name: "Enemy A",
                        affiliation: SquaddieAffiliation.ENEMY,
                        attributeSheetId: "line_sheet",
                    })
                )
                outOfBattleSquaddieManager.addOrUpdateSquaddie(
                    OutOfBattleSquaddieService.new({
                        id: "enemy-b",
                        name: "Enemy B",
                        affiliation: SquaddieAffiliation.ENEMY,
                        attributeSheetId: "line_sheet",
                    })
                )
                outOfBattleSquaddieManager.addOrUpdateSquaddie(
                    OutOfBattleSquaddieService.new({
                        id: "enemy-c",
                        name: "Enemy C",
                        affiliation: SquaddieAffiliation.ENEMY,
                        attributeSheetId: "line_sheet",
                    })
                )

                const inBattleSquaddieManager = new InBattleSquaddieManager(
                    InBattleSquaddieCollectionService.new(),
                    outOfBattleSquaddieManager
                )
                actorId = inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "actor",
                })
                enemyAId = inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy-a",
                })
                enemyBId = inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy-b",
                })
                enemyCId = inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy-c",
                })

                const map = CoordinateMapService.new({
                    id: "line_map",
                    name: "Line map",
                    movementProperties: ["1 1 1 1 1 1"],
                })
                const coordinateMapCollectionManager =
                    new CoordinateMapCollectionManager(
                        CoordinateMapCollectionService.new()
                    )
                coordinateMapCollectionManager.addOrUpdate({ map })
                coordinateMapCollectionManager.addSquaddie({
                    mapId: "line_map",
                    squaddieId: actorId,
                    coordinate: { row: 0, col: 0 },
                })
                coordinateMapCollectionManager.addSquaddie({
                    mapId: "line_map",
                    squaddieId: enemyAId,
                    coordinate: { row: 0, col: 2 },
                })
                coordinateMapCollectionManager.addSquaddie({
                    mapId: "line_map",
                    squaddieId: enemyBId,
                    coordinate: { row: 0, col: 4 },
                })
                coordinateMapCollectionManager.addSquaddie({
                    mapId: "line_map",
                    squaddieId: enemyCId,
                    coordinate: { row: 0, col: 5 },
                })

                const squaddieActionManager = new SquaddieActionManager(
                    SquaddieActionCollectionService.new()
                )
                squaddieActionManager.addOrUpdate(createLineAction())

                missionManager = new MissionManager({
                    missionState: MissionStateService.new({
                        id: "line-mission",
                        mapId: "line_map",
                    }),
                    inBattleSquaddieManager,
                    coordinateMapCollectionManager,
                    squaddieActionManager,
                })
            })

            it("returns all enemies along the line", () => {
                const targets = missionManager.resolveAoeTargets({
                    actor: actorId,
                    action: { id: "slash" },
                    targetCoordinate: { row: 0, col: 4 },
                })

                const targetIds = targets.map((t) => t.outOfBattleSquaddieId)
                expect(targetIds).toContain("enemy-a")
                expect(targetIds).toContain("enemy-b")
                expect(targetIds).toContain("enemy-c")
            })

            it("previewActionResults forecasts results for all enemies in the line", () => {
                const targets = missionManager.resolveAoeTargets({
                    actor: actorId,
                    action: { id: "slash" },
                    targetCoordinate: { row: 0, col: 4 },
                })

                const forecastedResults = missionManager.previewActionResults({
                    actor: actorId,
                    targets,
                    action: { id: "slash" },
                })

                const forecastedTargetIds = forecastedResults.map(
                    (result) => result.battleSquaddieId.outOfBattleSquaddieId
                )
                expect(forecastedTargetIds).toContain("enemy-a")
                expect(forecastedTargetIds).toContain("enemy-b")
                expect(forecastedTargetIds).toContain("enemy-c")
            })

            it("useActionAndGetResults applies results to all enemies in the line", () => {
                const targets = missionManager.resolveAoeTargets({
                    actor: actorId,
                    action: { id: "slash" },
                    targetCoordinate: { row: 0, col: 4 },
                })

                const results = missionManager.useActionAndGetResults({
                    actor: actorId,
                    targets,
                    action: { id: "slash" },
                    rollGenerator: new RollGenerator([3, 3]),
                })

                const resultKeys = [...results.targetResults.keys()]
                expect(resultKeys.some((k) => k.startsWith("enemy-a"))).toBe(
                    true
                )
                expect(resultKeys.some((k) => k.startsWith("enemy-b"))).toBe(
                    true
                )
                expect(resultKeys.some((k) => k.startsWith("enemy-c"))).toBe(
                    true
                )
            })
        })

        describe("BLOOM action hits every enemy within the radius", () => {
            let missionManager: MissionManager
            let actorId: BattleSquaddieId
            let enemyAId: BattleSquaddieId
            let enemyBId: BattleSquaddieId
            let enemyCId: BattleSquaddieId

            const createBloomAction = () =>
                SquaddieActionService.new({
                    id: "fireball",
                    name: "Fireball",
                    range: ActionRange.MEDIUM,
                    shape: CoordinateGeneratorShape.BLOOM,
                    areaOfEffectSize: 1,
                    affiliationRelationship: {
                        self: false,
                        foe: true,
                        friend: false,
                    },
                    effectOnActor: {
                        SUCCESS: { actionPoints: { spent: 1 } },
                    },
                    effectOnTarget: {
                        SUCCESS: {
                            damage: {
                                raw: 2,
                                targetProficiency: ProficiencyType.SKILL_BODY,
                            },
                        },
                    },
                })

            beforeEach(() => {
                const { manager: outOfBattleSquaddieManager } =
                    OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                        {
                            sheetId: "bloom_sheet",
                            attributeSheetOptions: {
                                maxHitPoints: 10,
                                items: { maxCapacity: 0 },
                            },
                        }
                    )

                outOfBattleSquaddieManager.addOrUpdateSquaddie(
                    OutOfBattleSquaddieService.new({
                        id: "actor",
                        name: "Actor",
                        affiliation: SquaddieAffiliation.PLAYER,
                        attributeSheetId: "bloom_sheet",
                    })
                )
                outOfBattleSquaddieManager.addOrUpdateSquaddie(
                    OutOfBattleSquaddieService.new({
                        id: "enemy-a",
                        name: "Enemy A",
                        affiliation: SquaddieAffiliation.ENEMY,
                        attributeSheetId: "bloom_sheet",
                    })
                )
                outOfBattleSquaddieManager.addOrUpdateSquaddie(
                    OutOfBattleSquaddieService.new({
                        id: "enemy-b",
                        name: "Enemy B",
                        affiliation: SquaddieAffiliation.ENEMY,
                        attributeSheetId: "bloom_sheet",
                    })
                )
                outOfBattleSquaddieManager.addOrUpdateSquaddie(
                    OutOfBattleSquaddieService.new({
                        id: "enemy-c",
                        name: "Enemy C",
                        affiliation: SquaddieAffiliation.ENEMY,
                        attributeSheetId: "bloom_sheet",
                    })
                )

                const inBattleSquaddieManager = new InBattleSquaddieManager(
                    InBattleSquaddieCollectionService.new(),
                    outOfBattleSquaddieManager
                )
                actorId = inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "actor",
                })
                enemyAId = inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy-a",
                })
                enemyBId = inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy-b",
                })
                enemyCId = inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy-c",
                })

                const map = CoordinateMapService.new({
                    id: "bloom_map",
                    name: "Bloom map",
                    movementProperties: ["1 1 1 1", "1 1 1 1"],
                })
                const coordinateMapCollectionManager =
                    new CoordinateMapCollectionManager(
                        CoordinateMapCollectionService.new()
                    )
                coordinateMapCollectionManager.addOrUpdate({ map })
                coordinateMapCollectionManager.addSquaddie({
                    mapId: "bloom_map",
                    squaddieId: actorId,
                    coordinate: { row: 0, col: 0 },
                })
                coordinateMapCollectionManager.addSquaddie({
                    mapId: "bloom_map",
                    squaddieId: enemyAId,
                    coordinate: { row: 0, col: 1 },
                })
                coordinateMapCollectionManager.addSquaddie({
                    mapId: "bloom_map",
                    squaddieId: enemyBId,
                    coordinate: { row: 1, col: 1 },
                })
                coordinateMapCollectionManager.addSquaddie({
                    mapId: "bloom_map",
                    squaddieId: enemyCId,
                    coordinate: { row: 0, col: 3 },
                })

                const squaddieActionManager = new SquaddieActionManager(
                    SquaddieActionCollectionService.new()
                )
                squaddieActionManager.addOrUpdate(createBloomAction())

                missionManager = new MissionManager({
                    missionState: MissionStateService.new({
                        id: "bloom-mission",
                        mapId: "bloom_map",
                    }),
                    inBattleSquaddieManager,
                    coordinateMapCollectionManager,
                    squaddieActionManager,
                })
            })

            it("returns all enemies within the blast radius, excluding enemies outside it", () => {
                const targets = missionManager.resolveAoeTargets({
                    actor: actorId,
                    action: { id: "fireball" },
                    targetCoordinate: { row: 0, col: 1 },
                })

                const targetIds = targets.map((t) => t.outOfBattleSquaddieId)
                expect(targetIds).toContain("enemy-a")
                expect(targetIds).toContain("enemy-b")
                expect(targetIds).not.toContain("enemy-c")
            })

            it("previewActionResults forecasts results for all enemies in the blast radius", () => {
                const targets = missionManager.resolveAoeTargets({
                    actor: actorId,
                    action: { id: "fireball" },
                    targetCoordinate: { row: 0, col: 1 },
                })

                const forecastedResults = missionManager.previewActionResults({
                    actor: actorId,
                    targets,
                    action: { id: "fireball" },
                })

                const forecastedTargetIds = forecastedResults.map(
                    (result) => result.battleSquaddieId.outOfBattleSquaddieId
                )
                expect(forecastedTargetIds).toContain("enemy-a")
                expect(forecastedTargetIds).toContain("enemy-b")
                expect(forecastedTargetIds).not.toContain("enemy-c")
            })

            it("useActionAndGetResults applies results to all enemies within the blast radius", () => {
                const targets = missionManager.resolveAoeTargets({
                    actor: actorId,
                    action: { id: "fireball" },
                    targetCoordinate: { row: 0, col: 1 },
                })

                const results = missionManager.useActionAndGetResults({
                    actor: actorId,
                    targets,
                    action: { id: "fireball" },
                    rollGenerator: new RollGenerator([3, 3]),
                })

                const resultKeys = [...results.targetResults.keys()]
                expect(resultKeys.some((k) => k.startsWith("enemy-a"))).toBe(
                    true
                )
                expect(resultKeys.some((k) => k.startsWith("enemy-b"))).toBe(
                    true
                )
                expect(resultKeys.every((k) => !k.startsWith("enemy-c"))).toBe(
                    true
                )
            })
        })
    })
})
