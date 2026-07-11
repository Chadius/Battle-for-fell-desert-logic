import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine.js"
import {
    createMovementTestMission,
    MovementTestMissionIds,
} from "../../../testUtils/mission/movementTestMission.js"
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
import {
    HowToDetermineDegreeOfSuccess,
    MovementEffectType,
    SquaddieActionService,
} from "../../../squaddieAction/squaddieAction.js"
import { ActionRange } from "../../../squaddieAction/actionRange.js"
import { CoordinateGeneratorShape } from "../../../coordinateMap/shape.js"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.js"
import { MissionAffiliationTurn } from "../../missionTurn.js"

const leapActionId = "leap"
const mapId = "ready-action-test-map"
const actorStartCoordinate = { row: 0, col: 0 }
const enemyCoordinate = { row: 0, col: 4 }

function createTestSetup(): {
    missionEngine: MissionEngine
    missionManager: MissionManager
    actorId: BattleSquaddieId
    enemyId: BattleSquaddieId
} {
    const { manager: outOfBattleSquaddieManager } =
        OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
            sheetId: "actor-sheet",
            attributeSheetOptions: {
                maxHitPoints: 5,
                distancePerAction: 3,
            },
        })

    const playerSquaddie = OutOfBattleSquaddieService.new({
        id: "player-1",
        name: "Player 1",
        affiliation: SquaddieAffiliation.PLAYER,
        attributeSheetId: "actor-sheet",
        actionIds: [leapActionId],
    })
    outOfBattleSquaddieManager.addOrUpdateSquaddie(playerSquaddie)

    outOfBattleSquaddieManager.addOrUpdateAttributeSheet(
        OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
            id: "enemy-sheet",
        })
    )
    const enemySquaddie = OutOfBattleSquaddieService.new({
        id: "enemy-1",
        name: "Enemy 1",
        affiliation: SquaddieAffiliation.ENEMY,
        attributeSheetId: "enemy-sheet",
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
        id: mapId,
        name: "Ready action test map",
        movementProperties: ["1 - 1 1 1 1"],
    })

    const coordinateMapCollectionManager = new CoordinateMapCollectionManager(
        CoordinateMapCollectionService.new()
    )
    coordinateMapCollectionManager.addOrUpdate({ map })
    coordinateMapCollectionManager.addSquaddie({
        mapId,
        squaddieId: actorId,
        coordinate: actorStartCoordinate,
    })
    coordinateMapCollectionManager.addSquaddie({
        mapId,
        squaddieId: enemyId,
        coordinate: enemyCoordinate,
    })

    const leapAction = SquaddieActionService.new({
        id: leapActionId,
        name: "Leap",
        howToDetermineDegreeOfSuccess:
            HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
        range: ActionRange.SELF,
        shape: CoordinateGeneratorShape.BLOOM,
        affiliationRelationship: { self: true, foe: false, friend: false },
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: {
                actionPoints: { spent: 2 },
                movement: {
                    movementType:
                        MovementEffectType.ACTOR_CHOSEN_SPECIAL_TRAVERSAL,
                    traversal: {
                        skipOverPits: true,
                        squaddieMovementSpecialTraversalInfo: {
                            actionPointsOfMovement: 1,
                        },
                    },
                },
            },
        },
    })

    const squaddieActionManager = new SquaddieActionManager(
        SquaddieActionCollectionService.new()
    )
    squaddieActionManager.addOrUpdate(leapAction)
    squaddieActionManager.addOrUpdate(SquaddieActionService.defaultMove())
    squaddieActionManager.addOrUpdate(SquaddieActionService.defaultEndTurn())

    const missionState = MissionStateService.new({
        id: "ready-action-test-mission",
        mapId,
    })

    const missionManager = new MissionManager({
        missionState,
        inBattleSquaddieManager,
        coordinateMapCollectionManager,
        squaddieActionManager,
    })

    return {
        missionEngine: new MissionEngine(missionManager),
        missionManager,
        actorId,
        enemyId,
    }
}

describe("MissionEngine.readyAction movement destination validation", () => {
    let missionEngine: MissionEngine
    let actorId: BattleSquaddieId

    beforeEach(() => {
        ;({ missionEngine, actorId } = createTestSetup())
        missionEngine.transitionToNextPhase()
        missionEngine.transitionToNextPhase()
        expect(
            missionEngine.missionManager?.missionState?.turn
                .missionAffiliationTurn
        ).toEqual(MissionAffiliationTurn.PLAYER_TURN)
    })

    it("accepts a valid reachable destination across the pit", () => {
        const result = missionEngine.readyAction({
            actor: actorId,
            targets: [],
            action: {
                id: leapActionId,
                decisions: { targetDestination: { row: 0, col: 2 } },
            },
        })

        expect(result.isValid).toBe(true)
    })

    it("rejects an off-map destination", () => {
        const result = missionEngine.readyAction({
            actor: actorId,
            targets: [],
            action: {
                id: leapActionId,
                decisions: {
                    targetDestination: { row: 1000, col: 1000 },
                },
            },
        })

        expect(result.isValid).toBe(false)
    })

    it("rejects a destination occupied by another squaddie", () => {
        const result = missionEngine.readyAction({
            actor: actorId,
            targets: [],
            action: {
                id: leapActionId,
                decisions: {
                    targetDestination: enemyCoordinate,
                },
            },
        })

        expect(result.isValid).toBe(false)
    })
})

describe("MissionEngine.readyAction — TELEPORT_TO_ACTOR_CHOSEN validation", () => {
    it("rejects a TELEPORT_TO_ACTOR_CHOSEN action when no destination decision is provided", () => {
        const { missionManager, fractaSquaddieId, valeSquaddieId } =
            createMovementTestMission()
        const engine = new MissionEngine(missionManager)
        engine.transitionToNextPhase()
        engine.transitionToNextPhase()

        const result = engine.readyAction({
            actor: valeSquaddieId,
            targets: [fractaSquaddieId],
            action: {
                id: MovementTestMissionIds.vale.rescueActionId,
            },
        })

        expect(result.isValid).toBe(false)
        expect(result.message).toBe("This action requires a destination.")
    })
})
