import { beforeEach, describe, expect, it } from "vitest"
import {
    type SquaddieAction,
    SquaddieActionService,
} from "../squaddieAction.js"
import { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { OutOfBattleSquaddieService } from "../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { SquaddieAffiliation } from "../../affiliation/affiliation.js"
import { OutOfBattleSquaddieTestSetup } from "../../testUtils/outOfBattleSquaddieTestSetup.js"
import { ProficiencyType } from "../../proficiency/proficiencyLevel.js"
import {
    SquaddieConditionService,
    SquaddieConditionSource,
    SquaddieConditionType,
} from "../../proficiency/squaddieCondition.js"
import type { BattleSquaddieId } from "../../squaddie/inBattle/battleSquaddieId.js"
import { ProficiencyCalculator } from "./proficiencyCalculator.js"

describe("ProficiencyCalculator and Off-Guard", () => {
    let inBattleSquaddieManager: InBattleSquaddieManager
    let target: BattleSquaddieId
    let weaponAttack: SquaddieAction

    const addOffGuardToTarget = (amount: number | undefined) => {
        inBattleSquaddieManager.addConditionsToSquaddie({
            ...target,
            conditions: [
                SquaddieConditionService.new({
                    type: SquaddieConditionType.OFF_GUARD,
                    amount: amount == undefined ? undefined : { amount },
                    duration: undefined,
                    source: SquaddieConditionSource.ELEMENTAL,
                }),
            ],
        })
    }

    const getArmorDefense = () =>
        ProficiencyCalculator.getTargetDefensiveBonus({
            target,
            squaddieAction: weaponAttack,
            inBattleSquaddieManager,
        })

    const isOffGuardByFlanking = ({
        squaddieAction,
        isActorFlankingTarget,
    }: {
        squaddieAction: SquaddieAction
        isActorFlankingTarget: boolean
    }) =>
        ProficiencyCalculator.isTargetOffGuardByFlanking({
            target,
            squaddieAction,
            inBattleSquaddieManager,
            isActorFlankingTarget,
        })

    beforeEach(() => {
        const { manager: outOfBattleSquaddieManager } =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "sheet",
                attributeSheetOptions: { rank: 0 },
            })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: "target",
                actionIds: [],
                attributeSheetId: "sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
        )
        inBattleSquaddieManager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            outOfBattleSquaddieManager
        )
        const { inBattleSquaddieId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "target",
            })
        target = { inBattleSquaddieId, outOfBattleSquaddieId: "target" }
        weaponAttack = SquaddieActionService.new({
            id: "weaponAttack",
            proficiency: ProficiencyType.WEAPON_SIMPLE,
            effectOnActor: { SUCCESS: {} },
        })
    })

    describe("isTargetOffGuardByFlanking", () => {
        describe("when the actor flanks the target", () => {
            describe("and the attack is defended by Armor", () => {
                it("reports the target as Off-Guard", () => {
                    expect(
                        isOffGuardByFlanking({
                            squaddieAction: weaponAttack,
                            isActorFlankingTarget: true,
                        })
                    ).toBe(true)
                })
            })

            describe("and the target is already Off-Guard", () => {
                beforeEach(() => {
                    addOffGuardToTarget(undefined)
                })

                it("does not report the flank as making it Off-Guard", () => {
                    expect(
                        isOffGuardByFlanking({
                            squaddieAction: weaponAttack,
                            isActorFlankingTarget: true,
                        })
                    ).toBe(false)
                })
            })

            describe("and the attack is not defended by Armor", () => {
                let mindAttack: SquaddieAction

                beforeEach(() => {
                    mindAttack = SquaddieActionService.new({
                        id: "mindAttack",
                        proficiency: ProficiencyType.SKILL_MIND,
                        effectOnActor: { SUCCESS: {} },
                    })
                })

                it("does not report the target as Off-Guard", () => {
                    expect(
                        isOffGuardByFlanking({
                            squaddieAction: mindAttack,
                            isActorFlankingTarget: true,
                        })
                    ).toBe(false)
                })
            })
        })

        describe("when the actor does not flank the target", () => {
            it("does not report the target as Off-Guard", () => {
                expect(
                    isOffGuardByFlanking({
                        squaddieAction: weaponAttack,
                        isActorFlankingTarget: false,
                    })
                ).toBe(false)
            })
        })
    })

    describe("when Off-Guard is given an amount", () => {
        const offGuardAmountInData = 3
        let armorWithoutOffGuard: number

        beforeEach(() => {
            armorWithoutOffGuard = getArmorDefense()
            addOffGuardToTarget(offGuardAmountInData)
        })

        it("still lowers Armor by exactly 1", () => {
            expect(getArmorDefense()).toBe(armorWithoutOffGuard - 1)
        })
    })
})
