import { describe, expect, it } from "vitest"
import { MissionEngineTestHarness } from "../../../testUtils/mission/missionEngineTestHarness"
import { MissionObjectiveService } from "../../missionObjective"
import { MissionObjectiveRewardService } from "../../missionObjectiveReward"
import { MissionObjectiveCriteriaService } from "../../missionObjectiveCriteria"
import { MissionAffiliationTurn } from "../../missionTurn"
import { MovieSceneImageService } from "../../../movie/movieSceneImage"
import { MovieSceneType } from "../../../movie/movieScene"
import type { Movie } from "../../../movie/movie"
import { MovieEngineCommand } from "../../../movie/movieEngine"

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

const harnessWithEnemyCommanderObjective = ({
    beforeAdvance,
}: {
    beforeAdvance?: (harness: MissionEngineTestHarness) => void
} = {}): MissionEngineTestHarness => {
    const harness = new MissionEngineTestHarness()
    harness.registerMovie(makeMovie("commander-orders-attack"))
    harness.addObjective(
        MissionObjectiveService.new({
            id: "enemy-commander-orders-attack",
            rewards: [
                MissionObjectiveRewardService.newPlayMovieReward("movie-1"),
            ],
            criteria: [
                MissionObjectiveCriteriaService.newPhaseReachedCriteria({
                    turnCount: 0,
                    missionAffiliationTurn:
                        MissionAffiliationTurn.ENEMY_TURN_START,
                }),
            ],
        })
    )
    beforeAdvance?.(harness)
    harness.advanceToPlayerTurn()

    return harness
}

describe("PHASE_REACHED objectives", () => {
    it("is already satisfied at the mission's initial turn and phase", () => {
        const harness = new MissionEngineTestHarness()
        harness.addObjective(
            MissionObjectiveService.new({
                id: "opening-dialogue",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward(["intro"]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newPhaseReachedCriteria({
                        turnCount: 0,
                        missionAffiliationTurn:
                            MissionAffiliationTurn.TURN_START,
                    }),
                ],
            })
        )

        const completed =
            harness.getCompletedNonTerminalButNotRewardedObjectives()
        expect(completed.map((objective) => objective.id)).toContain(
            "opening-dialogue"
        )
    })

    it("does not fire until the target phase is reached", () => {
        const harness = new MissionEngineTestHarness()
        harness.addObjective(
            MissionObjectiveService.new({
                id: "enemy-commander-orders-attack",
                rewards: [
                    MissionObjectiveRewardService.newDialogueReward([
                        "impatient",
                    ]),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newPhaseReachedCriteria({
                        turnCount: 0,
                        missionAffiliationTurn:
                            MissionAffiliationTurn.ENEMY_TURN_START,
                    }),
                ],
            })
        )
        harness.advanceToPlayerTurn()

        const completed =
            harness.getCompletedNonTerminalButNotRewardedObjectives()
        expect(completed.map((objective) => objective.id)).not.toContain(
            "enemy-commander-orders-attack"
        )
    })

    describe("when the target phase is reached mid auto-advance", () => {
        const harnessAtTargetPhase = (): MissionEngineTestHarness => {
            const harness = harnessWithEnemyCommanderObjective()
            harness.endSquaddieTurn(harness.getLiniSquaddieId())
            return harness
        }

        it("triggers its reward as soon as the phase is reached", () => {
            const harness = harnessAtTargetPhase()

            expect(harness.isMoviePlaying()).toBe(true)
        })

        it("pauses further AI action while the movie plays", () => {
            const harness = harnessAtTargetPhase()

            expect(harness.getCurrentAffiliationTurn()).toBe(
                MissionAffiliationTurn.ENEMY_TURN_START
            )
        })
    })

    it("still fires once turn/phase progression passes the target, even when the target phase itself is skipped", () => {
        const harness = harnessWithEnemyCommanderObjective({
            beforeAdvance: (harness) => harness.defeatSlitherDemon(),
        })

        harness.endSquaddieTurn(harness.getLiniSquaddieId())

        expect(harness.isMoviePlaying()).toBe(true)
    })

    it("does not re-trigger an already rewarded PHASE_REACHED objective on later phase transitions", () => {
        const harness = harnessWithEnemyCommanderObjective()
        harness.endSquaddieTurn(harness.getLiniSquaddieId())
        harness.processMovieCommand(MovieEngineCommand.STOP)
        harness.transitionToNextPhase()

        expect(
            harness
                .getCompletedButNotRewardedMissionObjectives()
                .map((objective) => objective.id)
        ).not.toContain("enemy-commander-orders-attack")
    })
})
