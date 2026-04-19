import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine"
import { MissionManager } from "../../missionManager"
import { MissionStateService } from "../../missionState"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { SquaddieAffiliation } from "../../../affiliation/affiliation"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap"
import { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../../../coordinateMap/coordinateMapCollection"
import { SquaddieActionManager } from "../../../squaddieAction/squaddieActionManager"
import { SquaddieActionCollectionService } from "../../../squaddieAction/squaddieActionCollection"
import {
    HowToDetermineDegreeOfSuccess,
    MovementEffectType,
    SquaddieActionService,
} from "../../../squaddieAction/squaddieAction"
import { ActionRange } from "../../../squaddieAction/actionRange"
import { CoordinateGeneratorShape } from "../../../coordinateMap/shape"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess"
import { DEFAULT_ACTION_POINTS } from "../../../squaddie/inBattle/inBattleSquaddie"
import { MissionAffiliationTurn } from "../../missionTurn"

// IDs used across the test setup functions.
const leapActionId = "leap"
const enemyOutOfBattleId = "enemy-1"

const mapId = "leap-test-map"
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
        id: enemyOutOfBattleId,
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
        outOfBattleSquaddieId: enemyOutOfBattleId,
    })

    const map = CoordinateMapService.new({
        id: mapId,
        name: "Leap test map",
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
        id: "leap-test-mission",
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

describe("MissionEngine.getMovementOptionsForAction", () => {
    it("throws error if missionManager is undefined", () => {
        const missionEngine = new MissionEngine()
        const actor: BattleSquaddieId = {
            inBattleSquaddieId: 0,
            outOfBattleSquaddieId: "player-1",
        }

        expect(() =>
            missionEngine.getMovementOptionsForAction(actor, leapActionId)
        ).toThrow(
            "[MissionEngine.getMovementOptionsForAction]: missionManager is undefined"
        )
    })

    it("throws error if inBattleSquaddieManager is undefined", () => {
        const missionManager = new MissionManager({
            missionState: MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
            }),
        })
        const missionEngine = new MissionEngine(missionManager)
        const actor: BattleSquaddieId = {
            inBattleSquaddieId: 0,
            outOfBattleSquaddieId: "player-1",
        }

        expect(() =>
            missionEngine.getMovementOptionsForAction(actor, leapActionId)
        ).toThrow(
            "[MissionEngine.getMovementOptionsForAction]: inBattleSquaddieManager is undefined"
        )
    })

    describe("with a player and a pit-blocked map", () => {
        let missionEngine: MissionEngine
        let missionManager: MissionManager
        let actorId: BattleSquaddieId

        beforeEach(() => {
            ;({ missionEngine, missionManager, actorId } = createTestSetup())
            missionEngine.transitionToNextPhase()
            missionEngine.transitionToNextPhase()
            expect(
                missionEngine.missionManager?.missionState?.turn
                    .missionAffiliationTurn
            ).toEqual(MissionAffiliationTurn.PLAYER_TURN)
        })

        it("Leap returns destinations reachable only by traversing the pit", () => {
            const result = missionEngine.getMovementOptionsForAction(
                actorId,
                leapActionId
            )

            expect(result.length).toBeGreaterThan(0)
            const landedAcrossPit = result.some(
                (item) => item.destination.col === 2
            )
            expect(landedAcrossPit).toBe(true)
        })

        it("Leap destinations exclude the occupied enemy square", () => {
            const result = missionEngine.getMovementOptionsForAction(
                actorId,
                leapActionId
            )

            const occupiedIncluded = result.some(
                (item) =>
                    item.destination.row === enemyCoordinate.row &&
                    item.destination.col === enemyCoordinate.col
            )
            expect(occupiedIncluded).toBe(false)
        })

        it("returns empty array when the actor cannot afford the action", () => {
            missionManager.inBattleSquaddieManager!.spendActionPoints({
                inBattleSquaddieId: actorId.inBattleSquaddieId,
                outOfBattleSquaddieId: actorId.outOfBattleSquaddieId,
                actionPoints: DEFAULT_ACTION_POINTS,
            })

            const result = missionEngine.getMovementOptionsForAction(
                actorId,
                leapActionId
            )

            expect(result).toHaveLength(0)
        })
    })
})
