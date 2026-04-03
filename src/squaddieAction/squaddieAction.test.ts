import { beforeEach, describe, expect, it } from "vitest"
import {
    HowToDetermineDegreeOfSuccess,
    SquaddieActionService,
} from "./squaddieAction"
import {
    DegreeOfSuccess,
    type TDegreeOfSuccess,
} from "../degreesOfSuccess/degreeOfSuccess"
import {
    ProficiencyLevel,
    ProficiencyType,
    type TProficiencyLevel,
    type TProficiencyType,
} from "../proficiency/proficiencyLevel"
import { SquaddieActionForecastCalculator } from "./calculate/forecast/squaddieActionForecastCalculator"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../squaddie/inBattle/inBattleSquaddieCollection"
import { SquaddieActionManager } from "./squaddieActionManager"
import { SquaddieActionCollectionService } from "./squaddieActionCollection"
import { OutOfBattleSquaddieTestSetup } from "../testUtils/outOfBattleSquaddieTestSetup"
import {
    AttributeScore,
    type AttributeScoreType,
} from "../proficiency/attributeScore"
import {
    SquaddieAffiliation,
    type TSquaddieAffiliation,
} from "../affiliation/affiliation"
import type { OutOfBattleSquaddieManager } from "../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { OutOfBattleSquaddieService } from "../squaddie/outOfBattle/outOfBattleSquaddie"

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
