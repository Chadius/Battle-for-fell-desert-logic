import { beforeEach, describe, expect, it } from "vitest"
import type { MissionEngine } from "../missionEngine.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"
import {
    createTwoPlayerMission,
    TwoPlayerMissionActionIds,
} from "../../../testUtils/mission/twoPlayerMission.js"
import { useSelfTargetedAction } from "../../../testUtils/mission/useSelfTargetedAction.js"

describe("MissionEngine multiple attack penalty contribution", () => {
    let missionEngine: MissionEngine
    let playerId: BattleSquaddieId

    const getAttackContribution = () =>
        missionEngine.getSquaddieInfo(playerId).attackContributionThisTurn

    beforeEach(() => {
        ;({ missionEngine, player1Id: playerId } = createTwoPlayerMission())
    })

    describe("when a weapon action is used", () => {
        beforeEach(() => {
            useSelfTargetedAction({
                missionEngine,
                actor: playerId,
                actionId: TwoPlayerMissionActionIds.salute,
            })
        })

        it("adds to the squaddie's attack contribution", () => {
            expect(getAttackContribution()).toBeGreaterThan(0)
        })

        describe("and the weapon action is undone", () => {
            beforeEach(() => {
                missionEngine.undoLastPlayerUndoableAction()
            })

            it("takes the contribution back", () => {
                expect(getAttackContribution()).toBe(0)
            })
        })
    })

    describe("when a non-weapon action is used", () => {
        beforeEach(() => {
            useSelfTargetedAction({
                missionEngine,
                actor: playerId,
                actionId: TwoPlayerMissionActionIds.jab,
            })
        })

        it("does not add to the squaddie's attack contribution", () => {
            expect(getAttackContribution()).toBe(0)
        })
    })
})
