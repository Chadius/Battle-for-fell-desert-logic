import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngine } from "../missionEngine.js"
import { DEFAULT_ACTION_POINTS } from "../../../squaddie/inBattle/inBattleSquaddie.js"
import type { BattleSquaddieId } from "../../../squaddie/inBattle/battleSquaddieId.js"
import {
    DEFAULT_END_TURN_ACTION_ID,
    DEFAULT_MOVE_ACTION_ID,
} from "../../../squaddieAction/squaddieAction.js"
import {
    createDashMission,
    DashMissionActionIds,
} from "../../../testUtils/mission/dashMission.js"
import { useSelfTargetedAction } from "../../../testUtils/mission/useSelfTargetedAction.js"

const actionPointCostDependsOnMovementPathForValidAction = ({
    missionEngine,
    actor,
    actionId,
}: {
    missionEngine: MissionEngine
    actor: BattleSquaddieId
    actionId: string
}) =>
    missionEngine
        .getSquaddieActionValidity(actor)
        .validActions.find((validAction) => validAction.actionId === actionId)
        ?.actionPointCostDependsOnMovementPath

const actionPointCostDependsOnMovementPathForInvalidAction = ({
    missionEngine,
    actor,
    actionId,
}: {
    missionEngine: MissionEngine
    actor: BattleSquaddieId
    actionId: string
}) =>
    missionEngine
        .getSquaddieActionValidity(actor)
        .invalidActions.find(
            (invalidAction) => invalidAction.actionId === actionId
        )?.actionPointCostDependsOnMovementPath

const spendAllActionPoints = ({
    missionEngine,
    actor,
}: {
    missionEngine: MissionEngine
    actor: BattleSquaddieId
}) => {
    Array.from({ length: DEFAULT_ACTION_POINTS }).forEach(() =>
        useSelfTargetedAction({
            missionEngine,
            actor,
            actionId: DashMissionActionIds.jab,
        })
    )
}

describe("MissionEngine.getSquaddieActionValidity actionPointCostDependsOnMovementPath", () => {
    let missionEngine: MissionEngine
    let runnerId: BattleSquaddieId

    beforeEach(() => {
        ;({ missionEngine, runnerId } = createDashMission())
    })

    describe("when the action spends a fixed number of action points", () => {
        it("does not depend on the movement path", () => {
            expect(
                actionPointCostDependsOnMovementPathForValidAction({
                    missionEngine,
                    actor: runnerId,
                    actionId: DashMissionActionIds.jab,
                })
            ).toBe(false)
        })
    })

    describe("when the action charges action points for the path the actor moves", () => {
        it("depends on the movement path", () => {
            expect(
                actionPointCostDependsOnMovementPathForValidAction({
                    missionEngine,
                    actor: runnerId,
                    actionId: DashMissionActionIds.dash,
                })
            ).toBe(true)
        })
    })

    describe("when the action spends all remaining action points", () => {
        it("does not depend on the movement path", () => {
            expect(
                actionPointCostDependsOnMovementPathForValidAction({
                    missionEngine,
                    actor: runnerId,
                    actionId: DEFAULT_END_TURN_ACTION_ID,
                })
            ).toBe(false)
        })
    })

    describe("when the squaddie has somewhere to move", () => {
        it("reports that Move depends on the movement path", () => {
            expect(
                actionPointCostDependsOnMovementPathForValidAction({
                    missionEngine,
                    actor: runnerId,
                    actionId: DEFAULT_MOVE_ACTION_ID,
                })
            ).toBe(true)
        })
    })

    describe("when the squaddie has no action points left to move with", () => {
        beforeEach(() => {
            spendAllActionPoints({ missionEngine, actor: runnerId })
        })

        it("reports that the invalid Move still depends on the movement path", () => {
            expect(
                actionPointCostDependsOnMovementPathForInvalidAction({
                    missionEngine,
                    actor: runnerId,
                    actionId: DEFAULT_MOVE_ACTION_ID,
                })
            ).toBe(true)
        })
    })
})
