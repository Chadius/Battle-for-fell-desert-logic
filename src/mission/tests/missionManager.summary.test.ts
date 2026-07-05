import { beforeEach, describe, expect, it, vi } from "vitest"
import { MissionManager } from "../missionManager"
import { MissionStateService } from "../missionState"
import {
    type MissionObjective,
    MissionObjectiveService,
} from "../missionObjective"
import { MissionObjectiveRewardService } from "../missionObjectiveReward"
import { MissionObjectiveCriteriaService } from "../missionObjectiveCriteria"
import { SquaddieAffiliation } from "../../affiliation/affiliation"
import { InBattleSquaddieManager } from "../../squaddie/inBattle/inBattleSquaddieManager"
import { OutOfBattleSquaddieService } from "../../squaddie/outOfBattle/outOfBattleSquaddie"
import { InBattleSquaddieCollectionService } from "../../squaddie/inBattle/inBattleSquaddieCollection"
import { OutOfBattleSquaddieTestSetup } from "../../testUtils/outOfBattleSquaddieTestSetup"
import { CoordinateMapCollectionManager } from "../../coordinateMap/coordinateMapManager"
import { CoordinateMapCollectionService } from "../../coordinateMap/coordinateMapCollection"
import {
    CoordinateMapService,
    type SerializedCoordinateMap,
} from "../../coordinateMap/coordinateMap"
import type { BattleSquaddieId } from "../../squaddie/inBattle/battleSquaddieId"

describe("MissionManager", () => {
    describe("createInMissionSummary and loadInMissionSummary", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let missionManager: MissionManager
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

            const objective = MissionObjectiveService.new({
                id: "obj-1",
                rewards: [MissionObjectiveRewardService.newMissionEndsReward()],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [objective],
            })

            missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
            })
        })

        it("createInMissionSummary captures objective and squaddie state", () => {
            inBattleSquaddieManager.dealDamageToSquaddie({
                ...squaddieId,
                damage: { amount: 5, type: undefined },
            })

            const inMissionSummary = missionManager.createInMissionSummary()

            expect(inMissionSummary.missionObjectives).toHaveLength(1)
            expect(inMissionSummary.missionObjectives[0].id).toBe("obj-1")
            expect(inMissionSummary.missionObjectives[0].isCompleted).toBe(
                false
            )

            const squaddieData =
                inMissionSummary.inBattleSquaddieCollection.byOutOfBattleSquaddieId.get(
                    "enemy-1"
                )![0]
            expect(squaddieData.hitPoints.current).toBe(5)
        })

        it("loadInMissionSummary restores squaddie state", () => {
            const tempManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                inBattleSquaddieManager.outOfBattleSquaddieManager!
            )
            const tempId = tempManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy-1",
            })
            tempManager.dealDamageToSquaddie({
                ...tempId,
                damage: { amount: 7, type: undefined },
            })
            tempManager.spendActionPoints({ ...tempId, actionPoints: 2 })
            const savedState = {
                mapId: "",
                mapName: "",
                missionObjectives: [
                    { id: "obj-1", isCompleted: false, hasGivenReward: false },
                ],
                inBattleSquaddieCollection:
                    tempManager.inBattleSquaddieCollection!,
                recentPhaseTransitions: [],
            }

            missionManager.loadInMissionSummary(savedState)

            const hitPoints = inBattleSquaddieManager.getHitPoints(squaddieId)
            expect(hitPoints.current).toBe(3)

            const actionPoints =
                inBattleSquaddieManager.getActionPoints(squaddieId)
            expect(actionPoints.current).toBe(1)
        })

        it("loadInMissionSummary restores objective hasGivenReward", () => {
            const tempManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                inBattleSquaddieManager.outOfBattleSquaddieManager!
            )
            const tempId = tempManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy-1",
            })
            tempManager.dealDamageToSquaddie({
                ...tempId,
                damage: { amount: 10, type: undefined },
            })
            const savedState = {
                mapId: "",
                mapName: "",
                missionObjectives: [
                    { id: "obj-1", isCompleted: true, hasGivenReward: true },
                ],
                inBattleSquaddieCollection:
                    tempManager.inBattleSquaddieCollection!,
                recentPhaseTransitions: [],
            }

            missionManager.loadInMissionSummary(savedState)

            expect(
                missionManager.missionState!.objectives[0].hasGivenReward
            ).toBe(true)
        })

        it("round-trip preserves state", () => {
            inBattleSquaddieManager.dealDamageToSquaddie({
                ...squaddieId,
                damage: { amount: 7, type: undefined },
            })
            inBattleSquaddieManager.spendActionPoints({
                ...squaddieId,
                actionPoints: 2,
            })

            const originalHitPoints =
                inBattleSquaddieManager.getHitPoints(squaddieId)
            const originalActionPoints =
                inBattleSquaddieManager.getActionPoints(squaddieId)

            const savedState = missionManager.createInMissionSummary()

            inBattleSquaddieManager.giveHealingToSquaddie({
                ...squaddieId,
                healing: { raw: 10 },
            })
            inBattleSquaddieManager.restoreActionPoints({
                ...squaddieId,
                actionPoints: 3,
            })

            missionManager.loadInMissionSummary(savedState)

            const restoredHitPoints =
                inBattleSquaddieManager.getHitPoints(squaddieId)
            const restoredActionPoints =
                inBattleSquaddieManager.getActionPoints(squaddieId)

            expect(restoredHitPoints.current).toBe(originalHitPoints.current)
            expect(restoredActionPoints.current).toBe(
                originalActionPoints.current
            )
        })

        describe("when a mission objective is hidden", () => {
            let hiddenObjective: MissionObjective

            beforeEach(() => {
                hiddenObjective = MissionObjectiveService.new({
                    id: "obj-hidden",
                    rewards: [
                        MissionObjectiveRewardService.newMissionEndsReward(),
                    ],
                    criteria: [
                        MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                            {
                                affiliations: [SquaddieAffiliation.ENEMY],
                            }
                        ),
                    ],
                    hidden: true,
                })
            })

            it("excludes it from createInMissionSummary by default", () => {
                const missionState = MissionStateService.new({
                    id: "mission-1",
                    mapId: "map-1",
                    objectives: [hiddenObjective],
                })
                const manager = new MissionManager({
                    missionState,
                    inBattleSquaddieManager,
                })

                const summary = manager.createInMissionSummary()

                expect(summary.missionObjectives).toHaveLength(0)
            })

            it("includes it when the revealHiddenMissionObjectives debug flag is set", () => {
                const missionState = MissionStateService.new({
                    id: "mission-1",
                    mapId: "map-1",
                    objectives: [hiddenObjective],
                    overrides: {
                        debugFlags: { revealHiddenMissionObjectives: true },
                    },
                })
                const manager = new MissionManager({
                    missionState,
                    inBattleSquaddieManager,
                })

                const summary = manager.createInMissionSummary()

                expect(summary.missionObjectives).toHaveLength(1)
                expect(summary.missionObjectives[0].id).toBe("obj-hidden")
            })
        })

        it("createInMissionSummary throws when state is undefined", () => {
            const manager = new MissionManager({
                missionState: undefined,
                inBattleSquaddieManager: inBattleSquaddieManager,
            })

            expect(() => manager.createInMissionSummary()).toThrow(
                "[MissionManager.createInMissionSummary]: state must be defined"
            )
        })

        it("createInMissionSummary throws when inBattleSquaddieManager is undefined", () => {
            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
            })
            const manager = new MissionManager({ missionState: missionState })

            expect(() => manager.createInMissionSummary()).toThrow(
                "[MissionManager.createInMissionSummary]: inBattleSquaddieManager must be defined"
            )
        })
    })

    describe("Serialize Coordinate Maps", () => {
        it("will throw an error if CoordinateMapCollectionManager is not defined", () => {
            const manager = new MissionManager({})

            expect(() => {
                manager.serializeCoordinateMap("testMap")
            }).toThrow("coordinateMapCollectionManager must be defined")
        })
        it("will serialize and return a map", () => {
            const coordinateMapCollection = CoordinateMapCollectionService.new()
            const coordinateMapCollectionManager =
                new CoordinateMapCollectionManager(coordinateMapCollection)
            coordinateMapCollectionManager.addOrUpdate({
                map: CoordinateMapService.new({
                    id: "testMap",
                    name: "testMap",
                    movementProperties: ["1 1 1 1 ", " 1 2 1 x ", "1 - x x "],
                }),
            })
            coordinateMapCollectionManager.addSquaddie({
                mapId: "testMap",
                squaddieId: {
                    inBattleSquaddieId: 0,
                    outOfBattleSquaddieId: "soldier",
                },
                coordinate: {
                    row: 0,
                    col: 2,
                },
            })

            coordinateMapCollectionManager.addSquaddie({
                mapId: "testMap",
                squaddieId: {
                    inBattleSquaddieId: 0,
                    outOfBattleSquaddieId: "offscreen",
                },
                coordinate: undefined,
            })

            const manager = new MissionManager({
                coordinateMapCollectionManager,
            })

            const originalMap = CoordinateMapCollectionService.get({
                collection:
                    coordinateMapCollectionManager.coordinateMapCollection!,
                id: "testMap",
            })!

            const serializedMap = CoordinateMapService.serialize(originalMap)
            const serializedMapFromManager: SerializedCoordinateMap =
                manager.serializeCoordinateMap("testMap")
            expect(serializedMapFromManager).toEqual(serializedMap)
        })
    })

    describe("getSquaddieAffiliation", () => {
        it("calls its inBattleSquaddieManager to get the squaddie affiliation", () => {
            const inBattleSquaddieManager = {
                getSquaddieAffiliation: vi
                    .fn()
                    .mockReturnValue(SquaddieAffiliation.PLAYER),
            } as any

            const manager = new MissionManager({
                inBattleSquaddieManager: inBattleSquaddieManager,
            })

            const affiliation = manager.getSquaddieAffiliation({
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
            })

            expect(affiliation).toBe(SquaddieAffiliation.PLAYER)
            expect(
                inBattleSquaddieManager.getSquaddieAffiliation
            ).toHaveBeenCalledWith({
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "squaddie-1",
            })
        })

        it("throws an error if inBattleSquaddieManager is undefined", () => {
            const manager = new MissionManager()

            expect(() => {
                manager.getSquaddieAffiliation({
                    inBattleSquaddieId: 1,
                    outOfBattleSquaddieId: "squaddie-1",
                })
            }).toThrow(
                "[MissionManager.getSquaddieAffiliation]: inBattleSquaddieManager must be defined"
            )
        })
    })
})
