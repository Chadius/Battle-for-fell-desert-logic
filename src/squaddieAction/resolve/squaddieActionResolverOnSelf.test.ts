import { beforeEach, describe, expect, it } from "vitest"
import {
    type SquaddieAction,
    SquaddieActionService,
} from "../squaddieAction.ts"
import { SquaddieActionManager } from "../squaddieActionManager.ts"
import {
    type OutOfBattleSquaddieAttributeSheet,
    OutOfBattleSquaddieAttributeSheetService,
} from "../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet.ts"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection.ts"
import { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager.ts"
import {
    type InBattleSquaddieCollection,
    InBattleSquaddieCollectionService,
} from "../../squaddie/inBattle/inBattleSquaddieCollection.ts"
import { OutOfBattleSquaddieManager } from "../../squaddie/outOfBattle/outOfBattleSquaddieManager.ts"
import { OutOfBattleSquaddieCollectionService } from "../../squaddie/outOfBattle/outOfBattleSquaddieCollection.ts"
import { AttributeScore } from "../../proficiency/attributeScore.ts"
import {
    ProficiencyLevel,
    ProficiencyType,
} from "../../proficiency/proficiencyLevel.ts"
import {
    type OutOfBattleSquaddie,
    OutOfBattleSquaddieService,
} from "../../squaddie/outOfBattle/outOfBattleSquaddie.ts"
import { SquaddieAffiliation } from "../../squaddie/outOfBattle/affiliation.ts"
import { SquaddieActionCollectionService } from "../squaddieActionCollection.ts"
import { ActionRange } from "../actionRange.ts"
import { CoordinateGeneratorShape } from "../../coordinateMap/shape.ts"
import { SquaddieActionResolverOnSelf } from "./squaddieActionResolverOnSelf.ts"
import { SquaddieActionResolver } from "./squaddieActionResolver.ts"

describe("Squaddie resolves actions on themself", () => {
    let endTurnAction: SquaddieAction
    let actionManager: SquaddieActionManager

    let attributeSheet: OutOfBattleSquaddieAttributeSheet
    let outOfBattleSquaddie: OutOfBattleSquaddie
    let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    let outOfBattleSquaddieId: string

    let inBattleSquaddieManager: InBattleSquaddieManager
    let inBattleSquaddieCollection: InBattleSquaddieCollection
    let inBattleSquaddieId: number

    beforeEach(() => {
        outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
            OutOfBattleSquaddieCollectionService.new(),
            OutOfBattleSquaddieAttributeSheetCollectionService.new()
        )
        attributeSheet = OutOfBattleSquaddieAttributeSheetService.new({
            id: "soldier",
            movementPerAction: 2,
            maxHitPoints: 5,
            attributeScores: {
                [AttributeScore.BODY]: 5,
                [AttributeScore.MIND]: 7,
                [AttributeScore.SOUL]: 3,
            },
            proficiencyLevels: {
                [ProficiencyType.DEFEND_BODY]: ProficiencyLevel.NOVICE,
                [ProficiencyType.SKILL_BODY]: ProficiencyLevel.EXPERT,
            },
            rank: 3,
        })
        outOfBattleSquaddieManager.addOrUpdateAttributeSheet(attributeSheet)

        outOfBattleSquaddieId = "soldier"
        outOfBattleSquaddie = OutOfBattleSquaddieService.new({
            id: outOfBattleSquaddieId,
            name: "Soldier",
            actionIds: [0],
            attributeSheetId: "soldier",
            affiliation: SquaddieAffiliation.PLAYER,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(outOfBattleSquaddie)

        inBattleSquaddieCollection = InBattleSquaddieCollectionService.new()
        inBattleSquaddieManager = new InBattleSquaddieManager(
            inBattleSquaddieCollection,
            outOfBattleSquaddieManager
        )
        ;({ inBattleSquaddieId } = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId,
        }))

        endTurnAction = SquaddieActionService.new({
            id: "endTurn",
            name: "End Turn",
            proficiency: ProficiencyType.UNKNOWN,
            targeting: {
                range: ActionRange.SELF,
                shape: CoordinateGeneratorShape.BLOOM,
                affiliationRelationship: {
                    self: true,
                    friend: false,
                    foe: false,
                },
            },
            effect: {
                actionPoints: {
                    spent: "all",
                },
            },
        })
        actionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )
        actionManager.addOrUpdate(endTurnAction)
    })

    it("will calculate removing all actions when squaddie uses End Turn without actually changing squaddie", () => {
        const startingActionPoints = inBattleSquaddieManager.getActionPoints({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
        }).current

        const results = SquaddieActionResolverOnSelf.calculateResult({
            actor: {
                inBattleSquaddieId,
                outOfBattleSquaddieId,
                inBattleSquaddieManager,
            },
            action: {
                id: endTurnAction.id,
                manager: actionManager,
            },
        })

        expect(results).toHaveLength(1)
        expect(results[0]).toEqual(
            expect.objectContaining({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
                actionPoints: {
                    spent: 3,
                },
            })
        )

        expect(
            inBattleSquaddieManager.getActionPoints({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            }).current
        ).toEqual(startingActionPoints)
    })

    it("will apply removing all actions when squaddie uses End Turn without actually changing squaddie", () => {
        const results = SquaddieActionResolverOnSelf.calculateResult({
            actor: {
                inBattleSquaddieId,
                outOfBattleSquaddieId,
                inBattleSquaddieManager,
            },
            action: {
                id: endTurnAction.id,
                manager: actionManager,
            },
        })

        SquaddieActionResolver.applyResultsToSquaddies({
            inBattleSquaddieManager,
            results,
        })

        expect(
            inBattleSquaddieManager.getActionPoints({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            }).current
        ).toEqual(0)
    })
})
