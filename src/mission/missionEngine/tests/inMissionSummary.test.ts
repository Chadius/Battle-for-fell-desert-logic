import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { SquaddieAffiliation } from "../../../affiliation/affiliation"
import {
    type BattleSquaddieId,
    InBattleSquaddieManager,
} from "../../../squaddie/inBattle/inBattleSquaddieManager"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection"
import { MissionObjectiveService } from "../../missionObjective"
import { MissionObjectiveRewardService } from "../../missionObjectiveReward"
import { MissionObjectiveCriteriaService } from "../../missionObjectiveCriteria"
import { MissionStateService } from "../../missionState"
import { MissionManager } from "../../missionManager"

describe("InMissionSummary", () => {
    describe("getInMissionSummary", () => {
        it("throws error if MissionManager is undefined", () => {
            const missionEngine = new MissionEngine()

            expect(() => missionEngine.getInMissionSummary()).toThrow(
                "missionManager is undefined"
            )
        })

        it("returns InMissionSummary from MissionManager", () => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "test sheet",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            distancePerAction: 1,
                            items: { maxCapacity: 0 },
                        },
                    }
                )

            const enemySquaddie = OutOfBattleSquaddieService.new({
                id: "enemy-1",
                name: "Enemy",
                actionIds: [],
                attributeSheetId: "test sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(enemySquaddie)

            const inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )
            const squaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy-1",
            })

            const missionObjective = MissionObjectiveService.new({
                id: "obj-1",
                rewards: [MissionObjectiveRewardService.newMissionEndsReward()],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [missionObjective],
            })

            const missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
            })
            const missionEngine = new MissionEngine(missionManager)

            inBattleSquaddieManager.dealDamageToSquaddie({
                ...squaddieId,
                damage: { amount: 3, type: undefined },
            })

            const inMissionSummary = missionEngine.getInMissionSummary()

            expect(inMissionSummary.missionObjectives).toHaveLength(1)
            expect(inMissionSummary.missionObjectives[0].id).toBe("obj-1")
            expect(
                inMissionSummary.inBattleSquaddieCollection.byOutOfBattleSquaddieId.get(
                    "enemy-1"
                )![0].hitPoints.current
            ).toBe(7)
        })
    })

    describe("getSerializedInMissionSummary", () => {
        it("throws error if MissionManager is undefined", () => {
            const missionEngine = new MissionEngine()

            expect(() => missionEngine.getSerializedInMissionSummary()).toThrow(
                "missionManager is undefined"
            )
        })

        it("returns serializable summary with plain objects", () => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "test sheet",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            distancePerAction: 1,
                            items: { maxCapacity: 0 },
                        },
                    }
                )

            const enemySquaddie = OutOfBattleSquaddieService.new({
                id: "enemy-1",
                name: "Enemy",
                actionIds: [],
                attributeSheetId: "test sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(enemySquaddie)

            const inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )
            const squaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy-1",
            })

            inBattleSquaddieManager.dealDamageToSquaddie({
                ...squaddieId,
                damage: { amount: 4, type: undefined },
            })

            const missionObjective = MissionObjectiveService.new({
                id: "obj-1",
                rewards: [MissionObjectiveRewardService.newMissionEndsReward()],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [missionObjective],
            })

            const missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
            })
            const missionEngine = new MissionEngine(missionManager)

            const serializable = missionEngine.getSerializedInMissionSummary()

            expect(serializable.missionObjectives).toHaveLength(1)
            expect(serializable.missionObjectives[0].id).toBe("obj-1")
            expect(
                serializable.inBattleSquaddieCollection.byOutOfBattleSquaddieId
            ).not.toBeInstanceOf(Map)
            expect(
                serializable.inBattleSquaddieCollection.byOutOfBattleSquaddieId[
                    "enemy-1"
                ][0].hitPoints.current
            ).toBe(6)
        })

        it("can serialize into a JSON string", () => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "test sheet",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            distancePerAction: 1,
                            items: { maxCapacity: 0 },
                        },
                    }
                )

            const enemySquaddie = OutOfBattleSquaddieService.new({
                id: "enemy-1",
                name: "Enemy",
                actionIds: [],
                attributeSheetId: "test sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(enemySquaddie)

            const inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )
            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy-1",
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
            })

            const missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
            })
            const missionEngine = new MissionEngine(missionManager)

            const serializable = missionEngine.getSerializedInMissionSummary()
            const jsonString = JSON.stringify(serializable)
            const parsed = JSON.parse(jsonString)

            expect(parsed.inBattleSquaddieCollection).toBeDefined()
            expect(
                parsed.inBattleSquaddieCollection.byOutOfBattleSquaddieId[
                    "enemy-1"
                ]
            ).toHaveLength(1)
        })
    })

    describe("loadSerializedInMissionSummary", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let missionManager: MissionManager
        let missionEngine: MissionEngine
        let squaddieId: BattleSquaddieId

        beforeEach(() => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "test sheet",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            distancePerAction: 1,
                            items: { maxCapacity: 0 },
                        },
                    }
                )

            const enemySquaddie = OutOfBattleSquaddieService.new({
                id: "enemy-1",
                name: "Enemy",
                actionIds: [],
                attributeSheetId: "test sheet",
                affiliation: SquaddieAffiliation.ENEMY,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(enemySquaddie)

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            squaddieId = inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy-1",
            })

            const missionObjective = MissionObjectiveService.new({
                id: "obj-1",
                rewards: [MissionObjectiveRewardService.newMissionEndsReward()],
                criteria: [
                    MissionObjectiveCriteriaService.newSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [missionObjective],
            })

            missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
            })
            missionEngine = new MissionEngine(missionManager)
        })

        it("throws error if MissionManager is undefined", () => {
            const engine = new MissionEngine()

            expect(() =>
                engine.loadSerializedInMissionSummary({
                    missionObjectives: [],
                    inBattleSquaddieCollection: { byOutOfBattleSquaddieId: {} },
                    recentPhaseTransitions: [],
                })
            ).toThrow("missionManager is undefined")
        })

        it("restores squaddie state from serializable summary", () => {
            const savedState = {
                missionObjectives: [
                    { id: "obj-1", isCompleted: false, hasGivenReward: false },
                ],
                inBattleSquaddieCollection: {
                    byOutOfBattleSquaddieId: {
                        "enemy-1": [
                            {
                                id: 0,
                                outOfBattleSquaddieId: "enemy-1",
                                name: "Enemy",
                                hitPoints: { max: 10, current: 3 },
                                conditions: {},
                                actionPoints: { current: 1 },
                                actionIds: { natural: [] },
                                itemIdsUsed: [],
                            },
                        ],
                    },
                },
                recentPhaseTransitions: [],
            }

            missionEngine.loadSerializedInMissionSummary(savedState)

            const hitPoints = inBattleSquaddieManager.getHitPoints(squaddieId)
            expect(hitPoints.current).toBe(3)

            const actionPoints =
                inBattleSquaddieManager.getActionPoints(squaddieId)
            expect(actionPoints.current).toBe(1)
        })

        it("restores objective hasGivenReward flag", () => {
            const savedState = {
                missionObjectives: [
                    { id: "obj-1", isCompleted: true, hasGivenReward: true },
                ],
                inBattleSquaddieCollection: {
                    byOutOfBattleSquaddieId: {
                        "enemy-1": [
                            {
                                id: 0,
                                outOfBattleSquaddieId: "enemy-1",
                                name: "Enemy",
                                hitPoints: { max: 10, current: 0 },
                                conditions: {},
                                actionPoints: { current: 3 },
                                actionIds: { natural: [] },
                                itemIdsUsed: [],
                            },
                        ],
                    },
                },
                recentPhaseTransitions: [],
            }

            missionEngine.loadSerializedInMissionSummary(savedState)

            expect(
                missionManager.missionState!.objectives[0].hasGivenReward
            ).toBe(true)
        })

        it("round-trip preserves state via getSerializedInMissionSummary and loadSerializedInMissionSummary", () => {
            inBattleSquaddieManager.dealDamageToSquaddie({
                ...squaddieId,
                damage: { amount: 6, type: undefined },
            })
            inBattleSquaddieManager.spendActionPoints({
                ...squaddieId,
                actionPoints: 2,
            })

            const originalHitPoints =
                inBattleSquaddieManager.getHitPoints(squaddieId)
            const originalActionPoints =
                inBattleSquaddieManager.getActionPoints(squaddieId)

            const savedState = missionEngine.getSerializedInMissionSummary()

            inBattleSquaddieManager.dealDamageToSquaddie({
                ...squaddieId,
                damage: { amount: 2, type: undefined },
            })

            missionEngine.loadSerializedInMissionSummary(savedState)

            const restoredHitPoints =
                inBattleSquaddieManager.getHitPoints(squaddieId)
            const restoredActionPoints =
                inBattleSquaddieManager.getActionPoints(squaddieId)

            expect(restoredHitPoints.current).toBe(originalHitPoints.current)
            expect(restoredActionPoints.current).toBe(
                originalActionPoints.current
            )
        })
    })
})
