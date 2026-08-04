import { MissionEngine } from "../../mission/missionEngine/missionEngine.js"
import { MissionManager } from "../../mission/missionManager.js"
import { MissionStateService } from "../../mission/missionState.js"
import { ArmyManager } from "../../campaign/army/armyManager.js"
import { ArmyService } from "../../campaign/army/army.js"
import {
    type CampaignSquaddie,
    CampaignSquaddieService,
} from "../../campaign/army/campaignSquaddie.js"
import {
    type CampaignSquaddieDeploymentCoordinateCollection,
    CampaignSquaddieDeploymentCoordinateCollectionService,
} from "../../mission/campaignSquaddieDeploymentCoordinateCollection.js"
import { CampaignSquaddieDeploymentCoordinateService } from "../../mission/campaignSquaddieDeploymentCoordinate.js"
import { OutOfBattleSquaddieManager } from "../../squaddie/outOfBattle/outOfBattleSquaddieManager.js"
import { OutOfBattleSquaddieCollectionService } from "../../squaddie/outOfBattle/outOfBattleSquaddieCollection.js"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection.js"
import {
    type OutOfBattleSquaddieAttributeSheet,
    OutOfBattleSquaddieAttributeSheetService,
} from "../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet.js"
import {
    type OutOfBattleSquaddie,
    OutOfBattleSquaddieService,
} from "../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { CoordinateMapCollectionManager } from "../../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../../coordinateMap/coordinateMapCollection.js"
import { CoordinateMapService } from "../../coordinateMap/coordinateMap.js"
import { SquaddieActionManager } from "../../squaddieAction/squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../../squaddieAction/squaddieActionCollection.js"
import { SquaddieActionService } from "../../squaddieAction/squaddieAction.js"
import { SquaddieAffiliation } from "../../affiliation/affiliation.js"
import { AttributeScore } from "../../proficiency/attributeScore.js"
import type { RollGenerator } from "../../squaddieAction/calculate/roll/rollGenerator.js"
import type { MissionObjective } from "../../mission/missionObjective.js"
import {
    CampaignTestHarness,
    CampaignTestHarnessIds,
} from "./campaignTestHarness.js"

export const CampaignTestHarnessWithLockedDeploymentIds = {
    mapId: "campaign-test-harness-locked-deployment-map",
    mapName: "Campaign Test Harness Locked Deployment Map",
    missionStateId: "campaign-test-harness-locked-deployment-mission",
    lini: {
        campaignSquaddieId: CampaignTestHarnessIds.lini.campaignSquaddieId,
        outOfBattleSquaddieId:
            CampaignTestHarnessIds.lini.outOfBattleSquaddieId,
        attributeSheetId: CampaignTestHarnessIds.lini.attributeSheetId,
        scimitarActionId: CampaignTestHarnessIds.lini.scimitarActionId,
        leaderCoordinateId: "slot-leader",
    },
    vale: {
        campaignSquaddieId: "vale",
        outOfBattleSquaddieId: "vale",
        attributeSheetId: "vale-attribute-sheet",
        coordinateId: "slot-vale",
    },
    otto: {
        campaignSquaddieId: "otto",
        outOfBattleSquaddieId: "otto",
        attributeSheetId: "otto-attribute-sheet",
    },
    zaya: {
        campaignSquaddieId: "zaya",
        outOfBattleSquaddieId: "zaya",
        attributeSheetId: "zaya-attribute-sheet",
    },
    openCoordinateId: "slot-open",
} as const

export class CampaignTestHarnessWithLockedDeployment extends MissionEngine {
    constructor({
        objectives = [],
        rollGenerator,
    }: {
        objectives?: MissionObjective[]
        rollGenerator?: RollGenerator
    } = {}) {
        super(
            CampaignTestHarnessWithLockedDeployment.createMissionManager(
                objectives
            ),
            rollGenerator
        )
    }

    private static createMissionManager(
        objectives: MissionObjective[]
    ): MissionManager {
        const armyManager =
            CampaignTestHarnessWithLockedDeployment.createArmyManager()
        const outOfBattleSquaddieManager =
            CampaignTestHarnessWithLockedDeployment.createOutOfBattleSquaddieManager()
        const inBattleSquaddieManager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            outOfBattleSquaddieManager
        )
        const coordinateMapCollectionManager =
            CampaignTestHarnessWithLockedDeployment.createCoordinateMapCollectionManager()
        const squaddieActionManager =
            CampaignTestHarnessWithLockedDeployment.createSquaddieActionManager()
        const coordinateCollection =
            CampaignTestHarnessWithLockedDeployment.createCoordinateCollection()

        const missionState = MissionStateService.new({
            id: CampaignTestHarnessWithLockedDeploymentIds.missionStateId,
            mapId: CampaignTestHarnessWithLockedDeploymentIds.mapId,
            campaignSquaddieDeploymentCoordinates: coordinateCollection,
            objectives,
        })

        return new MissionManager({
            missionState,
            inBattleSquaddieManager,
            coordinateMapCollectionManager,
            squaddieActionManager,
            outOfBattleSquaddieManager,
            armyManager,
        })
    }

    private static createValeCampaignSquaddie(): CampaignSquaddie {
        return CampaignSquaddieService.new({
            id: CampaignTestHarnessWithLockedDeploymentIds.vale
                .campaignSquaddieId,
            outOfBattleAttributeSheetId:
                CampaignTestHarnessWithLockedDeploymentIds.vale
                    .attributeSheetId,
            outOfBattleSquaddieId:
                CampaignTestHarnessWithLockedDeploymentIds.vale
                    .outOfBattleSquaddieId,
            name: "Vale",
        })
    }

    private static createOttoCampaignSquaddie(): CampaignSquaddie {
        return CampaignSquaddieService.new({
            id: CampaignTestHarnessWithLockedDeploymentIds.otto
                .campaignSquaddieId,
            outOfBattleAttributeSheetId:
                CampaignTestHarnessWithLockedDeploymentIds.otto
                    .attributeSheetId,
            outOfBattleSquaddieId:
                CampaignTestHarnessWithLockedDeploymentIds.otto
                    .outOfBattleSquaddieId,
            name: "Otto",
        })
    }

    private static createZayaCampaignSquaddie(): CampaignSquaddie {
        return CampaignSquaddieService.new({
            id: CampaignTestHarnessWithLockedDeploymentIds.zaya
                .campaignSquaddieId,
            outOfBattleAttributeSheetId:
                CampaignTestHarnessWithLockedDeploymentIds.zaya
                    .attributeSheetId,
            outOfBattleSquaddieId:
                CampaignTestHarnessWithLockedDeploymentIds.zaya
                    .outOfBattleSquaddieId,
            name: "Zaya",
        })
    }

    private static createValeAttributeSheet(): OutOfBattleSquaddieAttributeSheet {
        return OutOfBattleSquaddieAttributeSheetService.new({
            id: CampaignTestHarnessWithLockedDeploymentIds.vale
                .attributeSheetId,
            maxHitPoints: 5,
            movement: { movementPointsPerAction: 2 },
            attributeScores: {
                [AttributeScore.BODY]: 1,
                [AttributeScore.MIND]: 1,
                [AttributeScore.SOUL]: 0,
            },
        })
    }

    private static createOttoAttributeSheet(): OutOfBattleSquaddieAttributeSheet {
        return OutOfBattleSquaddieAttributeSheetService.new({
            id: CampaignTestHarnessWithLockedDeploymentIds.otto
                .attributeSheetId,
            maxHitPoints: 5,
            movement: { movementPointsPerAction: 2 },
            attributeScores: {
                [AttributeScore.BODY]: 1,
                [AttributeScore.MIND]: 0,
                [AttributeScore.SOUL]: 0,
            },
        })
    }

    private static createZayaAttributeSheet(): OutOfBattleSquaddieAttributeSheet {
        return OutOfBattleSquaddieAttributeSheetService.new({
            id: CampaignTestHarnessWithLockedDeploymentIds.zaya
                .attributeSheetId,
            maxHitPoints: 5,
            movement: { movementPointsPerAction: 2 },
            attributeScores: {
                [AttributeScore.BODY]: 0,
                [AttributeScore.MIND]: 0,
                [AttributeScore.SOUL]: 1,
            },
        })
    }

    private static createValeOutOfBattleSquaddie(): OutOfBattleSquaddie {
        return OutOfBattleSquaddieService.new({
            id: CampaignTestHarnessWithLockedDeploymentIds.vale
                .outOfBattleSquaddieId,
            name: "Vale",
            attributeSheetId:
                CampaignTestHarnessWithLockedDeploymentIds.vale
                    .attributeSheetId,
            affiliation: SquaddieAffiliation.PLAYER,
        })
    }

    private static createOttoOutOfBattleSquaddie(): OutOfBattleSquaddie {
        return OutOfBattleSquaddieService.new({
            id: CampaignTestHarnessWithLockedDeploymentIds.otto
                .outOfBattleSquaddieId,
            name: "Otto",
            attributeSheetId:
                CampaignTestHarnessWithLockedDeploymentIds.otto
                    .attributeSheetId,
            affiliation: SquaddieAffiliation.PLAYER,
        })
    }

    private static createZayaOutOfBattleSquaddie(): OutOfBattleSquaddie {
        return OutOfBattleSquaddieService.new({
            id: CampaignTestHarnessWithLockedDeploymentIds.zaya
                .outOfBattleSquaddieId,
            name: "Zaya",
            attributeSheetId:
                CampaignTestHarnessWithLockedDeploymentIds.zaya
                    .attributeSheetId,
            affiliation: SquaddieAffiliation.PLAYER,
        })
    }

    private static createArmyManager(): ArmyManager {
        const armyManager = new ArmyManager(ArmyService.new())
        armyManager.addOrUpdate(
            CampaignTestHarness.createLiniCampaignSquaddie()
        )
        armyManager.addOrUpdate(
            CampaignTestHarnessWithLockedDeployment.createValeCampaignSquaddie()
        )
        armyManager.addOrUpdate(
            CampaignTestHarnessWithLockedDeployment.createOttoCampaignSquaddie()
        )
        armyManager.addOrUpdate(
            CampaignTestHarnessWithLockedDeployment.createZayaCampaignSquaddie()
        )
        return armyManager
    }

    private static createOutOfBattleSquaddieManager(): OutOfBattleSquaddieManager {
        const outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
            OutOfBattleSquaddieCollectionService.new(),
            OutOfBattleSquaddieAttributeSheetCollectionService.new()
        )

        outOfBattleSquaddieManager.addOrUpdateAttributeSheet(
            CampaignTestHarness.createLiniAttributeSheet()
        )
        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            CampaignTestHarness.createLiniOutOfBattleSquaddie()
        )

        outOfBattleSquaddieManager.addOrUpdateAttributeSheet(
            CampaignTestHarnessWithLockedDeployment.createValeAttributeSheet()
        )
        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            CampaignTestHarnessWithLockedDeployment.createValeOutOfBattleSquaddie()
        )

        outOfBattleSquaddieManager.addOrUpdateAttributeSheet(
            CampaignTestHarnessWithLockedDeployment.createOttoAttributeSheet()
        )
        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            CampaignTestHarnessWithLockedDeployment.createOttoOutOfBattleSquaddie()
        )

        outOfBattleSquaddieManager.addOrUpdateAttributeSheet(
            CampaignTestHarnessWithLockedDeployment.createZayaAttributeSheet()
        )
        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            CampaignTestHarnessWithLockedDeployment.createZayaOutOfBattleSquaddie()
        )

        return outOfBattleSquaddieManager
    }

    private static createCoordinateMapCollectionManager(): CoordinateMapCollectionManager {
        const coordinateMapCollectionManager =
            new CoordinateMapCollectionManager(
                CoordinateMapCollectionService.new()
            )
        coordinateMapCollectionManager.addOrUpdate({
            map: CoordinateMapService.new({
                id: CampaignTestHarnessWithLockedDeploymentIds.mapId,
                name: CampaignTestHarnessWithLockedDeploymentIds.mapName,
                movementProperties: ["1 1 1 ", "1 1 1 "],
            }),
        })
        return coordinateMapCollectionManager
    }

    private static createSquaddieActionManager(): SquaddieActionManager {
        const squaddieActionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )
        squaddieActionManager.addOrUpdate(
            CampaignTestHarness.createScimitarAction()
        )
        SquaddieActionService.defaultActions().forEach((squaddieAction) =>
            squaddieActionManager.addOrUpdate(squaddieAction)
        )
        return squaddieActionManager
    }

    private static createCoordinateCollection(): CampaignSquaddieDeploymentCoordinateCollection {
        let coordinateCollection =
            CampaignSquaddieDeploymentCoordinateCollectionService.new()

        coordinateCollection =
            CampaignSquaddieDeploymentCoordinateCollectionService.addOrUpdate({
                collection: coordinateCollection,
                campaignSquaddieDeploymentCoordinate:
                    CampaignSquaddieDeploymentCoordinateService.new({
                        id: CampaignTestHarnessWithLockedDeploymentIds.lini
                            .leaderCoordinateId,
                        coordinate: { row: 0, col: 0 },
                        request: { type: "LEADER" },
                        locked: true,
                    }),
            })

        coordinateCollection =
            CampaignSquaddieDeploymentCoordinateCollectionService.addOrUpdate({
                collection: coordinateCollection,
                campaignSquaddieDeploymentCoordinate:
                    CampaignSquaddieDeploymentCoordinateService.new({
                        id: CampaignTestHarnessWithLockedDeploymentIds.vale
                            .coordinateId,
                        coordinate: { row: 0, col: 1 },
                        request: {
                            type: "SPECIFIC_SQUADDIE",
                            campaignSquaddieId:
                                CampaignTestHarnessWithLockedDeploymentIds.vale
                                    .campaignSquaddieId,
                        },
                        locked: true,
                    }),
            })

        coordinateCollection =
            CampaignSquaddieDeploymentCoordinateCollectionService.addOrUpdate({
                collection: coordinateCollection,
                campaignSquaddieDeploymentCoordinate:
                    CampaignSquaddieDeploymentCoordinateService.new({
                        id: CampaignTestHarnessWithLockedDeploymentIds.openCoordinateId,
                        coordinate: { row: 0, col: 2 },
                        request: { type: "NONE" },
                    }),
            })

        return coordinateCollection
    }
}
