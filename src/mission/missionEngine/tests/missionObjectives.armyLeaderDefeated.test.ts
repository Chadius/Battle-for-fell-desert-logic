import { beforeEach, describe, expect, it } from "vitest"
import { RollGenerator } from "../../../squaddieAction/calculate/roll/rollGenerator.js"
import {
    MissionEngineTestHarness,
    MissionEngineTestHarnessIds,
} from "../../../testUtils/mission/missionEngineTestHarness.js"
import { MissionObjectiveCriteriaService } from "../../missionObjectiveCriteria.js"
import { MissionObjectiveService } from "../../missionObjective.js"
import { MissionObjectiveRewardService } from "../../missionObjectiveReward.js"
import { ArmyManager } from "../../../campaign/army/armyManager.js"
import { ArmyService } from "../../../campaign/army/army.js"
import { CampaignSquaddieService } from "../../../campaign/army/campaignSquaddie.js"

// [6,6]: max-roll bump → CRITICAL → kills the Slither Demon (willKo=true)
const KILL_HIT = [6, 6]

function advanceHarnessToPlayerTurn(harness: MissionEngineTestHarness): void {
    harness.transitionToNextPhase()
    harness.transitionToNextPhase()
}

function placeSlitherDemonAdjacentToLini(
    harness: MissionEngineTestHarness
): void {
    const demonId = harness.getSlitherDemonSquaddieId()
    const coordinateMapManager =
        harness.missionManager!.coordinateMapCollectionManager!
    coordinateMapManager.removeSquaddie({
        mapId: MissionEngineTestHarnessIds.mapId,
        squaddieId: demonId,
    })
    coordinateMapManager.addSquaddie({
        mapId: MissionEngineTestHarnessIds.mapId,
        squaddieId: demonId,
        coordinate: { row: 0, col: 1 },
    })
}

function setSlitherDemonAsArmyLeader(harness: MissionEngineTestHarness): void {
    const leader = CampaignSquaddieService.new({
        id: "slither-demon-leader",
        outOfBattleAttributeSheetId: "irrelevant-sheet",
        outOfBattleSquaddieId:
            MissionEngineTestHarnessIds.slitherDemon.outOfBattleSquaddieId,
        name: "Slither Demon",
        isLeader: true,
    })
    const army = ArmyService.addOrUpdate({
        army: ArmyService.new(),
        campaignSquaddie: leader,
    })
    harness.missionManager!.armyManager = new ArmyManager(army)
}

describe("MissionEngine — ARMY_LEADER_DEFEATED objective", () => {
    let harness: MissionEngineTestHarness

    beforeEach(() => {
        harness = new MissionEngineTestHarness(new RollGenerator(KILL_HIT))
        placeSlitherDemonAdjacentToLini(harness)
        setSlitherDemonAsArmyLeader(harness)
        advanceHarnessToPlayerTurn(harness)

        const defeatLeaderObjective = MissionObjectiveService.new({
            id: "leader-koed",
            rewards: [
                MissionObjectiveRewardService.newPlayMovieReward("down!"),
            ],
            criteria: [
                MissionObjectiveCriteriaService.newArmyLeaderDefeatedCriteria(),
            ],
        })
        harness.addObjective(defeatLeaderObjective)
    })

    describe("before the leader is defeated", () => {
        it("the objective remains in-progress", () => {
            expect(
                harness
                    .getInProgressMissionObjectives()
                    .map((objective) => objective.id)
            ).toContain("leader-koed")
        })
    })

    describe("once the leader is KO'd", () => {
        beforeEach(() => {
            const demonId = harness.getSlitherDemonSquaddieId()
            harness.readyAction({
                actor: harness.getLiniSquaddieId(),
                targets: [demonId],
                action: {
                    id: MissionEngineTestHarnessIds.lini.scimitarActionId,
                },
            })
            harness.useActionAndGetResults()
        })

        it("moves the objective to completed-but-not-rewarded", () => {
            expect(
                harness
                    .getCompletedButNotRewardedMissionObjectives()
                    .map((objective) => objective.id)
            ).toContain("leader-koed")
        })

        it("removes the objective from the in-progress list", () => {
            expect(
                harness
                    .getInProgressMissionObjectives()
                    .map((objective) => objective.id)
            ).not.toContain("leader-koed")
        })
    })
})
