import { beforeEach, describe, expect, it } from "vitest"
import { AoeTargetResolutionService } from "./aoeTargetResolutionService.js"
import { SquaddieActionService } from "../../squaddieAction.js"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { SquaddieAffiliation } from "../../../affiliation/affiliation.js"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.js"
import { ActionRange } from "../../actionRange.js"
import { CoordinateGeneratorShape } from "../../../coordinateMap/shape.js"
import {
    CoordinateCalculator,
    CoordinateDirection,
    type TCoordinateDirection,
} from "../../../coordinateMap/coordinateCalculator.js"
import type { OffsetCoordinate } from "../../../coordinateMap/offsetCoordinate.js"
import { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../../../coordinateMap/coordinateMapCollection.js"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap.js"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup.js"
import type { OutOfBattleSquaddieManager } from "../../../squaddie/outOfBattle/outOfBattleSquaddieManager.js"
import { ProficiencyType } from "../../../proficiency/proficiencyLevel.js"
import { AttributeScore } from "../../../proficiency/attributeScore.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"

describe("AoeTargetResolutionService", () => {
    let inBattleSquaddieManager: InBattleSquaddieManager
    let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    let coordinateMapCollectionManager: CoordinateMapCollectionManager
    let lini: BattleSquaddieId
    let slitherDemon: BattleSquaddieId
    let secondEnemy: BattleSquaddieId
    let thirdEnemy: BattleSquaddieId
    const mapId = "test-map"

    const foeAoeAction = SquaddieActionService.new({
        id: "foe-aoe",
        name: "Foe AoE",
        attribute: AttributeScore.MIND,
        proficiency: ProficiencyType.SKILL_MIND,
        range: ActionRange.MEDIUM,
        shape: CoordinateGeneratorShape.BLOOM,
        areaOfEffectSize: 1,
        aimCoordinateRequiresTarget: false,
        affiliationRelationship: { self: false, foe: true, friend: false },
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 2 } },
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

    const size2FoeAction = SquaddieActionService.new({
        id: "size-2-foe-aoe",
        name: "Size 2 Foe AoE",
        attribute: AttributeScore.MIND,
        proficiency: ProficiencyType.SKILL_MIND,
        range: ActionRange.LONG,
        shape: CoordinateGeneratorShape.BLOOM,
        areaOfEffectSize: 2,
        aimCoordinateRequiresTarget: false,
        affiliationRelationship: { self: false, foe: true, friend: false },
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 2 } },
        },
        effectOnTarget: {
            [DegreeOfSuccess.SUCCESS]: {
                damage: { raw: 3, targetProficiency: ProficiencyType.ARMOR },
            },
        },
    })

    const friendAoeAction = SquaddieActionService.new({
        id: "friend-aoe",
        name: "Friend AoE",
        attribute: AttributeScore.SOUL,
        proficiency: ProficiencyType.SKILL_SOUL,
        range: ActionRange.MEDIUM,
        shape: CoordinateGeneratorShape.BLOOM,
        areaOfEffectSize: 1,
        aimCoordinateRequiresTarget: false,
        affiliationRelationship: { self: true, foe: false, friend: true },
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 2 } },
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

    beforeEach(() => {
        const { manager } =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "test-sheet",
            })
        outOfBattleSquaddieManager = manager

        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: "lini",
                name: "Lini",
                actionIds: [],
                attributeSheetId: "test-sheet",
                affiliation: SquaddieAffiliation.PLAYER,
            })
        )
        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: "slither-demon",
                name: "Slither Demon",
                actionIds: [],
                attributeSheetId: "test-sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
        )
        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: "second-enemy",
                name: "Second Enemy",
                actionIds: [],
                attributeSheetId: "test-sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
        )
        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: "third-enemy",
                name: "Third Enemy",
                actionIds: [],
                attributeSheetId: "test-sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
        )

        const inBattleCollection = InBattleSquaddieCollectionService.new()
        inBattleSquaddieManager = new InBattleSquaddieManager(
            inBattleCollection,
            outOfBattleSquaddieManager
        )

        const { inBattleSquaddieId: liniId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "lini",
            })
        lini = { inBattleSquaddieId: liniId, outOfBattleSquaddieId: "lini" }

        const { inBattleSquaddieId: demonId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "slither-demon",
            })
        slitherDemon = {
            inBattleSquaddieId: demonId,
            outOfBattleSquaddieId: "slither-demon",
        }

        const { inBattleSquaddieId: secondId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "second-enemy",
            })
        secondEnemy = {
            inBattleSquaddieId: secondId,
            outOfBattleSquaddieId: "second-enemy",
        }

        const { inBattleSquaddieId: thirdId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "third-enemy",
            })
        thirdEnemy = {
            inBattleSquaddieId: thirdId,
            outOfBattleSquaddieId: "third-enemy",
        }

        let mapCollection = CoordinateMapCollectionService.new()
        mapCollection = CoordinateMapCollectionService.addOrUpdate({
            collection: mapCollection,
            map: CoordinateMapService.new({
                id: mapId,
                name: "Test Map",
                movementProperties: [
                    "1 1 1 1 1 1",
                    " 1 1 1 1 1 1",
                    "1 1 1 1 1 1 ",
                    " 1 1 1 1 1 1",
                    "1 1 1 1 1 1 ",
                ],
            }),
        })
        coordinateMapCollectionManager = new CoordinateMapCollectionManager(
            mapCollection
        )

        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: lini,
            coordinate: { row: 2, col: 2 },
        })
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: slitherDemon,
            coordinate: { row: 2, col: 3 },
        })
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: secondEnemy,
            coordinate: { row: 2, col: 4 },
        })
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: thirdEnemy,
            coordinate: { row: 2, col: 5 },
        })
    })

    it("returns squaddies within radius at blast center", () => {
        const result = AoeTargetResolutionService.resolveAoeTargets({
            action: foeAoeAction,
            actor: lini,
            targetCoordinate: { row: 2, col: 3 },
            mapId,
            managers: {
                coordinateMapCollectionManager,
                inBattleSquaddieManager,
            },
        })

        expect(result.length).toBe(2)
        expect(result).toContainEqual(slitherDemon)
        expect(result).toContainEqual(secondEnemy)
    })

    it("excludes squaddies outside radius", () => {
        const result = AoeTargetResolutionService.resolveAoeTargets({
            action: foeAoeAction,
            actor: lini,
            targetCoordinate: { row: 0, col: 0 },
            mapId,
            managers: {
                coordinateMapCollectionManager,
                inBattleSquaddieManager,
            },
        })

        expect(result.length).toBe(0)
    })

    it("affiliationRelationship foe filter excludes Lini", () => {
        const result = AoeTargetResolutionService.resolveAoeTargets({
            action: foeAoeAction,
            actor: lini,
            targetCoordinate: { row: 2, col: 2 },
            mapId,
            managers: {
                coordinateMapCollectionManager,
                inBattleSquaddieManager,
            },
        })

        expect(result).not.toContainEqual(lini)
        expect(result).toContainEqual(slitherDemon)
    })

    it("affiliationRelationship friend filter returns Lini only", () => {
        const result = AoeTargetResolutionService.resolveAoeTargets({
            action: friendAoeAction,
            actor: lini,
            targetCoordinate: { row: 2, col: 2 },
            mapId,
            managers: {
                coordinateMapCollectionManager,
                inBattleSquaddieManager,
            },
        })

        expect(result.length).toBe(1)
        expect(result).toContainEqual(lini)
    })

    it("size=0 returns only the squaddie at exact coordinate", () => {
        const singleTileAction = SquaddieActionService.new({
            id: "single-tile",
            name: "Single Tile",
            range: ActionRange.MEDIUM,
            shape: CoordinateGeneratorShape.BLOOM,
            areaOfEffectSize: 0,
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
        })

        const result = AoeTargetResolutionService.resolveAoeTargets({
            action: singleTileAction,
            actor: lini,
            targetCoordinate: { row: 2, col: 3 },
            mapId,
            managers: {
                coordinateMapCollectionManager,
                inBattleSquaddieManager,
            },
        })

        expect(result.length).toBe(1)
        expect(result).toContainEqual(slitherDemon)
    })

    it("returns empty array when no squaddies in radius", () => {
        const result = AoeTargetResolutionService.resolveAoeTargets({
            action: foeAoeAction,
            actor: lini,
            targetCoordinate: { row: 0, col: 4 },
            mapId,
            managers: {
                coordinateMapCollectionManager,
                inBattleSquaddieManager,
            },
        })

        expect(result.length).toBe(0)
    })

    it("size=2 includes squaddies at distance 1 and exactly distance 2", () => {
        const result = AoeTargetResolutionService.resolveAoeTargets({
            action: size2FoeAction,
            actor: lini,
            targetCoordinate: { row: 2, col: 2 },
            mapId,
            managers: {
                coordinateMapCollectionManager,
                inBattleSquaddieManager,
            },
        })

        expect(result).toContainEqual(slitherDemon)
        expect(result).toContainEqual(secondEnemy)
        expect(result).not.toContainEqual(lini)
    })

    it("size=2 excludes squaddies at distance 3", () => {
        const result = AoeTargetResolutionService.resolveAoeTargets({
            action: size2FoeAction,
            actor: lini,
            targetCoordinate: { row: 2, col: 2 },
            mapId,
            managers: {
                coordinateMapCollectionManager,
                inBattleSquaddieManager,
            },
        })

        expect(result).not.toContainEqual(thirdEnemy)
    })

    const buildTerrainMap = (
        terrainRow: number,
        terrainCol: number,
        terrainChar: "-" | "X"
    ): CoordinateMapCollectionManager => {
        const buildRow = (rowIndex: number, cols: number): string => {
            const tiles = Array.from({ length: cols }, (_, col) =>
                rowIndex === terrainRow && col === terrainCol
                    ? terrainChar
                    : "1"
            ).join(" ")
            return rowIndex % 2 === 0 ? tiles : ` ${tiles}`
        }

        const movementProperties = [0, 1, 2, 3, 4].map((r) => buildRow(r, 5))

        let mapCollection = CoordinateMapCollectionService.new()
        mapCollection = CoordinateMapCollectionService.addOrUpdate({
            collection: mapCollection,
            map: CoordinateMapService.new({
                id: mapId,
                name: "Terrain Test Map",
                movementProperties,
            }),
        })
        return new CoordinateMapCollectionManager(mapCollection)
    }

    const placeSquaddieAtNeighborOf = ({
        manager,
        squaddieId,
        origin,
        direction,
    }: {
        manager: CoordinateMapCollectionManager
        squaddieId: BattleSquaddieId
        origin: OffsetCoordinate
        direction: TCoordinateDirection
    }) => {
        manager.addSquaddie({
            mapId,
            squaddieId,
            coordinate: CoordinateCalculator.getNeighbor(origin, direction),
        })
    }

    describe("LINE terrain blocking", () => {
        let lineTerrainManager: CoordinateMapCollectionManager

        const lineAction = SquaddieActionService.new({
            id: "line-action",
            name: "Line Action",
            range: ActionRange.LONG,
            shape: CoordinateGeneratorShape.LINE,
            areaOfEffectSize: 0,
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
        })

        const lineActionSkipOverPitsFalse = SquaddieActionService.new({
            id: "line-no-pit",
            name: "Line No Pit",
            range: ActionRange.LONG,
            shape: CoordinateGeneratorShape.LINE,
            areaOfEffectSize: 0,
            skipOverPits: false,
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
        })

        const lineActionMoveThroughWalls = SquaddieActionService.new({
            id: "line-walls",
            name: "Line Through Walls",
            range: ActionRange.LONG,
            shape: CoordinateGeneratorShape.LINE,
            areaOfEffectSize: 0,
            moveThroughWalls: true,
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
        })

        it("line crosses pit by default — enemy beyond pit is hit", () => {
            lineTerrainManager = buildTerrainMap(2, 2, "-")
            lineTerrainManager.addSquaddie({
                mapId,
                squaddieId: lini,
                coordinate: { row: 2, col: 0 },
            })
            lineTerrainManager.addSquaddie({
                mapId,
                squaddieId: slitherDemon,
                coordinate: { row: 2, col: 4 },
            })

            const result = AoeTargetResolutionService.resolveAoeTargets({
                action: lineAction,
                actor: lini,
                targetCoordinate: { row: 2, col: 4 },
                mapId,
                managers: {
                    coordinateMapCollectionManager: lineTerrainManager,
                    inBattleSquaddieManager,
                },
            })

            expect(result).toContainEqual(slitherDemon)
        })

        it("line stops at wall by default — enemy beyond wall is not hit", () => {
            lineTerrainManager = buildTerrainMap(2, 2, "X")
            lineTerrainManager.addSquaddie({
                mapId,
                squaddieId: lini,
                coordinate: { row: 2, col: 0 },
            })
            lineTerrainManager.addSquaddie({
                mapId,
                squaddieId: slitherDemon,
                coordinate: { row: 2, col: 4 },
            })

            const result = AoeTargetResolutionService.resolveAoeTargets({
                action: lineAction,
                actor: lini,
                targetCoordinate: { row: 2, col: 4 },
                mapId,
                managers: {
                    coordinateMapCollectionManager: lineTerrainManager,
                    inBattleSquaddieManager,
                },
            })

            expect(result).not.toContainEqual(slitherDemon)
        })

        it("moveThroughWalls: true — enemy beyond wall is hit", () => {
            lineTerrainManager = buildTerrainMap(2, 2, "X")
            lineTerrainManager.addSquaddie({
                mapId,
                squaddieId: lini,
                coordinate: { row: 2, col: 0 },
            })
            lineTerrainManager.addSquaddie({
                mapId,
                squaddieId: slitherDemon,
                coordinate: { row: 2, col: 4 },
            })

            const result = AoeTargetResolutionService.resolveAoeTargets({
                action: lineActionMoveThroughWalls,
                actor: lini,
                targetCoordinate: { row: 2, col: 4 },
                mapId,
                managers: {
                    coordinateMapCollectionManager: lineTerrainManager,
                    inBattleSquaddieManager,
                },
            })

            expect(result).toContainEqual(slitherDemon)
        })

        it("skipOverPits: false — enemy beyond pit is not hit", () => {
            lineTerrainManager = buildTerrainMap(2, 2, "-")
            lineTerrainManager.addSquaddie({
                mapId,
                squaddieId: lini,
                coordinate: { row: 2, col: 0 },
            })
            lineTerrainManager.addSquaddie({
                mapId,
                squaddieId: slitherDemon,
                coordinate: { row: 2, col: 4 },
            })

            const result = AoeTargetResolutionService.resolveAoeTargets({
                action: lineActionSkipOverPitsFalse,
                actor: lini,
                targetCoordinate: { row: 2, col: 4 },
                mapId,
                managers: {
                    coordinateMapCollectionManager: lineTerrainManager,
                    inBattleSquaddieManager,
                },
            })

            expect(result).not.toContainEqual(slitherDemon)
        })
    })

    describe("BLOOM terrain blocking", () => {
        let bloomTerrainManager: CoordinateMapCollectionManager

        const bloomRadius2Action = SquaddieActionService.new({
            id: "bloom-r2",
            name: "Bloom Radius 2",
            range: ActionRange.LONG,
            shape: CoordinateGeneratorShape.BLOOM,
            areaOfEffectSize: 2,
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
        })

        const bloomRadius3Action = SquaddieActionService.new({
            id: "bloom-r3",
            name: "Bloom Radius 3",
            range: ActionRange.LONG,
            shape: CoordinateGeneratorShape.BLOOM,
            areaOfEffectSize: 3,
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
        })

        const bloomSkipOverPitsFalse = SquaddieActionService.new({
            id: "bloom-no-pit",
            name: "Bloom No Pit",
            range: ActionRange.LONG,
            shape: CoordinateGeneratorShape.BLOOM,
            areaOfEffectSize: 2,
            skipOverPits: false,
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
        })

        const bloomMoveThroughWalls = SquaddieActionService.new({
            id: "bloom-walls",
            name: "Bloom Through Walls",
            range: ActionRange.LONG,
            shape: CoordinateGeneratorShape.BLOOM,
            areaOfEffectSize: 2,
            moveThroughWalls: true,
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
        })

        const placeSquaddiesForBloomTest = (
            manager: CoordinateMapCollectionManager
        ) => {
            manager.addSquaddie({
                mapId,
                squaddieId: lini,
                coordinate: { row: 2, col: 2 },
            })
            manager.addSquaddie({
                mapId,
                squaddieId: slitherDemon,
                coordinate: { row: 2, col: 4 },
            })
        }

        it("bloom crosses pit by default — enemy beyond pit is hit", () => {
            bloomTerrainManager = buildTerrainMap(2, 3, "-")
            placeSquaddiesForBloomTest(bloomTerrainManager)

            const result = AoeTargetResolutionService.resolveAoeTargets({
                action: bloomRadius2Action,
                actor: lini,
                targetCoordinate: { row: 2, col: 2 },
                mapId,
                managers: {
                    coordinateMapCollectionManager: bloomTerrainManager,
                    inBattleSquaddieManager,
                },
            })

            expect(result).toContainEqual(slitherDemon)
        })

        it("skipOverPits: false — bloom does not cross pit to hit enemy", () => {
            bloomTerrainManager = buildTerrainMap(2, 3, "-")
            placeSquaddiesForBloomTest(bloomTerrainManager)

            const result = AoeTargetResolutionService.resolveAoeTargets({
                action: bloomSkipOverPitsFalse,
                actor: lini,
                targetCoordinate: { row: 2, col: 2 },
                mapId,
                managers: {
                    coordinateMapCollectionManager: bloomTerrainManager,
                    inBattleSquaddieManager,
                },
            })

            expect(result).not.toContainEqual(slitherDemon)
        })

        it("bloom blocked by wall with radius 2 — enemy not reachable directly", () => {
            bloomTerrainManager = buildTerrainMap(2, 3, "X")
            placeSquaddiesForBloomTest(bloomTerrainManager)

            const result = AoeTargetResolutionService.resolveAoeTargets({
                action: bloomRadius2Action,
                actor: lini,
                targetCoordinate: { row: 2, col: 2 },
                mapId,
                managers: {
                    coordinateMapCollectionManager: bloomTerrainManager,
                    inBattleSquaddieManager,
                },
            })

            expect(result).not.toContainEqual(slitherDemon)
        })

        it("bloom wraps around wall with radius 3 — enemy reachable via alternate path", () => {
            bloomTerrainManager = buildTerrainMap(2, 3, "X")
            placeSquaddiesForBloomTest(bloomTerrainManager)

            const result = AoeTargetResolutionService.resolveAoeTargets({
                action: bloomRadius3Action,
                actor: lini,
                targetCoordinate: { row: 2, col: 2 },
                mapId,
                managers: {
                    coordinateMapCollectionManager: bloomTerrainManager,
                    inBattleSquaddieManager,
                },
            })

            expect(result).toContainEqual(slitherDemon)
        })

        it("moveThroughWalls: true — bloom passes through wall to hit enemy", () => {
            bloomTerrainManager = buildTerrainMap(2, 3, "X")
            placeSquaddiesForBloomTest(bloomTerrainManager)

            const result = AoeTargetResolutionService.resolveAoeTargets({
                action: bloomMoveThroughWalls,
                actor: lini,
                targetCoordinate: { row: 2, col: 2 },
                mapId,
                managers: {
                    coordinateMapCollectionManager: bloomTerrainManager,
                    inBattleSquaddieManager,
                },
            })

            expect(result).toContainEqual(slitherDemon)
        })
    })

    describe("LINE diagonal direction", () => {
        const diagonalLineAction = SquaddieActionService.new({
            id: "diagonal-line",
            name: "Diagonal Line",
            range: ActionRange.LONG,
            shape: CoordinateGeneratorShape.LINE,
            areaOfEffectSize: 0,
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
        })

        let diagonalMapManager: CoordinateMapCollectionManager

        beforeEach(() => {
            let mapCollection = CoordinateMapCollectionService.new()
            mapCollection = CoordinateMapCollectionService.addOrUpdate({
                collection: mapCollection,
                map: CoordinateMapService.new({
                    id: mapId,
                    name: "Diagonal Test Map",
                    movementProperties: [
                        "1 1 1 1",
                        " 1 1 1 1",
                        "1 1 1 1",
                        " 1 1 1 1",
                        "1 1 1 1",
                    ],
                }),
            })
            diagonalMapManager = new CoordinateMapCollectionManager(
                mapCollection
            )

            diagonalMapManager.addSquaddie({
                mapId,
                squaddieId: lini,
                coordinate: { row: 4, col: 0 },
            })
            diagonalMapManager.addSquaddie({
                mapId,
                squaddieId: secondEnemy,
                coordinate: { row: 0, col: 2 },
            })
        })

        it("hits enemy at the far end of a diagonal line when aiming at an intermediate tile", () => {
            const result = AoeTargetResolutionService.resolveAoeTargets({
                action: diagonalLineAction,
                actor: lini,
                targetCoordinate: { row: 2, col: 1 },
                mapId,
                managers: {
                    coordinateMapCollectionManager: diagonalMapManager,
                    inBattleSquaddieManager,
                },
            })

            expect(result).toContainEqual(secondEnemy)
        })

        it("hits enemy on the diagonal when aiming directly at it", () => {
            const result = AoeTargetResolutionService.resolveAoeTargets({
                action: diagonalLineAction,
                actor: lini,
                targetCoordinate: { row: 0, col: 2 },
                mapId,
                managers: {
                    coordinateMapCollectionManager: diagonalMapManager,
                    inBattleSquaddieManager,
                },
            })

            expect(result).toContainEqual(secondEnemy)
        })

        it("hits enemy at intermediate step when a farther enemy is also on the diagonal", () => {
            diagonalMapManager.addSquaddie({
                mapId,
                squaddieId: slitherDemon,
                coordinate: { row: 2, col: 1 },
            })

            const result = AoeTargetResolutionService.resolveAoeTargets({
                action: diagonalLineAction,
                actor: lini,
                targetCoordinate: { row: 0, col: 2 },
                mapId,
                managers: {
                    coordinateMapCollectionManager: diagonalMapManager,
                    inBattleSquaddieManager,
                },
            })

            expect(result).toContainEqual(slitherDemon)
            expect(result).toContainEqual(secondEnemy)
        })
    })

    describe("CONE targeting", () => {
        const coneWidth0Action = SquaddieActionService.new({
            id: "cone-width-0",
            name: "Cone Width 0",
            range: ActionRange.LONG,
            shape: CoordinateGeneratorShape.CONE,
            areaOfEffectSize: 0,
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
        })

        const coneWidth1Action = SquaddieActionService.new({
            id: "cone-width-1",
            name: "Cone Width 1",
            range: ActionRange.LONG,
            shape: CoordinateGeneratorShape.CONE,
            areaOfEffectSize: 1,
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
        })

        const coneWidth1IncludesSelfAction = SquaddieActionService.new({
            id: "cone-width-1-self",
            name: "Cone Width 1 Self",
            range: ActionRange.LONG,
            shape: CoordinateGeneratorShape.CONE,
            areaOfEffectSize: 1,
            affiliationRelationship: { self: true, foe: true, friend: false },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
        })

        it("width 0 only hits squaddies along the single ray toward the aim point", () => {
            const result = AoeTargetResolutionService.resolveAoeTargets({
                action: coneWidth0Action,
                actor: lini,
                targetCoordinate: { row: 2, col: 3 },
                mapId,
                managers: {
                    coordinateMapCollectionManager,
                    inBattleSquaddieManager,
                },
            })

            expect(result).toContainEqual(slitherDemon)
            expect(result).toContainEqual(secondEnemy)
            expect(result).toContainEqual(thirdEnemy)
        })

        it("width 1 also hits squaddies on the two flanking directions", () => {
            const liniCoordinate = { row: 2, col: 2 }
            placeSquaddieAtNeighborOf({
                manager: coordinateMapCollectionManager,
                squaddieId: secondEnemy,
                origin: liniCoordinate,
                direction: CoordinateDirection.UP_RIGHT,
            })
            placeSquaddieAtNeighborOf({
                manager: coordinateMapCollectionManager,
                squaddieId: thirdEnemy,
                origin: liniCoordinate,
                direction: CoordinateDirection.DOWN_RIGHT,
            })

            const result = AoeTargetResolutionService.resolveAoeTargets({
                action: coneWidth1Action,
                actor: lini,
                targetCoordinate: { row: 2, col: 3 },
                mapId,
                managers: {
                    coordinateMapCollectionManager,
                    inBattleSquaddieManager,
                },
            })

            expect(result).toContainEqual(slitherDemon)
            expect(result).toContainEqual(secondEnemy)
            expect(result).toContainEqual(thirdEnemy)
        })

        it("width 1 fills the wedge, hitting an enemy that lies inside it but on neither flanking ray", () => {
            const liniCoordinate = { row: 2, col: 2 }
            const interiorCoordinate = CoordinateCalculator.getNeighbor(
                CoordinateCalculator.getNeighbor(
                    liniCoordinate,
                    CoordinateDirection.RIGHT
                ),
                CoordinateDirection.UP_RIGHT
            )
            coordinateMapCollectionManager.addSquaddie({
                mapId,
                squaddieId: secondEnemy,
                coordinate: interiorCoordinate,
            })

            const result = AoeTargetResolutionService.resolveAoeTargets({
                action: coneWidth1Action,
                actor: lini,
                targetCoordinate: { row: 2, col: 3 },
                mapId,
                managers: {
                    coordinateMapCollectionManager,
                    inBattleSquaddieManager,
                },
            })

            expect(result).toContainEqual(secondEnemy)
        })

        describe("when the action cannot target the actor", () => {
            it("does not include the actor among the resolved targets", () => {
                const result = AoeTargetResolutionService.resolveAoeTargets({
                    action: coneWidth1Action,
                    actor: lini,
                    targetCoordinate: { row: 2, col: 3 },
                    mapId,
                    managers: {
                        coordinateMapCollectionManager,
                        inBattleSquaddieManager,
                    },
                })

                expect(result).not.toContainEqual(lini)
            })
        })

        describe("when the action can target the actor", () => {
            it("includes the actor among the resolved targets", () => {
                const result = AoeTargetResolutionService.resolveAoeTargets({
                    action: coneWidth1IncludesSelfAction,
                    actor: lini,
                    targetCoordinate: { row: 2, col: 3 },
                    mapId,
                    managers: {
                        coordinateMapCollectionManager,
                        inBattleSquaddieManager,
                    },
                })

                expect(result).toContainEqual(lini)
            })
        })
    })

    describe("CONE terrain blocking", () => {
        let coneTerrainManager: CoordinateMapCollectionManager

        const coneAction = SquaddieActionService.new({
            id: "cone-action",
            name: "Cone Action",
            range: ActionRange.LONG,
            shape: CoordinateGeneratorShape.CONE,
            areaOfEffectSize: 1,
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
        })

        const coneActionMoveThroughWalls = SquaddieActionService.new({
            id: "cone-walls",
            name: "Cone Through Walls",
            range: ActionRange.LONG,
            shape: CoordinateGeneratorShape.CONE,
            areaOfEffectSize: 1,
            moveThroughWalls: true,
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
        })

        it("a wall on one ray only blocks that ray — the other flanking rays still hit their targets", () => {
            coneTerrainManager = buildTerrainMap(2, 3, "X")
            coneTerrainManager.addSquaddie({
                mapId,
                squaddieId: lini,
                coordinate: { row: 2, col: 2 },
            })
            coneTerrainManager.addSquaddie({
                mapId,
                squaddieId: slitherDemon,
                coordinate: { row: 2, col: 4 },
            })

            placeSquaddieAtNeighborOf({
                manager: coneTerrainManager,
                squaddieId: secondEnemy,
                origin: { row: 2, col: 2 },
                direction: CoordinateDirection.UP_RIGHT,
            })

            const result = AoeTargetResolutionService.resolveAoeTargets({
                action: coneAction,
                actor: lini,
                targetCoordinate: { row: 2, col: 3 },
                mapId,
                managers: {
                    coordinateMapCollectionManager: coneTerrainManager,
                    inBattleSquaddieManager,
                },
            })

            expect(result).not.toContainEqual(slitherDemon)
            expect(result).toContainEqual(secondEnemy)
        })

        it("blocks an interior wedge hex when a wall sits directly on the line from the actor to it", () => {
            const liniCoordinate = { row: 2, col: 2 }
            const interiorCoordinate = CoordinateCalculator.getNeighbor(
                CoordinateCalculator.getNeighbor(
                    liniCoordinate,
                    CoordinateDirection.RIGHT
                ),
                CoordinateDirection.UP_RIGHT
            )
            const lineToInterior =
                CoordinateCalculator.calculateEveryCoordinateInLine(
                    liniCoordinate,
                    interiorCoordinate
                )
            // interiorCoordinate is 2 hexes from lini, so the line is exactly
            // [lini, intermediateHex, interiorCoordinate] — index 1 is the
            // sole hex strictly between the actor and the target.
            expect(lineToInterior).toHaveLength(3)
            const blockingTile = lineToInterior[1]

            coneTerrainManager = buildTerrainMap(
                blockingTile.row,
                blockingTile.col,
                "X"
            )
            coneTerrainManager.addSquaddie({
                mapId,
                squaddieId: lini,
                coordinate: liniCoordinate,
            })
            coneTerrainManager.addSquaddie({
                mapId,
                squaddieId: secondEnemy,
                coordinate: interiorCoordinate,
            })

            const result = AoeTargetResolutionService.resolveAoeTargets({
                action: coneAction,
                actor: lini,
                targetCoordinate: { row: 2, col: 3 },
                mapId,
                managers: {
                    coordinateMapCollectionManager: coneTerrainManager,
                    inBattleSquaddieManager,
                },
            })

            expect(result).not.toContainEqual(secondEnemy)
        })

        it("moveThroughWalls: true — the blocked ray hits its target again", () => {
            coneTerrainManager = buildTerrainMap(2, 3, "X")
            coneTerrainManager.addSquaddie({
                mapId,
                squaddieId: lini,
                coordinate: { row: 2, col: 2 },
            })
            coneTerrainManager.addSquaddie({
                mapId,
                squaddieId: slitherDemon,
                coordinate: { row: 2, col: 4 },
            })

            const result = AoeTargetResolutionService.resolveAoeTargets({
                action: coneActionMoveThroughWalls,
                actor: lini,
                targetCoordinate: { row: 2, col: 3 },
                mapId,
                managers: {
                    coordinateMapCollectionManager: coneTerrainManager,
                    inBattleSquaddieManager,
                },
            })

            expect(result).toContainEqual(slitherDemon)
        })
    })
})
