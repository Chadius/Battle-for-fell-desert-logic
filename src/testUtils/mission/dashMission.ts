import {
    HowToDetermineDegreeOfSuccess,
    MovementEffectType,
    SquaddieActionService,
} from "../../squaddieAction/squaddieAction.js"
import { ActionRange } from "../../squaddieAction/actionRange.js"
import { DegreeOfSuccess } from "../../degreesOfSuccess/degreeOfSuccess.js"
import {
    MissionAffiliationTurn,
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

export const DashMissionActionIds = {
    dash: "dash",
    jab: "jab",
}

function createDashAction() {
    return SquaddieActionService.new({
        id: DashMissionActionIds.dash,
        howToDetermineDegreeOfSuccess:
            HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
        range: ActionRange.SELF,
        affiliationRelationship: { self: true, foe: false, friend: false },
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: {
                actionPoints: {
                    spent: 0,
                    additional: { movementPathActionPointCost: true },
                },
                movement: { movementType: MovementEffectType.ACTOR_CHOSEN },
            },
        },
    })
}

function createJabAction() {
    return SquaddieActionService.new({
        id: DashMissionActionIds.jab,
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

export function createDashMission(): {
    missionEngine: MissionEngine
    runnerId: BattleSquaddieId
    teammateIdWhoKeepsThePlayerPhaseOpen: BattleSquaddieId
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
    outOfBattleSquaddieManager.addOrUpdateSquaddie(
        OutOfBattleSquaddieService.new({
            id: "runner",
            affiliation: SquaddieAffiliation.PLAYER,
            attributeSheetId: "player_sheet",
            actionIds: [DashMissionActionIds.dash, DashMissionActionIds.jab],
        })
    )

    outOfBattleSquaddieManager.addOrUpdateSquaddie(
        OutOfBattleSquaddieService.new({
            id: "teammate",
            affiliation: SquaddieAffiliation.PLAYER,
            attributeSheetId: "player_sheet",
            actionIds: [DashMissionActionIds.jab],
        })
    )

    const inBattleSquaddieManager = new InBattleSquaddieManager(
        InBattleSquaddieCollectionService.new(),
        outOfBattleSquaddieManager
    )
    const runnerId = inBattleSquaddieManager.createNewSquaddie({
        outOfBattleSquaddieId: "runner",
    })
    const teammateId = inBattleSquaddieManager.createNewSquaddie({
        outOfBattleSquaddieId: "teammate",
    })

    const coordinateMapCollectionManager = new CoordinateMapCollectionManager(
        CoordinateMapCollectionService.new()
    )
    coordinateMapCollectionManager.addOrUpdate({
        map: CoordinateMapService.new({
            id: "dash_map",
            name: "dash map",
            movementProperties: ["1 1 1 1 1"],
        }),
    })
    coordinateMapCollectionManager.addSquaddie({
        mapId: "dash_map",
        squaddieId: runnerId,
        coordinate: { row: 0, col: 0 },
    })
    coordinateMapCollectionManager.addSquaddie({
        mapId: "dash_map",
        squaddieId: teammateId,
        coordinate: { row: 0, col: 4 },
    })

    const squaddieActionManager = new SquaddieActionManager(
        SquaddieActionCollectionService.new()
    )
    squaddieActionManager.addOrUpdate(createDashAction())
    squaddieActionManager.addOrUpdate(createJabAction())
    SquaddieActionService.defaultActions().forEach((squaddieAction) =>
        squaddieActionManager.addOrUpdate(squaddieAction)
    )

    const missionManager = new MissionManager({
        missionState: MissionStateService.new({
            id: "dash-mission",
            mapId: "dash_map",
            turn: MissionTurnService.new({
                missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
            }),
        }),
        inBattleSquaddieManager,
        coordinateMapCollectionManager,
        squaddieActionManager,
    })

    return {
        missionEngine: new MissionEngine(missionManager),
        runnerId,
        teammateIdWhoKeepsThePlayerPhaseOpen: teammateId,
    }
}
