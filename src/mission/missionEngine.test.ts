import { describe, expect, it } from "vitest"
import { MissionEngine } from "./missionEngine"
import { MissionManager } from "./missionManager"
import { MissionStateService } from "./missionState"
import { MissionObjectiveService } from "./missionObjective"
import { MissionObjectiveRewardService } from "./missionObjectiveReward"
import { MissionObjectiveCriteriaService } from "./missionObjectiveCriteria"
import { SquaddieAffiliation } from "../affiliation/affiliation"
import { OutOfBattleSquaddieManager } from "../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { OutOfBattleSquaddieCollectionService } from "../squaddie/outOfBattle/outOfBattleSquaddieCollection"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection"
import { OutOfBattleSquaddieAttributeSheetService } from "../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet"
import { OutOfBattleSquaddieService } from "../squaddie/outOfBattle/outOfBattleSquaddie"
import { InBattleSquaddieCollectionService } from "../squaddie/inBattle/inBattleSquaddieCollection"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import { AttributeScore } from "../proficiency/attributeScore"

describe("MissionEngine", () => {
    describe("isDone", () => {
        it("throws error if MissionManager is undefined", () => {
            const missionEngine = new MissionEngine()

            expect(() => missionEngine.isDone()).toThrow(
                "[MissionEngine.isDone]: missionManager is undefined"
            )
        })

        it("returns false when MISSION_ENDS reward has not been given", () => {
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

            const missionManager = new MissionManager(missionState)
            const missionEngine = new MissionEngine(missionManager)

            expect(missionEngine.isDone()).toBe(false)
        })

        it("returns true when MISSION_ENDS reward was given", () => {
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
            const rewardedObjective =
                MissionObjectiveService.markRewardAsGiven(missionObjective)

            const missionState = MissionStateService.new({
                id: "mission-1",
                mapId: "map-1",
                objectives: [rewardedObjective],
            })

            const missionManager = new MissionManager(missionState)
            const missionEngine = new MissionEngine(missionManager)

            expect(missionEngine.isDone()).toBe(true)
        })
    })

    describe("getInMissionSummary", () => {
        it("throws error if MissionManager is undefined", () => {
            const missionEngine = new MissionEngine()

            expect(() => missionEngine.getInMissionSummary()).toThrow(
                "[MissionEngine.getInMissionSummary]: missionManager is undefined"
            )
        })

        it("returns InMissionSummary from MissionManager", () => {
            const outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
                OutOfBattleSquaddieCollectionService.new(),
                OutOfBattleSquaddieAttributeSheetCollectionService.new()
            )

            const attributeSheet = OutOfBattleSquaddieAttributeSheetService.new(
                {
                    items: { itemIds: [], maxCapacity: 0 },
                    movement: { distancePerAction: 1 },
                    id: "test sheet",
                    maxHitPoints: 10,
                    attributeScores: {
                        [AttributeScore.BODY]: 5,
                        [AttributeScore.MIND]: 5,
                        [AttributeScore.SOUL]: 5,
                    },
                    rank: 0,
                }
            )
            outOfBattleSquaddieManager.addOrUpdateAttributeSheet(attributeSheet)

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

            const missionManager = new MissionManager(
                missionState,
                inBattleSquaddieManager
            )
            const missionEngine = new MissionEngine(missionManager)

            inBattleSquaddieManager.dealDamageToSquaddie({
                ...squaddieId,
                damage: { amount: 3, type: undefined },
            })

            const inMissionSummary = missionEngine.getInMissionSummary()

            expect(inMissionSummary.missionObjectives).toHaveLength(1)
            expect(inMissionSummary.missionObjectives[0].id).toBe("obj-1")
            expect(
                inMissionSummary.inBattleSquaddieCollection
                    .byOutOfBattleSquaddieId["enemy-1"][0].hitPoints.current
            ).toBe(7)
        })
    })
})
