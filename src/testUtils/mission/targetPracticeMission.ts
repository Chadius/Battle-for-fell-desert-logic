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

export const ValeAndGloriaMissionIds = {
    mapId: "target-practice-map-id",
    mapName: "Target Practice",
    missionStateId: "targetPracticeMissionId",
    vale: {
        outOfBattleSquaddieId: "vale",
        attributeSheetId: "vale-attribute-sheet",
        lightningBoltActionId: "vale-lightning-bolt",
        daggerActionId: "vale-dagger",
        intimidatingGlareActionId: "vale-intimidating-glare",
    },
    gloria: {
        outOfBattleSquaddieId: "gloria",
        attributeSheetId: "gloria-attribute-sheet",
        longswordActionId: "gloria-longsword",
        shieldActionId: "gloria-shield",
        sweepActionId: "gloria-sweep",
    },
    slitherDemon: {
        outOfBattleSquaddieId: "slither-demon-v2",
        attributeSheetId: "slither-demon-v2-attribute-sheet",
        biteActionId: "slither-demon-v2-bite",
    },
    objectives: {
        defeatAllEnemies: "vg-missionObjectiveDefeatAllEnemies",
        defeatAllPlayers: "vg-missionObjectiveDefeatAllPlayers",
    },
} as const

export function createTargetPracticeMission(): MissionManager {
    const coordinateMapCollectionManager =
        createCoordinateMapCollectionManager()
    const squaddieActionManager = createSquaddieActionManager()
    const outOfBattleSquaddieManager = createOutOfBattleSquaddieManager()

    const { inBattleSquaddieManager } = createInBattleSquaddieManager(
        outOfBattleSquaddieManager
    )

    const missionState = MissionStateService.new({
        id: ValeAndGloriaMissionIds.missionStateId,
        mapId: ValeAndGloriaMissionIds.mapId,
        objectives: createMissionObjectives(),
        deployments: {
            required: [
                MissionDeploymentService.new({
                    id: "vale",
                    outOfBattleSquaddieId:
                        ValeAndGloriaMissionIds.vale.outOfBattleSquaddieId,
                    coordinates: [{ row: 2, col: 3 }],
                }),
                MissionDeploymentService.new({
                    id: "gloria",
                    outOfBattleSquaddieId:
                        ValeAndGloriaMissionIds.gloria.outOfBattleSquaddieId,
                    coordinates: [{ row: 3, col: 0 }],
                }),
                MissionDeploymentService.new({
                    id: "demons",
                    outOfBattleSquaddieId:
                        ValeAndGloriaMissionIds.slitherDemon
                            .outOfBattleSquaddieId,
                    coordinates: [
                        { row: 2, col: 6 },
                        { row: 2, col: 7 },
                        { row: 2, col: 8 },
                        { row: 2, col: 9 },
                    ],
                }),
            ],
        },
    })

    return new MissionManager({
        missionState,
        inBattleSquaddieManager,
        coordinateMapCollectionManager,
        squaddieActionManager,
    })
}

function createCoordinateMapCollectionManager(): CoordinateMapCollectionManager {
    const movementProperties = [
        "1 1 1 1 1 1 2 2 2 2",
        " 1 1 1 X X 2 2 2 2 2",
        "1 1 1 1 - 1 2 2 2 2",
        " 1 1 1 X X 2 2 2 2 2",
        "1 1 1 1 1 1 2 2 2 2",
    ]

    const coordinateMap = CoordinateMapService.new({
        id: ValeAndGloriaMissionIds.mapId,
        name: ValeAndGloriaMissionIds.mapName,
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
        id: ValeAndGloriaMissionIds.objectives.defeatAllEnemies,
        rewards: [MissionObjectiveRewardService.newMissionEndsReward()],
        criteria: [
            MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria({
                affiliations: [SquaddieAffiliation.ENEMY],
            }),
        ],
    })

    const defeatAllPlayers = MissionObjectiveService.new({
        id: ValeAndGloriaMissionIds.objectives.defeatAllPlayers,
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

    manager.addOrUpdate(createLightningBoltAction())
    manager.addOrUpdate(createDaggerStabAction())
    manager.addOrUpdate(createIntimidatingGlareAction())
    manager.addOrUpdate(createLongswordAction())
    manager.addOrUpdate(createShieldAction())
    manager.addOrUpdate(createSweepAction())
    manager.addOrUpdate(createDemonBiteAction())
    manager.addOrUpdate(SquaddieActionService.defaultMove())
    manager.addOrUpdate(SquaddieActionService.defaultEndTurn())

    return manager
}

function createLightningBoltAction(): SquaddieAction {
    return SquaddieActionService.new({
        id: ValeAndGloriaMissionIds.vale.lightningBoltActionId,
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

function createDaggerStabAction(): SquaddieAction {
    return SquaddieActionService.new({
        id: ValeAndGloriaMissionIds.vale.daggerActionId,
        name: "Dagger Stab",
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

function createIntimidatingGlareAction(): SquaddieAction {
    return SquaddieActionService.new({
        id: ValeAndGloriaMissionIds.vale.intimidatingGlareActionId,
        name: "Intimidating Glare",
        attribute: AttributeScore.MIND,
        proficiency: ProficiencyType.SKILL_MIND,
        range: ActionRange.SHORT,
        shape: CoordinateGeneratorShape.BLOOM,
        affiliationRelationship: {
            self: false,
            foe: true,
            friend: false,
        },
        howToDetermineDegreeOfSuccess:
            HowToDetermineDegreeOfSuccess.ACTOR_ROLLS_TO_HIT,
        effectOnActor: {
            [DegreeOfSuccess.CRITICAL]: {
                actionPoints: { spent: 1 },
            },
            [DegreeOfSuccess.SUCCESS]: {
                actionPoints: { spent: 1 },
            },
        },
        effectOnTarget: {
            [DegreeOfSuccess.CRITICAL]: {
                conditions: {
                    add: [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.FRIGHTENED,
                            amount: { amount: 2 },
                            duration: {
                                duration: 2,
                                decaysAt: SquaddieConditionDecaysAt.TURN_END,
                            },
                            source: SquaddieConditionSource.SPIRITUAL,
                        }),
                    ],
                },
            },
            [DegreeOfSuccess.SUCCESS]: {
                conditions: {
                    add: [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.FRIGHTENED,
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
            [DegreeOfSuccess.FAILURE]: {},
        },
    })
}

function createLongswordAction(): SquaddieAction {
    return SquaddieActionService.new({
        id: ValeAndGloriaMissionIds.gloria.longswordActionId,
        name: "Longsword",
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

function createShieldAction(): SquaddieAction {
    return SquaddieActionService.new({
        id: ValeAndGloriaMissionIds.gloria.shieldActionId,
        name: "Shield",
        attribute: AttributeScore.BODY,
        proficiency: ProficiencyType.SKILL_BODY,
        range: ActionRange.SELF,
        shape: CoordinateGeneratorShape.BLOOM,
        affiliationRelationship: {
            self: true,
            foe: false,
            friend: false,
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
                conditions: {
                    add: [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.ARMOR,
                            amount: { amount: 1 },
                            duration: {
                                duration: 1,
                                decaysAt: SquaddieConditionDecaysAt.TURN_START,
                            },
                            source: SquaddieConditionSource.ITEM,
                        }),
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.ABSORB,
                            amount: { amount: 1 },
                            duration: {
                                duration: 1,
                                decaysAt: SquaddieConditionDecaysAt.TURN_START,
                            },
                            source: SquaddieConditionSource.ITEM,
                        }),
                    ],
                },
            },
        },
    })
}

function createSweepAction(): SquaddieAction {
    return SquaddieActionService.new({
        id: ValeAndGloriaMissionIds.gloria.sweepActionId,
        name: "Sweep",
        attribute: AttributeScore.BODY,
        proficiency: ProficiencyType.WEAPON_MARTIAL,
        range: ActionRange.MELEE,
        shape: CoordinateGeneratorShape.LINE,
        areaOfEffectSize: 1,
        aimCoordinateRequiresTarget: false,
        affiliationRelationship: {
            self: false,
            foe: true,
            friend: false,
        },
        effectOnActor: {
            [DegreeOfSuccess.SUCCESS]: {
                actionPoints: { spent: 2 },
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

function createDemonBiteAction(): SquaddieAction {
    return SquaddieActionService.new({
        id: ValeAndGloriaMissionIds.slitherDemon.biteActionId,
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

    const valeAttributeSheet = OutOfBattleSquaddieAttributeSheetService.new({
        id: ValeAndGloriaMissionIds.vale.attributeSheetId,
        maxHitPoints: 4,
        movement: {
            movementPointsPerAction: 2,
            skipOverPits: true,
            reduceMoveCosts: true,
        },
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
        id: ValeAndGloriaMissionIds.vale.outOfBattleSquaddieId,
        name: "Vale",
        attributeSheetId: ValeAndGloriaMissionIds.vale.attributeSheetId,
        actionIds: [
            ValeAndGloriaMissionIds.vale.lightningBoltActionId,
            ValeAndGloriaMissionIds.vale.intimidatingGlareActionId,
            ValeAndGloriaMissionIds.vale.daggerActionId,
        ],
        affiliation: SquaddieAffiliation.PLAYER,
    })
    manager.addOrUpdateSquaddie(valeSquaddie)

    const gloriaAttributeSheet = OutOfBattleSquaddieAttributeSheetService.new({
        id: ValeAndGloriaMissionIds.gloria.attributeSheetId,
        maxHitPoints: 6,
        movement: {
            movementPointsPerAction: 2,
        },
        attributeScores: {
            [AttributeScore.BODY]: 2,
            [AttributeScore.MIND]: -1,
            [AttributeScore.SOUL]: 1,
        },
        proficiencyLevels: {
            [ProficiencyType.WEAPON_MARTIAL]: ProficiencyLevel.EXPERT,
            [ProficiencyType.ARMOR]: ProficiencyLevel.EXPERT,
        },
        rank: 1,
    })
    manager.addOrUpdateAttributeSheet(gloriaAttributeSheet)

    const gloriaSquaddie = OutOfBattleSquaddieService.new({
        id: ValeAndGloriaMissionIds.gloria.outOfBattleSquaddieId,
        name: "Gloria",
        attributeSheetId: ValeAndGloriaMissionIds.gloria.attributeSheetId,
        actionIds: [
            ValeAndGloriaMissionIds.gloria.longswordActionId,
            ValeAndGloriaMissionIds.gloria.shieldActionId,
            ValeAndGloriaMissionIds.gloria.sweepActionId,
        ],
        affiliation: SquaddieAffiliation.PLAYER,
    })
    manager.addOrUpdateSquaddie(gloriaSquaddie)

    const demonAttributeSheet = OutOfBattleSquaddieAttributeSheetService.new({
        id: ValeAndGloriaMissionIds.slitherDemon.attributeSheetId,
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
        id: ValeAndGloriaMissionIds.slitherDemon.outOfBattleSquaddieId,
        name: "Slither Demon",
        attributeSheetId: ValeAndGloriaMissionIds.slitherDemon.attributeSheetId,
        actionIds: [ValeAndGloriaMissionIds.slitherDemon.biteActionId],
        affiliation: SquaddieAffiliation.ENEMY,
    })
    manager.addOrUpdateSquaddie(demonSquaddie)

    return manager
}

function createInBattleSquaddieManager(
    outOfBattleSquaddieManager: OutOfBattleSquaddieManager
): {
    inBattleSquaddieManager: InBattleSquaddieManager
    valeSquaddieId: BattleSquaddieId
    gloriaSquaddieId: BattleSquaddieId
    demonSquaddieIds: BattleSquaddieId[]
} {
    const manager = new InBattleSquaddieManager(
        InBattleSquaddieCollectionService.new(),
        outOfBattleSquaddieManager
    )

    const valeSquaddieId = manager.createNewSquaddie({
        outOfBattleSquaddieId:
            ValeAndGloriaMissionIds.vale.outOfBattleSquaddieId,
    })

    const gloriaSquaddieId = manager.createNewSquaddie({
        outOfBattleSquaddieId:
            ValeAndGloriaMissionIds.gloria.outOfBattleSquaddieId,
    })

    const demonSquaddieIds: BattleSquaddieId[] = []
    for (let i = 0; i < 4; i++) {
        const demonId = manager.createNewSquaddie({
            outOfBattleSquaddieId:
                ValeAndGloriaMissionIds.slitherDemon.outOfBattleSquaddieId,
        })
        demonSquaddieIds.push(demonId)
    }

    return {
        inBattleSquaddieManager: manager,
        valeSquaddieId,
        gloriaSquaddieId,
        demonSquaddieIds,
    }
}
