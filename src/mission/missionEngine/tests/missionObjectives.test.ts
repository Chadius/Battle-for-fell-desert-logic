import { beforeEach, describe, expect, it } from "vitest"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup"
import { OutOfBattleSquaddieService } from "../../../squaddie/outOfBattle/outOfBattleSquaddie"
import { SquaddieAffiliation } from "../../../affiliation/affiliation"
import { InBattleSquaddieCollectionService } from "../../../squaddie/inBattle/inBattleSquaddieCollection"
import { MissionEngine } from "../missionEngine"
import { MissionObjectiveService } from "../../missionObjective"
import { MissionObjectiveRewardService } from "../../missionObjectiveReward"
import { MissionObjectiveCriteriaService } from "../../missionObjectiveCriteria"
import { MissionStateService } from "../../missionState"
import { MissionManager } from "../../missionManager"

describe("MissionObjectives", () => {
    describe("mission objective getters", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager

        beforeEach(() => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "test_sheet",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            distancePerAction: 2,
                            items: { maxCapacity: 0 },
                        },
                    }
                )

            const aliveEnemy = OutOfBattleSquaddieService.new({
                id: "enemy-alive",
                name: "Alive Enemy",
                affiliation: SquaddieAffiliation.ENEMY,
                attributeSheetId: "test_sheet",
            })

            const deadEnemy = OutOfBattleSquaddieService.new({
                id: "enemy-dead",
                name: "Dead Enemy",
                affiliation: SquaddieAffiliation.ENEMY,
                attributeSheetId: "test_sheet",
            })

            const deadAlly = OutOfBattleSquaddieService.new({
                id: "ally-dead",
                name: "Dead Ally",
                affiliation: SquaddieAffiliation.ALLY,
                attributeSheetId: "test_sheet",
            })

            outOfBattleSquaddieManager.addOrUpdateSquaddie(aliveEnemy)
            outOfBattleSquaddieManager.addOrUpdateSquaddie(deadEnemy)
            outOfBattleSquaddieManager.addOrUpdateSquaddie(deadAlly)

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            inBattleSquaddieManager.createNewSquaddie({
                outOfBattleSquaddieId: "enemy-alive",
            })

            const deadEnemySquaddieId =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy-dead",
                })

            const deadAllySquaddieId =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "ally-dead",
                })

            inBattleSquaddieManager.dealDamageToSquaddie({
                ...deadEnemySquaddieId,
                damage: { amount: 100, type: undefined },
            })

            inBattleSquaddieManager.dealDamageToSquaddie({
                ...deadAllySquaddieId,
                damage: { amount: 100, type: undefined },
            })
        })

        it("throws error if MissionManager is undefined for getInProgressObjectives", () => {
            const missionEngine = new MissionEngine()

            expect(() =>
                missionEngine.getInProgressMissionObjectives()
            ).toThrow("missionManager is undefined")
        })

        it("throws error if MissionManager is undefined for getCompletedButNotRewardedObjectives", () => {
            const missionEngine = new MissionEngine()

            expect(() =>
                missionEngine.getCompletedButNotRewardedMissionObjectives()
            ).toThrow("missionManager is undefined")
        })

        it("throws error if MissionManager is undefined for getCompletedAndRewardedObjectives", () => {
            const missionEngine = new MissionEngine()

            expect(() =>
                missionEngine.getCompletedAndRewardedMissionObjectives()
            ).toThrow("missionManager is undefined")
        })

        it("getInProgressObjectives returns objectives that are not complete", () => {
            const inProgressObjective = MissionObjectiveService.new({
                id: "in-progress",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["dialog"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            const completedObjective = MissionObjectiveService.new({
                id: "completed",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["dialog"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ALLY],
                        }
                    ),
                ],
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [inProgressObjective, completedObjective],
            })

            const missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
            })
            const missionEngine = new MissionEngine(missionManager)

            const inProgress = missionEngine.getInProgressMissionObjectives()

            expect(inProgress).toHaveLength(1)
            expect(inProgress[0].id).toBe("in-progress")
        })

        it("getCompletedButNotRewardedObjectives returns completed objectives without reward", () => {
            const completedNotRewarded = MissionObjectiveService.new({
                id: "completed-not-rewarded",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["dialog"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ALLY],
                        }
                    ),
                ],
            })

            const completedAndRewarded = MissionObjectiveService.new({
                id: "completed-and-rewarded",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["dialog"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ALLY],
                        }
                    ),
                ],
                hasGivenReward: true,
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [completedNotRewarded, completedAndRewarded],
            })

            const missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
            })
            const missionEngine = new MissionEngine(missionManager)

            const completedButNotRewarded =
                missionEngine.getCompletedButNotRewardedMissionObjectives()

            expect(completedButNotRewarded).toHaveLength(1)
            expect(completedButNotRewarded[0].id).toBe("completed-not-rewarded")
        })

        it("getCompletedAndRewardedObjectives returns objectives that have been rewarded", () => {
            const notRewarded = MissionObjectiveService.new({
                id: "not-rewarded",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["dialog"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ALLY],
                        }
                    ),
                ],
            })

            const rewarded = MissionObjectiveService.new({
                id: "rewarded",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["dialog"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ALLY],
                        }
                    ),
                ],
                hasGivenReward: true,
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [notRewarded, rewarded],
            })

            const missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
            })
            const missionEngine = new MissionEngine(missionManager)

            const completedAndRewarded =
                missionEngine.getCompletedAndRewardedMissionObjectives()

            expect(completedAndRewarded).toHaveLength(1)
            expect(completedAndRewarded[0].id).toBe("rewarded")
        })
    })

    describe("markMissionObjectiveAsRewarded", () => {
        let inBattleSquaddieManager: InBattleSquaddieManager

        beforeEach(() => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "test_sheet",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            distancePerAction: 2,
                            items: { maxCapacity: 0 },
                        },
                    }
                )

            const deadEnemy = OutOfBattleSquaddieService.new({
                id: "enemy-dead",
                name: "Dead Enemy",
                affiliation: SquaddieAffiliation.ENEMY,
                attributeSheetId: "test_sheet",
            })

            outOfBattleSquaddieManager.addOrUpdateSquaddie(deadEnemy)

            inBattleSquaddieManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                outOfBattleSquaddieManager
            )

            const deadEnemySquaddieId =
                inBattleSquaddieManager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy-dead",
                })

            inBattleSquaddieManager.dealDamageToSquaddie({
                ...deadEnemySquaddieId,
                damage: { amount: 100, type: undefined },
            })
        })

        it("throws error if MissionManager is undefined", () => {
            const missionEngine = new MissionEngine()

            expect(() =>
                missionEngine.markMissionObjectiveAsRewarded("obj-1")
            ).toThrow("missionManager is undefined")
        })

        it("throws error if objective is not found", () => {
            const missionObjective = MissionObjectiveService.new({
                id: "obj-1",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["dialog"]),
                ],
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
                objectives: [missionObjective],
            })

            const missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
            })
            const missionEngine = new MissionEngine(missionManager)

            expect(() =>
                missionEngine.markMissionObjectiveAsRewarded("non-existent")
            ).toThrow("objective not found")
        })

        it("throws error if objective is not complete", () => {
            const { manager: outOfBattleSquaddieManager } =
                OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet(
                    {
                        sheetId: "test_sheet",
                        attributeSheetOptions: {
                            maxHitPoints: 10,
                            distancePerAction: 2,
                            items: { maxCapacity: 0 },
                        },
                    }
                )

            const aliveEnemy = OutOfBattleSquaddieService.new({
                id: "enemy-alive",
                name: "Alive Enemy",
                affiliation: SquaddieAffiliation.ENEMY,
                attributeSheetId: "test_sheet",
            })

            outOfBattleSquaddieManager.addOrUpdateSquaddie(aliveEnemy)

            const inBattleSquaddieManagerWithAliveEnemy =
                new InBattleSquaddieManager(
                    InBattleSquaddieCollectionService.new(),
                    outOfBattleSquaddieManager
                )

            inBattleSquaddieManagerWithAliveEnemy.createNewSquaddie({
                outOfBattleSquaddieId: "enemy-alive",
            })

            const incompleteObjective = MissionObjectiveService.new({
                id: "incomplete-obj",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["dialog"]),
                ],
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
                objectives: [incompleteObjective],
            })

            const missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManagerWithAliveEnemy,
            })
            const missionEngine = new MissionEngine(missionManager)

            expect(() =>
                missionEngine.markMissionObjectiveAsRewarded("incomplete-obj")
            ).toThrow("objective is not complete")
        })

        it("marks a completed objective as rewarded", () => {
            const completedObjective = MissionObjectiveService.new({
                id: "completed-obj",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["dialog"]),
                ],
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
                objectives: [completedObjective],
            })

            const missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
            })
            const missionEngine = new MissionEngine(missionManager)

            expect(
                missionEngine.getCompletedButNotRewardedMissionObjectives()
            ).toHaveLength(1)

            missionEngine.markMissionObjectiveAsRewarded("completed-obj")

            expect(
                missionEngine.getCompletedButNotRewardedMissionObjectives()
            ).toHaveLength(0)
            expect(
                missionEngine.getCompletedAndRewardedMissionObjectives()
            ).toHaveLength(1)
            expect(
                missionEngine.getCompletedAndRewardedMissionObjectives()[0].id
            ).toBe("completed-obj")
        })

        it("does nothing if objective is already rewarded", () => {
            const alreadyRewardedObjective = MissionObjectiveService.new({
                id: "already-rewarded",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["dialog"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
                hasGivenReward: true,
            })

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [alreadyRewardedObjective],
            })

            const missionManager = new MissionManager({
                missionState: missionState,
                inBattleSquaddieManager: inBattleSquaddieManager,
            })
            const missionEngine = new MissionEngine(missionManager)

            expect(() =>
                missionEngine.markMissionObjectiveAsRewarded("already-rewarded")
            ).not.toThrow()

            expect(
                missionEngine.getCompletedAndRewardedMissionObjectives()
            ).toHaveLength(1)
        })
    })
})
