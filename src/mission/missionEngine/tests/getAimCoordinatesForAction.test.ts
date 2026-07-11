import { describe, expect, it } from "vitest"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup.js"
import { MissionEngine } from "../missionEngine.js"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager.js"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { SquaddieAffiliation } from "../../../affiliation/affiliation.js"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap.js"
import { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../../../coordinateMap/coordinateMapCollection.js"
import { SquaddieActionManager } from "../../../squaddieAction/squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../../../squaddieAction/squaddieActionCollection.js"
import { SquaddieActionService } from "../../../squaddieAction/squaddieAction.js"
import { MissionStateService } from "../../missionState.js"
import { MissionManager } from "../../missionManager.js"
import { ActionRange } from "../../../squaddieAction/actionRange.js"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.js"
import { ProficiencyType } from "../../../proficiency/proficiencyLevel.js"
import { CoordinateGeneratorShape } from "../../../coordinateMap/shape.js"
import type { OffsetCoordinate } from "../../../coordinateMap/offsetCoordinate.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"

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
            aimCoordinateRequiresTarget: false,
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

        it("AOE with aimCoordinateRequiresTarget false: includes aim coordinates where the blast radius hits a target even if the aim coord is empty", () => {
            const { missionEngine, actorId, enemyId } = createEngine({
                actorCoordinate: { row: 0, col: 0 },
                enemyCoordinate: { row: 0, col: 1 },
            })

            const results = missionEngine.getAimCoordinatesForAction({
                actor: actorId,
                actionId: bloomNoTargetRequiredId,
            })

            expect(results.length).toBeGreaterThan(0)

            results.forEach((entry) => {
                expect(entry.targetIds.length).toBeGreaterThan(0)
            })

            const actorTileEntry = results.find(
                (e) => e.aimCoordinate.row === 0 && e.aimCoordinate.col === 0
            )
            expect(actorTileEntry).toBeDefined()
            expect(actorTileEntry!.targetIds).toContainEqual(enemyId)
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

    describe("LINE action (Lightning Bolt) integration", () => {
        const lightningBoltId = "lightning-bolt"

        const createLineEngine = (): {
            missionEngine: MissionEngine
            actorId: BattleSquaddieId
            enemy0Id: BattleSquaddieId
            enemy1Id: BattleSquaddieId
            enemy2Id: BattleSquaddieId
        } => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "test_sheet",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            distancePerAction: 1,
                        },
                    }
                )

            const playerSquaddie = OutOfBattleSquaddieService.new({
                id: "player-1",
                name: "Player 1",
                affiliation: SquaddieAffiliation.PLAYER,
                attributeSheetId: "test_sheet",
                actionIds: [lightningBoltId],
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(playerSquaddie)
            ;[
                { id: "enemy-0", name: "Enemy 0" },
                { id: "enemy-1", name: "Enemy 1" },
                { id: "enemy-2", name: "Enemy 2" },
            ].forEach(({ id, name }) => {
                outOfBattleSquaddieManager.addOrUpdateSquaddie(
                    OutOfBattleSquaddieService.new({
                        id,
                        name,
                        affiliation: SquaddieAffiliation.ENEMY,
                        attributeSheetId: "test_sheet",
                    })
                )
            })

            const inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            const actorId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "player-1",
            })
            const enemy0Id = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy-0",
            })
            const enemy1Id = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy-1",
            })
            const enemy2Id = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy-2",
            })

            const map = CoordinateMapService.new({
                id: "test_map",
                name: "test map",
                movementProperties: ["1 1 1 1 1 1 1"],
            })

            const coordinateMapCollectionManager =
                new CoordinateMapCollectionManager(
                    CoordinateMapCollectionService.new()
                )
            coordinateMapCollectionManager.addOrUpdate({ map })
            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: actorId,
                coordinate: { row: 0, col: 0 },
            })
            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: enemy0Id,
                coordinate: { row: 0, col: 2 },
            })
            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: enemy1Id,
                coordinate: { row: 0, col: 3 },
            })
            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: enemy2Id,
                coordinate: { row: 0, col: 4 },
            })

            const squaddieActionManager = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )

            const lightningBolt = SquaddieActionService.new({
                id: lightningBoltId,
                name: "Lightning Bolt",
                range: ActionRange.LONG,
                shape: CoordinateGeneratorShape.LINE,
                areaOfEffectSize: 0,
                aimCoordinateRequiresTarget: false,
                affiliationRelationship: {
                    self: false,
                    foe: true,
                    friend: false,
                },
                proficiency: ProficiencyType.WEAPON_SIMPLE,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: 3,
                            targetProficiency: ProficiencyType.ARMOR,
                        },
                    },
                },
            })
            squaddieActionManager.addOrUpdate(lightningBolt)

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
                enemy0Id,
                enemy1Id,
                enemy2Id,
            }
        }

        it("getSquaddieActionValidity includes Lightning Bolt in validActions", () => {
            const { missionEngine, actorId } = createLineEngine()

            const validity = missionEngine.getSquaddieActionValidity(actorId)

            const validActionIds = validity.validActions.map((a) => a.actionId)
            expect(validActionIds).toContain(lightningBoltId)
            const invalidActionIds = validity.invalidActions.map(
                (a) => a.actionId
            )
            expect(invalidActionIds).not.toContain(lightningBoltId)
        })

        it("getAimCoordinatesForAction returns multiple aim coordinates", () => {
            const { missionEngine, actorId } = createLineEngine()

            const results = missionEngine.getAimCoordinatesForAction({
                actor: actorId,
                actionId: lightningBoltId,
            })

            expect(results.length).toBeGreaterThan(1)
        })

        it("aiming at an empty tile should hit all targets", () => {
            const { missionEngine, actorId, enemy0Id, enemy1Id, enemy2Id } =
                createLineEngine()

            const results = missionEngine.getAimCoordinatesForAction({
                actor: actorId,
                actionId: lightningBoltId,
            })

            const entry = results.find(
                (e) => e.aimCoordinate.row === 0 && e.aimCoordinate.col === 1
            )
            expect(entry).toBeDefined()
            expect(entry!.targetIds).toContainEqual(enemy0Id)
            expect(entry!.targetIds).toContainEqual(enemy1Id)
            expect(entry!.targetIds).toContainEqual(enemy2Id)
            expect(entry!.targetIds).toHaveLength(3)
        })

        it("aiming at the first enemy returns only that enemy", () => {
            const { missionEngine, actorId, enemy0Id, enemy1Id, enemy2Id } =
                createLineEngine()

            const results = missionEngine.getAimCoordinatesForAction({
                actor: actorId,
                actionId: lightningBoltId,
            })

            const entry = results.find(
                (e) => e.aimCoordinate.row === 0 && e.aimCoordinate.col === 2
            )
            expect(entry).toBeDefined()
            expect(entry!.targetIds).toContainEqual(enemy0Id)
            expect(entry!.targetIds).toContainEqual(enemy1Id)
            expect(entry!.targetIds).toContainEqual(enemy2Id)
            expect(entry!.targetIds).toHaveLength(3)
        })

        it("aiming past the first enemy hits both the first and second enemy", () => {
            const { missionEngine, actorId, enemy0Id, enemy1Id, enemy2Id } =
                createLineEngine()

            const results = missionEngine.getAimCoordinatesForAction({
                actor: actorId,
                actionId: lightningBoltId,
            })

            const entry = results.find(
                (e) => e.aimCoordinate.row === 0 && e.aimCoordinate.col === 3
            )
            expect(entry).toBeDefined()
            expect(entry!.targetIds).toContainEqual(enemy0Id)
            expect(entry!.targetIds).toContainEqual(enemy1Id)
            expect(entry!.targetIds).toContainEqual(enemy2Id)
            expect(entry!.targetIds).toHaveLength(3)
        })

        it("aiming at the third enemy hits all three enemies in the line", () => {
            const { missionEngine, actorId, enemy0Id, enemy1Id, enemy2Id } =
                createLineEngine()

            const results = missionEngine.getAimCoordinatesForAction({
                actor: actorId,
                actionId: lightningBoltId,
            })

            const entry = results.find(
                (e) => e.aimCoordinate.row === 0 && e.aimCoordinate.col === 4
            )
            expect(entry).toBeDefined()
            expect(entry!.targetIds).toContainEqual(enemy0Id)
            expect(entry!.targetIds).toContainEqual(enemy1Id)
            expect(entry!.targetIds).toContainEqual(enemy2Id)
            expect(entry!.targetIds).toHaveLength(3)
        })

        it("getTargetsForAimCoordinate at col 3 returns all enemies", () => {
            const { missionEngine, actorId, enemy0Id, enemy1Id, enemy2Id } =
                createLineEngine()

            const targetIds = missionEngine.getTargetsForAimCoordinate({
                actor: actorId,
                actionId: lightningBoltId,
                aimCoordinate: { row: 0, col: 3 },
            })

            expect(targetIds).toContainEqual(enemy0Id)
            expect(targetIds).toContainEqual(enemy1Id)
            expect(targetIds).toContainEqual(enemy2Id)
            expect(targetIds).toHaveLength(3)
        })

        it("getTargetsForAimCoordinate at col 4 returns all three enemies", () => {
            const { missionEngine, actorId, enemy0Id, enemy1Id, enemy2Id } =
                createLineEngine()

            const targetIds = missionEngine.getTargetsForAimCoordinate({
                actor: actorId,
                actionId: lightningBoltId,
                aimCoordinate: { row: 0, col: 4 },
            })

            expect(targetIds).toContainEqual(enemy0Id)
            expect(targetIds).toContainEqual(enemy1Id)
            expect(targetIds).toContainEqual(enemy2Id)
            expect(targetIds).toHaveLength(3)
        })
    })
})
