import { beforeEach, describe, expect, it } from "vitest"
import type { MissionEngine } from "../../../../mission/missionEngine/missionEngine.js"
import type { BattleSquaddieId } from "../../../../squaddie/inBattle/battleSquaddieId.js"
import {
    createTwoPlayerMission,
    TwoPlayerMissionActionIds,
} from "../../../../testUtils/mission/twoPlayerMission.js"
import {
    SquaddieActionClassification,
    SquaddieActionClassificationService,
} from "../../../squaddieActionClassification.js"
import {
    DEFAULT_END_TURN_ACTION_ID,
    DEFAULT_MOVE_ACTION_ID,
} from "../../../squaddieAction.js"

describe("categorizeSquaddieActions classification", () => {
    let missionEngine: MissionEngine
    let player1Id: BattleSquaddieId

    beforeEach(() => {
        ;({ missionEngine, player1Id } = createTwoPlayerMission())
    })

    const expectedClassificationOf = (actionId: string) =>
        SquaddieActionClassificationService.classify(
            missionEngine.getActionById(actionId)
        )

    const listedClassificationOf = (
        actionList: "validActions" | "invalidActions",
        actionId: string
    ) =>
        missionEngine
            .getSquaddieActionValidity(player1Id)
            [
                actionList
            ].find((listedAction) => listedAction.actionId === actionId)
            ?.classification

    describe("when the squaddie can use an action", () => {
        it("lists the valid action with its classification", () => {
            expect(
                listedClassificationOf(
                    "validActions",
                    TwoPlayerMissionActionIds.jab
                )
            ).toBe(expectedClassificationOf(TwoPlayerMissionActionIds.jab))
        })
    })

    describe("when the squaddie has no action points left", () => {
        beforeEach(() => {
            missionEngine.endSquaddieTurn(player1Id)
        })

        it("lists the invalid action with its classification", () => {
            expect(
                listedClassificationOf(
                    "invalidActions",
                    TwoPlayerMissionActionIds.jab
                )
            ).toBe(expectedClassificationOf(TwoPlayerMissionActionIds.jab))
        })
    })

    describe("when the list includes the default actions every squaddie gets", () => {
        it("classifies the default end-turn action as END", () => {
            expect(
                listedClassificationOf(
                    "validActions",
                    DEFAULT_END_TURN_ACTION_ID
                )
            ).toBe(SquaddieActionClassification.END)
        })

        it("classifies the default move action as MOVE", () => {
            expect(
                listedClassificationOf("validActions", DEFAULT_MOVE_ACTION_ID)
            ).toBe(SquaddieActionClassification.MOVE)
        })
    })
})
