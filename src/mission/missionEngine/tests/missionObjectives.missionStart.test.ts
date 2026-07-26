import { describe, expect, it } from "vitest"
import { MissionEngineTestHarness } from "../../../testUtils/mission/missionEngineTestHarness.js"
import { MissionObjectiveService } from "../../missionObjective.js"
import { MissionObjectiveRewardService } from "../../missionObjectiveReward.js"
import { MissionObjectiveCriteriaService } from "../../missionObjectiveCriteria.js"
import { MissionAffiliationTurn } from "../../missionTurn.js"
import { MovieSceneImageService } from "../../../movie/movieSceneImage.js"
import { MovieSceneType } from "../../../movie/movieScene.js"
import type { Movie } from "../../../movie/movie.js"
import { MovieEngineCommand } from "../../../movie/movieEngine.js"

const makeMovie = (sceneId: string): Movie => ({
    id: "movie-1",
    firstSceneId: sceneId,
    scenes: [
        {
            type: MovieSceneType.IMAGE,
            data: MovieSceneImageService.new({
                id: sceneId,
                resourceManifestEntryId: "img",
            }),
        },
    ],
})

const newMissionStartObjective = (id: string, movieId: string) =>
    MissionObjectiveService.new({
        id,
        rewards: [MissionObjectiveRewardService.newPlayMovieReward(movieId)],
        criteria: [
            MissionObjectiveCriteriaService.newPhaseReachedCriteria({
                turnCount: 0,
                missionAffiliationTurn: MissionAffiliationTurn.TURN_START,
            }),
        ],
    })

describe("Mission start objectives", () => {
    it("is satisfied at the mission's initial state, before any command is given", () => {
        const harness = new MissionEngineTestHarness()
        harness.addObjective(
            newMissionStartObjective("set-the-stage", "movie-1")
        )

        const completed =
            harness.getCompletedNonTerminalButNotRewardedObjectives()

        expect(completed.map((objective) => objective.id)).toContain(
            "set-the-stage"
        )
    })

    it("plays its reward as soon as the engine takes its first step, before the player turn begins", () => {
        const harness = new MissionEngineTestHarness()
        harness.registerMovie(makeMovie("opening-narration"))
        harness.addObjective(
            newMissionStartObjective("set-the-stage", "movie-1")
        )

        harness.transitionToNextPhase()

        expect(harness.isMoviePlaying()).toBe(true)
        expect(harness.getCurrentAffiliationTurn()).toBe(
            MissionAffiliationTurn.PLAYER_TURN_START
        )
    })

    it("does not re-trigger once its reward has already been given", () => {
        const harness = new MissionEngineTestHarness()
        harness.registerMovie(makeMovie("opening-narration"))
        harness.addObjective(
            newMissionStartObjective("set-the-stage", "movie-1")
        )

        harness.transitionToNextPhase()
        harness.processMovieCommand(MovieEngineCommand.STOP)
        harness.transitionToNextPhase()

        expect(
            harness
                .getCompletedButNotRewardedMissionObjectives()
                .map((objective) => objective.id)
        ).not.toContain("set-the-stage")
    })
})
