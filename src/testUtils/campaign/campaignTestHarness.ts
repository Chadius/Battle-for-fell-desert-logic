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
import {
    HowToDetermineDegreeOfSuccess,
    type SquaddieAction,
    SquaddieActionService,
} from "../../squaddieAction/squaddieAction.js"
import { SquaddieAffiliation } from "../../affiliation/affiliation.js"
import { AttributeScore } from "../../proficiency/attributeScore.js"
import { ProficiencyType } from "../../proficiency/proficiencyLevel.js"
import { ActionRange } from "../../squaddieAction/actionRange.js"
import { DegreeOfSuccess } from "../../degreesOfSuccess/degreeOfSuccess.js"
import { CoordinateGeneratorShape } from "../../coordinateMap/shape.js"
import type { RollGenerator } from "../../squaddieAction/calculate/roll/rollGenerator.js"
import type { MissionObjective } from "../../mission/missionObjective.js"

export const CampaignTestHarnessIds = {
    mapId: "campaign-test-harness-map",
    mapName: "Campaign Test Harness Map",
    missionStateId: "campaign-test-harness-mission",
    lini: {
        campaignSquaddieId: "lini",
        outOfBattleSquaddieId: "lini",
        attributeSheetId: "lini-attribute-sheet",
        scimitarActionId: "lini-scimitar",
        coordinateId: "slot-lini",
    },
    rem: {
        campaignSquaddieId: "rem",
        outOfBattleSquaddieId: "rem",
        attributeSheetId: "rem-attribute-sheet",
        healActionId: "rem-heal",
    },
    openCoordinateId: "slot-open",
} as const

export class CampaignTestHarness extends MissionEngine {
    constructor({
        objectives = [],
        rollGenerator,
    }: {
        objectives?: MissionObjective[]
        rollGenerator?: RollGenerator
    } = {}) {
        super(
            CampaignTestHarness.createMissionManager(objectives),
            rollGenerator
        )
    }

    private static createMissionManager(
        objectives: MissionObjective[]
    ): MissionManager {
        const armyManager = CampaignTestHarness.createArmyManager()
        const outOfBattleSquaddieManager =
            CampaignTestHarness.createOutOfBattleSquaddieManager()
        const inBattleSquaddieManager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            outOfBattleSquaddieManager
        )
        const coordinateMapCollectionManager =
            CampaignTestHarness.createCoordinateMapCollectionManager()
        const squaddieActionManager =
            CampaignTestHarness.createSquaddieActionManager()
        const coordinateCollection =
            CampaignTestHarness.createCoordinateCollection()

        const missionState = MissionStateService.new({
            id: CampaignTestHarnessIds.missionStateId,
            mapId: CampaignTestHarnessIds.mapId,
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

    static createLiniCampaignSquaddie(): CampaignSquaddie {
        return CampaignSquaddieService.new({
            id: CampaignTestHarnessIds.lini.campaignSquaddieId,
            outOfBattleAttributeSheetId:
                CampaignTestHarnessIds.lini.attributeSheetId,
            outOfBattleSquaddieId:
                CampaignTestHarnessIds.lini.outOfBattleSquaddieId,
            name: "Lini",
            isLeader: true,
        })
    }

    private static createRemCampaignSquaddie(): CampaignSquaddie {
        return CampaignSquaddieService.new({
            id: CampaignTestHarnessIds.rem.campaignSquaddieId,
            outOfBattleAttributeSheetId:
                CampaignTestHarnessIds.rem.attributeSheetId,
            outOfBattleSquaddieId:
                CampaignTestHarnessIds.rem.outOfBattleSquaddieId,
            name: "Rem",
        })
    }

    static createLiniAttributeSheet(): OutOfBattleSquaddieAttributeSheet {
        return OutOfBattleSquaddieAttributeSheetService.new({
            id: CampaignTestHarnessIds.lini.attributeSheetId,
            maxHitPoints: 5,
            movement: { movementPointsPerAction: 2 },
            attributeScores: {
                [AttributeScore.BODY]: 1,
                [AttributeScore.MIND]: 0,
                [AttributeScore.SOUL]: 1,
            },
        })
    }

    private static createRemAttributeSheet(): OutOfBattleSquaddieAttributeSheet {
        return OutOfBattleSquaddieAttributeSheetService.new({
            id: CampaignTestHarnessIds.rem.attributeSheetId,
            maxHitPoints: 5,
            movement: { movementPointsPerAction: 2 },
            attributeScores: {
                [AttributeScore.BODY]: 0,
                [AttributeScore.MIND]: 1,
                [AttributeScore.SOUL]: 1,
            },
        })
    }

    static createLiniOutOfBattleSquaddie(): OutOfBattleSquaddie {
        return OutOfBattleSquaddieService.new({
            id: CampaignTestHarnessIds.lini.outOfBattleSquaddieId,
            name: "Lini",
            attributeSheetId: CampaignTestHarnessIds.lini.attributeSheetId,
            affiliation: SquaddieAffiliation.PLAYER,
            actionIds: [CampaignTestHarnessIds.lini.scimitarActionId],
        })
    }

    private static createRemOutOfBattleSquaddie(): OutOfBattleSquaddie {
        return OutOfBattleSquaddieService.new({
            id: CampaignTestHarnessIds.rem.outOfBattleSquaddieId,
            name: "Rem",
            attributeSheetId: CampaignTestHarnessIds.rem.attributeSheetId,
            affiliation: SquaddieAffiliation.PLAYER,
            actionIds: [CampaignTestHarnessIds.rem.healActionId],
        })
    }

    private static createArmyManager(): ArmyManager {
        const armyManager = new ArmyManager(ArmyService.new())
        armyManager.addOrUpdate(
            CampaignTestHarness.createLiniCampaignSquaddie()
        )
        armyManager.addOrUpdate(CampaignTestHarness.createRemCampaignSquaddie())
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
            CampaignTestHarness.createRemAttributeSheet()
        )
        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            CampaignTestHarness.createRemOutOfBattleSquaddie()
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
                id: CampaignTestHarnessIds.mapId,
                name: CampaignTestHarnessIds.mapName,
                movementProperties: ["1 1", "1 1"],
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
        squaddieActionManager.addOrUpdate(
            CampaignTestHarness.createHealAction()
        )
        return squaddieActionManager
    }

    private static createScimitarAction(): SquaddieAction {
        return SquaddieActionService.new({
            id: CampaignTestHarnessIds.lini.scimitarActionId,
            name: "Scimitar",
            attribute: AttributeScore.BODY,
            proficiency: ProficiencyType.WEAPON_MARTIAL,
            range: ActionRange.MELEE,
            shape: CoordinateGeneratorShape.BLOOM,
            affiliationRelationship: {
                self: false,
                foe: true,
                friend: false,
            },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: { spent: 1 },
                },
            },
            effectOnTarget: {
                [DegreeOfSuccess.FAILURE]: {},
                [DegreeOfSuccess.SUCCESS]: {
                    damage: {
                        raw: 2,
                        targetProficiency: ProficiencyType.ARMOR,
                    },
                },
                [DegreeOfSuccess.CRITICAL]: {
                    damage: {
                        raw: 4,
                        targetProficiency: ProficiencyType.ARMOR,
                    },
                },
            },
        })
    }

    private static createHealAction(): SquaddieAction {
        return SquaddieActionService.new({
            id: CampaignTestHarnessIds.rem.healActionId,
            name: "Heal",
            attribute: AttributeScore.SOUL,
            proficiency: ProficiencyType.SKILL_SOUL,
            range: ActionRange.MELEE,
            shape: CoordinateGeneratorShape.BLOOM,
            affiliationRelationship: {
                self: true,
                foe: false,
                friend: true,
            },
            howToDetermineDegreeOfSuccess:
                HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: { spent: 1 },
                },
            },
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    healing: { raw: 2 },
                },
            },
        })
    }

    private static createCoordinateCollection(): CampaignSquaddieDeploymentCoordinateCollection {
        let coordinateCollection =
            CampaignSquaddieDeploymentCoordinateCollectionService.new()
        coordinateCollection =
            CampaignSquaddieDeploymentCoordinateCollectionService.addOrUpdate({
                collection: coordinateCollection,
                campaignSquaddieDeploymentCoordinate:
                    CampaignSquaddieDeploymentCoordinateService.new({
                        id: CampaignTestHarnessIds.lini.coordinateId,
                        coordinate: { row: 0, col: 0 },
                        request: {
                            type: "SPECIFIC_SQUADDIE",
                            campaignSquaddieId:
                                CampaignTestHarnessIds.lini.campaignSquaddieId,
                        },
                    }),
            })
        coordinateCollection =
            CampaignSquaddieDeploymentCoordinateCollectionService.addOrUpdate({
                collection: coordinateCollection,
                campaignSquaddieDeploymentCoordinate:
                    CampaignSquaddieDeploymentCoordinateService.new({
                        id: CampaignTestHarnessIds.openCoordinateId,
                        coordinate: { row: 0, col: 1 },
                        request: { type: "NONE" },
                    }),
            })
        return coordinateCollection
    }
}
