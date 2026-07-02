import { beforeEach, describe, expect, it } from "vitest"
import { MissionObjectiveService } from "./missionObjective"
import { MissionObjectiveRewardService } from "./missionObjectiveReward"
import { MissionObjectiveCriteriaService } from "./missionObjectiveCriteria"
import { SquaddieAffiliation } from "../affiliation/affiliation"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import { OutOfBattleSquaddieService } from "../squaddie/outOfBattle/outOfBattleSquaddie"
import { InBattleSquaddieCollectionService } from "../squaddie/inBattle/inBattleSquaddieCollection"
import {
    type InMissionSummary,
    InMissionSummaryService,
    type MissionObjectiveSummary,
} from "./inMissionSummary"
import { OutOfBattleSquaddieTestSetup } from "../testUtils/outOfBattleSquaddieTestSetup"
import { MissionAffiliationTurn } from "./missionTurn"

describe("InMissionSummary", () => {
    describe("new", () => {
        it("creates an empty summary with no parameters", () => {
            const summary = InMissionSummaryService.new({})

            expect(summary.mapId).toBe("")
            expect(summary.mapName).toBe("")
            expect(summary.missionObjectives).toEqual([])
            expect(
                summary.inBattleSquaddieCollection.byOutOfBattleSquaddieId
            ).toBeInstanceOf(Map)
            expect(
                summary.inBattleSquaddieCollection.byOutOfBattleSquaddieId.size
            ).toBe(0)
            expect(summary.recentPhaseTransitions).toEqual([])
        })

        it("creates a summary with provided data", () => {
            const objectiveStates: MissionObjectiveSummary[] = [
                { id: "obj-1", isCompleted: true, hasGivenReward: false },
            ]
            const attributeSheet =
                OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
                    id: "test-sheet",
                    maxHitPoints: 10,
                })
            const outOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "squaddie-1",
                name: "Test",
                actionIds: [],
                attributeSheetId: "test-sheet",
                affiliation: SquaddieAffiliation.PLAYER,
            })
            const { collection: inBattleSquaddieCollection } =
                InBattleSquaddieCollectionService.createNewSquaddie({
                    collection: InBattleSquaddieCollectionService.new(),
                    outOfBattleSquaddie,
                    attributeSheet,
                })

            const summary = InMissionSummaryService.new({
                missionObjectives: objectiveStates,
                inBattleSquaddieCollection,
            })

            expect(summary.missionObjectives).toEqual(objectiveStates)
            expect(
                summary.inBattleSquaddieCollection.byOutOfBattleSquaddieId.get(
                    "squaddie-1"
                )
            ).toHaveLength(1)
        })
    })

    describe("createFromMission", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager
        let squaddieId: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }

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
        })

        it("creates summary from mission with objective and squaddie data", () => {
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

            const summary = InMissionSummaryService.createFromMission({
                mapId: "test-map",
                mapName: "Test Map",
                missionObjectives: [objective],
                inBattleSquaddieManager,
            })

            expect(summary.mapId).toBe("test-map")
            expect(summary.mapName).toBe("Test Map")
            expect(summary.missionObjectives).toHaveLength(1)
            expect(summary.missionObjectives[0].id).toBe("obj-1")
            expect(summary.missionObjectives[0].isCompleted).toBe(false)
            expect(summary.missionObjectives[0].hasGivenReward).toBe(false)

            expect(
                summary.inBattleSquaddieCollection.byOutOfBattleSquaddieId.get(
                    "enemy-1"
                )
            ).toHaveLength(1)
        })

        it("marks objective as completed when criteria are met", () => {
            inBattleSquaddieManager.dealDamageToSquaddie({
                inBattleSquaddieId: squaddieId.inBattleSquaddieId,
                outOfBattleSquaddieId: squaddieId.outOfBattleSquaddieId,
                damage: { amount: 100, type: undefined },
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

            const summary = InMissionSummaryService.createFromMission({
                missionObjectives: [objective],
                inBattleSquaddieManager,
            })

            expect(summary.missionObjectives[0].isCompleted).toBe(true)
        })

        it("preserves hasGivenReward flag", () => {
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
                hasGivenReward: true,
            })

            const summary = InMissionSummaryService.createFromMission({
                missionObjectives: [objective],
                inBattleSquaddieManager,
            })

            expect(summary.missionObjectives[0].hasGivenReward).toBe(true)
        })
    })

    describe("serialization", () => {
        it("round-trip serialize/deserialize preserves data", () => {
            const attributeSheet =
                OutOfBattleSquaddieTestSetup.createTestAttributeSheet({
                    id: "test-sheet",
                    maxHitPoints: 10,
                })
            const outOfBattleSquaddie = OutOfBattleSquaddieService.new({
                id: "squaddie-1",
                name: "Test",
                actionIds: ["action1"],
                attributeSheetId: "test-sheet",
                affiliation: SquaddieAffiliation.PLAYER,
            })
            const { collection } =
                InBattleSquaddieCollectionService.createNewSquaddie({
                    collection: InBattleSquaddieCollectionService.new(),
                    outOfBattleSquaddie,
                    attributeSheet,
                })
            const original: InMissionSummary = {
                mapId: "test-map",
                mapName: "Test Map",
                missionObjectives: [
                    { id: "obj-1", isCompleted: true, hasGivenReward: true },
                    { id: "obj-2", isCompleted: false, hasGivenReward: false },
                ],
                inBattleSquaddieCollection: collection,
                recentPhaseTransitions: [MissionAffiliationTurn.PLAYER_TURN],
            }

            const serialized = InMissionSummaryService.serialize(original)
            const jsonString = JSON.stringify(serialized)
            const parsed = JSON.parse(jsonString)
            const restored = InMissionSummaryService.deserialize(parsed)

            expect(restored.mapId).toBe("test-map")
            expect(restored.mapName).toBe("Test Map")
            expect(restored.missionObjectives).toEqual(
                original.missionObjectives
            )
            expect(
                restored.inBattleSquaddieCollection.byOutOfBattleSquaddieId.get(
                    "squaddie-1"
                )
            ).toHaveLength(1)
            expect(restored.recentPhaseTransitions).toEqual([
                MissionAffiliationTurn.PLAYER_TURN,
            ])
        })

        it("SerializedInMissionSummary is directly JSON-serializable", () => {
            const summary: InMissionSummary = {
                mapId: "",
                mapName: "",
                missionObjectives: [
                    { id: "obj-1", isCompleted: true, hasGivenReward: false },
                ],
                inBattleSquaddieCollection:
                    InBattleSquaddieCollectionService.new(),
                recentPhaseTransitions: [],
            }

            const serialized = InMissionSummaryService.serialize(summary)
            const jsonString = JSON.stringify(serialized)
            const parsed = JSON.parse(jsonString)

            expect(parsed.missionObjectives).toBeDefined()
            expect(parsed.inBattleSquaddieCollection).toBeDefined()
        })
    })

    describe("applyToMission", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager

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

            const squaddie = OutOfBattleSquaddieService.new({
                id: "squaddie-1",
                name: "Squaddie",
                actionIds: [],
                attributeSheetId: "test sheet",
                affiliation: SquaddieAffiliation.PLAYER,
            })
            outOfBattleSquaddieManager.addOrUpdateSquaddie(squaddie)

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )
        })

        it("loads squaddie collection from saved summary", () => {
            const tempManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                inBattleSquaddieManager.outOfBattleSquaddieManager!
            )
            const tempId = tempManager.createNewSquaddie({
                outOfBattleSquaddieId: "squaddie-1",
            })
            tempManager.dealDamageToSquaddie({
                ...tempId,
                damage: { amount: 3, type: undefined },
            })
            tempManager.spendActionPoints({ ...tempId, actionPoints: 2 })
            const savedState: InMissionSummary = {
                mapId: "",
                mapName: "",
                missionObjectives: [],
                inBattleSquaddieCollection:
                    tempManager.inBattleSquaddieCollection!,
                recentPhaseTransitions: [],
            }

            InMissionSummaryService.applyToMission({
                InMissionSummary: savedState,
                missionObjectives: [],
                inBattleSquaddieManager,
            })

            const hitPoints = inBattleSquaddieManager.getHitPoints({
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "squaddie-1",
            })
            expect(hitPoints.current).toBe(7)

            const actionPoints = inBattleSquaddieManager.getActionPoints({
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "squaddie-1",
            })
            expect(actionPoints.current).toBe(1)
        })

        it("marks objectives as rewarded if saved summary has them rewarded", () => {
            const savedState: InMissionSummary = {
                mapId: "",
                mapName: "",
                missionObjectives: [
                    { id: "obj-1", isCompleted: true, hasGivenReward: true },
                ],
                inBattleSquaddieCollection:
                    InBattleSquaddieCollectionService.new(),
                recentPhaseTransitions: [],
            }

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
                hasGivenReward: false,
            })

            const updatedObjectives = InMissionSummaryService.applyToMission({
                InMissionSummary: savedState,
                missionObjectives: [objective],
                inBattleSquaddieManager,
            })

            expect(updatedObjectives[0].hasGivenReward).toBe(true)
        })

        it("does not modify objectives not in saved summary", () => {
            const savedState: InMissionSummary = {
                mapId: "",
                mapName: "",
                missionObjectives: [],
                inBattleSquaddieCollection:
                    InBattleSquaddieCollectionService.new(),
                recentPhaseTransitions: [],
            }

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
                hasGivenReward: false,
            })

            const updatedObjectives = InMissionSummaryService.applyToMission({
                InMissionSummary: savedState,
                missionObjectives: [objective],
                inBattleSquaddieManager,
            })

            expect(updatedObjectives[0].hasGivenReward).toBe(false)
        })
    })
})
