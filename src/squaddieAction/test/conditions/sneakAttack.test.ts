import { beforeEach, describe, expect, it } from "vitest"
import {
    type SquaddieAction,
    SquaddieActionService,
} from "../../squaddieAction.js"
import { SquaddieActionManager } from "../../squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../../squaddieActionCollection.js"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager.js"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { SquaddieAffiliation } from "../../../affiliation/affiliation.js"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup.js"
import type { OutOfBattleSquaddieManager } from "../../../squaddie/outOfBattle/outOfBattleSquaddieManager.js"
import { ProficiencyType } from "../../../proficiency/proficiencyLevel.js"
import {
    DegreeOfSuccess,
    type TDegreeOfSuccess,
} from "../../../degreesOfSuccess/degreeOfSuccess.js"
import {
    SquaddieConditionDecaysAt,
    SquaddieConditionService,
    SquaddieConditionSource,
    SquaddieConditionType,
} from "../../../proficiency/squaddieCondition.js"
import { SquaddieActionResultCalculator } from "../../calculate/result/squaddieActionResultCalculator.js"
import { OutOfBattleSquaddieAttributeSheetService } from "../../../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet.js"
import { AttributeScore } from "../../../proficiency/attributeScore.js"
import { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../../../coordinateMap/coordinateMapCollection.js"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap.js"

describe("Sneak Attack", () => {
    const MAP_ID = "sneak_attack_map"

    let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    let inBattleSquaddieManager: InBattleSquaddieManager
    let actionManager: SquaddieActionManager
    let actor: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }
    let target: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }

    const addOffGuardToTarget = () => {
        inBattleSquaddieManager.addConditionsToSquaddie({
            inBattleSquaddieId: target.inBattleSquaddieId,
            outOfBattleSquaddieId: target.outOfBattleSquaddieId,
            conditions: [
                SquaddieConditionService.new({
                    type: SquaddieConditionType.OFF_GUARD,
                    amount: { amount: 1 },
                    duration: {
                        duration: 1,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                    source: SquaddieConditionSource.ELEMENTAL,
                }),
            ],
        })
    }

    const giveActorPassiveSneakAttack = (sneakAttackDamage: number) => {
        outOfBattleSquaddieManager.addOrUpdateAttributeSheet(
            OutOfBattleSquaddieAttributeSheetService.new({
                id: "sheet",
                attributeScores: {
                    [AttributeScore.BODY]: 5,
                    [AttributeScore.MIND]: 5,
                    [AttributeScore.SOUL]: 5,
                },
                movement: {},
                sneakAttackDamage,
            })
        )
    }

    const getSneakAttackDamageFromResult = (
        action: SquaddieAction,
        degreeOfSuccess: TDegreeOfSuccess,
        options?: {
            coordinateMapCollectionManager?: CoordinateMapCollectionManager
            mapId?: string
        }
    ) => {
        const results = SquaddieActionResultCalculator.calculateResult({
            degreeOfSuccess,
            managers: {
                inBattleSquaddieManager,
                squaddieActionManager: actionManager,
                coordinateMapCollectionManager:
                    options?.coordinateMapCollectionManager,
            },
            actor,
            targets: [target],
            action: { id: action.id },
            map: options?.mapId ? { mapId: options.mapId } : undefined,
        })
        const targetResult = results.find(
            (r) =>
                r.inBattleSquaddieId === target.inBattleSquaddieId &&
                r.outOfBattleSquaddieId === target.outOfBattleSquaddieId
        )
        return targetResult?.damage
    }

    beforeEach(() => {
        const result =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "sheet",
                attributeSheetOptions: { rank: 0 },
            })
        outOfBattleSquaddieManager = result.manager

        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: "actor",
                name: "Actor",
                actionIds: [],
                attributeSheetId: "sheet",
                affiliation: SquaddieAffiliation.PLAYER,
            })
        )
        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            OutOfBattleSquaddieService.new({
                id: "target",
                name: "Target",
                actionIds: [],
                attributeSheetId: "sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
        )

        inBattleSquaddieManager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            outOfBattleSquaddieManager
        )

        const { inBattleSquaddieId: actorId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor",
            })
        actor = { inBattleSquaddieId: actorId, outOfBattleSquaddieId: "actor" }

        const { inBattleSquaddieId: targetId } =
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "target",
            })
        target = {
            inBattleSquaddieId: targetId,
            outOfBattleSquaddieId: "target",
        }

        actionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )
    })

    describe("action-level sneak attack", () => {
        let weaponAction: SquaddieAction

        beforeEach(() => {
            weaponAction = SquaddieActionService.new({
                id: "daggerAttack",
                name: "Dagger Attack",
                proficiency: ProficiencyType.WEAPON_NATURAL,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 1 },
                    },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: 1,
                            targetProficiency: ProficiencyType.ARMOR,
                            sneakAttackDamage: 1,
                        },
                    },
                    [DegreeOfSuccess.CRITICAL]: {
                        damage: {
                            raw: 1,
                            targetProficiency: ProficiencyType.ARMOR,
                            sneakAttackDamage: 1,
                        },
                    },
                },
            })
            actionManager.addOrUpdate(weaponAction)
        })

        it("applies sneak attack bonus when target has OFF_GUARD", () => {
            addOffGuardToTarget()
            const damage = getSneakAttackDamageFromResult(
                weaponAction,
                DegreeOfSuccess.SUCCESS
            )
            expect(damage?.raw).toBe(2)
            expect(damage?.sneakAttackDamage).toBe(1)
        })

        it("does not apply sneak attack when target is not vulnerable", () => {
            const damage = getSneakAttackDamageFromResult(
                weaponAction,
                DegreeOfSuccess.SUCCESS
            )
            expect(damage?.raw).toBe(1)
            expect(damage?.sneakAttackDamage).toBeUndefined()
        })

        it("is not automatically doubled on CRITICAL", () => {
            addOffGuardToTarget()
            const damage = getSneakAttackDamageFromResult(
                weaponAction,
                DegreeOfSuccess.CRITICAL
            )
            expect(damage?.sneakAttackDamage).toBe(1)
        })
    })

    describe("passive squaddie sneak attack", () => {
        let weaponAction: SquaddieAction

        beforeEach(() => {
            weaponAction = SquaddieActionService.new({
                id: "weaponAttack",
                name: "Weapon Attack",
                proficiency: ProficiencyType.WEAPON_NATURAL,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 1 },
                    },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: 1,
                            targetProficiency: ProficiencyType.ARMOR,
                        },
                    },
                    [DegreeOfSuccess.CRITICAL]: {
                        damage: {
                            raw: 1,
                            targetProficiency: ProficiencyType.ARMOR,
                        },
                    },
                },
            })
            actionManager.addOrUpdate(weaponAction)
        })

        it("applies passive sneak attack when target has OFF_GUARD", () => {
            giveActorPassiveSneakAttack(1)
            addOffGuardToTarget()
            const damage = getSneakAttackDamageFromResult(
                weaponAction,
                DegreeOfSuccess.SUCCESS
            )
            expect(damage?.raw).toBe(2)
            expect(damage?.sneakAttackDamage).toBe(1)
        })

        it("is doubled on CRITICAL", () => {
            giveActorPassiveSneakAttack(1)
            addOffGuardToTarget()
            const damage = getSneakAttackDamageFromResult(
                weaponAction,
                DegreeOfSuccess.CRITICAL
            )
            expect(damage?.sneakAttackDamage).toBe(2)
        })

        it("does not apply without vulnerability", () => {
            giveActorPassiveSneakAttack(1)
            const damage = getSneakAttackDamageFromResult(
                weaponAction,
                DegreeOfSuccess.SUCCESS
            )
            expect(damage?.sneakAttackDamage).toBeUndefined()
        })
    })

    describe("greater value wins between action and passive", () => {
        let weaponAction: SquaddieAction

        beforeEach(() => {
            weaponAction = SquaddieActionService.new({
                id: "weaponAttack",
                name: "Weapon Attack",
                proficiency: ProficiencyType.WEAPON_NATURAL,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 1 },
                    },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: 1,
                            targetProficiency: ProficiencyType.ARMOR,
                            sneakAttackDamage: 1,
                        },
                    },
                },
            })
            actionManager.addOrUpdate(weaponAction)
        })

        it("passive wins when passive (2) > action (1) on SUCCESS", () => {
            giveActorPassiveSneakAttack(2)
            addOffGuardToTarget()
            const damage = getSneakAttackDamageFromResult(
                weaponAction,
                DegreeOfSuccess.SUCCESS
            )
            expect(damage?.sneakAttackDamage).toBe(2)
        })

        it("on CRITICAL passive doubles to 4 and beats action 3", () => {
            const critWeaponAction = SquaddieActionService.new({
                id: "critWeapon",
                name: "Crit Weapon",
                proficiency: ProficiencyType.WEAPON_NATURAL,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 1 },
                    },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: 1,
                            targetProficiency: ProficiencyType.ARMOR,
                            sneakAttackDamage: 3,
                        },
                    },
                    [DegreeOfSuccess.CRITICAL]: {
                        damage: {
                            raw: 2,
                            targetProficiency: ProficiencyType.ARMOR,
                            sneakAttackDamage: 3,
                        },
                    },
                },
            })
            actionManager.addOrUpdate(critWeaponAction)

            giveActorPassiveSneakAttack(2)
            addOffGuardToTarget()

            const successDamage = getSneakAttackDamageFromResult(
                critWeaponAction,
                DegreeOfSuccess.SUCCESS
            )
            expect(successDamage?.sneakAttackDamage).toBe(3)

            const critDamage = getSneakAttackDamageFromResult(
                critWeaponAction,
                DegreeOfSuccess.CRITICAL
            )
            expect(critDamage?.sneakAttackDamage).toBe(4)
        })
    })

    describe("non-weapon action", () => {
        it("does not apply sneak attack for SKILL_BODY actions", () => {
            const bodyAction = SquaddieActionService.new({
                id: "bodyAttack",
                name: "Body Attack",
                proficiency: ProficiencyType.SKILL_BODY,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 1 },
                    },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: 1,
                            targetProficiency: ProficiencyType.DEFEND_BODY,
                            sneakAttackDamage: 1,
                        },
                    },
                },
            })
            actionManager.addOrUpdate(bodyAction)

            addOffGuardToTarget()
            const damage = getSneakAttackDamageFromResult(
                bodyAction,
                DegreeOfSuccess.SUCCESS
            )
            expect(damage?.sneakAttackDamage).toBeUndefined()
            expect(damage?.raw).toBe(1)
        })
    })

    describe("no damage effect", () => {
        it("does not produce sneak attack when action has no damage", () => {
            const conditionAction = SquaddieActionService.new({
                id: "conditionAction",
                name: "Condition Action",
                proficiency: ProficiencyType.WEAPON_NATURAL,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 1 },
                    },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        conditions: {
                            add: [
                                SquaddieConditionService.new({
                                    type: SquaddieConditionType.OFF_GUARD,
                                    amount: { amount: 1 },
                                    duration: {
                                        duration: 1,
                                        decaysAt:
                                            SquaddieConditionDecaysAt.TURN_END,
                                    },
                                    source: SquaddieConditionSource.ELEMENTAL,
                                }),
                            ],
                        },
                    },
                },
            })
            actionManager.addOrUpdate(conditionAction)

            addOffGuardToTarget()
            const results = SquaddieActionResultCalculator.calculateResult({
                degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                managers: {
                    inBattleSquaddieManager,
                    squaddieActionManager: actionManager,
                },
                actor,
                targets: [target],
                action: { id: conditionAction.id },
            })
            const targetResult = results.find(
                (r) =>
                    r.inBattleSquaddieId === target.inBattleSquaddieId &&
                    r.outOfBattleSquaddieId === target.outOfBattleSquaddieId
            )
            expect(targetResult?.damage).toBeUndefined()
        })
    })

    describe("flanking triggers sneak attack", () => {
        let weaponAction: SquaddieAction
        let coordinateMapCollectionManager: CoordinateMapCollectionManager
        let ally: { inBattleSquaddieId: number; outOfBattleSquaddieId: string }

        beforeEach(() => {
            weaponAction = SquaddieActionService.new({
                id: "daggerAttack",
                name: "Dagger Attack",
                proficiency: ProficiencyType.WEAPON_NATURAL,
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 1 },
                    },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: 1,
                            targetProficiency: ProficiencyType.ARMOR,
                            sneakAttackDamage: 1,
                        },
                    },
                    [DegreeOfSuccess.CRITICAL]: {
                        damage: {
                            raw: 1,
                            targetProficiency: ProficiencyType.ARMOR,
                            sneakAttackDamage: 1,
                        },
                    },
                },
            })
            actionManager.addOrUpdate(weaponAction)

            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "ally",
                    name: "Ally",
                    actionIds: [],
                    attributeSheetId: "sheet",
                    affiliation: SquaddieAffiliation.ALLY,
                })
            )
            const { inBattleSquaddieId: allyId } =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "ally",
                })
            ally = {
                inBattleSquaddieId: allyId,
                outOfBattleSquaddieId: "ally",
            }

            const map = CoordinateMapService.new({
                id: MAP_ID,
                name: "Flanking Map",
                movementProperties: ["1 1 1"],
            })
            coordinateMapCollectionManager = new CoordinateMapCollectionManager(
                CoordinateMapCollectionService.new()
            )
            coordinateMapCollectionManager.addOrUpdate({ map })
            coordinateMapCollectionManager.addSquaddie({
                mapId: MAP_ID,
                squaddieId: actor,
                coordinate: { row: 0, col: 0 },
            })
            coordinateMapCollectionManager.addSquaddie({
                mapId: MAP_ID,
                squaddieId: target,
                coordinate: { row: 0, col: 1 },
            })
            coordinateMapCollectionManager.addSquaddie({
                mapId: MAP_ID,
                squaddieId: ally,
                coordinate: { row: 0, col: 2 },
            })
        })

        it("applies sneak attack when actor is flanking (no OFF_GUARD condition)", () => {
            const damage = getSneakAttackDamageFromResult(
                weaponAction,
                DegreeOfSuccess.SUCCESS,
                {
                    coordinateMapCollectionManager,
                    mapId: MAP_ID,
                }
            )
            expect(damage?.sneakAttackDamage).toBe(1)
        })

        it("passive sneak attack is doubled on CRITICAL when flanking", () => {
            giveActorPassiveSneakAttack(1)
            const damage = getSneakAttackDamageFromResult(
                weaponAction,
                DegreeOfSuccess.CRITICAL,
                {
                    coordinateMapCollectionManager,
                    mapId: MAP_ID,
                }
            )
            expect(damage?.sneakAttackDamage).toBe(2)
        })
    })

    describe("ActionModifierBreakdown.sneakAttackDamage in forecast", () => {
        let weaponAction: SquaddieAction

        beforeEach(() => {
            weaponAction = SquaddieActionService.new({
                id: "daggerAttack",
                name: "Dagger Attack",
                proficiency: ProficiencyType.WEAPON_NATURAL,
                degreesOfSuccess: [
                    DegreeOfSuccess.CRITICAL,
                    DegreeOfSuccess.SUCCESS,
                    DegreeOfSuccess.FAILURE,
                    DegreeOfSuccess.BOTCH,
                ],
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: { spent: 1 },
                    },
                },
                effectOnTarget: {
                    [DegreeOfSuccess.SUCCESS]: {
                        damage: {
                            raw: 1,
                            targetProficiency: ProficiencyType.ARMOR,
                            sneakAttackDamage: 1,
                        },
                    },
                },
            })
            actionManager.addOrUpdate(weaponAction)
        })

        it("shows sneakAttackDamage in modifierBreakdown when target is OFF_GUARD", () => {
            addOffGuardToTarget()
            const forecastResults =
                SquaddieActionResultCalculator.calculateForecastedResults({
                    actor,
                    targets: [target],
                    action: { id: weaponAction.id, manager: actionManager },
                    inBattleSquaddieManager,
                })

            const successResult = forecastResults.find(
                (r) =>
                    r.battleSquaddieId.inBattleSquaddieId ===
                        target.inBattleSquaddieId &&
                    r.degreeOfSuccess === DegreeOfSuccess.SUCCESS
            )
            expect(successResult?.modifierBreakdown?.sneakAttackDamage).toBe(1)
        })

        it("sneakAttackDamage is undefined in modifierBreakdown when target is not vulnerable", () => {
            const forecastResults =
                SquaddieActionResultCalculator.calculateForecastedResults({
                    actor,
                    targets: [target],
                    action: { id: weaponAction.id, manager: actionManager },
                    inBattleSquaddieManager,
                })

            const successResult = forecastResults.find(
                (r) =>
                    r.battleSquaddieId.inBattleSquaddieId ===
                        target.inBattleSquaddieId &&
                    r.degreeOfSuccess === DegreeOfSuccess.SUCCESS
            )
            expect(
                successResult?.modifierBreakdown?.sneakAttackDamage
            ).toBeUndefined()
        })
    })
})
