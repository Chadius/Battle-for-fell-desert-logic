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

describe("getSquaddieActionValidity", () => {
    const meleeAttackId = "melee-attack"

    it("throws error if MissionManager is undefined", () => {
        const missionEngine = new MissionEngine()

        const actor: BattleSquaddieId = {
            inBattleSquaddieId: 0,
            outOfBattleSquaddieId: "squaddie-1",
        }

        expect(() => missionEngine.getSquaddieActionValidity(actor)).toThrow(
            "[MissionEngine.getSquaddieActionValidity]: missionManager is undefined"
        )
    })

    it("returns invalid actions with reasons when squaddie is far from enemies", () => {
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
            actionIds: [meleeAttackId],
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

        const playerSquaddieId = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "player-1",
        })
        const enemySquaddieId = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "enemy-1",
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
            squaddieId: playerSquaddieId,
            coordinate: { row: 0, col: 0 },
        })
        coordinateMapCollectionManager.addSquaddie({
            mapId: "test_map",
            squaddieId: enemySquaddieId,
            coordinate: { row: 0, col: 6 },
        })

        const squaddieActionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )
        const meleeAttack = SquaddieActionService.new({
            id: meleeAttackId,
            name: "Melee Attack",
            range: ActionRange.MELEE,
            affiliationRelationship: {
                self: false,
                foe: true,
                friend: false,
            },
            proficiency: ProficiencyType.WEAPON_SIMPLE,
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
        squaddieActionManager.addOrUpdate(meleeAttack)

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

        const missionEngine = new MissionEngine(missionManager)

        const result = missionEngine.getSquaddieActionValidity(playerSquaddieId)

        expect(result.battleSquaddieId).toEqual(playerSquaddieId)
        expect(result.invalidActions).toHaveLength(1)
        expect(result.invalidActions[0].actionId).toBe(meleeAttackId)
        expect(result.invalidActions[0].reason).toBe(
            "No applicable targets in range"
        )
        expect(result.validActions).toHaveLength(2)
    })

    it("returns valid actions when squaddie is adjacent to targets", () => {
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
            actionIds: [meleeAttackId],
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

        const playerSquaddieId = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "player-1",
        })
        const enemySquaddieId = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "enemy-1",
        })

        const map = CoordinateMapService.new({
            id: "test_map",
            name: "test map",
            movementProperties: ["1 1 1 "],
        })

        const coordinateMapCollectionManager =
            new CoordinateMapCollectionManager(
                CoordinateMapCollectionService.new()
            )
        coordinateMapCollectionManager.addOrUpdate({ map })

        coordinateMapCollectionManager.addSquaddie({
            mapId: "test_map",
            squaddieId: playerSquaddieId,
            coordinate: { row: 0, col: 0 },
        })
        coordinateMapCollectionManager.addSquaddie({
            mapId: "test_map",
            squaddieId: enemySquaddieId,
            coordinate: { row: 0, col: 1 },
        })

        const squaddieActionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )
        const meleeAttack = SquaddieActionService.new({
            id: meleeAttackId,
            name: "Melee Attack",
            range: ActionRange.MELEE,
            affiliationRelationship: {
                self: false,
                foe: true,
                friend: false,
            },
            proficiency: ProficiencyType.WEAPON_SIMPLE,
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
        squaddieActionManager.addOrUpdate(meleeAttack)

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

        const missionEngine = new MissionEngine(missionManager)

        const result = missionEngine.getSquaddieActionValidity(playerSquaddieId)

        expect(result.battleSquaddieId).toEqual(playerSquaddieId)
        expect(result.validActions).toHaveLength(2)
        expect(result.validActions[0].actionId).toBe(meleeAttackId)
        expect(result.validActions[0].actionName).toBe("Melee Attack")
        const meleeAimEntry = result.validActions[0].aimCoordinateResults.find(
            (e) => e.aimCoordinate.row === 0 && e.aimCoordinate.col === 1
        )
        expect(meleeAimEntry).toBeDefined()
        expect(meleeAimEntry!.targetIds).toContainEqual(
            expect.objectContaining({
                outOfBattleSquaddieId: "enemy-1",
            })
        )
        expect(result.invalidActions).toHaveLength(1)
    })
})
