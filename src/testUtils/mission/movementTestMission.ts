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
import { MissionDeploymentService } from "../../mission/missionDeployment"

export const MovementTestMissionIds = {
    mapId: "movement-test-map-id",
    mapName: "Movement Test",
    missionStateId: "movementTestMissionId",
    fracta: {
        outOfBattleSquaddieId: "fracta",
        attributeSheetId: "fracta-attribute-sheet",
        axeStrikeActionId: "fracta-axe-strike",
        leapActionId: "fracta-leap",
    },
    vale: {
        outOfBattleSquaddieId: "vale-movement-test",
        attributeSheetId: "vale-movement-test-attribute-sheet",
        rescueActionId: "vale-mt-rescue",
        gravityPullActionId: "vale-mt-gravity-pull",
    },
    slitherDemon: {
        outOfBattleSquaddieId: "slither-demon-v3",
        attributeSheetId: "slither-demon-v3-attribute-sheet",
        biteActionId: "slither-demon-v3-bite",
    },
    objectives: {
        defeatAllEnemies: "mt-missionObjectiveDefeatAllEnemies",
        defeatAllPlayers: "mt-missionObjectiveDefeatAllPlayers",
    },
} as const

export function createMovementTestMission(): {
    missionManager: MissionManager
    fractaSquaddieId: BattleSquaddieId
    valeSquaddieId: BattleSquaddieId
    demonSquaddieIds: BattleSquaddieId[]
} {
    const coordinateMapCollectionManager =
        createCoordinateMapCollectionManager()
    const squaddieActionManager = createSquaddieActionManager()
    const outOfBattleSquaddieManager = createOutOfBattleSquaddieManager()

    const {
        inBattleSquaddieManager,
        fractaSquaddieId,
        valeSquaddieId,
        demonSquaddieIds,
    } = createInBattleSquaddieManager(outOfBattleSquaddieManager)

    const missionState = MissionStateService.new({
        id: MovementTestMissionIds.missionStateId,
        mapId: MovementTestMissionIds.mapId,
        objectives: createMissionObjectives(),
        deployments: {
            required: [
                MissionDeploymentService.new({
                    id: "fracta",
                    outOfBattleSquaddieId:
                        MovementTestMissionIds.fracta.outOfBattleSquaddieId,
                    coordinates: [{ row: 2, col: 2 }],
                }),
                MissionDeploymentService.new({
                    id: "vale",
                    outOfBattleSquaddieId:
                        MovementTestMissionIds.vale.outOfBattleSquaddieId,
                    coordinates: [{ row: 5, col: 1 }],
                }),
                MissionDeploymentService.new({
                    id: "slither-demons",
                    outOfBattleSquaddieId:
                        MovementTestMissionIds.slitherDemon
                            .outOfBattleSquaddieId,
                    coordinates: [
                        { row: 1, col: 5 },
                        { row: 2, col: 5 },
                        { row: 5, col: 0 },
                        { row: 4, col: 4 },
                    ],
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

    return {
        missionManager,
        fractaSquaddieId,
        valeSquaddieId,
        demonSquaddieIds,
    }
}

function createCoordinateMapCollectionManager(): CoordinateMapCollectionManager {
    const movementProperties = [
        "1 1 1 1 1 1 1",
        " 1 1 - - 1 1 1",
        "1 1 1 - - 1 1",
        " 1 1 1 1 1 1 1",
        "1 1 1 1 1 1 1",
        " 1 1 1 1 1 1 1",
        "1 1 1 1 1 1 1",
    ]

    const coordinateMap = CoordinateMapService.new({
        id: MovementTestMissionIds.mapId,
        name: MovementTestMissionIds.mapName,
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
        id: MovementTestMissionIds.objectives.defeatAllEnemies,
        rewards: [MissionObjectiveRewardService.newMissionEndsReward()],
        criteria: [
            MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria({
                affiliations: [SquaddieAffiliation.ENEMY],
            }),
        ],
    })

    const defeatAllPlayers = MissionObjectiveService.new({
        id: MovementTestMissionIds.objectives.defeatAllPlayers,
        rewards: [MissionObjectiveRewardService.newMissionFailureReward()],
        criteria: [
            MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria({
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

    manager.addOrUpdate(createAxeStrikeAction())
    manager.addOrUpdate(createLeapAction())
    manager.addOrUpdate(createRescueAction())
    manager.addOrUpdate(createGravityPullAction())
    manager.addOrUpdate(createDemonBiteAction())
    manager.addOrUpdate(SquaddieActionService.defaultMove())
    manager.addOrUpdate(SquaddieActionService.defaultEndTurn())

    return manager
}

function createAxeStrikeAction(): SquaddieAction {
    return SquaddieActionService.new({
        id: MovementTestMissionIds.fracta.axeStrikeActionId,
        name: "Axe Strike",
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
                    raw: 3,
                    targetProficiency: ProficiencyType.ARMOR,
                },
            },
            [DegreeOfSuccess.CRITICAL]: {
                damage: {
                    raw: 5,
                    targetProficiency: ProficiencyType.ARMOR,
                },
            },
        },
    })
}

// Fracta leaps to an actor-chosen destination, skipping over pits.
// Costs 2 AP. Movement range is based on 1 action point of movement budget.
function createLeapAction(): SquaddieAction {
    return SquaddieActionService.new({
        id: MovementTestMissionIds.fracta.leapActionId,
        name: "Leap",
        howToDetermineDegreeOfSuccess:
            HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
        range: ActionRange.SELF,
        shape: CoordinateGeneratorShape.BLOOM,
        affiliationRelationship: {
            self: true,
            foe: false,
            friend: false,
        },
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
}

// Vale teleports a friend within MEDIUM range to a destination within MELEE range of herself.
function createRescueAction(): SquaddieAction {
    return SquaddieActionService.new({
        id: MovementTestMissionIds.vale.rescueActionId,
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

// Vale pulls all foes within 5 tiles toward her.
// Enemies make a DEFEND_MIND saving throw (derived from SKILL_MIND proficiency).
// On FAILURE the enemy is pulled 2 tiles closer; on SUCCESS they resist.
function createGravityPullAction(): SquaddieAction {
    return SquaddieActionService.new({
        id: MovementTestMissionIds.vale.gravityPullActionId,
        name: "Gravity Pull",
        attribute: AttributeScore.MIND,
        proficiency: ProficiencyType.SKILL_MIND,
        range: ActionRange.SELF,
        shape: CoordinateGeneratorShape.BLOOM,
        areaOfEffectSize: 5,
        affiliationRelationship: {
            self: false,
            foe: true,
            friend: false,
        },
        aimCoordinateRequiresTarget: false,
        howToDetermineDegreeOfSuccess:
            HowToDetermineDegreeOfSuccess.TARGETS_ROLL_TO_RESIST,
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: {
                actionPoints: { spent: 2 },
            },
        },
        effectOnTarget: {
            // Enemy succeeded their saving throw — no effect
            [DegreeOfSuccess.SUCCESS]: {},
            // Enemy failed their saving throw — pulled 2 tiles toward Vale
            [DegreeOfSuccess.FAILURE]: {
                movement: {
                    movementType: MovementEffectType.FORCED_TOWARD_ACTOR,
                    forcedDistance: 2,
                },
            },
        },
    })
}

// Standard enemy melee bite used by Slither Demon v3.
function createDemonBiteAction(): SquaddieAction {
    return SquaddieActionService.new({
        id: MovementTestMissionIds.slitherDemon.biteActionId,
        name: "Bite",
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
                    raw: 2,
                    targetProficiency: ProficiencyType.ARMOR,
                },
            },
            [DegreeOfSuccess.CRITICAL]: {
                damage: {
                    raw: 3,
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

    // Fracta: high Body (+2), low Mind (-1), average Soul (0). Fast mover (3 tiles/AP).
    const fractaAttributeSheet = OutOfBattleSquaddieAttributeSheetService.new({
        id: MovementTestMissionIds.fracta.attributeSheetId,
        maxHitPoints: 5,
        movement: {
            movementPointsPerAction: 3,
        },
        attributeScores: {
            [AttributeScore.BODY]: 2,
            [AttributeScore.MIND]: -1,
            [AttributeScore.SOUL]: 0,
        },
        proficiencyLevels: {
            [ProficiencyType.WEAPON_MARTIAL]: ProficiencyLevel.EXPERT,
        },
        rank: 1,
    })
    manager.addOrUpdateAttributeSheet(fractaAttributeSheet)

    const fractaSquaddie = OutOfBattleSquaddieService.new({
        id: MovementTestMissionIds.fracta.outOfBattleSquaddieId,
        name: "Fracta",
        attributeSheetId: MovementTestMissionIds.fracta.attributeSheetId,
        actionIds: [
            MovementTestMissionIds.fracta.axeStrikeActionId,
            MovementTestMissionIds.fracta.leapActionId,
        ],
        affiliation: SquaddieAffiliation.PLAYER,
    })
    manager.addOrUpdateSquaddie(fractaSquaddie)

    // Vale: high Mind (+2), average Body (0), average Soul (0). Rescue and Gravity Pull caster.
    const valeAttributeSheet = OutOfBattleSquaddieAttributeSheetService.new({
        id: MovementTestMissionIds.vale.attributeSheetId,
        maxHitPoints: 4,
        movement: {
            movementPointsPerAction: 2,
        },
        attributeScores: {
            [AttributeScore.BODY]: 0,
            [AttributeScore.MIND]: 2,
            [AttributeScore.SOUL]: 0,
        },
        proficiencyLevels: {
            [ProficiencyType.SKILL_MIND]: ProficiencyLevel.EXPERT,
        },
        rank: 1,
    })
    manager.addOrUpdateAttributeSheet(valeAttributeSheet)

    const valeSquaddie = OutOfBattleSquaddieService.new({
        id: MovementTestMissionIds.vale.outOfBattleSquaddieId,
        name: "Vale",
        attributeSheetId: MovementTestMissionIds.vale.attributeSheetId,
        actionIds: [
            MovementTestMissionIds.vale.rescueActionId,
            MovementTestMissionIds.vale.gravityPullActionId,
        ],
        affiliation: SquaddieAffiliation.PLAYER,
    })
    manager.addOrUpdateSquaddie(valeSquaddie)

    // Slither Demon v3: average Body, low Mind and Soul.
    const demonAttributeSheet = OutOfBattleSquaddieAttributeSheetService.new({
        id: MovementTestMissionIds.slitherDemon.attributeSheetId,
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
        id: MovementTestMissionIds.slitherDemon.outOfBattleSquaddieId,
        name: "Slither Demon",
        attributeSheetId: MovementTestMissionIds.slitherDemon.attributeSheetId,
        actionIds: [MovementTestMissionIds.slitherDemon.biteActionId],
        affiliation: SquaddieAffiliation.ENEMY,
    })
    manager.addOrUpdateSquaddie(demonSquaddie)

    return manager
}

function createInBattleSquaddieManager(
    outOfBattleSquaddieManager: OutOfBattleSquaddieManager
): {
    inBattleSquaddieManager: InBattleSquaddieManager
    fractaSquaddieId: BattleSquaddieId
    valeSquaddieId: BattleSquaddieId
    demonSquaddieIds: BattleSquaddieId[]
} {
    const manager = new InBattleSquaddieManager(
        InBattleSquaddieCollectionService.new(),
        outOfBattleSquaddieManager
    )

    const fractaSquaddieId = manager.createNewSquaddie({
        outOfBattleSquaddieId:
            MovementTestMissionIds.fracta.outOfBattleSquaddieId,
    })

    const valeSquaddieId = manager.createNewSquaddie({
        outOfBattleSquaddieId:
            MovementTestMissionIds.vale.outOfBattleSquaddieId,
    })

    const demonSquaddieIds: BattleSquaddieId[] = []
    for (let i = 0; i < 4; i++) {
        const demonId = manager.createNewSquaddie({
            outOfBattleSquaddieId:
                MovementTestMissionIds.slitherDemon.outOfBattleSquaddieId,
        })
        demonSquaddieIds.push(demonId)
    }

    return {
        inBattleSquaddieManager: manager,
        fractaSquaddieId,
        valeSquaddieId,
        demonSquaddieIds,
    }
}

export function serializeMissionState(): SerializedMissionState {
    const missionState = MissionStateService.new({
        id: MovementTestMissionIds.missionStateId,
        mapId: MovementTestMissionIds.mapId,
        objectives: createMissionObjectives(),
        deployments: {
            required: [
                MissionDeploymentService.new({
                    id: "fracta",
                    outOfBattleSquaddieId:
                        MovementTestMissionIds.fracta.outOfBattleSquaddieId,
                    coordinates: [{ row: 2, col: 2 }],
                }),
                MissionDeploymentService.new({
                    id: "vale",
                    outOfBattleSquaddieId:
                        MovementTestMissionIds.vale.outOfBattleSquaddieId,
                    coordinates: [{ row: 5, col: 1 }],
                }),
                MissionDeploymentService.new({
                    id: "slither-demons",
                    outOfBattleSquaddieId:
                        MovementTestMissionIds.slitherDemon
                            .outOfBattleSquaddieId,
                    coordinates: [
                        { row: 1, col: 5 },
                        { row: 2, col: 5 },
                        { row: 5, col: 0 },
                        { row: 4, col: 4 },
                    ],
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
