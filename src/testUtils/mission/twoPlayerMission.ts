import {
    HowToDetermineDegreeOfSuccess,
    SquaddieActionService,
} from "../../squaddieAction/squaddieAction.js"
import { ActionRange } from "../../squaddieAction/actionRange.js"
import { DegreeOfSuccess } from "../../degreesOfSuccess/degreeOfSuccess.js"
import {
    MissionAffiliationTurn,
    type TMissionAffiliationTurn,
    MissionTurnService,
} from "../../mission/missionTurn.js"
import { MissionEngine } from "../../mission/missionEngine/missionEngine.js"
import { MissionManager } from "../../mission/missionManager.js"
import { MissionStateService } from "../../mission/missionState.js"
import { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { OutOfBattleSquaddieTestSetup } from "../outOfBattleSquaddieTestSetup.js"
import { OutOfBattleSquaddieService } from "../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { SquaddieAffiliation } from "../../affiliation/affiliation.js"
import { CoordinateMapCollectionManager } from "../../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../../coordinateMap/coordinateMapCollection.js"
import { CoordinateMapService } from "../../coordinateMap/coordinateMap.js"
import { SquaddieActionManager } from "../../squaddieAction/squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../../squaddieAction/squaddieActionCollection.js"
import type { BattleSquaddieId } from "../../squaddie/inBattle/battleSquaddieId.js"
import {
    SquaddieConditionDecaysAt,
    SquaddieConditionService,
    SquaddieConditionSource,
    SquaddieConditionType,
} from "../../proficiency/squaddieCondition.js"

export const TwoPlayerMissionActionIds = {
    jab: "jab",
    wave: "wave",
    poke: "poke",
}

function createJabAction() {
    return SquaddieActionService.new({
        id: TwoPlayerMissionActionIds.jab,
        howToDetermineDegreeOfSuccess:
            HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
        range: ActionRange.SELF,
        affiliationRelationship: { self: true, foe: false, friend: false },
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: {
                actionPoints: { spent: 1 },
            },
        },
    })
}

function createWaveAction() {
    return SquaddieActionService.new({
        id: TwoPlayerMissionActionIds.wave,
        howToDetermineDegreeOfSuccess:
            HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
        range: ActionRange.SELF,
        affiliationRelationship: { self: true, foe: false, friend: false },
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: {
                actionPoints: { spent: 0 },
            },
        },
    })
}

function createPokeAction() {
    return SquaddieActionService.new({
        id: TwoPlayerMissionActionIds.poke,
        howToDetermineDegreeOfSuccess:
            HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
        range: ActionRange.MELEE,
        affiliationRelationship: { self: false, foe: false, friend: true },
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: {
                actionPoints: { spent: 1 },
            },
        },
        effectOnTarget: {
            [DegreeOfSuccess.SUCCESS]: {
                conditions: {
                    add: [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.ARMOR,
                            amount: { amount: 1 },
                            duration: {
                                duration: 1,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                            source: SquaddieConditionSource.UNKNOWN,
                        }),
                    ],
                },
            },
        },
    })
}

export function createTwoPlayerMission({
    missionAffiliationTurn = MissionAffiliationTurn.PLAYER_TURN,
}: { missionAffiliationTurn?: TMissionAffiliationTurn } = {}): {
    missionEngine: MissionEngine
    player1Id: BattleSquaddieId
    player2Id: BattleSquaddieId
} {
    const { manager: outOfBattleSquaddieManager } =
        OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
            sheetId: "player_sheet",
            attributeSheetOptions: {
                maxHitPoints: 10,
                distancePerAction: 2,
                items: { maxCapacity: 0 },
            },
        })

    const player1 = OutOfBattleSquaddieService.new({
        id: "player-1",
        affiliation: SquaddieAffiliation.PLAYER,
        attributeSheetId: "player_sheet",
        actionIds: [
            TwoPlayerMissionActionIds.jab,
            TwoPlayerMissionActionIds.wave,
            TwoPlayerMissionActionIds.poke,
        ],
    })
    const player2 = OutOfBattleSquaddieService.new({
        id: "player-2",
        affiliation: SquaddieAffiliation.PLAYER,
        attributeSheetId: "player_sheet",
        actionIds: [TwoPlayerMissionActionIds.jab],
    })

    outOfBattleSquaddieManager.addOrUpdateSquaddie(player1)
    outOfBattleSquaddieManager.addOrUpdateSquaddie(player2)

    const inBattleSquaddieManager = new InBattleSquaddieManager(
        InBattleSquaddieCollectionService.new(),
        outOfBattleSquaddieManager
    )

    const player1Id = inBattleSquaddieManager.createNewSquaddie({
        outOfBattleSquaddieId: "player-1",
    })
    const player2Id = inBattleSquaddieManager.createNewSquaddie({
        outOfBattleSquaddieId: "player-2",
    })

    const coordinateMap = CoordinateMapService.new({
        id: "test_map",
        name: "test map",
        movementProperties: ["1 1 1 1 1"],
    })

    const coordinateMapCollectionManager = new CoordinateMapCollectionManager(
        CoordinateMapCollectionService.new()
    )
    coordinateMapCollectionManager.addOrUpdate({ map: coordinateMap })
    coordinateMapCollectionManager.addSquaddie({
        mapId: "test_map",
        squaddieId: player1Id,
        coordinate: { row: 0, col: 0 },
    })
    coordinateMapCollectionManager.addSquaddie({
        mapId: "test_map",
        squaddieId: player2Id,
        coordinate: { row: 0, col: 1 },
    })

    const squaddieActionManager = new SquaddieActionManager(
        SquaddieActionCollectionService.new()
    )
    squaddieActionManager.addOrUpdate(createJabAction())
    squaddieActionManager.addOrUpdate(createWaveAction())
    squaddieActionManager.addOrUpdate(createPokeAction())
    squaddieActionManager.addOrUpdate(SquaddieActionService.defaultEndTurn())
    squaddieActionManager.addOrUpdate(SquaddieActionService.defaultMove())

    const missionState = MissionStateService.new({
        id: "mission-1",
        mapId: "test_map",
        turn: MissionTurnService.new({
            missionAffiliationTurn,
        }),
    })

    const missionManager = new MissionManager({
        missionState,
        inBattleSquaddieManager,
        coordinateMapCollectionManager,
        squaddieActionManager,
    })

    return {
        missionEngine: new MissionEngine(missionManager),
        player1Id,
        player2Id,
    }
}
