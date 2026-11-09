import { beforeEach, describe, expect, it } from "vitest"
import type { MissionEngine } from "../missionEngine.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"
import {
    createTwoPlayerMission,
    TwoPlayerMissionActionIds,
} from "../../../testUtils/mission/twoPlayerMission.js"
import { useSelfTargetedAction } from "../../../testUtils/mission/useSelfTargetedAction.js"

describe("MissionEngine.undoLastPlayerUndoableAction restores mission statistics", () => {
    let missionEngine: MissionEngine
    let playerId: BattleSquaddieId
    let healingReceivedBeforeHeal: number

    const getHealingReceived = () =>
        missionEngine.getMissionStatistics().healingReceivedByPlayerTeam

    const heal = () =>
        useSelfTargetedAction({
            missionEngine,
            actor: playerId,
            actionId: TwoPlayerMissionActionIds.mend,
        })

    beforeEach(() => {
        ;({ missionEngine, player1Id: playerId } = createTwoPlayerMission({
            startingDamage: 5,
        }))
        healingReceivedBeforeHeal = getHealingReceived()
        heal()
    })

    it("counts the healing after the squaddie heals", () => {
        expect(getHealingReceived()).toBeGreaterThan(healingReceivedBeforeHeal)
    })

    describe("and the heal is undone", () => {
        beforeEach(() => {
            missionEngine.undoLastPlayerUndoableAction()
        })

        it("takes the healing back off the statistics", () => {
            expect(getHealingReceived()).toBe(healingReceivedBeforeHeal)
        })

        describe("and the squaddie heals again", () => {
            let healingReceivedAfterFirstHeal: number

            beforeEach(() => {
                healingReceivedAfterFirstHeal = getHealingReceived()
                heal()
            })

            it("counts the new healing", () => {
                expect(getHealingReceived()).toBeGreaterThan(
                    healingReceivedAfterFirstHeal
                )
            })
        })
    })
})
