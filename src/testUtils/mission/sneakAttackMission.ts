import { MissionManager } from "../../mission/missionManager"
import {
    MissionStateService,
    type SerializedMissionState,
} from "../../mission/missionState"
import { CoordinateMapCollectionManager } from "../../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../../coordinateMap/coordinateMapCollection"
import {
    CoordinateMapService,
    type SerializedCoordinateMap,
} from "../../coordinateMap/coordinateMap"
import type { BattleSquaddieId } from "../../squaddie/inBattle/battleSquaddieId"
import { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../../squaddie/inBattle/inBattleSquaddieCollection"
import { OutOfBattleSquaddieManager } from "../../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { OutOfBattleSquaddieCollectionService } from "../../squaddie/outOfBattle/outOfBattleSquaddieCollection"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection"
import {
    OutOfBattleSquaddieAttributeSheetService,
    type SerializedOutOfBattleSquaddieAttributeSheet,
} from "../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet"
import {
    OutOfBattleSquaddieService,
    type SerializedOutOfBattleSquaddie,
} from "../../squaddie/outOfBattle/outOfBattleSquaddie"
import { SquaddieActionManager } from "../../squaddieAction/squaddieActionManager"
import { SquaddieActionCollectionService } from "../../squaddieAction/squaddieActionCollection"
import {
    HowToDetermineDegreeOfSuccess,
    MovementEffectType,
    type SerializedSquaddieAction,
    type SquaddieAction,
    SquaddieActionService,
} from "../../squaddieAction/squaddieAction"
import { SquaddieAffiliation } from "../../affiliation/affiliation"
import { AttributeScore } from "../../proficiency/attributeScore"
import {
    ProficiencyLevel,
    ProficiencyType,
} from "../../proficiency/proficiencyLevel"
import { ActionRange } from "../../squaddieAction/actionRange"
import { DegreeOfSuccess } from "../../degreesOfSuccess/degreeOfSuccess"
import { CoordinateGeneratorShape } from "../../coordinateMap/shape"
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
import { MissionDeploymentService } from "../../mission/missionDeployment"

export const SneakAttackMissionIds = {
    mapId: "sneak-attack-map-id",
    mapName: "Sneak Attack Test",
    missionStateId: "sneakAttackMissionId",
    lini: {
        outOfBattleSquaddieId: "lini-sneak",
        attributeSheetId: "lini-sneak-attribute-sheet",
        scimitarActionId: "lini-sneak-scimitar",
        healActionId: "lini-sneak-heal",
        solarSphereActionId: "lini-sneak-solar-sphere",
    },
    vale: {
        outOfBattleSquaddieId: "vale-sneak",
        attributeSheetId: "vale-sneak-attribute-sheet",
        daggerActionId: "vale-sneak-dagger",
        lightningBoltActionId: "vale-sneak-lightning-bolt",
        rescueActionId: "vale-sneak-rescue",
    },
    demon: {
        outOfBattleSquaddieId: "goblin-grunt",
        attributeSheetId: "goblin-grunt-attribute-sheet",
        clawActionId: "goblin-grunt-claw",
    },
    objectives: {
        defeatAllEnemies: "sneak-missionObjectiveDefeatAllEnemies",
        defeatAllPlayers: "sneak-missionObjectiveDefeatAllPlayers",
    },
} as const

export function createSneakAttackMission(): {
    missionManager: MissionManager
    liniSquaddieId: BattleSquaddieId
    valeSquaddieId: BattleSquaddieId
    demonSquaddieId: BattleSquaddieId
} {
    const coordinateMapCollectionManager =
        createCoordinateMapCollectionManager()
    const squaddieActionManager = createSquaddieActionManager()
    const outOfBattleSquaddieManager = createOutOfBattleSquaddieManager()

    const {
        inBattleSquaddieManager,
        liniSquaddieId,
        valeSquaddieId,
        demonSquaddieId,
    } = createInBattleSquaddieManager(outOfBattleSquaddieManager)

    const missionState = MissionStateService.new({
        id: SneakAttackMissionIds.missionStateId,
        mapId: SneakAttackMissionIds.mapId,
        objectives: createMissionObjectives(),
        deployments: {
            required: [
                MissionDeploymentService.new({
                    id: "lini",
                    outOfBattleSquaddieId:
                        SneakAttackMissionIds.lini.outOfBattleSquaddieId,
                    coordinates: [{ row: 1, col: 0 }],
                }),
                MissionDeploymentService.new({
                    id: "vale",
                    outOfBattleSquaddieId:
                        SneakAttackMissionIds.vale.outOfBattleSquaddieId,
                    coordinates: [{ row: 1, col: 2 }],
                }),
                MissionDeploymentService.new({
                    id: "demon",
                    outOfBattleSquaddieId:
                        SneakAttackMissionIds.demon.outOfBattleSquaddieId,
                    coordinates: [{ row: 1, col: 1 }],
                }),
            ],
        },
    })

    const missionManager = new MissionManager({
        missionState,
        inBattleSquaddieManager,
        coordinateMapCollectionManager,
        squaddieActionManager,
    })
    missionManager.deployRequiredSquaddies()
    return { missionManager, liniSquaddieId, valeSquaddieId, demonSquaddieId }
}

function createCoordinateMapCollectionManager(): CoordinateMapCollectionManager {
    // 3 rows × 5 cols, all walkable cost-1 tiles.
    // Lini (1,0) — Demon (1,1) — Vale (1,2): a straight horizontal line that
    // creates flanking in both directions (LEFT and RIGHT are hex opposites).
    const movementProperties = ["1 1 1 1 1", " 1 1 1 1 1", "1 1 1 1 1"]

    const coordinateMap = CoordinateMapService.new({
        id: SneakAttackMissionIds.mapId,
        name: SneakAttackMissionIds.mapName,
        movementProperties,
    })

    const manager = new CoordinateMapCollectionManager(
        CoordinateMapCollectionService.new()
    )
    manager.addOrUpdate({ map: coordinateMap })
    return manager
}

function createMissionObjectives(): MissionObjective[] {
    const defeatAllEnemies = MissionObjectiveService.new({
        id: SneakAttackMissionIds.objectives.defeatAllEnemies,
        rewards: [MissionObjectiveRewardService.newMissionEndsReward()],
        criteria: [
            MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria({
                affiliations: [SquaddieAffiliation.ENEMY],
            }),
        ],
    })

    const defeatAllPlayers = MissionObjectiveService.new({
        id: SneakAttackMissionIds.objectives.defeatAllPlayers,
        rewards: [MissionObjectiveRewardService.newMissionFailureReward()],
        criteria: [
            MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria({
                affiliations: [SquaddieAffiliation.PLAYER],
            }),
        ],
    })

    return [defeatAllEnemies, defeatAllPlayers]
}

function createSquaddieActionManager(): SquaddieActionManager {
    const manager = new SquaddieActionManager(
        SquaddieActionCollectionService.new()
    )

    manager.addOrUpdate(createScimitarAction())
    manager.addOrUpdate(createHealAction())
    manager.addOrUpdate(createSolarSphereAction())
    manager.addOrUpdate(createDaggerAction())
    manager.addOrUpdate(createLightningBoltAction())
    manager.addOrUpdate(createRescueAction())
    manager.addOrUpdate(createClawAction())
    manager.addOrUpdate(SquaddieActionService.defaultMove())
    manager.addOrUpdate(SquaddieActionService.defaultEndTurn())

    return manager
}

// Lini's melee weapon. Her passive sneakAttackDamage=1 adds +1 on weapon hits
// when the demon is flanked or has OFF_GUARD — no sneakAttackDamage on the action itself.
function createScimitarAction(): SquaddieAction {
    return SquaddieActionService.new({
        id: SneakAttackMissionIds.lini.scimitarActionId,
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

function createHealAction(): SquaddieAction {
    return SquaddieActionService.new({
        id: SneakAttackMissionIds.lini.healActionId,
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
                healing: {
                    raw: 2,
                },
            },
        },
    })
}

function createSolarSphereAction(): SquaddieAction {
    return SquaddieActionService.new({
        id: SneakAttackMissionIds.lini.solarSphereActionId,
        name: "Solar Sphere",
        attribute: AttributeScore.SOUL,
        proficiency: ProficiencyType.SKILL_SOUL,
        range: ActionRange.MEDIUM,
        shape: CoordinateGeneratorShape.BLOOM,
        areaOfEffectSize: 0,
        aimCoordinateRequiresTarget: true,
        affiliationRelationship: {
            self: false,
            foe: true,
            friend: false,
        },
        howToDetermineDegreeOfSuccess:
            HowToDetermineDegreeOfSuccess.TARGETS_ROLL_TO_RESIST,
        multipleAttackPenalty: { applies: false, contribution: 0 },
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: {
                actionPoints: { spent: 2 },
            },
        },
        effectOnTarget: {
            [DegreeOfSuccess.CRITICAL]: {},
            [DegreeOfSuccess.SUCCESS]: {
                damage: {
                    raw: 1,
                    targetProficiency: ProficiencyType.SKILL_SOUL,
                },
            },
            [DegreeOfSuccess.FAILURE]: {
                damage: {
                    raw: 2,
                    targetProficiency: ProficiencyType.SKILL_SOUL,
                },
                conditions: {
                    add: [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.SLOWED,
                            amount: { amount: 1 },
                            duration: {
                                duration: 1,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                            source: SquaddieConditionSource.SPIRITUAL,
                        }),
                    ],
                },
            },
            [DegreeOfSuccess.BOTCH]: {
                damage: {
                    raw: 4,
                    targetProficiency: ProficiencyType.SKILL_SOUL,
                },
                conditions: {
                    add: [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.SLOWED,
                            amount: { amount: 3 },
                            duration: {
                                duration: 1,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                            source: SquaddieConditionSource.SPIRITUAL,
                        }),
                    ],
                },
            },
        },
    })
}

// Vale's melee weapon. sneakAttackDamage is on the action itself (not passive).
function createDaggerAction(): SquaddieAction {
    return SquaddieActionService.new({
        id: SneakAttackMissionIds.vale.daggerActionId,
        name: "Dagger",
        attribute: AttributeScore.BODY,
        proficiency: ProficiencyType.WEAPON_SIMPLE,
        range: ActionRange.MELEE,
        shape: CoordinateGeneratorShape.BLOOM,
        areaOfEffectSize: 0,
        aimCoordinateRequiresTarget: true,
        affiliationRelationship: {
            self: false,
            foe: true,
            friend: false,
        },
        howToDetermineDegreeOfSuccess:
            HowToDetermineDegreeOfSuccess.ACTOR_ROLLS_TO_HIT,
        degreesOfSuccess: [
            DegreeOfSuccess.SUCCESS,
            DegreeOfSuccess.CRITICAL,
            DegreeOfSuccess.FAILURE,
        ],
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: {
                actionPoints: { spent: 1 },
            },
        },
        effectOnTarget: {
            [DegreeOfSuccess.CRITICAL]: {
                damage: {
                    raw: 2,
                    targetProficiency: ProficiencyType.ARMOR,
                    sneakAttackDamage: 2,
                },
            },
            [DegreeOfSuccess.SUCCESS]: {
                damage: {
                    raw: 1,
                    targetProficiency: ProficiencyType.ARMOR,
                    sneakAttackDamage: 1,
                },
            },
            [DegreeOfSuccess.FAILURE]: {},
        },
    })
}

function createLightningBoltAction(): SquaddieAction {
    return SquaddieActionService.new({
        id: SneakAttackMissionIds.vale.lightningBoltActionId,
        name: "Lightning Bolt",
        attribute: AttributeScore.MIND,
        proficiency: ProficiencyType.SKILL_MIND,
        range: ActionRange.LONG,
        shape: CoordinateGeneratorShape.LINE,
        areaOfEffectSize: 0,
        aimCoordinateRequiresTarget: true,
        affiliationRelationship: {
            self: false,
            foe: true,
            friend: false,
        },
        howToDetermineDegreeOfSuccess:
            HowToDetermineDegreeOfSuccess.ACTOR_ROLLS_TO_HIT,
        degreesOfSuccess: [DegreeOfSuccess.SUCCESS, DegreeOfSuccess.FAILURE],
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
            [DegreeOfSuccess.FAILURE]: {},
        },
    })
}

// Vale teleports a friend within MEDIUM range to a destination within MELEE range of herself.
function createRescueAction(): SquaddieAction {
    return SquaddieActionService.new({
        id: SneakAttackMissionIds.vale.rescueActionId,
        name: "Rescue",
        howToDetermineDegreeOfSuccess:
            HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
        range: ActionRange.MEDIUM,
        shape: CoordinateGeneratorShape.BLOOM,
        affiliationRelationship: {
            self: false,
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
                movement: {
                    movementType: MovementEffectType.TELEPORT_TO_ACTOR_CHOSEN,
                    destinationRange: ActionRange.MELEE,
                },
            },
        },
    })
}

function createClawAction(): SquaddieAction {
    return SquaddieActionService.new({
        id: SneakAttackMissionIds.demon.clawActionId,
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
        },
    })
}

function createOutOfBattleSquaddieManager(): OutOfBattleSquaddieManager {
    const manager = new OutOfBattleSquaddieManager(
        OutOfBattleSquaddieCollectionService.new(),
        OutOfBattleSquaddieAttributeSheetCollectionService.new()
    )

    const liniAttributeSheet = OutOfBattleSquaddieAttributeSheetService.new({
        id: SneakAttackMissionIds.lini.attributeSheetId,
        maxHitPoints: 5,
        movement: { movementPointsPerAction: 2 },
        attributeScores: {
            [AttributeScore.BODY]: 1,
            [AttributeScore.MIND]: 0,
            [AttributeScore.SOUL]: 1,
        },
        rank: 1,
        sneakAttackDamage: 1,
    })
    manager.addOrUpdateAttributeSheet(liniAttributeSheet)

    const liniSquaddie = OutOfBattleSquaddieService.new({
        id: SneakAttackMissionIds.lini.outOfBattleSquaddieId,
        name: "Lini",
        attributeSheetId: SneakAttackMissionIds.lini.attributeSheetId,
        actionIds: [
            SneakAttackMissionIds.lini.scimitarActionId,
            SneakAttackMissionIds.lini.healActionId,
            SneakAttackMissionIds.lini.solarSphereActionId,
        ],
        affiliation: SquaddieAffiliation.PLAYER,
    })
    manager.addOrUpdateSquaddie(liniSquaddie)

    const valeAttributeSheet = OutOfBattleSquaddieAttributeSheetService.new({
        id: SneakAttackMissionIds.vale.attributeSheetId,
        maxHitPoints: 4,
        movement: { movementPointsPerAction: 2 },
        attributeScores: {
            [AttributeScore.BODY]: -1,
            [AttributeScore.MIND]: 2,
            [AttributeScore.SOUL]: 1,
        },
        proficiencyLevels: {
            [ProficiencyType.SKILL_MIND]: ProficiencyLevel.EXPERT,
        },
        rank: 1,
    })
    manager.addOrUpdateAttributeSheet(valeAttributeSheet)

    const valeSquaddie = OutOfBattleSquaddieService.new({
        id: SneakAttackMissionIds.vale.outOfBattleSquaddieId,
        name: "Vale",
        attributeSheetId: SneakAttackMissionIds.vale.attributeSheetId,
        actionIds: [
            SneakAttackMissionIds.vale.daggerActionId,
            SneakAttackMissionIds.vale.lightningBoltActionId,
            SneakAttackMissionIds.vale.rescueActionId,
        ],
        affiliation: SquaddieAffiliation.PLAYER,
    })
    manager.addOrUpdateSquaddie(valeSquaddie)

    const demonAttributeSheet = OutOfBattleSquaddieAttributeSheetService.new({
        id: SneakAttackMissionIds.demon.attributeSheetId,
        maxHitPoints: 3,
        movement: { movementPointsPerAction: 2 },
        attributeScores: {
            [AttributeScore.BODY]: 0,
            [AttributeScore.MIND]: -1,
            [AttributeScore.SOUL]: -1,
        },
        rank: 0,
    })
    manager.addOrUpdateAttributeSheet(demonAttributeSheet)

    const demonSquaddie = OutOfBattleSquaddieService.new({
        id: SneakAttackMissionIds.demon.outOfBattleSquaddieId,
        name: "Goblin Grunt",
        attributeSheetId: SneakAttackMissionIds.demon.attributeSheetId,
        actionIds: [SneakAttackMissionIds.demon.clawActionId],
        affiliation: SquaddieAffiliation.ENEMY,
    })
    manager.addOrUpdateSquaddie(demonSquaddie)

    return manager
}

function createInBattleSquaddieManager(
    outOfBattleSquaddieManager: OutOfBattleSquaddieManager
): {
    inBattleSquaddieManager: InBattleSquaddieManager
    liniSquaddieId: BattleSquaddieId
    valeSquaddieId: BattleSquaddieId
    demonSquaddieId: BattleSquaddieId
} {
    const manager = new InBattleSquaddieManager(
        InBattleSquaddieCollectionService.new(),
        outOfBattleSquaddieManager
    )

    const liniSquaddieId = manager.createNewSquaddie({
        outOfBattleSquaddieId: SneakAttackMissionIds.lini.outOfBattleSquaddieId,
    })

    const valeSquaddieId = manager.createNewSquaddie({
        outOfBattleSquaddieId: SneakAttackMissionIds.vale.outOfBattleSquaddieId,
    })

    const demonSquaddieId = manager.createNewSquaddie({
        outOfBattleSquaddieId:
            SneakAttackMissionIds.demon.outOfBattleSquaddieId,
    })

    return {
        inBattleSquaddieManager: manager,
        liniSquaddieId,
        valeSquaddieId,
        demonSquaddieId,
    }
}

export function serializeMissionState(): SerializedMissionState {
    const missionState = MissionStateService.new({
        id: SneakAttackMissionIds.missionStateId,
        mapId: SneakAttackMissionIds.mapId,
        objectives: createMissionObjectives(),
        deployments: {
            required: [
                MissionDeploymentService.new({
                    id: "lini",
                    outOfBattleSquaddieId:
                        SneakAttackMissionIds.lini.outOfBattleSquaddieId,
                    coordinates: [{ row: 1, col: 0 }],
                }),
                MissionDeploymentService.new({
                    id: "vale",
                    outOfBattleSquaddieId:
                        SneakAttackMissionIds.vale.outOfBattleSquaddieId,
                    coordinates: [{ row: 1, col: 2 }],
                }),
                MissionDeploymentService.new({
                    id: "demon",
                    outOfBattleSquaddieId:
                        SneakAttackMissionIds.demon.outOfBattleSquaddieId,
                    coordinates: [{ row: 1, col: 1 }],
                }),
            ],
        },
    })
    return MissionStateService.serialize(missionState)
}

export function serializeSquaddies(): SerializedOutOfBattleSquaddie[] {
    return createOutOfBattleSquaddieManager().serializeSquaddies()
}

export function serializeAttributeSheets(): SerializedOutOfBattleSquaddieAttributeSheet[] {
    return createOutOfBattleSquaddieManager().serializeAttributeSheets()
}

export function serializeMaps(): SerializedCoordinateMap[] {
    return createCoordinateMapCollectionManager().serialize()
}

export function serializeActions(): SerializedSquaddieAction[] {
    return createSquaddieActionManager().serialize()
}
