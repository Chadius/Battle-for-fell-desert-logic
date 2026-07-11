import { beforeEach, describe, expect, it } from "vitest"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager.js"
import { SquaddieActionManager } from "../../../squaddieAction/squaddieActionManager.js"
import { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager.js"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup.js"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { SquaddieAffiliation } from "../../../affiliation/affiliation.js"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { SquaddieActionService } from "../../../squaddieAction/squaddieAction.js"
import { ActionRange } from "../../../squaddieAction/actionRange.js"
import { CoordinateGeneratorShape } from "../../../coordinateMap/shape.js"
import { ProficiencyType } from "../../../proficiency/proficiencyLevel.js"
import { SquaddieActionCollectionService } from "../../../squaddieAction/squaddieActionCollection.js"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap.js"
import { CoordinateMapCollectionService } from "../../../coordinateMap/coordinateMapCollection.js"
import { MissionEngine } from "../missionEngine.js"
import { MissionStateService } from "../../missionState.js"
import { MissionManager } from "../../missionManager.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"

describe("previewReadiedActionAndForecastResults", () => {
    let inBattleSquaddieManager: InBattleSquaddieManager
    let squaddieActionManager: SquaddieActionManager
    let coordinateMapCollectionManager: CoordinateMapCollectionManager
    let actorSquaddieId: BattleSquaddieId
    let targetSquaddieId: BattleSquaddieId

    beforeEach(() => {
        const { manager: outOfBattleSquaddieManager } =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "actor_sheet",
                attributeSheetOptions: {
                    maxHitPoints: 10,
                    distancePerAction: 2,
                    items: { maxCapacity: 0 },
                },
            })

        const targetAttributeSheet =
            OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
                id: "target_sheet",
                maxHitPoints: 10,
                distancePerAction: 2,
                items: { maxCapacity: 0 },
            })
        outOfBattleSquaddieManager.addOrUpdateAttributeSheet(
            targetAttributeSheet
        )

        const actorOutOfBattleSquaddie = OutOfBattleSquaddieService.new({
            id: "actor",
            name: "Actor",
            affiliation: SquaddieAffiliation.PLAYER,
            attributeSheetId: "actor_sheet",
        })

        const targetOutOfBattleSquaddie = OutOfBattleSquaddieService.new({
            id: "target",
            name: "Target",
            affiliation: SquaddieAffiliation.ENEMY,
            attributeSheetId: "target_sheet",
        })

        outOfBattleSquaddieManager.addOrUpdateSquaddie(actorOutOfBattleSquaddie)
        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            targetOutOfBattleSquaddie
        )

        inBattleSquaddieManager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            outOfBattleSquaddieManager
        )

        actorSquaddieId = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "actor",
        })

        targetSquaddieId = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId: "target",
        })

        const attackAction = SquaddieActionService.new({
            id: "attack",
            name: "Attack",
            targeting: {
                range: ActionRange.MELEE,
                shape: CoordinateGeneratorShape.BLOOM,
                affiliationRelationship: {
                    self: false,
                    foe: true,
                    friend: false,
                },
            },
            effectOnActor: {
                SUCCESS: {},
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

        squaddieActionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )
        squaddieActionManager.addOrUpdate(attackAction)

        const map = CoordinateMapService.new({
            id: "test_map",
            name: "test map",
            movementProperties: ["1 1 1 "],
        })

        coordinateMapCollectionManager = new CoordinateMapCollectionManager(
            CoordinateMapCollectionService.new()
        )
        coordinateMapCollectionManager.addOrUpdate({ map })

        coordinateMapCollectionManager.addSquaddie({
            mapId: "test_map",
            squaddieId: actorSquaddieId,
            coordinate: { row: 0, col: 0 },
        })

        coordinateMapCollectionManager.addSquaddie({
            mapId: "test_map",
            squaddieId: targetSquaddieId,
            coordinate: { row: 0, col: 1 },
        })
    })

    it("throws error if MissionManager is undefined", () => {
        const missionEngine = new MissionEngine()
        missionEngine.readyAction({
            actor: actorSquaddieId,
            targets: [targetSquaddieId],
            action: { id: "attack" },
        })

        expect(() =>
            missionEngine.previewReadiedActionAndForecastResults()
        ).toThrow("missionManager is undefined")
    })

    it("throws error if readiedAction is undefined", () => {
        const missionState = MissionStateService.new({
            id: "mission-1",
            mapId: "test_map",
        })

        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
            coordinateMapCollectionManager: coordinateMapCollectionManager,
            squaddieActionManager: squaddieActionManager,
        })

        const missionEngine = new MissionEngine(missionManager)

        expect(() =>
            missionEngine.previewReadiedActionAndForecastResults()
        ).toThrow("readiedAction is undefined")
    })

    it("returns forecasted results from MissionManager", () => {
        const missionState = MissionStateService.new({
            id: "mission-1",
            mapId: "test_map",
        })

        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
            coordinateMapCollectionManager: coordinateMapCollectionManager,
            squaddieActionManager: squaddieActionManager,
        })

        const missionEngine = new MissionEngine(missionManager)

        missionEngine.readyAction({
            actor: actorSquaddieId,
            targets: [targetSquaddieId],
            action: { id: "attack" },
        })

        const results = missionEngine.previewReadiedActionAndForecastResults()

        expect(results.length).toBeGreaterThan(0)
        expect(results[0].battleSquaddieId).toBeDefined()
        expect(results[0].degreeOfSuccess).toBeDefined()
        expect(results[0].chanceOutOf36).toBeGreaterThan(0)
        expect(results[0].squaddieActionResults).toBeDefined()
    })

    it("does not consume the readiedAction", () => {
        const missionState = MissionStateService.new({
            id: "mission-1",
            mapId: "test_map",
        })

        const missionManager = new MissionManager({
            missionState: missionState,
            inBattleSquaddieManager: inBattleSquaddieManager,
            coordinateMapCollectionManager: coordinateMapCollectionManager,
            squaddieActionManager: squaddieActionManager,
        })

        const missionEngine = new MissionEngine(missionManager)

        missionEngine.readyAction({
            actor: actorSquaddieId,
            targets: [targetSquaddieId],
            action: { id: "attack" },
        })

        missionEngine.previewReadiedActionAndForecastResults()

        expect(missionEngine.getReadiedAction()).toBeDefined()
        expect(missionEngine.getReadiedAction()?.action.id).toBe("attack")
    })
})
