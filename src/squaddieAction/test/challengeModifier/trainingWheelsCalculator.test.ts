import { beforeEach, describe, expect, it } from "vitest"
import {
    type SquaddieAction,
    SquaddieActionService,
} from "../../squaddieAction.js"
import { SquaddieActionManager } from "../../squaddieActionManager.js"
import { type OutOfBattleSquaddie } from "../../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager.js"
import {
    type InBattleSquaddieCollection,
    InBattleSquaddieCollectionService,
} from "../../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { ProficiencyType } from "../../../proficiency/proficiencyLevel.js"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.js"
import { SquaddieActionCollectionService } from "../../squaddieActionCollection.js"
import { SquaddieActionResultCalculator } from "../../calculate/result/squaddieActionResultCalculator.js"
import { RollGenerator } from "../../calculate/roll/rollGenerator.js"
import {
    SquaddieAffiliation,
    type TSquaddieAffiliation,
} from "../../../affiliation/affiliation.js"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup.js"
import { OutOfBattleSquaddieManager } from "../../../squaddie/outOfBattle/outOfBattleSquaddieManager.js"
import { SquaddieIdConverterService } from "../../../squaddie/idConverterService.js"
import {
    type ChallengeModifierSetting,
    ChallengeModifierSettingService,
    ChallengeModifierType,
} from "../../calculate/challengeModifier/challengeModifierSetting.js"

const GUARANTEED_MISS: [number, number] = [1, 1]
const GUARANTEED_HIT: [number, number] = [6, 6]

const trainingWheelsEnabled: ChallengeModifierSetting =
    ChallengeModifierSettingService.setFlag({
        challengeModifierSetting: ChallengeModifierSettingService.new(),
        type: ChallengeModifierType.TRAINING_WHEELS,
        value: true,
    })

describe("Training Wheels challenge modifier", () => {
    let attackAction: SquaddieAction
    let actionManager: SquaddieActionManager
    let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    let inBattleSquaddieManager: InBattleSquaddieManager
    let inBattleSquaddieCollection: InBattleSquaddieCollection

    let actorOutOfBattleSquaddie: OutOfBattleSquaddie
    let actorInBattleSquaddieId: number

    let targetOutOfBattleSquaddie: OutOfBattleSquaddie
    let targetInBattleSquaddieId: number

    const setUpSquaddies = ({
        actorAffiliation,
        targetAffiliation,
    }: {
        actorAffiliation: TSquaddieAffiliation
        targetAffiliation: TSquaddieAffiliation
    }) => {
        const outOfBattleSquaddieManagerResult =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "combatant",
            })
        outOfBattleSquaddieManager = outOfBattleSquaddieManagerResult.manager

        actorOutOfBattleSquaddie = OutOfBattleSquaddieService.new({
            id: "actor",
            name: "Actor",
            actionIds: [attackAction.id],
            attributeSheetId: "combatant",
            affiliation: actorAffiliation,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(actorOutOfBattleSquaddie)

        targetOutOfBattleSquaddie = OutOfBattleSquaddieService.new({
            id: "target",
            name: "Target",
            actionIds: [],
            attributeSheetId: "combatant",
            affiliation: targetAffiliation,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            targetOutOfBattleSquaddie
        )

        inBattleSquaddieCollection = InBattleSquaddieCollectionService.new()
        inBattleSquaddieManager = new InBattleSquaddieManager(
            inBattleSquaddieCollection,
            outOfBattleSquaddieManager
        )
        ;({ inBattleSquaddieId: actorInBattleSquaddieId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: actorOutOfBattleSquaddie.id,
            }))
        ;({ inBattleSquaddieId: targetInBattleSquaddieId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: targetOutOfBattleSquaddie.id,
            }))
    }

    const calculateAgainstTarget = (
        rollGenerator: RollGenerator,
        challengeModifierSetting?: ChallengeModifierSetting
    ) =>
        SquaddieActionResultCalculator.calculateActionResultsWithRolls({
            actor: {
                inBattleSquaddieId: actorInBattleSquaddieId,
                outOfBattleSquaddieId: actorOutOfBattleSquaddie.id,
            },
            targets: [
                {
                    inBattleSquaddieId: targetInBattleSquaddieId,
                    outOfBattleSquaddieId: targetOutOfBattleSquaddie.id,
                },
            ],
            action: { id: attackAction.id },
            managers: {
                inBattleSquaddieManager,
                squaddieActionManager: actionManager,
            },
            rollGenerator,
            challengeModifierSetting,
        })

    const getTargetResult = (
        results: ReturnType<typeof calculateAgainstTarget>
    ) =>
        results.targetResults.get(
            SquaddieIdConverterService.squaddieIdToKey({
                inBattleSquaddieId: targetInBattleSquaddieId,
                outOfBattleSquaddieId: targetOutOfBattleSquaddie.id,
            })
        )!

    beforeEach(() => {
        attackAction = SquaddieActionService.new({
            id: "attack",
            name: "Attack",
            proficiency: ProficiencyType.WEAPON_MARTIAL,
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: { spent: 1 },
                },
            },
            effectOnTarget: {
                [DegreeOfSuccess.BOTCH]: {},
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
        actionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )
        actionManager.addOrUpdate(attackAction)
    })

    describe("player attacks a non-ally", () => {
        beforeEach(() => {
            setUpSquaddies({
                actorAffiliation: SquaddieAffiliation.PLAYER,
                targetAffiliation: SquaddieAffiliation.ENEMY,
            })
        })

        it("without the modifier, a guaranteed miss roll deals no damage", () => {
            const results = calculateAgainstTarget(
                new RollGenerator(GUARANTEED_MISS)
            )
            expect(
                getTargetResult(results).squaddieActionResults.some(
                    (r) => r.damage
                )
            ).toBe(false)
        })

        it("forces a critical hit even on a guaranteed miss roll", () => {
            const results = calculateAgainstTarget(
                new RollGenerator(GUARANTEED_MISS),
                trainingWheelsEnabled
            )

            const targetResult = getTargetResult(results)
            expect(targetResult.degreeOfSuccess).toBe(DegreeOfSuccess.CRITICAL)
            expect(
                targetResult.squaddieActionResults.find((r) => r.damage)?.damage
                    ?.raw
            ).toBe(4)
        })
    })

    describe("player attacks an ally", () => {
        beforeEach(() => {
            setUpSquaddies({
                actorAffiliation: SquaddieAffiliation.PLAYER,
                targetAffiliation: SquaddieAffiliation.ALLY,
            })
        })

        it("deals no damage on a guaranteed miss roll, even with the modifier enabled", () => {
            const results = calculateAgainstTarget(
                new RollGenerator(GUARANTEED_MISS),
                trainingWheelsEnabled
            )
            expect(
                getTargetResult(results).squaddieActionResults.some(
                    (r) => r.damage
                )
            ).toBe(false)
        })
    })

    describe("an enemy attacks a player squaddie", () => {
        beforeEach(() => {
            setUpSquaddies({
                actorAffiliation: SquaddieAffiliation.ENEMY,
                targetAffiliation: SquaddieAffiliation.PLAYER,
            })
        })

        it("without the modifier, a guaranteed hit roll deals damage", () => {
            const results = calculateAgainstTarget(
                new RollGenerator(GUARANTEED_HIT)
            )
            expect(
                getTargetResult(results).squaddieActionResults.some(
                    (r) => r.damage
                )
            ).toBe(true)
        })

        it("forces a botch even on a guaranteed hit roll", () => {
            const results = calculateAgainstTarget(
                new RollGenerator(GUARANTEED_HIT),
                trainingWheelsEnabled
            )

            const targetResult = getTargetResult(results)
            expect(targetResult.degreeOfSuccess).toBe(DegreeOfSuccess.BOTCH)
            expect(
                targetResult.squaddieActionResults.some((r) => r.damage)
            ).toBe(false)
        })
    })
})
