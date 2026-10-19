import { describe, expect, it } from "vitest"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.js"
import { ProficiencyType } from "../../../proficiency/proficiencyLevel.js"
import {
    type SquaddieAction,
    SquaddieActionService,
} from "../../squaddieAction.js"
import type { SquaddieActionEffect } from "../../squaddieActionEffect.js"
import {
    SquaddieActionClassification,
    SquaddieActionClassificationService,
} from "../../squaddieActionClassification.js"
import {
    ClassificationTestActions,
    ClassificationTestEffects,
    spendOneActionPoint,
} from "./classificationTestActions.js"

const proficiency = ProficiencyType.SKILL_MIND

const friendSupport = (effectOnFriend: SquaddieActionEffect): SquaddieAction =>
    SquaddieActionService.new({
        id: "support",
        name: "Support",
        proficiency,
        affiliationRelationship: { self: false, foe: false, friend: true },
        effectOnActor: spendOneActionPoint,
        effectOnTarget: { [DegreeOfSuccess.SUCCESS]: effectOnFriend },
    })

describe("SquaddieActionClassificationService.classify outcome", () => {
    describe("when the action damages a foe", () => {
        it("is DAMAGE", () => {
            const psychicStab = ClassificationTestActions.attack({
                proficiency,
            })

            expect(
                SquaddieActionClassificationService.classify(psychicStab)
            ).toBe("MIND_MELEE_DAMAGE")
        })
    })

    describe("when the action hinders a foe without damaging them", () => {
        it("is HINDER for a hindering condition", () => {
            const intimidatingGlare = ClassificationTestActions.hinder({
                proficiency,
            })

            expect(
                SquaddieActionClassificationService.classify(intimidatingGlare)
            ).toBe("MIND_MELEE_HINDER")
        })

        it("is HINDER for draining the foe's action points", () => {
            const exhaust = SquaddieActionService.new({
                id: "exhaust",
                name: "Exhaust",
                proficiency,
                affiliationRelationship: {
                    self: false,
                    foe: true,
                    friend: false,
                },
                effectOnActor: spendOneActionPoint,
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
            })

            expect(SquaddieActionClassificationService.classify(exhaust)).toBe(
                "MIND_MELEE_HINDER"
            )
        })
    })

    describe("when the action damages and hinders a foe", () => {
        it("is DAMAGE, because damage comes first", () => {
            const searingThought = SquaddieActionService.new({
                id: "searing-thought",
                name: "Searing Thought",
                proficiency,
                affiliationRelationship: {
                    self: false,
                    foe: true,
                    friend: false,
                },
                effectOnActor: spendOneActionPoint,
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        ...ClassificationTestEffects.damage,
                        ...ClassificationTestEffects.slowed,
                    },
                },
            })

            expect(
                SquaddieActionClassificationService.classify(searingThought)
            ).toBe("MIND_MELEE_DAMAGE")
        })
    })

    describe("when the action helps a friend", () => {
        it("is ASSIST for healing", () => {
            const mend = ClassificationTestActions.assist({ proficiency })

            expect(SquaddieActionClassificationService.classify(mend)).toBe(
                "MIND_MELEE_ASSIST"
            )
        })

        it.each([
            ["granting a helpful condition", ClassificationTestEffects.armor],
            [
                "treating a hindering condition",
                ClassificationTestEffects.treatSlowed,
            ],
            ["dispelling a condition", ClassificationTestEffects.dispelSlowed],
        ])("is ASSIST for %s", (_, effectOnFriend) => {
            const support = friendSupport(effectOnFriend)

            expect(SquaddieActionClassificationService.classify(support)).toBe(
                "MIND_MELEE_ASSIST"
            )
        })
    })

    describe("when the action hinders a foe and helps the actor", () => {
        it("is HINDER, because hindering comes before assisting", () => {
            const siphon = SquaddieActionService.new({
                id: "siphon",
                name: "Siphon",
                proficiency,
                affiliationRelationship: {
                    self: false,
                    foe: true,
                    friend: false,
                },
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 1 },
                        ...ClassificationTestEffects.healing,
                    },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: ClassificationTestEffects.slowed,
                },
            })

            expect(SquaddieActionClassificationService.classify(siphon)).toBe(
                "MIND_MELEE_HINDER"
            )
        })
    })

    describe("when the action only harms friends", () => {
        it("is UNKNOWN", () => {
            const friendlyFire = SquaddieActionService.new({
                id: "friendly-fire",
                name: "Friendly Fire",
                proficiency,
                affiliationRelationship: {
                    self: false,
                    foe: false,
                    friend: true,
                },
                effectOnActor: spendOneActionPoint,
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: ClassificationTestEffects.damage,
                },
            })

            expect(
                SquaddieActionClassificationService.classify(friendlyFire)
            ).toBe(SquaddieActionClassification.UNKNOWN)
        })
    })

    describe("when the action only helps foes", () => {
        it("is UNKNOWN", () => {
            const healFoe = SquaddieActionService.new({
                id: "heal-foe",
                name: "Heal Foe",
                proficiency,
                affiliationRelationship: {
                    self: false,
                    foe: true,
                    friend: false,
                },
                effectOnActor: spendOneActionPoint,
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]:
                        ClassificationTestEffects.healing,
                },
            })

            expect(SquaddieActionClassificationService.classify(healFoe)).toBe(
                SquaddieActionClassification.UNKNOWN
            )
        })
    })
})
