import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine.js"
import { MissionAffiliationTurn } from "../../missionTurn.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"
import {
    createTwoPlayerMission,
    TwoPlayerMissionActionIds,
} from "../../../testUtils/mission/twoPlayerMission.js"

const useSelfTargetedAction = ({
    missionEngine,
    actor,
    actionId,
}: {
    missionEngine: MissionEngine
    actor: BattleSquaddieId
    actionId: string
}) => {
    missionEngine.readyAction({
        actor,
        targets: [actor],
        action: { id: actionId },
    })
    missionEngine.useActionAndGetResults()
}

describe("MissionEngine.getSquaddieMidTurn", () => {
    let missionEngine: MissionEngine
    let player1Id: BattleSquaddieId

    beforeEach(() => {
        ;({ missionEngine, player1Id } = createTwoPlayerMission())
    })

    describe("when no squaddie in the phase has acted yet", () => {
        it("reports no squaddie mid-turn", () => {
            expect(missionEngine.getSquaddieMidTurn()).toBeUndefined()
        })
    })

    describe("when a squaddie has acted and can still act", () => {
        beforeEach(() => {
            useSelfTargetedAction({
                missionEngine,
                actor: player1Id,
                actionId: TwoPlayerMissionActionIds.jab,
            })
        })

        it("reports that squaddie", () => {
            expect(missionEngine.getSquaddieMidTurn()).toEqual(player1Id)
        })

        describe("and that squaddie ends their turn", () => {
            beforeEach(() => {
                missionEngine.endSquaddieTurn(player1Id)
            })

            it("reports no squaddie mid-turn", () => {
                expect(missionEngine.getSquaddieMidTurn()).toBeUndefined()
            })
        })

        describe("and their only action is undone", () => {
            beforeEach(() => {
                missionEngine.undoLastPlayerUndoableAction()
            })

            it("reports no squaddie mid-turn", () => {
                expect(missionEngine.getSquaddieMidTurn()).toBeUndefined()
            })
        })

        describe("and they act twice, then only the latest action is undone", () => {
            beforeEach(() => {
                useSelfTargetedAction({
                    missionEngine,
                    actor: player1Id,
                    actionId: TwoPlayerMissionActionIds.jab,
                })
                missionEngine.undoLastPlayerUndoableAction()
            })

            it("still reports that squaddie", () => {
                expect(missionEngine.getSquaddieMidTurn()).toEqual(player1Id)
            })
        })
    })

    describe("when a squaddie has only taken an action that costs no action points", () => {
        beforeEach(() => {
            useSelfTargetedAction({
                missionEngine,
                actor: player1Id,
                actionId: TwoPlayerMissionActionIds.wave,
            })
        })

        it("still reports that squaddie", () => {
            expect(missionEngine.getSquaddieMidTurn()).toEqual(player1Id)
        })
    })

    describe("when the phase belongs to no affiliation", () => {
        beforeEach(() => {
            ;({ missionEngine } = createTwoPlayerMission({
                missionAffiliationTurn: MissionAffiliationTurn.TURN_START,
            }))
        })

        it("reports no squaddie mid-turn", () => {
            expect(missionEngine.getSquaddieMidTurn()).toBeUndefined()
        })
    })
})
