import { beforeEach, describe, expect, it } from "vitest"
import type { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager.js"
import { MissionObjectiveCriteriaService } from "./missionObjectiveCriteria.js"
import { MissionObjectiveProgressService } from "./missionObjectiveProgress.js"
import { MissionAffiliationTurn } from "./missionTurn.js"
import { type Army, ArmyService } from "../campaign/army/army.js"
import { CampaignSquaddieService } from "../campaign/army/campaignSquaddie.js"
import {
    type KnightAndTwoDemons,
    MissionObjectiveProgressTestSetup,
} from "../testUtils/mission/missionObjectiveProgressTestSetup.js"

const buildArmyLedBy = (outOfBattleSquaddieId: string): Army =>
    ArmyService.addOrUpdate({
        army: ArmyService.new(),
        campaignSquaddie: CampaignSquaddieService.new({
            id: "campaign-leader",
            outOfBattleAttributeSheetId: "test sheet",
            outOfBattleSquaddieId,
            name: "Leader",
            isLeader: true,
        }),
    })

describe("MissionObjectiveProgressService — turn and leader criteria", () => {
    let inBattleSquaddieManager: InBattleSquaddieManager
    let squaddies: KnightAndTwoDemons

    beforeEach(() => {
        squaddies = MissionObjectiveProgressTestSetup.createKnightAndTwoDemons()
        inBattleSquaddieManager = squaddies.inBattleSquaddieManager
    })

    describe("when the goal is reaching the enemy phase of turn 5", () => {
        const criteria =
            MissionObjectiveCriteriaService.newPhaseReachedCriteria({
                turnCount: 5,
                missionAffiliationTurn: MissionAffiliationTurn.ENEMY_TURN,
            })

        describe("when it is turn 2", () => {
            it("reports the target phase with 3 turns remaining", () => {
                const progress =
                    MissionObjectiveProgressService.calculateCriteriaProgress(
                        criteria,
                        inBattleSquaddieManager,
                        {
                            missionTurn: {
                                turnCount: 2,
                                missionAffiliationTurn:
                                    MissionAffiliationTurn.PLAYER_TURN,
                            },
                        }
                    )

                expect(progress).toEqual({
                    type: criteria.type,
                    turnCount: 5,
                    missionAffiliationTurn: MissionAffiliationTurn.ENEMY_TURN,
                    turnsRemaining: 3,
                })
            })
        })

        describe("when the target turn has already passed", () => {
            it("reports zero turns remaining", () => {
                const progress =
                    MissionObjectiveProgressService.calculateCriteriaProgress(
                        criteria,
                        inBattleSquaddieManager,
                        {
                            missionTurn: {
                                turnCount: 7,
                                missionAffiliationTurn:
                                    MissionAffiliationTurn.PLAYER_TURN,
                            },
                        }
                    )

                expect(progress).toEqual(
                    expect.objectContaining({ turnsRemaining: 0 })
                )
            })
        })

        describe("when the mission has no turn yet", () => {
            it("has no progress", () => {
                expect(
                    MissionObjectiveProgressService.calculateCriteriaProgress(
                        criteria,
                        inBattleSquaddieManager
                    )
                ).toBeUndefined()
            })
        })
    })

    describe("when the goal is defeating the army leader", () => {
        const criteria =
            MissionObjectiveCriteriaService.newArmyLeaderDefeatedCriteria()

        describe("when the army leader is defeated", () => {
            beforeEach(() => {
                MissionObjectiveProgressTestSetup.defeatSquaddie(
                    inBattleSquaddieManager,
                    squaddies.knight
                )
            })

            it("reports the leader as defeated", () => {
                const progress =
                    MissionObjectiveProgressService.calculateCriteriaProgress(
                        criteria,
                        inBattleSquaddieManager,
                        { army: buildArmyLedBy("knight") }
                    )

                expect(progress).toEqual({
                    type: criteria.type,
                    leader: {
                        battleSquaddieId: squaddies.knight,
                        isDefeated: true,
                    },
                })
            })
        })

        describe("when there is no army", () => {
            it("has no progress", () => {
                expect(
                    MissionObjectiveProgressService.calculateCriteriaProgress(
                        criteria,
                        inBattleSquaddieManager
                    )
                ).toBeUndefined()
            })
        })

        describe("when the leader is not on the map", () => {
            it("has no progress", () => {
                expect(
                    MissionObjectiveProgressService.calculateCriteriaProgress(
                        criteria,
                        inBattleSquaddieManager,
                        { army: buildArmyLedBy("absent-leader") }
                    )
                ).toBeUndefined()
            })
        })
    })
})
