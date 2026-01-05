import { beforeEach, describe, expect, it } from "vitest"
import { ProficiencyCalculator } from "./proficiencyCalculator"
import { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager"
import { OutOfBattleSquaddieManager } from "../../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { OutOfBattleSquaddieCollectionService } from "../../squaddie/outOfBattle/outOfBattleSquaddieCollection"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection"
import { OutOfBattleSquaddieAttributeSheetService } from "../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet"
import { OutOfBattleSquaddieService } from "../../squaddie/outOfBattle/outOfBattleSquaddie"
import { InBattleSquaddieCollectionService } from "../../squaddie/inBattle/inBattleSquaddieCollection"
import { AttributeScore } from "../../proficiency/attributeScore"
import {
    ProficiencyLevel,
    ProficiencyLevelConst,
    ProficiencyType,
} from "../../proficiency/proficiencyLevel"
import type { SquaddieAction } from "../squaddieAction"
import { SquaddieActionService } from "../squaddieAction"
import { DegreeOfSuccess } from "../../degreesOfSuccess/degreeOfSuccess"
import { SquaddieAffiliation } from "../../affiliation/affiliation"

describe("ProficiencyCalculator", () => {
    let inBattleSquaddieManager: InBattleSquaddieManager
    let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    let actor: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }
    let target: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }
    let testAction: SquaddieAction

    beforeEach(() => {
        outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
            OutOfBattleSquaddieCollectionService.new(),
            OutOfBattleSquaddieAttributeSheetCollectionService.new()
        )

        const soldierSheet = OutOfBattleSquaddieAttributeSheetService.new({
            id: "soldier",
            movement: { distancePerAction: 2 },
            maxHitPoints: 5,
            attributeScores: {
                [AttributeScore.BODY]: 5,
                [AttributeScore.MIND]: 7,
                [AttributeScore.SOUL]: 3,
            },
            proficiencyLevels: {
                [ProficiencyType.DEFEND_BODY]: ProficiencyLevel.NOVICE,
                [ProficiencyType.SKILL_BODY]: ProficiencyLevel.EXPERT,
                [ProficiencyType.WEAPON_MARTIAL]: ProficiencyLevel.NOVICE,
            },
            rank: 3,
        })
        outOfBattleSquaddieManager.addOrUpdateAttributeSheet(soldierSheet)

        const actorSquaddie = OutOfBattleSquaddieService.new({
            id: "actor",
            name: "Actor",
            actionIds: [],
            attributeSheetId: "soldier",
            affiliation: SquaddieAffiliation.PLAYER,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(actorSquaddie)

        const targetSquaddie = OutOfBattleSquaddieService.new({
            id: "target",
            name: "Target",
            actionIds: [],
            attributeSheetId: "soldier",
            affiliation: SquaddieAffiliation.ENEMY,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(targetSquaddie)

        const inBattleCollection = InBattleSquaddieCollectionService.new()
        inBattleSquaddieManager = new InBattleSquaddieManager(
            inBattleCollection,
            outOfBattleSquaddieManager
        )

        const { inBattleSquaddieId: actorId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor",
            })
        actor = {
            inBattleSquaddieId: actorId,
            outOfBattleSquaddieId: "actor",
        }

        const { inBattleSquaddieId: targetId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "target",
            })
        target = {
            inBattleSquaddieId: targetId,
            outOfBattleSquaddieId: "target",
        }

        testAction = SquaddieActionService.new({
            id: "test-action",
            name: "Test Action",
            proficiency: ProficiencyType.WEAPON_MARTIAL,
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: { spent: 1 },
                },
            },
        })
    })

    describe("getActorProficiencyBonus", () => {
        it("returns the actor's proficiency bonus for the action's proficiency type", () => {
            const bonus = ProficiencyCalculator.getActorProficiencyBonus({
                actor,
                squaddieAction: testAction,
                inBattleSquaddieManager,
            })

            const expectedBonus = inBattleSquaddieManager.getProficiencyBonus({
                inBattleSquaddieId: actor.inBattleSquaddieId,
                outOfBattleSquaddieId: actor.outOfBattleSquaddieId,
                type: ProficiencyType.WEAPON_MARTIAL,
            }).total

            expect(bonus).toBe(expectedBonus)
        })
    })

    describe("getTargetDefensiveBonus", () => {
        it("returns the target's defensive proficiency bonus", () => {
            const bonus = ProficiencyCalculator.getTargetDefensiveBonus({
                target,
                squaddieAction: testAction,
                inBattleSquaddieManager,
            })

            const defensiveProficiencyType =
                ProficiencyLevelConst.defendingProficiencyTypeByProficiencyType.get(
                    testAction.proficiency
                )!

            const expectedBonus = inBattleSquaddieManager.getProficiencyBonus({
                inBattleSquaddieId: target.inBattleSquaddieId,
                outOfBattleSquaddieId: target.outOfBattleSquaddieId,
                type: defensiveProficiencyType,
            }).total

            expect(bonus).toBe(expectedBonus)
        })

        it("returns 0 if the action has no defending proficiency type", () => {
            const actionWithNoProficiency = SquaddieActionService.new({
                id: "no-proficiency",
                name: "No Proficiency",
                proficiency: ProficiencyType.UNKNOWN,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 1 },
                    },
                },
            })

            const bonus = ProficiencyCalculator.getTargetDefensiveBonus({
                target,
                squaddieAction: actionWithNoProficiency,
                inBattleSquaddieManager,
            })

            expect(bonus).toBe(0)
        })
    })

    describe("calculateModifierDifference", () => {
        it("calculates the modifier difference as actorBonus - targetDefensiveBonus - 6", () => {
            const actorBonus = 5
            const targetDefensiveBonus = 2

            const modifier = ProficiencyCalculator.calculateModifierDifference({
                actorBonus,
                targetDefensiveBonus,
            })

            expect(modifier).toBe(5 - 2 - 6)
            expect(modifier).toBe(-3)
        })

        it("handles negative actor bonus", () => {
            const actorBonus = -2
            const targetDefensiveBonus = 3

            const modifier = ProficiencyCalculator.calculateModifierDifference({
                actorBonus,
                targetDefensiveBonus,
            })

            expect(modifier).toBe(-2 - 3 - 6)
            expect(modifier).toBe(-11)
        })

        it("handles equal bonuses", () => {
            const actorBonus = 4
            const targetDefensiveBonus = 4

            const modifier = ProficiencyCalculator.calculateModifierDifference({
                actorBonus,
                targetDefensiveBonus,
            })

            expect(modifier).toBe(4 - 4 - 6)
            expect(modifier).toBe(-6)
        })
    })
})
