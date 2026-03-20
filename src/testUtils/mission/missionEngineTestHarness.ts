import { MissionEngine } from "../../mission/missionEngine/missionEngine"
import { MissionManager } from "../../mission/missionManager"
import { MissionStateService } from "../../mission/missionState"
import { CoordinateMapCollectionManager } from "../../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../../coordinateMap/coordinateMapCollection"
import { CoordinateMapService } from "../../coordinateMap/coordinateMap"
import type { BattleSquaddieId } from "../../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../../squaddie/inBattle/inBattleSquaddieCollection"
import { OutOfBattleSquaddieManager } from "../../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { OutOfBattleSquaddieCollectionService } from "../../squaddie/outOfBattle/outOfBattleSquaddieCollection"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection"
import { OutOfBattleSquaddieAttributeSheetService } from "../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet"
import { OutOfBattleSquaddieService } from "../../squaddie/outOfBattle/outOfBattleSquaddie"
import { SquaddieActionManager } from "../../squaddieAction/squaddieActionManager"
import { SquaddieActionCollectionService } from "../../squaddieAction/squaddieActionCollection"
import {
    type SquaddieAction,
    SquaddieActionService,
} from "../../squaddieAction/squaddieAction"
import { SquaddieAffiliation } from "../../affiliation/affiliation"
import { AttributeScore } from "../../proficiency/attributeScore"
import { ProficiencyType } from "../../proficiency/proficiencyLevel"
import { ActionRange } from "../../squaddieAction/actionRange"
import { DegreeOfSuccess } from "../../degreesOfSuccess/degreeOfSuccess"
import { CoordinateGeneratorShape } from "../../coordinateMap/shape"
import type { RollGenerator } from "../../squaddieAction/calculate/roll/rollGenerator"
import {
    type MissionObjective,
    MissionObjectiveService,
} from "../../mission/missionObjective"
import { MissionObjectiveRewardService } from "../../mission/missionObjectiveReward"
import { MissionObjectiveCriteriaService } from "../../mission/missionObjectiveCriteria"
import {
    SquaddieConditionDecaysAt,
    SquaddieConditionService,
    SquaddieConditionSource,
    SquaddieConditionType,
} from "../../proficiency/squaddieCondition"

export const MissionEngineTestHarnessIds = {
    mapId: "test-harness-map",
    missionStateId: "test-harness-mission",
    lini: {
        outOfBattleSquaddieId: "lini",
        attributeSheetId: "lini-attribute-sheet",
        scimitarActionId: "lini-scimitar",
        blessingActionId: "lini-blessing",
        healActionId: "lini-heal",
        solarSphereActionId: "lini-solar-sphere",
    },
    slitherDemon: {
        outOfBattleSquaddieId: "slither-demon",
        attributeSheetId: "slither-demon-attribute-sheet",
        clawActionId: "slither-demon-claw",
    },
    objectives: {
        defeatAllEnemies: "missionObjectiveDefeatAllEnemies",
        defeatAllPlayers: "missionObjectiveDefeatAllPlayers",
    },
} as const

interface TestMissionSetup {
    missionManager: MissionManager
    liniSquaddieId: BattleSquaddieId
    slitherDemonSquaddieId: BattleSquaddieId
}

export class MissionEngineTestHarness extends MissionEngine {
    private readonly liniSquaddieId: BattleSquaddieId
    private readonly slitherDemonSquaddieId: BattleSquaddieId

    constructor(rollGenerator?: RollGenerator) {
        const { missionManager, liniSquaddieId, slitherDemonSquaddieId } =
            MissionEngineTestHarness.createTestMissionSetup()
        super(missionManager, rollGenerator)
        this.liniSquaddieId = liniSquaddieId
        this.slitherDemonSquaddieId = slitherDemonSquaddieId
        this.addSquaddiesToMap()
    }

    private static createTestMissionSetup(): TestMissionSetup {
        const coordinateMapCollectionManager =
            MissionEngineTestHarness.createCoordinateMapCollectionManager()
        const squaddieActionManager =
            MissionEngineTestHarness.createSquaddieActionManager()
        const outOfBattleSquaddieManager =
            MissionEngineTestHarness.createOutOfBattleSquaddieManager()
        const {
            inBattleSquaddieManager,
            liniSquaddieId,
            slitherDemonSquaddieId,
        } = MissionEngineTestHarness.createInBattleSquaddieManager(
            outOfBattleSquaddieManager
        )

        const missionState = MissionStateService.new({
            id: MissionEngineTestHarnessIds.missionStateId,
            mapId: MissionEngineTestHarnessIds.mapId,
            objectives: this.createMissionObjectives(),
        })

        const missionManager = new MissionManager({
            missionState,
            inBattleSquaddieManager,
            coordinateMapCollectionManager,
            squaddieActionManager,
        })

        return {
            missionManager,
            liniSquaddieId,
            slitherDemonSquaddieId,
        }
    }

    private static readonly createMissionObjectives =
        (): MissionObjective[] => {
            const missionObjectiveDefeatAllEnemies: MissionObjective =
                MissionObjectiveService.new({
                    id: "missionObjectiveDefeatAllEnemies",
                    rewards: [
                        MissionObjectiveRewardService.newMissionEndsReward(),
                    ],
                    criteria: [
                        MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                            {
                                affiliations: [SquaddieAffiliation.ENEMY],
                            }
                        ),
                    ],
                })

            const missionObjectiveDefeatAllPlayers: MissionObjective =
                MissionObjectiveService.new({
                    id: "missionObjectiveDefeatAllPlayers",
                    rewards: [
                        MissionObjectiveRewardService.newMissionFailureReward(),
                    ],
                    criteria: [
                        MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                            {
                                affiliations: [SquaddieAffiliation.PLAYER],
                            }
                        ),
                    ],
                })
            return [
                missionObjectiveDefeatAllEnemies,
                missionObjectiveDefeatAllPlayers,
            ]
        }

    private static createCoordinateMapCollectionManager(): CoordinateMapCollectionManager {
        const movementProperties = [
            "1 1 2 1 1",
            " 1 - 1 X 1",
            "1 1 1 1 2",
            " 2 1 - 1 1",
        ]

        const coordinateMap = CoordinateMapService.new({
            id: MissionEngineTestHarnessIds.mapId,
            name: "Test Harness Map",
            movementProperties,
        })

        const manager = new CoordinateMapCollectionManager(
            CoordinateMapCollectionService.new()
        )
        manager.addOrUpdate({ map: coordinateMap })
        return manager
    }

    private static createSquaddieActionManager(): SquaddieActionManager {
        const manager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )

        manager.addOrUpdate(MissionEngineTestHarness.createScimitarAction())
        manager.addOrUpdate(MissionEngineTestHarness.createBlessingAction())
        manager.addOrUpdate(MissionEngineTestHarness.createHealAction())
        manager.addOrUpdate(MissionEngineTestHarness.createSolarSphereAction())
        manager.addOrUpdate(MissionEngineTestHarness.createClawAction())
        manager.addOrUpdate(SquaddieActionService.defaultMove())
        manager.addOrUpdate(SquaddieActionService.defaultEndTurn())

        return manager
    }

    private static createScimitarAction(): SquaddieAction {
        return SquaddieActionService.new({
            id: MissionEngineTestHarnessIds.lini.scimitarActionId,
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

    private static createBlessingAction(): SquaddieAction {
        return SquaddieActionService.new({
            id: MissionEngineTestHarnessIds.lini.blessingActionId,
            name: "Blessing",
            attribute: AttributeScore.SOUL,
            proficiency: ProficiencyType.SKILL_SOUL,
            range: ActionRange.SHORT,
            shape: CoordinateGeneratorShape.BLOOM,
            affiliationRelationship: {
                self: true,
                foe: false,
                friend: true,
            },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: { spent: 2 },
                },
            },
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    conditions: {
                        add: [
                            SquaddieConditionService.new({
                                type: SquaddieConditionType.ARMOR,
                                amount: 1,
                                duration: {
                                    duration: 2,
                                    decaysAt:
                                        SquaddieConditionDecaysAt.TURN_END,
                                },
                                source: SquaddieConditionSource.SPIRITUAL,
                            }),
                        ],
                    },
                },
            },
        })
    }

    private static createHealAction(): SquaddieAction {
        return SquaddieActionService.new({
            id: MissionEngineTestHarnessIds.lini.healActionId,
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
            actorRollsToHit: false,
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: { spent: 1 },
                },
            },
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    healing: {
                        raw: 2,
                    },
                },
            },
        })
    }

    private static createSolarSphereAction(): SquaddieAction {
        return SquaddieActionService.new({
            id: MissionEngineTestHarnessIds.lini.solarSphereActionId,
            name: "Solar Sphere",
            attribute: AttributeScore.MIND,
            proficiency: ProficiencyType.SKILL_MIND,
            range: ActionRange.MEDIUM,
            shape: CoordinateGeneratorShape.BLOOM,
            areaOfEffectSize: 1,
            targetCoordinateRequiresTarget: false,
            affiliationRelationship: {
                self: false,
                foe: true,
                friend: false,
            },
            actorRollsToHit: true,
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: { spent: 2 },
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
    }

    private static createClawAction(): SquaddieAction {
        return SquaddieActionService.new({
            id: MissionEngineTestHarnessIds.slitherDemon.clawActionId,
            name: "Claw",
            attribute: AttributeScore.BODY,
            proficiency: ProficiencyType.WEAPON_NATURAL,
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
                        raw: 1,
                        targetProficiency: ProficiencyType.ARMOR,
                    },
                },
                [DegreeOfSuccess.CRITICAL]: {
                    damage: {
                        raw: 2,
                        targetProficiency: ProficiencyType.ARMOR,
                    },
                },
            },
        })
    }

    private static createOutOfBattleSquaddieManager(): OutOfBattleSquaddieManager {
        const manager = new OutOfBattleSquaddieManager(
            OutOfBattleSquaddieCollectionService.new(),
            OutOfBattleSquaddieAttributeSheetCollectionService.new()
        )

        const liniAttributeSheet = OutOfBattleSquaddieAttributeSheetService.new(
            {
                id: MissionEngineTestHarnessIds.lini.attributeSheetId,
                maxHitPoints: 5,
                movement: {
                    distancePerAction: 2,
                },
                attributeScores: {
                    [AttributeScore.BODY]: 1,
                    [AttributeScore.MIND]: 0,
                    [AttributeScore.SOUL]: 1,
                },
                rank: 1,
            }
        )
        manager.addOrUpdateAttributeSheet(liniAttributeSheet)

        const liniSquaddie = OutOfBattleSquaddieService.new({
            id: MissionEngineTestHarnessIds.lini.outOfBattleSquaddieId,
            name: "Lini",
            attributeSheetId: MissionEngineTestHarnessIds.lini.attributeSheetId,
            actionIds: [
                MissionEngineTestHarnessIds.lini.scimitarActionId,
                MissionEngineTestHarnessIds.lini.blessingActionId,
                MissionEngineTestHarnessIds.lini.healActionId,
                MissionEngineTestHarnessIds.lini.solarSphereActionId,
            ],
            affiliation: SquaddieAffiliation.PLAYER,
        })
        manager.addOrUpdateSquaddie(liniSquaddie)

        const slitherDemonAttributeSheet =
            OutOfBattleSquaddieAttributeSheetService.new({
                id: MissionEngineTestHarnessIds.slitherDemon.attributeSheetId,
                maxHitPoints: 3,
                movement: {
                    distancePerAction: 2,
                },
                attributeScores: {
                    [AttributeScore.BODY]: 0,
                    [AttributeScore.MIND]: -1,
                    [AttributeScore.SOUL]: -1,
                },
                rank: 0,
            })
        manager.addOrUpdateAttributeSheet(slitherDemonAttributeSheet)

        const slitherDemonSquaddie = OutOfBattleSquaddieService.new({
            id: MissionEngineTestHarnessIds.slitherDemon.outOfBattleSquaddieId,
            name: "Slither Demon",
            attributeSheetId:
                MissionEngineTestHarnessIds.slitherDemon.attributeSheetId,
            actionIds: [MissionEngineTestHarnessIds.slitherDemon.clawActionId],
            affiliation: SquaddieAffiliation.ENEMY,
        })
        manager.addOrUpdateSquaddie(slitherDemonSquaddie)

        return manager
    }

    private static createInBattleSquaddieManager(
        outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    ): {
        inBattleSquaddieManager: InBattleSquaddieManager
        liniSquaddieId: BattleSquaddieId
        slitherDemonSquaddieId: BattleSquaddieId
    } {
        const manager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            outOfBattleSquaddieManager
        )

        const liniSquaddieId = manager.createNewSquaddie({
            outOfBattleSquaddieId:
                MissionEngineTestHarnessIds.lini.outOfBattleSquaddieId,
        })

        const slitherDemonSquaddieId = manager.createNewSquaddie({
            outOfBattleSquaddieId:
                MissionEngineTestHarnessIds.slitherDemon.outOfBattleSquaddieId,
        })

        return {
            inBattleSquaddieManager: manager,
            liniSquaddieId,
            slitherDemonSquaddieId,
        }
    }

    private addSquaddiesToMap(): void {
        const coordinateMapCollectionManager =
            this.missionManager!.coordinateMapCollectionManager!

        coordinateMapCollectionManager.addSquaddie({
            mapId: MissionEngineTestHarnessIds.mapId,
            squaddieId: this.liniSquaddieId,
            coordinate: { row: 0, col: 0 },
        })

        coordinateMapCollectionManager.addSquaddie({
            mapId: MissionEngineTestHarnessIds.mapId,
            squaddieId: this.slitherDemonSquaddieId,
            coordinate: { row: 3, col: 4 },
        })
    }

    getLiniSquaddieId(): BattleSquaddieId {
        return this.liniSquaddieId
    }

    getSlitherDemonSquaddieId(): BattleSquaddieId {
        return this.slitherDemonSquaddieId
    }
}
