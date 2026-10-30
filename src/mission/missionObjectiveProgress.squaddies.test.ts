import { beforeEach, describe, expect, it } from "vitest"
import type { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager.js"
import { SquaddieAffiliation } from "../affiliation/affiliation.js"
import { MissionObjectiveCriteriaService } from "./missionObjectiveCriteria.js"
import {
    type MissionObjectiveCriteriaProgress,
    MissionObjectiveProgressService,
} from "./missionObjectiveProgress.js"
import {
    type KnightAndTwoDemons,
    MissionObjectiveProgressTestSetup,
} from "../testUtils/mission/missionObjectiveProgressTestSetup.js"

describe("MissionObjectiveProgressService — squaddie criteria", () => {
    let inBattleSquaddieManager: InBattleSquaddieManager
    let squaddies: KnightAndTwoDemons

    beforeEach(() => {
        squaddies = MissionObjectiveProgressTestSetup.createKnightAndTwoDemons()
        inBattleSquaddieManager = squaddies.inBattleSquaddieManager
    })

    describe("when the goal is defeating every enemy and one of two demons is down", () => {
        let progress: MissionObjectiveCriteriaProgress | undefined

        beforeEach(() => {
            MissionObjectiveProgressTestSetup.defeatSquaddie(
                inBattleSquaddieManager,
                squaddies.firstDemon
            )
            progress =
                MissionObjectiveProgressService.calculateCriteriaProgress(
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        { affiliations: [SquaddieAffiliation.ENEMY] }
                    ),
                    inBattleSquaddieManager
                )
        })

        it("lists the remaining demon as not defeated", () => {
            expect(progress).toEqual(
                expect.objectContaining({
                    squaddies: expect.arrayContaining([
                        {
                            battleSquaddieId: squaddies.secondDemon,
                            isDefeated: false,
                        },
                    ]),
                })
            )
        })

        it("counts one defeated and one remaining", () => {
            expect(progress).toEqual(
                expect.objectContaining({
                    defeatedCount: 1,
                    remainingCount: 1,
                })
            )
        })
    })

    describe("when the goal is defeating a specific demon and that demon is down", () => {
        beforeEach(() => {
            MissionObjectiveProgressTestSetup.defeatSquaddie(
                inBattleSquaddieManager,
                squaddies.firstDemon
            )
        })

        it("reports that demon as defeated", () => {
            const progress =
                MissionObjectiveProgressService.calculateCriteriaProgress(
                    MissionObjectiveCriteriaService.newSpecificSquaddiesDefeatedCriteria(
                        { battleSquaddieIds: [squaddies.firstDemon] }
                    ),
                    inBattleSquaddieManager
                )

            expect(progress).toEqual(
                expect.objectContaining({
                    squaddies: [
                        {
                            battleSquaddieId: squaddies.firstDemon,
                            isDefeated: true,
                        },
                    ],
                })
            )
        })
    })

    describe("when the goal is protecting the knight", () => {
        it("reports the knight as not defeated", () => {
            const progress =
                MissionObjectiveProgressService.calculateCriteriaProgress(
                    MissionObjectiveCriteriaService.newSpecificSquaddiesInjuredCriteria(
                        { outOfBattleSquaddieIds: ["knight"] }
                    ),
                    inBattleSquaddieManager
                )

            expect(progress).toEqual(
                expect.objectContaining({
                    squaddies: [
                        {
                            battleSquaddieId: squaddies.knight,
                            isDefeated: false,
                        },
                    ],
                })
            )
        })
    })
})
