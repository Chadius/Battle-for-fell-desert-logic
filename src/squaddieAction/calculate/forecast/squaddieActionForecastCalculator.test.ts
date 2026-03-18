import { beforeEach, describe, expect, it } from "vitest"
import { SquaddieActionForecastCalculator } from "./squaddieActionForecastCalculator"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { SquaddieAffiliation } from "../../../affiliation/affiliation"
import { ProficiencyType } from "../../../proficiency/proficiencyLevel"
import { SquaddieActionService } from "../../squaddieAction"
import { SquaddieActionManager } from "../../squaddieActionManager"
import { SquaddieActionCollectionService } from "../../squaddieActionCollection"
import type { OutOfBattleSquaddieManager } from "../../../squaddie/outOfBattle/outOfBattleSquaddieManager"

describe("SquaddieActionForecastCalculator", () => {
    describe("Multiple Attack Penalty in forecast", () => {
        let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
        let inBattleSquaddieManager: InBattleSquaddieManager
        let squaddieActionManager: SquaddieActionManager
        let actor: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }
        let target: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
        let weaponAction: ReturnType<typeof SquaddieActionService.new>
        let nonWeaponAction: ReturnType<typeof SquaddieActionService.new>

        beforeEach(() => {
            const setup =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "actor-sheet",
                        attributeSheetOptions: {
                            rank: 6,
                            maxHitPoints: 5,
                            distancePerAction: 2,
                        },
                    }
                )
            outOfBattleSquaddieManager = setup.manager

            const targetSetup =
                OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
                    id: "target-sheet",
                    rank: 0,
                    maxHitPoints: 5,
                    distancePerAction: 2,
                })
            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(targetSetup)

            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "actor-squaddie",
                    name: "Actor",
                    actionIds: [],
                    attributeSheetId: "actor-sheet",
                    affiliation: SquaddieAffiliation.PLAYER,
                })
            )
            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "target-squaddie",
                    name: "Target",
                    actionIds: [],
                    attributeSheetId: "target-sheet",
                    affiliation: SquaddieAffiliation.ENEMY,
                })
            )

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )
            const actorCreated = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor-squaddie",
            })
            actor = {
                inBattleSquaddieId: actorCreated.inBattleSquaddieId,
                outOfBattleSquaddieId: "actor-squaddie",
            }
            const targetCreated = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "target-squaddie",
            })
            target = {
                inBattleSquaddieId: targetCreated.inBattleSquaddieId,
                outOfBattleSquaddieId: "target-squaddie",
            }

            squaddieActionManager = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )

            weaponAction = SquaddieActionService.new({
                id: "weapon-attack",
                name: "Weapon Attack",
                proficiency: ProficiencyType.WEAPON_MARTIAL,
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
            squaddieActionManager.addOrUpdate(weaponAction)

            nonWeaponAction = SquaddieActionService.new({
                id: "non-weapon",
                name: "Non-Weapon",
                proficiency: ProficiencyType.SKILL_BODY,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: { actionPoints: { spent: 1 } },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: 1,
                            targetProficiency: ProficiencyType.DEFEND_BODY,
                        },
                    },
                },
            })
            squaddieActionManager.addOrUpdate(nonWeaponAction)
        })

        it("weapon action forecast shows lower critical chance when actor has attackContributionThisTurn 1 (MAP -3)", () => {
            const baselineForecast =
                SquaddieActionForecastCalculator.forecastChanceToHit({
                    inBattleSquaddieManager,
                    actor,
                    targets: [target],
                    action: {
                        id: weaponAction.id,
                        manager: squaddieActionManager,
                    },
                })
            const criticalKeyBaseline =
                SquaddieActionForecastCalculator.getForecastKey({
                    ...target,
                    degreeOfSuccess: DegreeOfSuccess.CRITICAL,
                })
            const criticalBaseline =
                baselineForecast.get(criticalKeyBaseline) ?? 0

            inBattleSquaddieManager.incrementAttackContributionThisTurn({
                ...actor,
                amount: 1,
            })

            const penalizedForecast =
                SquaddieActionForecastCalculator.forecastChanceToHit({
                    inBattleSquaddieManager,
                    actor,
                    targets: [target],
                    action: {
                        id: weaponAction.id,
                        manager: squaddieActionManager,
                    },
                })
            const criticalKeyPenalized =
                SquaddieActionForecastCalculator.getForecastKey({
                    ...target,
                    degreeOfSuccess: DegreeOfSuccess.CRITICAL,
                })
            const criticalPenalized =
                penalizedForecast.get(criticalKeyPenalized) ?? 0

            expect(criticalPenalized).toBeLessThan(criticalBaseline)
        })

        it("weapon action forecast shows even lower critical chance when attackContributionThisTurn is 2 (MAP -6)", () => {
            const baselineForecast =
                SquaddieActionForecastCalculator.forecastChanceToHit({
                    inBattleSquaddieManager,
                    actor,
                    targets: [target],
                    action: {
                        id: weaponAction.id,
                        manager: squaddieActionManager,
                    },
                })
            const criticalKey = SquaddieActionForecastCalculator.getForecastKey(
                {
                    ...target,
                    degreeOfSuccess: DegreeOfSuccess.CRITICAL,
                }
            )
            const criticalBaseline = baselineForecast.get(criticalKey) ?? 0

            inBattleSquaddieManager.incrementAttackContributionThisTurn({
                ...actor,
                amount: 2,
            })

            const penalizedForecast =
                SquaddieActionForecastCalculator.forecastChanceToHit({
                    inBattleSquaddieManager,
                    actor,
                    targets: [target],
                    action: {
                        id: weaponAction.id,
                        manager: squaddieActionManager,
                    },
                })
            const criticalPenalized = penalizedForecast.get(criticalKey) ?? 0

            expect(criticalPenalized).toBeLessThan(criticalBaseline)
        })

        it("non-weapon action forecast is unchanged regardless of attackContributionThisTurn", () => {
            const baselineForecast =
                SquaddieActionForecastCalculator.forecastChanceToHit({
                    inBattleSquaddieManager,
                    actor,
                    targets: [target],
                    action: {
                        id: nonWeaponAction.id,
                        manager: squaddieActionManager,
                    },
                })

            inBattleSquaddieManager.incrementAttackContributionThisTurn({
                ...actor,
                amount: 3,
            })

            const penalizedForecast =
                SquaddieActionForecastCalculator.forecastChanceToHit({
                    inBattleSquaddieManager,
                    actor,
                    targets: [target],
                    action: {
                        id: nonWeaponAction.id,
                        manager: squaddieActionManager,
                    },
                })

            expect(penalizedForecast).toEqual(baselineForecast)
        })
    })

    describe("parseForecastKey", () => {
        it("parses key to extract battleSquaddieId", () => {
            const key = SquaddieActionForecastCalculator.getForecastKey({
                inBattleSquaddieId: 42,
                outOfBattleSquaddieId: "squaddie-1",
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            })

            const result =
                SquaddieActionForecastCalculator.parseForecastKey(key)

            expect(result.battleSquaddieId.inBattleSquaddieId).toBe(42)
            expect(result.battleSquaddieId.outOfBattleSquaddieId).toBe(
                "squaddie-1"
            )
        })

        it("parses key to extract degreeOfSuccess", () => {
            const key = SquaddieActionForecastCalculator.getForecastKey({
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "test",
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            })

            const result =
                SquaddieActionForecastCalculator.parseForecastKey(key)

            expect(result.degreeOfSuccess).toBe(DegreeOfSuccess.SUCCESS)
        })

        it("handles CRITICAL degree type", () => {
            const key = SquaddieActionForecastCalculator.getForecastKey({
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "test",
                degreeOfSuccess: DegreeOfSuccess.CRITICAL,
            })

            const result =
                SquaddieActionForecastCalculator.parseForecastKey(key)

            expect(result.degreeOfSuccess).toBe(DegreeOfSuccess.CRITICAL)
        })

        it("handles FAILURE degree type", () => {
            const key = SquaddieActionForecastCalculator.getForecastKey({
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "test",
                degreeOfSuccess: DegreeOfSuccess.FAILURE,
            })

            const result =
                SquaddieActionForecastCalculator.parseForecastKey(key)

            expect(result.degreeOfSuccess).toBe(DegreeOfSuccess.FAILURE)
        })

        it("handles BOTCH degree type", () => {
            const key = SquaddieActionForecastCalculator.getForecastKey({
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "test",
                degreeOfSuccess: DegreeOfSuccess.BOTCH,
            })

            const result =
                SquaddieActionForecastCalculator.parseForecastKey(key)

            expect(result.degreeOfSuccess).toBe(DegreeOfSuccess.BOTCH)
        })

        it("round trips getForecastKey and parseForecastKey", () => {
            const original = {
                inBattleSquaddieId: 123,
                outOfBattleSquaddieId: "complex-id-with-numbers-456",
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            }

            const key =
                SquaddieActionForecastCalculator.getForecastKey(original)
            const parsed =
                SquaddieActionForecastCalculator.parseForecastKey(key)

            expect(parsed.battleSquaddieId.inBattleSquaddieId).toBe(
                original.inBattleSquaddieId
            )
            expect(parsed.battleSquaddieId.outOfBattleSquaddieId).toBe(
                original.outOfBattleSquaddieId
            )
            expect(parsed.degreeOfSuccess).toBe(original.degreeOfSuccess)
        })
    })
})
