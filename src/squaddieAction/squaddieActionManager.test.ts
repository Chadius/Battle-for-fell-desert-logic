import { beforeEach, describe, expect, it } from "vitest"
import {
    type SquaddieActionCollection,
    SquaddieActionCollectionService,
} from "./squaddieActionCollection.js"
import { type SquaddieAction, SquaddieActionService } from "./squaddieAction.js"
import { AttributeScore } from "../proficiency/attributeScore.js"
import { ProficiencyType } from "../proficiency/proficiencyLevel.js"
import { ActionRange } from "./actionRange.js"
import { CoordinateGeneratorShape } from "../coordinateMap/shape.js"
import { SquaddieActionManager } from "./squaddieActionManager.js"
import { DegreeOfSuccess } from "../degreesOfSuccess/degreeOfSuccess.js"

describe("Squaddie Action Collection Manager", () => {
    let longswordAttackAction: SquaddieAction
    let collection: SquaddieActionCollection
    let manager: SquaddieActionManager

    beforeEach(() => {
        collection = SquaddieActionCollectionService.new()
        manager = new SquaddieActionManager(collection)
        longswordAttackAction = SquaddieActionService.new({
            id: "longsword",
            name: "Longsword Strike",
            attribute: AttributeScore.BODY,
            proficiency: ProficiencyType.WEAPON_MARTIAL,
            targeting: {
                range: ActionRange.MELEE,
                shape: CoordinateGeneratorShape.BLOOM,
                affiliationRelationship: {
                    foe: true,
                    friend: false,
                    self: false,
                },
            },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {},
            },
        })
    })

    it("can add an action and retrieve it", () => {
        manager.addOrUpdate(longswordAttackAction)
        expect(manager.has(longswordAttackAction.id)).toBeTruthy()
        expect(manager.get(longswordAttackAction.id)).toEqual(
            longswordAttackAction
        )
        expect(() => manager.get("does not exist")).toThrow("No action")
    })

    it("can remove an action", () => {
        manager.addOrUpdate(longswordAttackAction)
        manager.remove(longswordAttackAction.id)
        expect(() => manager.get(longswordAttackAction.id)).toThrow("No action")
    })

    describe("serialize and deserialize", () => {
        let healAction: SquaddieAction

        beforeEach(() => {
            healAction = SquaddieActionService.new({
                id: "heal",
                name: "Heal",
                attribute: AttributeScore.SOUL,
                proficiency: ProficiencyType.SKILL_SOUL,
                targeting: {
                    range: ActionRange.MELEE,
                    shape: CoordinateGeneratorShape.BLOOM,
                    affiliationRelationship: {
                        foe: false,
                        friend: true,
                        self: true,
                    },
                },
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {},
                },
            })
        })

        it("serialize returns an empty array when the collection has no actions", () => {
            expect(manager.serialize()).toEqual([])
        })

        it("round-trips actions through serialize and addActionsFromJson", () => {
            manager.addOrUpdate(longswordAttackAction)
            manager.addOrUpdate(healAction)

            const freshManager = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )
            const errors = freshManager.addActionsFromJson(manager.serialize())

            expect(errors).toHaveLength(0)
            expect(freshManager.get(longswordAttackAction.id)).toEqual(
                longswordAttackAction
            )
            expect(freshManager.get(healAction.id)).toEqual(healAction)
        })

        it("addActionsFromJson accepts a single item (not an array)", () => {
            const errors = manager.addActionsFromJson(
                SquaddieActionService.serialize(longswordAttackAction)
            )

            expect(errors).toHaveLength(0)
            expect(manager.get(longswordAttackAction.id)).toEqual(
                longswordAttackAction
            )
        })

        it("returns an error for each invalid item and still adds valid ones", () => {
            const errors = manager.addActionsFromJson([
                { broken: true },
                SquaddieActionService.serialize(longswordAttackAction),
            ])

            expect(errors).toHaveLength(1)
            expect(errors[0]).toContain("SquaddieActionService.deserialize")
            expect(manager.has(longswordAttackAction.id)).toBeTruthy()
        })
    })
})
