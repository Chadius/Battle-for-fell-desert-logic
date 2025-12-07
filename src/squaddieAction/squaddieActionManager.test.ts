import { beforeEach, describe, expect, it } from "vitest"
import {
    type SquaddieActionCollection,
    SquaddieActionCollectionService,
} from "./squaddieActionCollection.ts"
import { type SquaddieAction, SquaddieActionService } from "./squaddieAction.ts"
import { AttributeScore } from "../proficiency/attributeScore.ts"
import { ProficiencyType } from "../proficiency/proficiencyLevel.ts"
import { ActionRange } from "./actionRange.ts"
import { CoordinateGeneratorShape } from "../coordinateMap/shape.ts"
import { SquaddieActionManager } from "./squaddieActionManager.ts"
import { DegreeOfSuccess } from "../degreesOfSuccess/degreeOfSuccess.ts"

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
})
