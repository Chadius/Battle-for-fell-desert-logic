import { beforeEach, describe, expect, it } from "vitest"
import { MissionManager } from "../missionManager.js"
import { type MissionState, MissionStateService } from "../missionState.js"
import { SquaddieAffiliation } from "../../affiliation/affiliation.js"
import { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager.js"
import { OutOfBattleSquaddieService } from "../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { InBattleSquaddieCollectionService } from "../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { OutOfBattleSquaddieTestSetup } from "../../testUtils/outOfBattleSquaddieTestSetup.js"
import { SquaddieActionManager } from "../../squaddieAction/squaddieActionManager.js"
import { SquaddieActionCollectionService } from "../../squaddieAction/squaddieActionCollection.js"
import { SquaddieActionService } from "../../squaddieAction/squaddieAction.js"
import {
    ProficiencyLevel,
    ProficiencyType,
} from "../../proficiency/proficiencyLevel.js"
import { CoordinateMapCollectionManager } from "../../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../../coordinateMap/coordinateMapCollection.js"
import { CoordinateMapService } from "../../coordinateMap/coordinateMap.js"
import { RollGenerator } from "../../squaddieAction/calculate/roll/rollGenerator.js"
import { ActionRange } from "../../squaddieAction/actionRange.js"
import { CoordinateGeneratorShape } from "../../coordinateMap/shape.js"
import { MissionAffiliationTurn, MissionTurnService } from "../missionTurn.js"
import type { OutOfBattleSquaddieManager } from "../../squaddie/outOfBattle/outOfBattleSquaddieManager.js"
import type { BattleSquaddieId } from "../../squaddie/inBattle/battleSquaddieId.js"

describe("MissionManager", () => {
    describe("useActionAndGetResults", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let squaddieActionManager: SquaddieActionManager
        let coordinateMapCollectionManager: CoordinateMapCollectionManager
        let actorSquaddieId: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
        let targetSquaddieId: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
        let deterministicRollGenerator: RollGenerator

        beforeEach(() => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "actor_sheet",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            items: { maxCapacity: 0 },
                        },
                    }
                )

            const targetAttributeSheet =
                OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
                    id: "target_sheet",
                    maxHitPoints: 10,
                    items: { maxCapacity: 0 },
                })
            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(
                targetAttributeSheet
            )

            const actorOutOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "actor",
                name: "Actor",
                affiliation: SquaddieAffiliation.PLAYER,
                attributeSheetId: "actor_sheet",
            })

            const targetOutOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "target",
                name: "Target",
                affiliation: SquaddieAffiliation.ENEMY,
                attributeSheetId: "target_sheet",
            })

            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                actorOutOfBattleSquaddie
            )
            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                targetOutOfBattleSquaddie
            )

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            actorSquaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor",
            })

            targetSquaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "target",
            })

            const attackAction = SquaddieActionService.new({
                id: "attack",
                name: "Attack",
                targeting: {
                    range: ActionRange.MELEE,
                    shape: CoordinateGeneratorShape.BLOOM,
                    affiliationRelationship: {
                        self: false,
                        foe: true,
                        friend: false,
                    },
                },
                effectOnActor: {
                    SUCCESS: {},
                },
                effectOnTarget: {
                    SUCCESS: {
                        damage: {
                            raw: 2,
                            targetProficiency: ProficiencyType.SKILL_BODY,
                        },
                    },
                },
            })

            squaddieActionManager = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )
            squaddieActionManager.addOrUpdate(attackAction)

            const map = CoordinateMapService.new({
                id: "test_map",
                name: "test map",
                movementProperties: ["1 1 1 "],
            })

            coordinateMapCollectionManager = new CoordinateMapCollectionManager(
                CoordinateMapCollectionService.new()
            )
            coordinateMapCollectionManager.addOrUpdate({ map })

            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: actorSquaddieId,
                coordinate: { row: 0, col: 0 },
            })

            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: targetSquaddieId,
                coordinate: { row: 0, col: 1 },
            })

            deterministicRollGenerator = new RollGenerator([3, 3])
        })

        it("calculates results and applies them to squaddies", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const manager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
                coordinateMapCollectionManager: coordinateMapCollectionManager,
                squaddieActionManager: squaddieActionManager,
            })

            const targetHPBefore =
                inBattleSquaddieManager.getSquaddie(targetSquaddieId)
                    .inBattleSquaddie.hitPoints.current

            const results = manager.useActionAndGetResults({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: {
                    id: "attack",
                },
                rollGenerator: deterministicRollGenerator,
            })

            expect(results.actorRoll).toEqual([3, 3])
            expect(results.targetResults.size).toBeGreaterThan(0)

            const targetHPAfter =
                inBattleSquaddieManager.getSquaddie(targetSquaddieId)
                    .inBattleSquaddie.hitPoints.current

            expect(targetHPAfter).toBeLessThan(targetHPBefore)
        })

        it("returns calculation results with rolls and degrees of success", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const manager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
                coordinateMapCollectionManager: coordinateMapCollectionManager,
                squaddieActionManager: squaddieActionManager,
            })

            const results = manager.useActionAndGetResults({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: {
                    id: "attack",
                },
                rollGenerator: deterministicRollGenerator,
            })

            expect(results).toHaveProperty("actorRoll")
            expect(results).toHaveProperty("targetResults")
            expect(results.actorRoll).toEqual([3, 3])

            for (const [_key, targetResult] of results.targetResults) {
                expect(targetResult).toHaveProperty("degreeOfSuccess")
                expect(targetResult).toHaveProperty("squaddieActionResults")
                expect(Array.isArray(targetResult.squaddieActionResults)).toBe(
                    true
                )
            }
        })

        it("throws when state is undefined", () => {
            const manager = new MissionManager({})

            expect(() =>
                manager.useActionAndGetResults({
                    actor: actorSquaddieId,
                    targets: [targetSquaddieId],
                    action: { id: "attack" },
                    rollGenerator: deterministicRollGenerator,
                })
            ).toThrow(
                "[MissionManager.useActionAndGetResults]: state must be defined"
            )
        })

        it("throws when inBattleSquaddieManager is undefined", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const manager = new MissionManager({ missionState: missionState })

            expect(() =>
                manager.useActionAndGetResults({
                    actor: actorSquaddieId,
                    targets: [targetSquaddieId],
                    action: { id: "attack" },
                    rollGenerator: deterministicRollGenerator,
                })
            ).toThrow(
                "[MissionManager.useActionAndGetResults]: inBattleSquaddieManager must be defined"
            )
        })

        it("throws when squaddieActionManager is undefined", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const manager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
                coordinateMapCollectionManager: coordinateMapCollectionManager,
            })

            expect(() =>
                manager.useActionAndGetResults({
                    actor: actorSquaddieId,
                    targets: [targetSquaddieId],
                    action: { id: "attack" },
                    rollGenerator: deterministicRollGenerator,
                })
            ).toThrow(
                "[MissionManager.useActionAndGetResults]: squaddieActionManager must be defined"
            )
        })

        it("throws when coordinateMapCollectionManager is undefined", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })

            const manager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
                coordinateMapCollectionManager: undefined,
                squaddieActionManager: squaddieActionManager,
            })

            expect(() =>
                manager.useActionAndGetResults({
                    actor: actorSquaddieId,
                    targets: [targetSquaddieId],
                    action: { id: "attack" },
                    rollGenerator: deterministicRollGenerator,
                })
            ).toThrow(
                "[MissionManager.useActionAndGetResults]: coordinateMapCollectionManager must be defined"
            )
        })

        it("should remove defeated squaddies from the map", () => {
            const fatalAttackAction = SquaddieActionService.new({
                id: "fatal-attack",
                name: "Fatal Attack",
                targeting: {
                    range: ActionRange.MELEE,
                    shape: CoordinateGeneratorShape.BLOOM,
                    affiliationRelationship: {
                        self: false,
                        foe: true,
                        friend: false,
                    },
                },
                effectOnActor: {
                    SUCCESS: {},
                },
                effectOnTarget: {
                    SUCCESS: {
                        damage: {
                            raw: 100,
                            targetProficiency: ProficiencyType.SKILL_BODY,
                        },
                    },
                },
            })
            squaddieActionManager.addOrUpdate(fatalAttackAction)

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })
            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
            })

            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: actorSquaddieId,
                coordinate: { row: 0, col: 0 },
            })
            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: targetSquaddieId,
                coordinate: { row: 0, col: 1 },
            })

            manager.useActionAndGetResults({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: "fatal-attack" },
                rollGenerator: deterministicRollGenerator,
            })

            expect(
                inBattleSquaddieManager.isSquaddieDefeated(targetSquaddieId)
            ).toBe(true)
            expect(
                coordinateMapCollectionManager.getSquaddieCoordinate({
                    mapId: "test_map",
                    squaddieId: targetSquaddieId,
                })
            ).toBeUndefined()
        })
    })

    describe("undoLastAction", () => {
        let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
        let inBattleSquaddieManager: InBattleSquaddieManager
        let coordinateMapCollectionManager: CoordinateMapCollectionManager
        let squaddieActionManager: SquaddieActionManager
        let missionState: MissionState
        let manager: MissionManager
        let squaddieId: BattleSquaddieId

        beforeEach(() => {
            ;({ manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "attr-sheet-1",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            proficiencyLevels: {
                                [ProficiencyType.DEFEND_BODY]:
                                    ProficiencyLevel.NOVICE,
                                [ProficiencyType.SKILL_BODY]:
                                    ProficiencyLevel.EXPERT,
                            },
                        },
                    }
                ))

            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "squaddie-1",
                    attributeSheetId: "attr-sheet-1",
                    affiliation: SquaddieAffiliation.PLAYER,
                    name: "squaddie-1",
                })
            )

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            squaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "squaddie-1",
            })

            let coordinateMapCollection = CoordinateMapCollectionService.new()
            coordinateMapCollection =
                CoordinateMapCollectionService.addOrUpdate({
                    collection: coordinateMapCollection,
                    map: CoordinateMapService.new({
                        id: "map-1",
                        name: "test map",
                        movementProperties: ["1 1 1 "],
                    }),
                })

            coordinateMapCollectionManager = new CoordinateMapCollectionManager(
                coordinateMapCollection
            )

            const squaddieActionCollection =
                SquaddieActionCollectionService.new()

            squaddieActionManager = new SquaddieActionManager(
                squaddieActionCollection
            )

            squaddieActionManager.addOrUpdate({
                id: "attack",
                name: "Attack",
                actionType: { isDamaging: true },
                actionEffects: [
                    {
                        actionDamageAmount: { damage: 3 },
                    },
                ],
            } as any)

            missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
            })

            manager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
                coordinateMapCollectionManager: coordinateMapCollectionManager,
                squaddieActionManager: squaddieActionManager,
            })
        })

        it("returns undefined if no history exists", () => {
            const result = manager.undoLastAction({
                reversingResults: [],
            })

            expect(result.removedAction).toBeUndefined()
        })

        it("returns undefined if history exists but current turn is empty", () => {
            manager.recordAction({
                action: squaddieActionManager.get("attack"),
                results: [squaddieId],
            })

            expect(manager.missionState?.history).toBeDefined()

            manager.missionState = {
                ...manager.missionState!,
                turn: {
                    ...manager.missionState!.turn,
                    turnCount: 99,
                },
            }

            const result = manager.undoLastAction({
                reversingResults: [],
            })

            expect(result.removedAction).toBeUndefined()
        })

        it("removes last action from history", () => {
            const action = squaddieActionManager.get("attack")
            manager.recordAction({
                action,
                results: [squaddieId],
            })

            expect(manager.getTotalActionCount()).toBe(1)

            const result = manager.undoLastAction({
                reversingResults: [],
            })

            expect(result.removedAction).toBeDefined()
            expect(result.removedAction?.action.id).toBe("attack")
            expect(manager.getTotalActionCount()).toBe(0)
        })

        it("applies reversing results without recording them", () => {
            const action = squaddieActionManager.get("attack")

            manager.recordAction({
                action,
                results: [squaddieId],
            })

            expect(manager.getTotalActionCount()).toBe(1)

            manager.undoLastAction({
                reversingResults: [
                    {
                        ...squaddieId,
                        healing: {
                            net: 3,
                            raw: 3,
                        },
                    },
                ],
            })

            expect(manager.getTotalActionCount()).toBe(0)
        })

        it("only removes last action when multiple actions exist", () => {
            const action = squaddieActionManager.get("attack")

            manager.recordAction({
                action,
                results: [squaddieId],
            })

            manager.recordAction({
                action,
                results: [squaddieId],
            })

            manager.recordAction({
                action,
                results: [squaddieId],
            })

            expect(manager.getTotalActionCount()).toBe(3)

            manager.undoLastAction({
                reversingResults: [],
            })

            expect(manager.getTotalActionCount()).toBe(2)
        })

        it("cleans up empty squaddie records after removing last action", () => {
            const action = squaddieActionManager.get("attack")

            manager.recordAction({
                action,
                results: [squaddieId],
            })

            expect(
                manager.missionState?.history?.turns[0].squaddieTurnRecords
            ).toHaveLength(1)

            manager.undoLastAction({
                reversingResults: [],
            })

            expect(manager.missionState?.history?.turns).toHaveLength(1)
            expect(
                manager.missionState?.history?.turns[0].squaddieTurnRecords
            ).toHaveLength(0)
        })

        it("throws error if missionState is undefined", () => {
            manager.missionState = undefined

            expect(() =>
                manager.undoLastAction({
                    reversingResults: [],
                })
            ).toThrow("[MissionManager.undoLastAction]: state must be defined")
        })

        it("throws error if inBattleSquaddieManager is undefined", () => {
            manager.inBattleSquaddieManager = undefined

            expect(() =>
                manager.undoLastAction({
                    reversingResults: [],
                })
            ).toThrow(
                "[MissionManager.undoLastAction]: inBattleSquaddieManager must be defined"
            )
        })

        it("throws error if coordinateMapCollectionManager is undefined", () => {
            manager.coordinateMapCollectionManager = undefined

            expect(() =>
                manager.undoLastAction({
                    reversingResults: [],
                })
            ).toThrow(
                "[MissionManager.undoLastAction]: coordinateMapCollectionManager must be defined"
            )
        })
    })

    describe("Multiple Attack Penalty (MAP) in useActionAndGetResults", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let squaddieActionManager: SquaddieActionManager
        let coordinateMapCollectionManager: CoordinateMapCollectionManager
        let actorSquaddieId: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
        let targetSquaddieId: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }
        let weaponActionId: string
        let nonWeaponActionId: string
        let flurryActionId: string

        beforeEach(() => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "actor_sheet",
                        attributeSheetOptions: {
                            maxHitPoints: 20,
                            items: { maxCapacity: 0 },
                        },
                    }
                )

            const targetAttributeSheet =
                OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
                    id: "target_sheet",
                    maxHitPoints: 20,
                    items: { maxCapacity: 0 },
                })
            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(
                targetAttributeSheet
            )

            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "actor",
                    name: "Actor",
                    affiliation: SquaddieAffiliation.PLAYER,
                    attributeSheetId: "actor_sheet",
                })
            )
            outOfBattleSquaddieManager.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "target",
                    name: "Target",
                    affiliation: SquaddieAffiliation.ENEMY,
                    attributeSheetId: "target_sheet",
                })
            )

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            actorSquaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "actor",
            })
            targetSquaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "target",
            })

            squaddieActionManager = new SquaddieActionManager(
                SquaddieActionCollectionService.new()
            )

            weaponActionId = "weapon-attack"
            squaddieActionManager.addOrUpdate(
                SquaddieActionService.new({
                    id: weaponActionId,
                    name: "Weapon Attack",
                    proficiency: ProficiencyType.WEAPON_MARTIAL,
                    targeting: {
                        range: ActionRange.MELEE,
                        shape: CoordinateGeneratorShape.BLOOM,
                        affiliationRelationship: {
                            self: false,
                            foe: true,
                            friend: false,
                        },
                    },
                    effectOnActor: {
                        SUCCESS: { actionPoints: { spent: 1 } },
                    },
                    effectOnTarget: {
                        SUCCESS: {
                            damage: {
                                raw: 1,
                                targetProficiency: ProficiencyType.ARMOR,
                            },
                        },
                    },
                })
            )

            nonWeaponActionId = "non-weapon"
            squaddieActionManager.addOrUpdate(
                SquaddieActionService.new({
                    id: nonWeaponActionId,
                    name: "Non-Weapon",
                    proficiency: ProficiencyType.SKILL_BODY,
                    targeting: {
                        range: ActionRange.MELEE,
                        shape: CoordinateGeneratorShape.BLOOM,
                        affiliationRelationship: {
                            self: false,
                            foe: true,
                            friend: false,
                        },
                    },
                    effectOnActor: {
                        SUCCESS: { actionPoints: { spent: 1 } },
                    },
                    effectOnTarget: {
                        SUCCESS: {
                            damage: {
                                raw: 1,
                                targetProficiency: ProficiencyType.SKILL_BODY,
                            },
                        },
                    },
                })
            )

            flurryActionId = "flurry"
            squaddieActionManager.addOrUpdate(
                SquaddieActionService.new({
                    id: flurryActionId,
                    name: "Flurry",
                    proficiency: ProficiencyType.WEAPON_MARTIAL,
                    multipleAttackPenalty: { contribution: 2 },
                    targeting: {
                        range: ActionRange.MELEE,
                        shape: CoordinateGeneratorShape.BLOOM,
                        affiliationRelationship: {
                            self: false,
                            foe: true,
                            friend: false,
                        },
                    },
                    effectOnActor: {
                        SUCCESS: { actionPoints: { spent: 2 } },
                    },
                    effectOnTarget: {
                        SUCCESS: {
                            damage: {
                                raw: 1,
                                targetProficiency: ProficiencyType.ARMOR,
                            },
                        },
                    },
                })
            )

            const map = CoordinateMapService.new({
                id: "test_map",
                name: "test map",
                movementProperties: ["1 1 1 "],
            })

            coordinateMapCollectionManager = new CoordinateMapCollectionManager(
                CoordinateMapCollectionService.new()
            )
            coordinateMapCollectionManager.addOrUpdate({ map })
            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: actorSquaddieId,
                coordinate: { row: 0, col: 0 },
            })
            coordinateMapCollectionManager.addSquaddie({
                mapId: "test_map",
                squaddieId: targetSquaddieId,
                coordinate: { row: 0, col: 1 },
            })
        })

        it("attackContributionThisTurn increments by 1 after a weapon action", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })
            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
            })

            expect(
                inBattleSquaddieManager.getAttackContributionThisTurn(
                    actorSquaddieId
                )
            ).toBe(0)

            manager.useActionAndGetResults({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: weaponActionId },
                rollGenerator: new RollGenerator([3, 3]),
            })

            expect(
                inBattleSquaddieManager.getAttackContributionThisTurn(
                    actorSquaddieId
                )
            ).toBe(1)
        })

        it("attackContributionThisTurn increments to 2 after two weapon actions", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })
            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
            })

            manager.useActionAndGetResults({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: weaponActionId },
                rollGenerator: new RollGenerator([3, 3]),
            })
            manager.useActionAndGetResults({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: weaponActionId },
                rollGenerator: new RollGenerator([3, 3]),
            })

            expect(
                inBattleSquaddieManager.getAttackContributionThisTurn(
                    actorSquaddieId
                )
            ).toBe(2)
        })

        it("non-weapon action does not increment attackContributionThisTurn", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })
            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
            })

            manager.useActionAndGetResults({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: nonWeaponActionId },
                rollGenerator: new RollGenerator([3, 3]),
            })

            expect(
                inBattleSquaddieManager.getAttackContributionThisTurn(
                    actorSquaddieId
                )
            ).toBe(0)
        })

        it("flurry action (mapContribution 2) increments attackContributionThisTurn by 2", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
            })
            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
            })

            manager.useActionAndGetResults({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: flurryActionId },
                rollGenerator: new RollGenerator([3, 3]),
            })

            expect(
                inBattleSquaddieManager.getAttackContributionThisTurn(
                    actorSquaddieId
                )
            ).toBe(2)
        })

        it("attackContributionThisTurn resets to 0 when resetAttackContributionThisTurn is called", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "test_map",
                turn: MissionTurnService.new({
                    missionAffiliationTurn: MissionAffiliationTurn.PLAYER_TURN,
                }),
            })
            const manager = new MissionManager({
                missionState,
                inBattleSquaddieManager,
                coordinateMapCollectionManager,
                squaddieActionManager,
            })

            manager.useActionAndGetResults({
                actor: actorSquaddieId,
                targets: [targetSquaddieId],
                action: { id: weaponActionId },
                rollGenerator: new RollGenerator([3, 3]),
            })
            expect(
                inBattleSquaddieManager.getAttackContributionThisTurn(
                    actorSquaddieId
                )
            ).toBe(1)

            inBattleSquaddieManager.resetAttackContributionThisTurn(
                actorSquaddieId
            )

            expect(
                inBattleSquaddieManager.getAttackContributionThisTurn(
                    actorSquaddieId
                )
            ).toBe(0)
        })
    })
})
