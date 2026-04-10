import { describe, expect, it } from "vitest"
import { SquaddieActionValidationService } from "../squaddieActionValidationService"
import { SquaddieActionService } from "../../../squaddieAction"
import type { InBattleSquaddieManager } from "../../../../squaddie/inBattle/inBattleSquaddieManager"
import { type BattleSquaddieId } from "../../../../squaddie/inBattle/battleSquaddieId"
import { OutOfBattleSquaddieService } from "../../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { SquaddieAffiliation } from "../../../../affiliation/affiliation"
import { DegreeOfSuccess } from "../../../../degreesOfSuccess/degreeOfSuccess"
import { ActionRange, type TActionRange } from "../../../actionRange"
import { CoordinateGeneratorShape } from "../../../../coordinateMap/shape"
import { ProficiencyType } from "../../../../proficiency/proficiencyLevel"
import { ValidationTestSetup } from "../../../../testUtils/validationTestSetup"
import type { OutOfBattleSquaddieManager } from "../../../../squaddie/outOfBattle/outOfBattleSquaddieManager"
import type { CoordinateMapCollectionManager } from "../../../../coordinateMap/coordinateMapManager"
import type { SquaddieActionManager } from "../../../squaddieActionManager"
import type { OffsetCoordinate } from "../../../../coordinateMap/offsetCoordinate"

const createEnemyAtPosition = ({
    id,
    position,
    outOfBattleSquaddieManager,
    inBattleSquaddieManager,
    coordinateMapCollectionManager,
    mapId,
}: {
    id: string
    position: OffsetCoordinate
    outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    inBattleSquaddieManager: InBattleSquaddieManager
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    mapId: string
}): BattleSquaddieId => {
    outOfBattleSquaddieManager.addOrUpdateSquaddie(
        OutOfBattleSquaddieService.new({
            id,
            name: id,
            actionIds: [],
            attributeSheetId: "test-sheet",
            affiliation: SquaddieAffiliation.ENEMY,
        })
    )
    const { inBattleSquaddieId } = inBattleSquaddieManager.createNewSquaddie({
        outOfBattleSquaddieId: id,
    })
    const battleId: BattleSquaddieId = {
        inBattleSquaddieId,
        outOfBattleSquaddieId: id,
    }
    coordinateMapCollectionManager.addSquaddie({
        mapId,
        squaddieId: battleId,
        coordinate: position,
    })
    return battleId
}

const createFoeTargetingAttack = (
    id: string,
    range: (typeof ActionRange)[keyof typeof ActionRange],
    options?: { skipOverPits?: boolean; moveThroughWalls?: boolean },
    squaddieActionManager?: SquaddieActionManager
) => {
    const action = SquaddieActionService.new({
        id,
        name: id,
        range,
        affiliationRelationship: { self: false, foe: true, friend: false },
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
        },
        ...options,
    })
    squaddieActionManager?.addOrUpdate(action)
    return action
}

const createBloomAoEAction = (
    id: string,
    range: TActionRange,
    squaddieActionManager?: SquaddieActionManager
) => {
    const action = SquaddieActionService.new({
        id,
        name: id,
        range,
        shape: CoordinateGeneratorShape.BLOOM,
        areaOfEffectSize: 1,
        affiliationRelationship: { self: false, foe: true, friend: false },
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
        },
        effectOnTarget: {
            [DegreeOfSuccess.SUCCESS]: {
                damage: { raw: 1, targetProficiency: ProficiencyType.ARMOR },
            },
        },
    })
    squaddieActionManager?.addOrUpdate(action)
    return action
}

describe("line of sight validation", () => {
    describe("direct targeting uses line of sight, not A* pathfinding", () => {
        it("wall on direct line of sight blocks the target", () => {
            const {
                actor,
                outOfBattleSquaddieManager,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
                mapId,
            } = ValidationTestSetup.create({
                mapMovementProperties: ["1 X 1 1 1", " 1 1 1 1 1", "1 1 1 1 1"],
                actorPosition: { row: 0, col: 0 },
            })

            const enemy = createEnemyAtPosition({
                id: "enemy",
                position: { row: 0, col: 2 },
                outOfBattleSquaddieManager,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                mapId,
            })

            const attack = createFoeTargetingAttack(
                "attack",
                ActionRange.REACH,
                {},
                squaddieActionManager
            )

            const result = SquaddieActionValidationService.isActionValid({
                actor,
                action: { id: attack.id },
                targets: [enemy],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

            expect(result.isValid).toBe(false)
        })

        it("wall not on the line of sight does not block the target", () => {
            const {
                actor,
                outOfBattleSquaddieManager,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
                mapId,
            } = ValidationTestSetup.create({
                mapMovementProperties: ["1 X 1 1 1", " 1 1 1 1 1", "1 1 1 1 1"],
                actorPosition: { row: 2, col: 1 },
            })

            const enemy = createEnemyAtPosition({
                id: "enemy",
                position: { row: 0, col: 2 },
                outOfBattleSquaddieManager,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                mapId,
            })

            const attack = createFoeTargetingAttack(
                "attack",
                ActionRange.REACH,
                {},
                squaddieActionManager
            )

            const result = SquaddieActionValidationService.isActionValid({
                actor,
                action: { id: attack.id },
                targets: [enemy],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

            expect(result.isValid).toBe(true)
        })

        it("pit on direct line of sight does not block by default (skipOverPits defaults to true)", () => {
            const {
                actor,
                outOfBattleSquaddieManager,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
                mapId,
            } = ValidationTestSetup.create({
                mapMovementProperties: ["1 - 1 1 1", " 1 1 1 1 1", "1 1 1 1 1"],
                actorPosition: { row: 0, col: 0 },
            })

            const enemy = createEnemyAtPosition({
                id: "enemy",
                position: { row: 0, col: 2 },
                outOfBattleSquaddieManager,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                mapId,
            })

            const attack = createFoeTargetingAttack(
                "attack",
                ActionRange.REACH,
                {},
                squaddieActionManager
            )

            const result = SquaddieActionValidationService.isActionValid({
                actor,
                action: { id: attack.id },
                targets: [enemy],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

            expect(result.isValid).toBe(true)
        })

        it("pit on direct line of sight blocks the target when skipOverPits is false", () => {
            const {
                actor,
                outOfBattleSquaddieManager,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
                mapId,
            } = ValidationTestSetup.create({
                mapMovementProperties: ["1 - 1 1 1", " 1 1 1 1 1", "1 1 1 1 1"],
                actorPosition: { row: 0, col: 0 },
            })

            const enemy = createEnemyAtPosition({
                id: "enemy",
                position: { row: 0, col: 2 },
                outOfBattleSquaddieManager,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                mapId,
            })

            const attack = createFoeTargetingAttack(
                "no-pit-attack",
                ActionRange.REACH,
                { skipOverPits: false },
                squaddieActionManager
            )

            const result = SquaddieActionValidationService.isActionValid({
                actor,
                action: { id: attack.id },
                targets: [enemy],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

            expect(result.isValid).toBe(false)
        })

        it("target behind wall is invalid even if an A* path exists around the wall", () => {
            const {
                actor,
                outOfBattleSquaddieManager,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
                mapId,
            } = ValidationTestSetup.create({
                mapMovementProperties: ["1 X 1 1 1", " 1 1 1 1 1", "1 1 1 1 1"],
                actorPosition: { row: 0, col: 0 },
            })

            const enemy = createEnemyAtPosition({
                id: "enemy",
                position: { row: 0, col: 2 },
                outOfBattleSquaddieManager,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                mapId,
            })

            const attack = createFoeTargetingAttack(
                "attack",
                ActionRange.REACH,
                {},
                squaddieActionManager
            )

            const result = SquaddieActionValidationService.isActionValid({
                actor,
                action: { id: attack.id },
                targets: [enemy],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

            expect(result.isValid).toBe(false)
        })
    })

    describe("AOE blast center targeting uses A* pathfinding", () => {
        it("blast center is invalid when a full wall row blocks all paths to it", () => {
            const {
                actor,
                outOfBattleSquaddieManager,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
                mapId,
            } = ValidationTestSetup.create({
                mapMovementProperties: ["1 1 1 1 1", " X X X X X", "1 1 1 1 1"],
                actorPosition: { row: 0, col: 0 },
            })

            const enemy = createEnemyAtPosition({
                id: "enemy",
                position: { row: 2, col: 0 },
                outOfBattleSquaddieManager,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                mapId,
            })

            const bloomAction = createBloomAoEAction(
                "bloom",
                ActionRange.MEDIUM,
                squaddieActionManager
            )

            const result = SquaddieActionValidationService.isActionValid({
                actor,
                action: {
                    id: bloomAction.id,
                    decisions: { targetCoordinate: { row: 2, col: 0 } },
                },
                targets: [enemy],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

            expect(result.isValid).toBe(false)
            expect(result.reason).toBe("Blast center is out of range")
        })

        it("blast center is valid when A* reaches it by going around a wall", () => {
            const {
                actor,
                outOfBattleSquaddieManager,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
                mapId,
            } = ValidationTestSetup.create({
                mapMovementProperties: ["1 X 1 1 1", " 1 1 1 1 1", "1 1 1 1 1"],
                actorPosition: { row: 0, col: 0 },
            })

            const enemy = createEnemyAtPosition({
                id: "enemy",
                position: { row: 0, col: 2 },
                outOfBattleSquaddieManager,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                mapId,
            })

            const bloomAction = createBloomAoEAction(
                "bloom",
                ActionRange.SHORT,
                squaddieActionManager
            )

            const result = SquaddieActionValidationService.isActionValid({
                actor,
                action: {
                    id: bloomAction.id,
                    decisions: { targetCoordinate: { row: 0, col: 2 } },
                },
                targets: [enemy],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

            expect(result.isValid).toBe(true)
        })

        it("blast center is valid when a pit lies on the direct path (A* skips over pits by default)", () => {
            const {
                actor,
                outOfBattleSquaddieManager,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
                mapId,
            } = ValidationTestSetup.create({
                mapMovementProperties: ["1 - 1 1 1", " 1 1 1 1 1", "1 1 1 1 1"],
                actorPosition: { row: 0, col: 0 },
            })

            const enemy = createEnemyAtPosition({
                id: "enemy",
                position: { row: 0, col: 2 },
                outOfBattleSquaddieManager,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                mapId,
            })

            const bloomAction = createBloomAoEAction(
                "bloom",
                ActionRange.REACH,
                squaddieActionManager
            )

            const result = SquaddieActionValidationService.isActionValid({
                actor,
                action: {
                    id: bloomAction.id,
                    decisions: { targetCoordinate: { row: 0, col: 2 } },
                },
                targets: [enemy],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

            expect(result.isValid).toBe(true)
        })

        it("rough terrain does not reduce targeting range (reduceMoveCosts is always true for targeting)", () => {
            const {
                actor,
                outOfBattleSquaddieManager,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
                mapId,
            } = ValidationTestSetup.create({
                mapMovementProperties: ["1 2 1 1 1", " 1 1 1 1 1", "1 1 1 1 1"],
                actorPosition: { row: 0, col: 0 },
            })

            const enemy = createEnemyAtPosition({
                id: "enemy",
                position: { row: 0, col: 1 },
                outOfBattleSquaddieManager,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                mapId,
            })

            const bloomAction = createBloomAoEAction(
                "bloom",
                ActionRange.MELEE,
                squaddieActionManager
            )

            const result = SquaddieActionValidationService.isActionValid({
                actor,
                action: {
                    id: bloomAction.id,
                    decisions: { targetCoordinate: { row: 0, col: 1 } },
                },
                targets: [enemy],
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager,
                    coordinateMapCollectionManager,
                },
                map: { mapId },
            })

            expect(result.isValid).toBe(true)
        })
    })
})
