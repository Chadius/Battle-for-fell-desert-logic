import { beforeEach, describe, expect, it } from "vitest"
import { SimpleAggressorStrategy } from "./simpleAggressorStrategy"
import type { AiStrategyInput } from "../aiStrategy"
import { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../../squaddie/inBattle/inBattleSquaddieCollection"
import { OutOfBattleSquaddieService } from "../../squaddie/outOfBattle/outOfBattleSquaddie"
import { OutOfBattleSquaddieTestSetup } from "../../testUtils/outOfBattleSquaddieTestSetup"
import { SquaddieAffiliation } from "../../affiliation/affiliation"
import { SquaddieActionManager } from "../../squaddieAction/squaddieActionManager"
import { SquaddieActionCollectionService } from "../../squaddieAction/squaddieActionCollection"
import { SquaddieActionService } from "../../squaddieAction/squaddieAction"
import { ActionRange } from "../../squaddieAction/actionRange"
import { DegreeOfSuccess } from "../../degreesOfSuccess/degreeOfSuccess"
import { ProficiencyType } from "../../proficiency/proficiencyLevel"
import { CoordinateMapCollectionManager } from "../../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../../coordinateMap/coordinateMapCollection"
import { CoordinateMapService } from "../../coordinateMap/coordinateMap"
import type { BattleSquaddieId } from "../../squaddie/inBattle/battleSquaddieId"

describe("SimpleAggressorStrategy", () => {
    let strategy: SimpleAggressorStrategy
    let squaddieActionManager: SquaddieActionManager
    let inBattleSquaddieManager: InBattleSquaddieManager
    let coordinateMapCollectionManager: CoordinateMapCollectionManager
    let actorId: BattleSquaddieId
    let targetId: BattleSquaddieId
    const mapId = "test-map"
    const meleeAttackId = "melee-attack"

    const createMapWithProperties = (properties: string) => {
        let mapCollection = CoordinateMapCollectionService.new()
        mapCollection = CoordinateMapCollectionService.addOrUpdate({
            collection: mapCollection,
            map: CoordinateMapService.new({
                id: mapId,
                name: "Test Map",
                movementProperties: [properties],
            }),
        })
        coordinateMapCollectionManager = new CoordinateMapCollectionManager(
            mapCollection
        )
    }

    const buildManagers = () => {
        const { manager: outOfBattleSquaddieManager } =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "shared-sheet",
                attributeSheetOptions: {
                    distancePerAction: 2,
                    maxHitPoints: 10,
                },
            })

        const actorSquaddie = OutOfBattleSquaddieService.new({
            id: "actor",
            name: "Actor",
            actionIds: [meleeAttackId],
            attributeSheetId: "shared-sheet",
            affiliation: SquaddieAffiliation.ENEMY,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(actorSquaddie)

        const targetSquaddie = OutOfBattleSquaddieService.new({
            id: "target",
            name: "Target",
            actionIds: [],
            attributeSheetId: "shared-sheet",
            affiliation: SquaddieAffiliation.PLAYER,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(targetSquaddie)

        const inBattleCollection = InBattleSquaddieCollectionService.new()
        inBattleSquaddieManager = new InBattleSquaddieManager(
            inBattleCollection,
            outOfBattleSquaddieManager
        )

        const { inBattleSquaddieId: actorInBattleId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor",
            })
        actorId = {
            inBattleSquaddieId: actorInBattleId,
            outOfBattleSquaddieId: "actor",
        }

        const { inBattleSquaddieId: targetInBattleId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "target",
            })
        targetId = {
            inBattleSquaddieId: targetInBattleId,
            outOfBattleSquaddieId: "target",
        }

        squaddieActionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )

        squaddieActionManager.addOrUpdate(
            SquaddieActionService.new({
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
        )
        squaddieActionManager.addOrUpdate(SquaddieActionService.defaultMove())
    }

    const buildInput = (): AiStrategyInput => ({
        actorIds: actorId,
        inBattleSquaddieManager,
        squaddieActionManager,
        coordinateMapCollectionManager,
        mapId,
    })

    beforeEach(() => {
        strategy = new SimpleAggressorStrategy()
        buildManagers()
        createMapWithProperties("1 1 1 1 1")
    })

    it("attacks adjacent foe", () => {
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: actorId,
            coordinate: { row: 0, col: 0 },
        })
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: targetId,
            coordinate: { row: 0, col: 1 },
        })

        const result = strategy.decideAction(buildInput())

        expect(result).toBeDefined()
        expect(result!.action.id).toBe(meleeAttackId)
        expect(result!.actor).toEqual(actorId)
        expect(result!.targets).toEqual([targetId])
    })

    it("moves toward foe a few spaces away", () => {
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: actorId,
            coordinate: { row: 0, col: 0 },
        })
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: targetId,
            coordinate: { row: 0, col: 3 },
        })

        const result = strategy.decideAction(buildInput())

        expect(result).toBeDefined()
        expect(result!.action.id).toBe("default-move")
        expect(result!.actor).toEqual(actorId)
        expect(result!.action.decisions?.desiredMovementDestination).toEqual(
            expect.objectContaining({ row: 0, col: 2 })
        )
    })

    it("returns undefined when foe is too far for remaining AP", () => {
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: actorId,
            coordinate: { row: 0, col: 0 },
        })
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: targetId,
            coordinate: { row: 0, col: 4 },
        })

        inBattleSquaddieManager.spendActionPoints({
            ...actorId,
            actionPoints: 2,
        })

        const result = strategy.decideAction(buildInput())

        expect(result).toBeUndefined()
    })

    it("returns undefined when a wall blocks the only path to the foe", () => {
        createMapWithProperties("1 X 1")
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: actorId,
            coordinate: { row: 0, col: 0 },
        })
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: targetId,
            coordinate: { row: 0, col: 2 },
        })

        const result = strategy.decideAction(buildInput())

        expect(result).toBeUndefined()
    })

    it("returns undefined when difficult terrain makes the path too costly", () => {
        createMapWithProperties("1 2 2 2 1")
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: actorId,
            coordinate: { row: 0, col: 0 },
        })
        coordinateMapCollectionManager.addSquaddie({
            mapId,
            squaddieId: targetId,
            coordinate: { row: 0, col: 4 },
        })

        inBattleSquaddieManager.spendActionPoints({
            ...actorId,
            actionPoints: 1,
        })

        const result = strategy.decideAction(buildInput())

        expect(result).toBeUndefined()
    })
})
