import { MissionManager } from "../../mission/missionManager"
import { MissionStateService } from "../../mission/missionState"
import { CoordinateMapCollectionManager } from "../../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../../coordinateMap/coordinateMapCollection"
import { CoordinateMapService } from "../../coordinateMap/coordinateMap"
import type { BattleSquaddieId } from "../../squaddie/inBattle/battleSquaddieId"
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
    HowToDetermineDegreeOfSuccess,
    MovementEffectType,
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
    demonSquaddieIds: BattleSquaddieId[]
} {
    const coordinateMapCollectionManager =
        createCoordinateMapCollectionManager()
    const squaddieActionManager = createSquaddieActionManager()
    const outOfBattleSquaddieManager = createOutOfBattleSquaddieManager()

    const { inBattleSquaddieManager, fractaSquaddieId, demonSquaddieIds } =
        createInBattleSquaddieManager(outOfBattleSquaddieManager)

    const missionState = MissionStateService.new({
        id: MovementTestMissionIds.missionStateId,
        mapId: MovementTestMissionIds.mapId,
        objectives: createMissionObjectives(),
    })

    const missionManager = new MissionManager({
        missionState,
        inBattleSquaddieManager,
        coordinateMapCollectionManager,
        squaddieActionManager,
    })

    addSquaddiesToMap({
        coordinateMapCollectionManager,
        fractaSquaddieId,
        demonSquaddieIds,
    })

    return {
        missionManager,
        fractaSquaddieId,
        demonSquaddieIds,
    }
}

// 7×7 map with a pit cluster at rows 1–2, cols 3–4.
// The pits divide the map into left and right halves so Fracta can demonstrate her Leap.
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
    // Win by defeating all enemies; lose if all players are KO'd.
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
    manager.addOrUpdate(createDemonBiteAction())
    manager.addOrUpdate(SquaddieActionService.defaultMove())
    manager.addOrUpdate(SquaddieActionService.defaultEndTurn())

    return manager
}

// Fracta's basic melee attack with an axe.
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

    // Two demons flanking Fracta across the pit cluster.
    const demonSquaddieIds: BattleSquaddieId[] = []
    for (let i = 0; i < 2; i++) {
        const demonId = manager.createNewSquaddie({
            outOfBattleSquaddieId:
                MovementTestMissionIds.slitherDemon.outOfBattleSquaddieId,
        })
        demonSquaddieIds.push(demonId)
    }

    return {
        inBattleSquaddieManager: manager,
        fractaSquaddieId,
        demonSquaddieIds,
    }
}

function addSquaddiesToMap({
    coordinateMapCollectionManager,
    fractaSquaddieId,
    demonSquaddieIds,
}: {
    coordinateMapCollectionManager: CoordinateMapCollectionManager
    fractaSquaddieId: BattleSquaddieId
    demonSquaddieIds: BattleSquaddieId[]
}): void {
    // Fracta starts on the left side of the pit cluster.
    coordinateMapCollectionManager.addSquaddie({
        mapId: MovementTestMissionIds.mapId,
        squaddieId: fractaSquaddieId,
        coordinate: { row: 2, col: 2 },
    })

    // Demons start on the right side of the pit cluster, across from Fracta.
    const demonCoordinates = [
        { row: 1, col: 5 },
        { row: 2, col: 5 },
    ]

    for (let i = 0; i < demonSquaddieIds.length; i++) {
        coordinateMapCollectionManager.addSquaddie({
            mapId: MovementTestMissionIds.mapId,
            squaddieId: demonSquaddieIds[i],
            coordinate: demonCoordinates[i],
        })
    }
}
