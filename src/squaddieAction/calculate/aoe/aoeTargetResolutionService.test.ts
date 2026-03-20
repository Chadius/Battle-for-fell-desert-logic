import { beforeEach, describe, expect, it } from "vitest"
import { AoeTargetResolutionService } from "./aoeTargetResolutionService"
import { SquaddieActionService } from "../../squaddieAction"
import {
    type BattleSquaddieId,
    InBattleSquaddieManager,
} from "../../../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { SquaddieAffiliation } from "../../../affiliation/affiliation"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess"
import { ActionRange } from "../../actionRange"
import { CoordinateGeneratorShape } from "../../../coordinateMap/shape"
import { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../../../coordinateMap/coordinateMapCollection"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup"
import type { OutOfBattleSquaddieManager } from "../../../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { ProficiencyType } from "../../../proficiency/proficiencyLevel"
import { AttributeScore } from "../../../proficiency/attributeScore"

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
        targetCoordinateRequiresTarget: false,
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
        targetCoordinateRequiresTarget: false,
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
        targetCoordinateRequiresTarget: false,
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
})
