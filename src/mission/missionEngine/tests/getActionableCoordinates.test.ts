import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine.js"
import { MissionManager } from "../../missionManager.js"
import { MissionStateService } from "../../missionState.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup.js"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { SquaddieAffiliation } from "../../../affiliation/affiliation.js"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap.js"
import { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../../../coordinateMap/coordinateMapCollection.js"
import { SquaddieActionManager } from "../../../squaddieAction/squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../../../squaddieAction/squaddieActionCollection.js"
import { SquaddieActionService } from "../../../squaddieAction/squaddieAction.js"
import { ActionRange } from "../../../squaddieAction/actionRange.js"
import { CoordinateGeneratorShape } from "../../../coordinateMap/shape.js"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.js"
import { AttributeScore } from "../../../proficiency/attributeScore.js"
import { ProficiencyType } from "../../../proficiency/proficiencyLevel.js"

const biteActionId = "bite"
const mapId = "melee-standoff-map"
const actorCoordinate = { row: 0, col: 0 }
const enemyCoordinate = { row: 0, col: 1 }

const createMeleeStandoff = (): {
    missionEngine: MissionEngine
    inBattleSquaddieManager: InBattleSquaddieManager
    actorId: BattleSquaddieId
    enemyId: BattleSquaddieId
} => {
    const { manager: outOfBattleSquaddieManager } =
        OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
            sheetId: "actor-sheet",
        })
    outOfBattleSquaddieManager.addOrUpdateAttributeSheet(
        OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
            id: "enemy-sheet",
        })
    )

    outOfBattleSquaddieManager.addOrUpdateSquaddie(
        OutOfBattleSquaddieService.new({
            id: "actor",
            name: "Actor",
            affiliation: SquaddieAffiliation.PLAYER,
            attributeSheetId: "actor-sheet",
            actionIds: [biteActionId],
        })
    )
    outOfBattleSquaddieManager.addOrUpdateSquaddie(
        OutOfBattleSquaddieService.new({
            id: "enemy",
            name: "Enemy",
            affiliation: SquaddieAffiliation.ENEMY,
            attributeSheetId: "enemy-sheet",
            actionIds: [biteActionId],
        })
    )

    const inBattleSquaddieManager = new InBattleSquaddieManager(
        InBattleSquaddieCollectionService.new(),
        outOfBattleSquaddieManager
    )
    const actorId = inBattleSquaddieManager.createNewSquaddie({
        outOfBattleSquaddieId: "actor",
    })
    const enemyId = inBattleSquaddieManager.createNewSquaddie({
        outOfBattleSquaddieId: "enemy",
    })

    const coordinateMapCollectionManager = new CoordinateMapCollectionManager(
        CoordinateMapCollectionService.new()
    )
    coordinateMapCollectionManager.addOrUpdate({
        map: CoordinateMapService.new({
            id: mapId,
            name: "Melee standoff map",
            movementProperties: ["1 1"],
        }),
    })
    coordinateMapCollectionManager.addSquaddie({
        mapId,
        squaddieId: actorId,
        coordinate: actorCoordinate,
    })
    coordinateMapCollectionManager.addSquaddie({
        mapId,
        squaddieId: enemyId,
        coordinate: enemyCoordinate,
    })

    const squaddieActionManager = new SquaddieActionManager(
        SquaddieActionCollectionService.new()
    )
    squaddieActionManager.addOrUpdate(
        SquaddieActionService.new({
            id: biteActionId,
            name: "Bite",
            attribute: AttributeScore.BODY,
            proficiency: ProficiencyType.WEAPON_NATURAL,
            range: ActionRange.MELEE,
            shape: CoordinateGeneratorShape.BLOOM,
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
            effectOnTarget: {
                [DegreeOfSuccess.FAILURE]: {},
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
    squaddieActionManager.addOrUpdate(SquaddieActionService.defaultEndTurn())

    const missionEngine = new MissionEngine(
        new MissionManager({
            missionState: MissionStateService.new({
                id: "melee-standoff-mission",
                mapId,
            }),
            inBattleSquaddieManager,
            coordinateMapCollectionManager,
            squaddieActionManager,
        })
    )
    missionEngine.transitionToNextPhase()
    missionEngine.transitionToNextPhase()

    return { missionEngine, inBattleSquaddieManager, actorId, enemyId }
}

describe("previewing the coordinates a squaddie can act upon", () => {
    let missionEngine: MissionEngine
    let inBattleSquaddieManager: InBattleSquaddieManager
    let actorId: BattleSquaddieId
    let enemyId: BattleSquaddieId

    beforeEach(() => {
        ;({ missionEngine, inBattleSquaddieManager, actorId, enemyId } =
            createMeleeStandoff())
    })

    describe("when a squaddie hemmed in by a blocker has an adjacent enemy", () => {
        it("reports no reachable movement", () => {
            expect(
                missionEngine.getMovementOptionsWithCosts(actorId)
            ).toHaveLength(0)
        })

        it("still reports the adjacent enemy as an attack target", () => {
            expect(missionEngine.getActionableCoordinates(actorId)).toEqual([
                {
                    actionId: biteActionId,
                    targetCoordinate: enemyCoordinate,
                    targetSquaddieIds: [enemyId],
                    actionPointCost: 1,
                },
            ])
        })
    })

    describe("when previewing an enemy whose turn it isn't", () => {
        beforeEach(() => {
            const { current } = inBattleSquaddieManager.getActionPoints(enemyId)
            inBattleSquaddieManager.spendActionPoints({
                ...enemyId,
                actionPoints: current,
            })
        })

        it("offers nothing to act upon under the default query", () => {
            expect(
                missionEngine.getActionableCoordinates(enemyId)
            ).toHaveLength(0)
        })

        it("offers its reachable attack targets under the maximum query", () => {
            expect(
                missionEngine.getActionableCoordinates(enemyId, {
                    actionPoints: "maximum",
                })
            ).toEqual([
                {
                    actionId: biteActionId,
                    targetCoordinate: actorCoordinate,
                    targetSquaddieIds: [actorId],
                    actionPointCost: 1,
                },
            ])
        })
    })
})
