import { describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine"
import { MissionManager } from "../../missionManager"
import { MissionStateService } from "../../missionState"
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

const mapId = "decisions-test-map"
const moveActionId = "default-move"
const rescueActionId = "rescue"

function createEngineWithActions(): MissionEngine {
    const { manager: outOfBattleSquaddieManager } =
        OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
            sheetId: "actor-sheet",
            attributeSheetOptions: { maxHitPoints: 5, distancePerAction: 3 },
        })

    const playerSquaddie = OutOfBattleSquaddieService.new({
        id: "player-1",
        name: "Player 1",
        affiliation: SquaddieAffiliation.PLAYER,
        attributeSheetId: "actor-sheet",
        actionIds: [rescueActionId],
    })
    outOfBattleSquaddieManager.addOrUpdateSquaddie(playerSquaddie)

    const inBattleSquaddieManager = new InBattleSquaddieManager(
        InBattleSquaddieCollectionService.new(),
        outOfBattleSquaddieManager
    )
    inBattleSquaddieManager.createNewSquaddie({
        outOfBattleSquaddieId: "player-1",
    })

    const coordinateMapCollectionManager = new CoordinateMapCollectionManager(
        CoordinateMapCollectionService.new()
    )
    coordinateMapCollectionManager.addOrUpdate({
        map: CoordinateMapService.new({
            id: mapId,
            name: "Decisions test map",
            movementProperties: ["1 1 1 1 1"],
        }),
    })

    const rescueAction = SquaddieActionService.new({
        id: rescueActionId,
        name: "Rescue",
        howToDetermineDegreeOfSuccess:
            HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
        range: ActionRange.MEDIUM,
        shape: CoordinateGeneratorShape.BLOOM,
        affiliationRelationship: { self: false, foe: false, friend: true },
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 2 } },
        },
        effectOnTarget: {
            [DegreeOfSuccess.SUCCESS]: {
                movement: {
                    movementType: MovementEffectType.TELEPORT_TO_ACTOR_CHOSEN,
                    destinationRange: ActionRange.MELEE,
                },
            },
        },
    })

    const squaddieActionManager = new SquaddieActionManager(
        SquaddieActionCollectionService.new()
    )
    squaddieActionManager.addOrUpdate(SquaddieActionService.defaultMove())
    squaddieActionManager.addOrUpdate(SquaddieActionService.defaultEndTurn())
    squaddieActionManager.addOrUpdate(rescueAction)

    const missionManager = new MissionManager({
        missionState: MissionStateService.new({
            id: "decisions-test-mission",
            mapId,
        }),
        inBattleSquaddieManager,
        coordinateMapCollectionManager,
        squaddieActionManager,
    })

    return new MissionEngine(missionManager)
}

describe("MissionEngine.getRequiredDecisionsForAction", () => {
    it("throws when missionManager is undefined", () => {
        const missionEngine = new MissionEngine()

        expect(() =>
            missionEngine.getRequiredDecisionsForAction(moveActionId)
        ).toThrow(
            "[MissionEngine.getRequiredDecisionsForAction]: missionManager is undefined"
        )
    })

    it("throws when squaddieActionManager is undefined", () => {
        const missionManager = new MissionManager({
            missionState: MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
            }),
        })
        const missionEngine = new MissionEngine(missionManager)

        expect(() =>
            missionEngine.getRequiredDecisionsForAction(moveActionId)
        ).toThrow(
            "[MissionEngine.getRequiredDecisionsForAction]: squaddieActionManager is undefined"
        )
    })

    it("default move requires no decisions", () => {
        const missionEngine = createEngineWithActions()

        const result = missionEngine.getRequiredDecisionsForAction(moveActionId)

        expect(result.requiresSpecificTarget).toBe(false)
        expect(result.requiresAimCoordinate).toBe(false)
        expect(result.requiresTargetDestination).toBe(false)
    })

    it("Rescue requires a specific target and a target destination", () => {
        const missionEngine = createEngineWithActions()

        const result =
            missionEngine.getRequiredDecisionsForAction(rescueActionId)

        expect(result.requiresSpecificTarget).toBe(true)
        expect(result.requiresAimCoordinate).toBe(false)
        expect(result.requiresTargetDestination).toBe(true)
    })
})
