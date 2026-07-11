import { beforeEach, describe, expect, it } from "vitest"
import {
    HowToDetermineDegreeOfSuccess,
    MovementEffectType,
    SquaddieActionService,
} from "./squaddieAction.js"
import { ActionRange } from "./actionRange.js"
import {
    DegreeOfSuccess,
    type TDegreeOfSuccess,
} from "../degreesOfSuccess/degreeOfSuccess.js"
import {
    ProficiencyLevel,
    ProficiencyType,
    type TProficiencyLevel,
    type TProficiencyType,
} from "../proficiency/proficiencyLevel.js"
import { SquaddieActionForecastCalculator } from "./calculate/forecast/squaddieActionForecastCalculator.js"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../squaddie/inBattle/inBattleSquaddieCollection.js"
import { SquaddieActionManager } from "./squaddieActionManager.js"
import { SquaddieActionCollectionService } from "./squaddieActionCollection.js"
import { OutOfBattleSquaddieTestSetup } from "../testUtils/outOfBattleSquaddieTestSetup.js"
import {
    AttributeScore,
    type AttributeScoreType,
} from "../proficiency/attributeScore.js"
import {
    SquaddieAffiliation,
    type TSquaddieAffiliation,
} from "../affiliation/affiliation.js"
import type { OutOfBattleSquaddieManager } from "../squaddie/outOfBattle/outOfBattleSquaddieManager.js"
import { OutOfBattleSquaddieService } from "../squaddie/outOfBattle/outOfBattleSquaddie.js"

describe("SquaddieActionService", () => {
    describe("degreesOfSuccess derivation from effectOnTarget", () => {
        it("derives degreesOfSuccess from effectOnTarget keys when only SUCCESS is defined", () => {
            const action = SquaddieActionService.new({
                id: "scimitar",
                name: "Scimitar",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
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

            expect(action.degreesOfSuccess).toEqual([DegreeOfSuccess.SUCCESS])
        })

        it("derives degreesOfSuccess from effectOnTarget keys when SUCCESS and FAILURE are defined", () => {
            const action = SquaddieActionService.new({
                id: "risky-attack",
                name: "Risky Attack",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: 3,
                            targetProficiency: ProficiencyType.ARMOR,
                        },
                    },
                    [DegreeOfSuccess.FAILURE]: {},
                },
            })

            const degrees = action.degreesOfSuccess as TDegreeOfSuccess[]
            expect(degrees).toContain(DegreeOfSuccess.SUCCESS)
            expect(degrees).toContain(DegreeOfSuccess.FAILURE)
            expect(degrees).not.toContain(DegreeOfSuccess.CRITICAL)
            expect(degrees).not.toContain(DegreeOfSuccess.BOTCH)
        })

        it("derives all 4 degreesOfSuccess when all 4 are defined in effectOnTarget", () => {
            const action = SquaddieActionService.new({
                id: "full-attack",
                name: "Full Attack",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.CRITICAL]: {
                        damage: {
                            raw: 4,
                            targetProficiency: ProficiencyType.ARMOR,
                        },
                    },
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: 2,
                            targetProficiency: ProficiencyType.ARMOR,
                        },
                    },
                    [DegreeOfSuccess.FAILURE]: {},
                    [DegreeOfSuccess.BOTCH]: {},
                },
            })

            expect(action.degreesOfSuccess).toContain(DegreeOfSuccess.CRITICAL)
            expect(action.degreesOfSuccess).toContain(DegreeOfSuccess.SUCCESS)
            expect(action.degreesOfSuccess).toContain(DegreeOfSuccess.FAILURE)
            expect(action.degreesOfSuccess).toContain(DegreeOfSuccess.BOTCH)
        })

        it("explicit degreesOfSuccess overrides derivation from effectOnTarget", () => {
            const action = SquaddieActionService.new({
                id: "override-action",
                name: "Override Action",
                degreesOfSuccess: [
                    DegreeOfSuccess.CRITICAL,
                    DegreeOfSuccess.SUCCESS,
                ],
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
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

            expect(action.degreesOfSuccess).toEqual([
                DegreeOfSuccess.CRITICAL,
                DegreeOfSuccess.SUCCESS,
            ])
        })

        it("defaults to [SUCCESS] when no effectOnTarget is defined (actor-only actions)", () => {
            const action = SquaddieActionService.new({
                id: "actor-only",
                name: "Actor Only",
                howToDetermineDegreeOfSuccess:
                    HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: "all" },
                    },
                },
            })

            expect(action.degreesOfSuccess).toEqual([DegreeOfSuccess.SUCCESS])
        })
    })

    describe("multipleAttackPenalty defaults", () => {
        it("weapon proficiency actions default to applies: true and contribution: 1", () => {
            const weaponProficiencies = [
                ProficiencyType.WEAPON_NATURAL,
                ProficiencyType.WEAPON_SIMPLE,
                ProficiencyType.WEAPON_MARTIAL,
            ]
            for (const proficiency of weaponProficiencies) {
                const action = SquaddieActionService.new({
                    id: "weapon-action",
                    name: "Weapon Action",
                    proficiency,
                    effectOnActor: {
                        [DegreeOfSuccess.SUCCESS]: {
                            actionPoints: { spent: 1 },
                        },
                    },
                })
                expect(action.multipleAttackPenalty.applies).toBe(true)
                expect(action.multipleAttackPenalty.contribution).toBe(1)
            }
        })

        it("non-weapon proficiency actions default to applies: false and contribution: 0", () => {
            const nonWeaponProficiencies = [
                ProficiencyType.UNKNOWN,
                ProficiencyType.SKILL_BODY,
                ProficiencyType.SKILL_MIND,
                ProficiencyType.SKILL_SOUL,
                ProficiencyType.ARMOR,
            ]
            for (const proficiency of nonWeaponProficiencies) {
                const action = SquaddieActionService.new({
                    id: "non-weapon-action",
                    name: "Non-Weapon Action",
                    proficiency,
                    effectOnActor: {
                        [DegreeOfSuccess.SUCCESS]: {
                            actionPoints: { spent: 1 },
                        },
                    },
                })
                expect(action.multipleAttackPenalty.applies).toBe(false)
                expect(action.multipleAttackPenalty.contribution).toBe(0)
            }
        })

        it("explicit contribution override is preserved alongside applies: true for weapon actions", () => {
            const action = SquaddieActionService.new({
                id: "flurry",
                name: "Flurry",
                proficiency: ProficiencyType.WEAPON_MARTIAL,
                multipleAttackPenalty: { contribution: 2 },
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 2 } },
                },
            })
            expect(action.multipleAttackPenalty.contribution).toBe(2)
            expect(action.multipleAttackPenalty.applies).toBe(true)
        })

        it("non-weapon action with explicit applies: true preserves applies: true and defaults contribution: 0", () => {
            const action = SquaddieActionService.new({
                id: "trip",
                name: "Trip",
                proficiency: ProficiencyType.SKILL_BODY,
                multipleAttackPenalty: { applies: true },
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
            })
            expect(action.multipleAttackPenalty.applies).toBe(true)
            expect(action.multipleAttackPenalty.contribution).toBe(0)
        })

        it("defaultEndTurn has applies: false and contribution: 0", () => {
            const action = SquaddieActionService.defaultEndTurn()
            expect(action.multipleAttackPenalty.applies).toBe(false)
            expect(action.multipleAttackPenalty.contribution).toBe(0)
        })

        it("defaultMove has applies: false and contribution: 0", () => {
            const action = SquaddieActionService.defaultMove()
            expect(action.multipleAttackPenalty.applies).toBe(false)
            expect(action.multipleAttackPenalty.contribution).toBe(0)
        })
    })

    describe("forecast folds CRITICAL into SUCCESS when effectOnTarget only defines SUCCESS", () => {
        let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
        let inBattleSquaddieManager: InBattleSquaddieManager
        let squaddieActionManager: SquaddieActionManager

        const createAttributeSheetWithProficiency = ({
            attributeSheetId,
            rank,
            proficiencyType,
            proficiencyLevel,
            attributeScores,
        }: {
            attributeSheetId: string
            rank: number
            proficiencyType: TProficiencyType
            proficiencyLevel: TProficiencyLevel
            attributeScores: Partial<Record<AttributeScoreType, number>>
        }) =>
            OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
                id: attributeSheetId,
                attributeScores,
                proficiencyLevels: new Map<TProficiencyType, TProficiencyLevel>(
                    [[proficiencyType, proficiencyLevel]]
                ),
                rank,
            })

        const addSquaddieToManager = ({
            attributeSheetId,
            squaddieId,
            name,
            affiliation,
            rank,
            proficiencyType,
            proficiencyLevel,
            attributeScores,
        }: {
            attributeSheetId: string
            squaddieId: string
            name: string
            affiliation: TSquaddieAffiliation
            rank: number
            proficiencyType: TProficiencyType
            proficiencyLevel: TProficiencyLevel
            attributeScores: Partial<Record<AttributeScoreType, number>>
        }) => {
            const sheet = createAttributeSheetWithProficiency({
                attributeSheetId,
                rank,
                proficiencyType,
                proficiencyLevel,
                attributeScores,
            })
            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(sheet)
            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: squaddieId,
                    name,
                    affiliation,
                    attributeSheetId,
                })
            )
        }

        beforeEach(() => {
            const setup =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet()
            outOfBattleSquaddieManager = setup.manager
            squaddieActionManager = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )
        })

        it("CRITICAL chances fold into SUCCESS when effectOnTarget only has SUCCESS", () => {
            addSquaddieToManager({
                attributeSheetId: "actor_attribute_sheet",
                squaddieId: "actor_squaddie",
                name: "Actor",
                affiliation: SquaddieAffiliation.PLAYER,
                rank: 0,
                proficiencyType: ProficiencyType.SKILL_MIND,
                proficiencyLevel: ProficiencyLevel.UNTRAINED,
                attributeScores: {
                    [AttributeScore.BODY]: 0,
                    [AttributeScore.MIND]: 0,
                    [AttributeScore.SOUL]: 0,
                },
            })

            addSquaddieToManager({
                attributeSheetId: "target_attribute_sheet",
                squaddieId: "target_squaddie",
                name: "Target",
                affiliation: SquaddieAffiliation.ENEMY,
                rank: 0,
                proficiencyType: ProficiencyType.DEFEND_MIND,
                proficiencyLevel: ProficiencyLevel.UNTRAINED,
                attributeScores: {
                    [AttributeScore.BODY]: 0,
                    [AttributeScore.MIND]: -6,
                    [AttributeScore.SOUL]: 0,
                },
            })

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            const actorId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor_squaddie",
            })
            const targetId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "target_squaddie",
            })

            const successOnlyAction = SquaddieActionService.new({
                id: "success-only-action",
                name: "Success Only",
                proficiency: ProficiencyType.SKILL_MIND,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 1 },
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

            squaddieActionManager.addOrUpdate(successOnlyAction)

            const result = SquaddieActionForecastCalculator.forecastChanceToHit(
                {
                    inBattleSquaddieManager,
                    actor: actorId,
                    targets: [targetId],
                    action: {
                        id: successOnlyAction.id,
                        manager: squaddieActionManager,
                    },
                }
            )

            const criticalKey = SquaddieActionForecastCalculator.getForecastKey(
                {
                    ...targetId,
                    degreeOfSuccess: DegreeOfSuccess.CRITICAL,
                }
            )
            const successKey = SquaddieActionForecastCalculator.getForecastKey({
                ...targetId,
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            })

            expect(result.has(criticalKey)).toBe(false)
            expect(result.get(successKey)).toBe(36)
            expect(result.size).toBe(1)
        })
    })

    describe("AoE targeting fields", () => {
        it("size defaults to 0 when not specified", () => {
            const action = SquaddieActionService.new({
                id: "no-size",
                name: "No Size",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
            })

            expect(action.targeting.areaOfEffectSize).toBe(0)
        })

        it("size is stored when specified", () => {
            const action = SquaddieActionService.new({
                id: "with-size",
                name: "With Size",
                areaOfEffectSize: 2,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
            })

            expect(action.targeting.areaOfEffectSize).toBe(2)
        })

        it("targetCoordinateRequiresTarget defaults to true when not specified", () => {
            const action = SquaddieActionService.new({
                id: "default-requires",
                name: "Default Requires",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
            })

            expect(action.targeting.aimCoordinateRequiresTarget).toBe(true)
        })

        it("targetCoordinateRequiresTarget: false is stored when specified", () => {
            const action = SquaddieActionService.new({
                id: "no-requires",
                name: "No Requires",
                aimCoordinateRequiresTarget: false,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
            })

            expect(action.targeting.aimCoordinateRequiresTarget).toBe(false)
        })
    })

    describe("howToDetermineDegreeOfSuccess", () => {
        it("defaults to ACTOR_ROLLS_TO_HIT when not specified", () => {
            const action = SquaddieActionService.new({
                id: "default-roll",
                name: "Default Roll",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
            })

            expect(action.howToDetermineDegreeOfSuccess).toBe(
                HowToDetermineDegreeOfSuccess.ACTOR_ROLLS_TO_HIT
            )
        })

        it("can be set to TARGETS_ROLL_TO_RESIST", () => {
            const action = SquaddieActionService.new({
                id: "target-rolls",
                name: "Target Rolls",
                howToDetermineDegreeOfSuccess:
                    HowToDetermineDegreeOfSuccess.TARGETS_ROLL_TO_RESIST,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
            })

            expect(action.howToDetermineDegreeOfSuccess).toBe(
                HowToDetermineDegreeOfSuccess.TARGETS_ROLL_TO_RESIST
            )
        })

        it("can be set to AUTOMATIC_SUCCESS", () => {
            const action = SquaddieActionService.new({
                id: "auto-success",
                name: "Auto Success",
                howToDetermineDegreeOfSuccess:
                    HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
            })

            expect(action.howToDetermineDegreeOfSuccess).toBe(
                HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS
            )
        })
    })
})

describe("SquaddieActionService.getRequiredDecisions", () => {
    it("default move (ACTOR_CHOSEN, self-only) requires no action decisions", () => {
        const result = SquaddieActionService.getRequiredDecisions(
            SquaddieActionService.defaultMove()
        )

        expect(result.requiresSpecificTarget).toBe(false)
        expect(result.requiresAimCoordinate).toBe(false)
        expect(result.requiresTargetDestination).toBe(false)
    })

    it("Leap (ACTOR_CHOSEN_SPECIAL_TRAVERSAL, self-only) requires a target destination", () => {
        const leap = SquaddieActionService.new({
            id: "leap",
            name: "Leap",
            howToDetermineDegreeOfSuccess:
                HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
            affiliationRelationship: { self: true, foe: false, friend: false },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: { spent: 2 },
                    movement: {
                        movementType:
                            MovementEffectType.ACTOR_CHOSEN_SPECIAL_TRAVERSAL,
                        traversal: { skipOverPits: true },
                    },
                },
            },
        })

        const result = SquaddieActionService.getRequiredDecisions(leap)

        expect(result.requiresSpecificTarget).toBe(false)
        expect(result.requiresAimCoordinate).toBe(false)
        expect(result.requiresTargetDestination).toBe(true)
    })

    it("standard attack (foe, not AOE) requires a specific target", () => {
        const attack = SquaddieActionService.new({
            id: "attack",
            name: "Attack",
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    damage: {
                        raw: 5,
                        targetProficiency: ProficiencyType.ARMOR,
                    },
                },
            },
        })

        const result = SquaddieActionService.getRequiredDecisions(attack)

        expect(result.requiresSpecificTarget).toBe(true)
        expect(result.requiresAimCoordinate).toBe(false)
        expect(result.requiresTargetDestination).toBe(false)
    })

    it("Rescue (friend, TELEPORT with MELEE destinationRange) requires specific target and target destination", () => {
        const rescue = SquaddieActionService.new({
            id: "rescue",
            name: "Rescue",
            howToDetermineDegreeOfSuccess:
                HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
            affiliationRelationship: { self: false, foe: false, friend: true },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 2 } },
            },
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    movement: {
                        movementType:
                            MovementEffectType.TELEPORT_TO_ACTOR_CHOSEN,
                        destinationRange: ActionRange.MELEE,
                    },
                },
            },
        })

        const result = SquaddieActionService.getRequiredDecisions(rescue)

        expect(result.requiresSpecificTarget).toBe(true)
        expect(result.requiresAimCoordinate).toBe(false)
        expect(result.requiresTargetDestination).toBe(true)
    })

    it("AOE pull (FORCED_TOWARD_ACTOR, areaOfEffectSize > 0) with aimCoordinateRequiresTarget false requires an aim coordinate", () => {
        const gravityPull = SquaddieActionService.new({
            id: "gravity-pull",
            name: "Gravity Pull",
            range: ActionRange.SELF,
            affiliationRelationship: { self: false, foe: true, friend: false },
            areaOfEffectSize: 5,
            aimCoordinateRequiresTarget: false,
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 2 } },
            },
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    movement: {
                        movementType: MovementEffectType.FORCED_TOWARD_ACTOR,
                        forcedDistance: 2,
                    },
                },
            },
        })

        const result = SquaddieActionService.getRequiredDecisions(gravityPull)

        expect(result.requiresSpecificTarget).toBe(false)
        expect(result.requiresAimCoordinate).toBe(true)
        expect(result.requiresTargetDestination).toBe(false)
        expect(result.actorIsAimCoordinate).toBe(true)
    })

    it("AOE with non-SELF range and aimCoordinateRequiresTarget false requires an aim coordinate but actor is not the aim", () => {
        const groundBlast = SquaddieActionService.new({
            id: "ground-blast",
            name: "Ground Blast",
            range: ActionRange.MEDIUM,
            affiliationRelationship: { self: false, foe: true, friend: false },
            areaOfEffectSize: 3,
            aimCoordinateRequiresTarget: false,
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 2 } },
            },
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    damage: {
                        raw: 3,
                        targetProficiency: ProficiencyType.ARMOR,
                        attributeScoreType: AttributeScore.MIND,
                    },
                },
            },
        })

        const result = SquaddieActionService.getRequiredDecisions(groundBlast)

        expect(result.requiresSpecificTarget).toBe(false)
        expect(result.requiresAimCoordinate).toBe(true)
        expect(result.requiresTargetDestination).toBe(false)
        expect(result.actorIsAimCoordinate).toBe(false)
    })

    it("TELEPORT with SELF destinationRange requires no target destination (target placed at actor's cell automatically)", () => {
        const selfTeleport = SquaddieActionService.new({
            id: "pull-to-self",
            name: "Pull to Self",
            howToDetermineDegreeOfSuccess:
                HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
            affiliationRelationship: { self: false, foe: false, friend: true },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    movement: {
                        movementType:
                            MovementEffectType.TELEPORT_TO_ACTOR_CHOSEN,
                        destinationRange: ActionRange.SELF,
                    },
                },
            },
        })

        const result = SquaddieActionService.getRequiredDecisions(selfTeleport)

        expect(result.requiresSpecificTarget).toBe(true)
        expect(result.requiresAimCoordinate).toBe(false)
        expect(result.requiresTargetDestination).toBe(false)
    })
})

describe("SquaddieActionService serialization", () => {
    it("round-trips a simple action with no movement or effectOnTarget", () => {
        const action = SquaddieActionService.new({
            id: "end-turn",
            name: "End Turn",
            howToDetermineDegreeOfSuccess:
                HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: { spent: "all" },
                },
            },
        })
        const serialized = SquaddieActionService.serialize(action)
        const deserialized = SquaddieActionService.deserialize(serialized)
        expect(deserialized).toEqual(action)
    })
    it("round-trips an action with effectOnTarget and all degrees", () => {
        const action = SquaddieActionService.new({
            id: "scimitar",
            name: "Scimitar",
            proficiency: ProficiencyType.WEAPON_MARTIAL,
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
            effectOnTarget: {
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
                [DegreeOfSuccess.FAILURE]: {
                    damage: {
                        raw: 0,
                        targetProficiency: ProficiencyType.ARMOR,
                    },
                },
                [DegreeOfSuccess.BOTCH]: {
                    damage: {
                        raw: 0,
                        targetProficiency: ProficiencyType.ARMOR,
                    },
                },
            },
        })
        const serialized = SquaddieActionService.serialize(action)
        const deserialized = SquaddieActionService.deserialize(serialized)
        expect(deserialized).toEqual(action)
    })
    it("round-trips ACTOR_CHOSEN movement", () => {
        const action = SquaddieActionService.defaultMove()
        const serialized = SquaddieActionService.serialize(action)
        const deserialized = SquaddieActionService.deserialize(serialized)
        expect(deserialized).toEqual(action)
    })
    it("round-trips ACTOR_CHOSEN_SPECIAL_TRAVERSAL movement", () => {
        const action = SquaddieActionService.new({
            id: "phase-walk",
            name: "Phase Walk",
            howToDetermineDegreeOfSuccess:
                HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: { spent: 1 },
                    movement: {
                        movementType:
                            MovementEffectType.ACTOR_CHOSEN_SPECIAL_TRAVERSAL,
                        traversal: {
                            moveThroughWalls: true,
                            skipOverPits: true,
                        },
                    },
                },
            },
        })
        const serialized = SquaddieActionService.serialize(action)
        const deserialized = SquaddieActionService.deserialize(serialized)
        expect(deserialized).toEqual(action)
    })
    it("round-trips TELEPORT_TO_ACTOR_CHOSEN movement", () => {
        const action = SquaddieActionService.new({
            id: "rescue",
            name: "Rescue",
            howToDetermineDegreeOfSuccess:
                HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
            affiliationRelationship: { self: false, foe: false, friend: true },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    movement: {
                        movementType:
                            MovementEffectType.TELEPORT_TO_ACTOR_CHOSEN,
                        destinationRange: ActionRange.MELEE,
                    },
                },
            },
        })
        const serialized = SquaddieActionService.serialize(action)
        const deserialized = SquaddieActionService.deserialize(serialized)
        expect(deserialized).toEqual(action)
    })
    it("round-trips FORCED_TOWARD_ACTOR movement", () => {
        const action = SquaddieActionService.new({
            id: "gravity-pull",
            name: "Gravity Pull",
            howToDetermineDegreeOfSuccess:
                HowToDetermineDegreeOfSuccess.AUTOMATIC_SUCCESS,
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    movement: {
                        movementType: MovementEffectType.FORCED_TOWARD_ACTOR,
                        forcedDistance: 3,
                    },
                },
            },
        })
        const serialized = SquaddieActionService.serialize(action)
        const deserialized = SquaddieActionService.deserialize(serialized)
        expect(deserialized).toEqual(action)
    })
    it("round-trips an action with conditions applied on target", () => {
        const action = SquaddieActionService.new({
            id: "frighten",
            name: "Frighten",
            proficiency: ProficiencyType.SKILL_SOUL,
            howToDetermineDegreeOfSuccess:
                HowToDetermineDegreeOfSuccess.ACTOR_ROLLS_TO_HIT,
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    conditions: {
                        add: [
                            {
                                type: "FRIGHTENED",
                                source: "SPIRITUAL",
                                amount: { current: 2, base: 2 },
                                limit: {
                                    duration: {
                                        duration: 2,
                                        decaysAt: "TURN_END",
                                    },
                                },
                            },
                        ],
                    },
                },
            },
        })
        const serialized = SquaddieActionService.serialize(action)
        const deserialized = SquaddieActionService.deserialize(serialized)
        expect(deserialized).toEqual(action)
    })
    it("throws with field path when id is missing", () => {
        expect(() =>
            SquaddieActionService.deserialize({
                name: "No ID",
                attribute: "BODY",
                proficiency: "ARMOR",
                howToDetermineDegreeOfSuccess: "AUTOMATIC_SUCCESS",
                degreesOfSuccess: ["SUCCESS"],
                targeting: {
                    range: "MELEE",
                    shape: "BLOOM",
                    affiliationRelationship: {
                        self: false,
                        foe: true,
                        friend: false,
                    },
                },
                multipleAttackPenalty: { applies: false, contribution: 0 },
                effectOnActor: { SUCCESS: { actionPoints: { spent: 1 } } },
            })
        ).toThrow("[SquaddieActionService.deserialize]:")
    })
    it("throws with field path when proficiency is an invalid enum value", () => {
        const action = SquaddieActionService.new({
            id: "test",
            name: "Test",
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
        })
        const serialized = SquaddieActionService.serialize(action)
        expect(() =>
            SquaddieActionService.deserialize({
                ...serialized,
                proficiency: "NOT_A_PROFICIENCY",
            })
        ).toThrow("[SquaddieActionService.deserialize]:")
    })
    it("throws with field path when movementType is invalid", () => {
        expect(() =>
            SquaddieActionService.deserialize({
                id: "bad-move",
                name: "Bad Move",
                attribute: "BODY",
                proficiency: "ARMOR",
                howToDetermineDegreeOfSuccess: "AUTOMATIC_SUCCESS",
                degreesOfSuccess: ["SUCCESS"],
                targeting: {
                    range: "MELEE",
                    shape: "BLOOM",
                    affiliationRelationship: {
                        self: true,
                        foe: false,
                        friend: false,
                    },
                },
                multipleAttackPenalty: { applies: false, contribution: 0 },
                effectOnActor: {
                    SUCCESS: {
                        movement: { movementType: "INVALID_MOVEMENT" },
                    },
                },
            })
        ).toThrow("[SquaddieActionService.deserialize]:")
    })
    it("throws when SUCCESS is missing from effectOnActor", () => {
        expect(() =>
            SquaddieActionService.deserialize({
                id: "no-success",
                name: "No Success",
                attribute: "BODY",
                proficiency: "ARMOR",
                howToDetermineDegreeOfSuccess: "AUTOMATIC_SUCCESS",
                degreesOfSuccess: ["SUCCESS"],
                targeting: {
                    range: "MELEE",
                    shape: "BLOOM",
                    affiliationRelationship: {
                        self: true,
                        foe: false,
                        friend: false,
                    },
                },
                multipleAttackPenalty: { applies: false, contribution: 0 },
                effectOnActor: {
                    CRITICAL: { actionPoints: { spent: 1 } },
                },
            })
        ).toThrow("[SquaddieActionService.deserialize]:")
    })
    it("throws when a condition type is invalid inside conditions.add", () => {
        const action = SquaddieActionService.new({
            id: "test",
            name: "Test",
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
            },
        })
        const serialized = SquaddieActionService.serialize(action)
        expect(() =>
            SquaddieActionService.deserialize({
                ...serialized,
                effectOnTarget: {
                    SUCCESS: {
                        conditions: {
                            add: [
                                {
                                    type: "NOT_A_CONDITION",
                                    source: "NONE",
                                    limit: {},
                                },
                            ],
                        },
                    },
                },
            })
        ).toThrow("[SquaddieActionService.deserialize]:")
    })
})

describe("cooldownTurns", () => {
    describe("when a SquaddieAction is created with a positive cooldownTurns", () => {
        it("stores the specified cooldown duration", () => {
            const action = SquaddieActionService.new({
                id: "freeze-blast",
                name: "Freeze Blast",
                cooldownTurns: 2,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
            })

            expect(action.cooldownTurns).toBe(2)
        })
    })

    describe("when a SquaddieAction is created with cooldownTurns of 0", () => {
        it("throws because cooldownTurns must be a positive number", () => {
            expect(() =>
                SquaddieActionService.new({
                    id: "freeze-blast",
                    name: "Freeze Blast",
                    cooldownTurns: 0,
                    effectOnActor: {
                        [DegreeOfSuccess.SUCCESS]: {
                            actionPoints: { spent: 1 },
                        },
                    },
                })
            ).toThrow()
        })
    })

    describe("when a SquaddieAction is created with a negative cooldownTurns", () => {
        it("throws because cooldownTurns must be a positive number", () => {
            expect(() =>
                SquaddieActionService.new({
                    id: "freeze-blast",
                    name: "Freeze Blast",
                    cooldownTurns: -1,
                    effectOnActor: {
                        [DegreeOfSuccess.SUCCESS]: {
                            actionPoints: { spent: 1 },
                        },
                    },
                })
            ).toThrow()
        })
    })

    describe("when a SquaddieAction is deserialized with cooldownTurns of 0", () => {
        it("throws because cooldownTurns must be a positive number", () => {
            const validAction = SquaddieActionService.new({
                id: "freeze-blast",
                name: "Freeze Blast",
                cooldownTurns: 1,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
            })
            const serialized = {
                ...SquaddieActionService.serialize(validAction),
                cooldownTurns: 0,
            }

            expect(() =>
                SquaddieActionService.deserialize(serialized)
            ).toThrow()
        })
    })
})
