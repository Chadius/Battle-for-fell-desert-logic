import { describe, expect, it } from "vitest"
import { SquaddieActionService } from "./squaddieAction.js"
import { DegreeOfSuccess } from "../degreesOfSuccess/degreeOfSuccess.js"
import { ProficiencyType } from "../proficiency/proficiencyLevel.js"
import {
    SquaddieConditionService,
    SquaddieConditionSource,
    SquaddieConditionType,
} from "../proficiency/squaddieCondition.js"

const noOpEffectOnActor = {
    [DegreeOfSuccess.SUCCESS]: {},
}

describe("SquaddieActionService.isAttackAction", () => {
    it("is true for an action that targets foes and deals damage", () => {
        const action = SquaddieActionService.new({
            id: "scimitar",
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: noOpEffectOnActor,
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    damage: {
                        raw: 2,
                        targetProficiency: ProficiencyType.ARMOR,
                    },
                },
            },
        })

        expect(SquaddieActionService.isAttackAction(action)).toBe(true)
    })

    it("is true for an action that targets foes and applies a hindering condition, even without damage", () => {
        const action = SquaddieActionService.new({
            id: "frighten",
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: noOpEffectOnActor,
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    conditions: {
                        add: [
                            SquaddieConditionService.new({
                                type: SquaddieConditionType.FRIGHTENED,
                                amount: { amount: 1 },
                                duration: undefined,
                                source: SquaddieConditionSource.PHYSICAL,
                            }),
                        ],
                    },
                },
            },
        })

        expect(SquaddieActionService.isAttackAction(action)).toBe(true)
    })

    it("is false for an action that targets foes but only applies a helpful condition", () => {
        const action = SquaddieActionService.new({
            id: "disarming-strike",
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: noOpEffectOnActor,
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    conditions: {
                        add: [
                            SquaddieConditionService.new({
                                type: SquaddieConditionType.ELUSIVE,
                                amount: undefined,
                                duration: undefined,
                                source: SquaddieConditionSource.PHYSICAL,
                            }),
                        ],
                    },
                },
            },
        })

        expect(SquaddieActionService.isAttackAction(action)).toBe(false)
    })

    it("is false for an action that deals damage to the actor themself for a temporary boost", () => {
        const action = SquaddieActionService.new({
            id: "blood-sacrifice",
            affiliationRelationship: { self: true, foe: false, friend: false },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    damage: {
                        raw: 1,
                        targetProficiency: ProficiencyType.ARMOR,
                    },
                },
            },
        })

        expect(SquaddieActionService.isAttackAction(action)).toBe(false)
    })

    it("is false for an action that heals a foe, since it targets foes without damage or a hindering condition", () => {
        const action = SquaddieActionService.new({
            id: "vampiric-heal",
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: noOpEffectOnActor,
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    healing: { raw: 2 },
                },
            },
        })

        expect(SquaddieActionService.isAttackAction(action)).toBe(false)
    })

    it("is false for an action that only targets friends, even if it deals damage", () => {
        const action = SquaddieActionService.new({
            id: "friendly-fire-drill",
            affiliationRelationship: { self: false, foe: false, friend: true },
            effectOnActor: noOpEffectOnActor,
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    damage: {
                        raw: 2,
                        targetProficiency: ProficiencyType.ARMOR,
                    },
                },
            },
        })

        expect(SquaddieActionService.isAttackAction(action)).toBe(false)
    })

    it("is true for an action that targets foes and drains their action points, even without damage", () => {
        const action = SquaddieActionService.new({
            id: "exhausting-roar",
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: noOpEffectOnActor,
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: { spent: 1 },
                },
            },
        })

        expect(SquaddieActionService.isAttackAction(action)).toBe(true)
    })

    it("is false for an action that targets foes but gives them action points", () => {
        const action = SquaddieActionService.new({
            id: "misguided-rally",
            affiliationRelationship: { self: false, foe: true, friend: false },
            effectOnActor: noOpEffectOnActor,
            effectOnTarget: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: { spent: 0, restore: 1 },
                },
            },
        })

        expect(SquaddieActionService.isAttackAction(action)).toBe(false)
    })
})
