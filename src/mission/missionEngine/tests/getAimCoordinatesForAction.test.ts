import { describe, expect, it } from "vitest"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup"
import { MissionEngine } from "../missionEngine"
import {
    type BattleSquaddieId,
    InBattleSquaddieManager,
} from "../../../squaddie/inBattle/inBattleSquaddieManager"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { SquaddieAffiliation } from "../../../affiliation/affiliation"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap"
import { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../../../coordinateMap/coordinateMapCollection"
import { SquaddieActionManager } from "../../../squaddieAction/squaddieActionManager"
import { SquaddieActionCollectionService } from "../../../squaddieAction/squaddieActionCollection"
import { SquaddieActionService } from "../../../squaddieAction/squaddieAction"
import { MissionStateService } from "../../missionState"
import { MissionManager } from "../../missionManager"
import { ActionRange } from "../../../squaddieAction/actionRange"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess"
import { ProficiencyType } from "../../../proficiency/proficiencyLevel"
import { CoordinateGeneratorShape } from "../../../coordinateMap/shape"
import type { OffsetCoordinate } from "../../../coordinateMap/offsetCoordinate"

describe("getAimCoordinatesForAction and getTargetsForAimCoordinate", () => {
    const meleeAttackId = "melee-attack"
    const bloomAttackId = "bloom-attack"
    const bloomNoTargetRequiredId = "bloom-no-target-required"

    const createEngine = ({
        actorCoordinate,
        enemyCoordinate,
        mapRow = "1 1 1 1 1",
    }: {
        actorCoordinate: OffsetCoordinate
        enemyCoordinate: OffsetCoordinate
        mapRow?: string
    }): {
        missionEngine: MissionEngine
        actorId: BattleSquaddieId
        enemyId: BattleSquaddieId
    } => {
        const { manager: outOfBattleSquaddieManager } =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "test_sheet",
                attributeSheetOptions: {
                    maxHitPoints: 10,
                    distancePerAction: 1,
                },
            })

        const playerSquaddie = OutOfBattleSquaddieService.new({
            id: "player-1",
            name: "Player 1",
            affiliation: SquaddieAffiliation.PLAYER,
            attributeSheetId: "test_sheet",
            actionIds: [meleeAttackId, bloomAttackId, bloomNoTargetRequiredId],
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(playerSquaddie)

        const enemySquaddie = OutOfBattleSquaddieService.new({
            id: "enemy-1",
            name: "Enemy 1",
            affiliation: SquaddieAffiliation.ENEMY,
            attributeSheetId: "test_sheet",
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(enemySquaddie)

        const inBattleSquaddieManager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            outOfBattleSquaddieManager
        )

        const actorId = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "player-1",
        })
        const enemyId = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "enemy-1",
        })

        const map = CoordinateMapService.new({
            id: "test_map",
            name: "test map",
            movementProperties: [mapRow],
        })

        const coordinateMapCollectionManager =
            new CoordinateMapCollectionManager(
                CoordinateMapCollectionService.new()
            )
        coordinateMapCollectionManager.addOrUpdate({ map })
        coordinateMapCollectionManager.addSquaddie({
            mapId: "test_map",
            squaddieId: actorId,
            coordinate: actorCoordinate,
        })
        coordinateMapCollectionManager.addSquaddie({
            mapId: "test_map",
            squaddieId: enemyId,
            coordinate: enemyCoordinate,
        })

        const squaddieActionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )

        const meleeAttack = SquaddieActionService.new({
            id: meleeAttackId,
            name: "Melee Attack",
            range: ActionRange.MELEE,
            affiliationRelationship: { self: false, foe: true, friend: false },
            proficiency: ProficiencyType.WEAPON_SIMPLE,
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
        squaddieActionManager.addOrUpdate(meleeAttack)

        const bloomAttack = SquaddieActionService.new({
            id: bloomAttackId,
            name: "Bloom Attack",
            range: ActionRange.MELEE,
            shape: CoordinateGeneratorShape.BLOOM,
            areaOfEffectSize: 1,
            affiliationRelationship: { self: false, foe: true, friend: false },
            proficiency: ProficiencyType.WEAPON_SIMPLE,
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
        squaddieActionManager.addOrUpdate(bloomAttack)

        const bloomNoTargetRequired = SquaddieActionService.new({
            id: bloomNoTargetRequiredId,
            name: "Bloom No Target Required",
            range: ActionRange.MELEE,
            shape: CoordinateGeneratorShape.BLOOM,
            areaOfEffectSize: 1,
            targetCoordinateRequiresTarget: false,
            affiliationRelationship: { self: false, foe: true, friend: false },
            proficiency: ProficiencyType.WEAPON_SIMPLE,
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
        squaddieActionManager.addOrUpdate(bloomNoTargetRequired)

        const missionState = MissionStateService.new({
            id: "mission-1",
            mapId: "test_map",
        })

        const missionManager = new MissionManager({
            missionState,
            inBattleSquaddieManager,
            coordinateMapCollectionManager,
            squaddieActionManager,
        })

        return {
            missionEngine: new MissionEngine(missionManager),
            actorId,
            enemyId,
        }
    }

    describe("getAimCoordinatesForAction", () => {
        it("throws if MissionManager is undefined", () => {
            const missionEngine = new MissionEngine()
            const actor: BattleSquaddieId = {
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "player-1",
            }

            expect(() =>
                missionEngine.getAimCoordinatesForAction({
                    actor,
                    actionId: meleeAttackId,
                })
            ).toThrow(
                "[MissionEngine.getAimCoordinatesForAction]: missionManager is undefined"
            )
        })

        it("direct action: returns one entry per valid target coordinate with the correct targetId when enemy is adjacent", () => {
            const { missionEngine, actorId, enemyId } = createEngine({
                actorCoordinate: { row: 0, col: 0 },
                enemyCoordinate: { row: 0, col: 1 },
            })

            const results = missionEngine.getAimCoordinatesForAction({
                actor: actorId,
                actionId: meleeAttackId,
            })

            expect(results).toHaveLength(1)
            expect(results[0].aimCoordinate).toEqual({ row: 0, col: 1 })
            expect(results[0].targetIds).toHaveLength(1)
            expect(results[0].targetIds[0]).toEqual(enemyId)
        })

        it("direct action: returns no entries when enemy is out of melee range", () => {
            const { missionEngine, actorId } = createEngine({
                actorCoordinate: { row: 0, col: 0 },
                enemyCoordinate: { row: 0, col: 4 },
            })

            const results = missionEngine.getAimCoordinatesForAction({
                actor: actorId,
                actionId: meleeAttackId,
            })

            expect(results).toHaveLength(0)
        })

        it("AOE with default requiresTarget: only includes blast centers that contain a target", () => {
            const { missionEngine, actorId, enemyId } = createEngine({
                actorCoordinate: { row: 0, col: 0 },
                enemyCoordinate: { row: 0, col: 1 },
            })

            const results = missionEngine.getAimCoordinatesForAction({
                actor: actorId,
                actionId: bloomAttackId,
            })

            expect(results.length).toBeGreaterThan(0)
            results.forEach((entry) => {
                expect(entry.targetIds.length).toBeGreaterThan(0)
            })

            const enemyEntry = results.find(
                (e) => e.aimCoordinate.row === 0 && e.aimCoordinate.col === 1
            )
            expect(enemyEntry).toBeDefined()
            expect(enemyEntry!.targetIds).toContainEqual(enemyId)
        })

        it("AOE with targetCoordinateRequiresTarget false: includes blast centers with empty targetIds", () => {
            const { missionEngine, actorId } = createEngine({
                actorCoordinate: { row: 0, col: 0 },
                enemyCoordinate: { row: 0, col: 4 },
            })

            const results = missionEngine.getAimCoordinatesForAction({
                actor: actorId,
                actionId: bloomNoTargetRequiredId,
            })

            expect(results.length).toBeGreaterThan(0)

            const emptyEntry = results.find((e) => e.targetIds.length === 0)
            expect(emptyEntry).toBeDefined()
        })
    })

    describe("getTargetsForAimCoordinate", () => {
        it("throws if MissionManager is undefined", () => {
            const missionEngine = new MissionEngine()
            const actor: BattleSquaddieId = {
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "player-1",
            }

            expect(() =>
                missionEngine.getTargetsForAimCoordinate({
                    actor,
                    actionId: meleeAttackId,
                    aimCoordinate: { row: 0, col: 1 },
                })
            ).toThrow(
                "[MissionEngine.getTargetsForAimCoordinate]: missionManager is undefined"
            )
        })

        it("returns correct targetIds for a valid aim coordinate", () => {
            const { missionEngine, actorId, enemyId } = createEngine({
                actorCoordinate: { row: 0, col: 0 },
                enemyCoordinate: { row: 0, col: 1 },
            })

            const targetIds = missionEngine.getTargetsForAimCoordinate({
                actor: actorId,
                actionId: meleeAttackId,
                aimCoordinate: { row: 0, col: 1 },
            })

            expect(targetIds).toHaveLength(1)
            expect(targetIds[0]).toEqual(enemyId)
        })

        it("returns empty array for a coordinate not in range", () => {
            const { missionEngine, actorId } = createEngine({
                actorCoordinate: { row: 0, col: 0 },
                enemyCoordinate: { row: 0, col: 1 },
            })

            const targetIds = missionEngine.getTargetsForAimCoordinate({
                actor: actorId,
                actionId: meleeAttackId,
                aimCoordinate: { row: 0, col: 4 },
            })

            expect(targetIds).toHaveLength(0)
        })
    })
})
