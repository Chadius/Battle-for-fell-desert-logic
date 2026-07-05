import { beforeEach, describe, expect, it } from "vitest"
import { MissionEngineTestHarness } from "../../../testUtils/mission/missionEngineTestHarness"
import { MissionObjectiveService } from "../../missionObjective"
import { MissionObjectiveRewardService } from "../../missionObjectiveReward"
import { MissionObjectiveCriteriaService } from "../../missionObjectiveCriteria"
import { SquaddieAffiliation } from "../../../affiliation/affiliation"
import { ChallengeModifierType } from "../../../squaddieAction/calculate/challengeModifier/challengeModifierSetting"
import { MovieSceneImageService } from "../../../movie/movieSceneImage"
import { MovieSceneType } from "../../../movie/movieScene"
import type { Movie } from "../../../movie/movie"

const makeMovie = (id: string, sceneId: string): Movie => ({
    id,
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

describe("SET_CHALLENGE_MODIFIER reward", () => {
    describe("when an action completes an objective with a SET_CHALLENGE_MODIFIER reward", () => {
        let harness: MissionEngineTestHarness

        beforeEach(() => {
            harness = new MissionEngineTestHarness()
            harness.addObjective(
                MissionObjectiveService.new({
                    id: "turn-on-training-wheels",
                    rewards: [
                        MissionObjectiveRewardService.newSetChallengeModifierReward(
                            ChallengeModifierType.TRAINING_WHEELS,
                            true
                        ),
                    ],
                    criteria: [
                        MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                            {
                                affiliations: [SquaddieAffiliation.ENEMY],
                            }
                        ),
                    ],
                })
            )
            harness.defeatSlitherDemon()
            harness.advanceToPlayerTurn()
            harness.endSquaddieTurn(harness.getLiniSquaddieId())
        })

        it("applies the challenge modifier value", () => {
            expect(
                harness.getChallengeModifierSetting()?.[
                    ChallengeModifierType.TRAINING_WHEELS
                ]
            ).toBe(true)
        })

        it("marks the objective as rewarded so it is not applied again", () => {
            const objectivesStillNeedingReward =
                harness.getCompletedButNotRewardedMissionObjectives()

            expect(
                objectivesStillNeedingReward.some(
                    (objective) => objective.id === "turn-on-training-wheels"
                )
            ).toBe(false)
        })
    })

    describe("when an objective bundles a SET_CHALLENGE_MODIFIER reward with a PLAY_MOVIE reward", () => {
        let harness: MissionEngineTestHarness

        beforeEach(() => {
            harness = new MissionEngineTestHarness()
            harness.registerMovie(makeMovie("victory-movie", "victory-scene"))
            harness.addObjective(
                MissionObjectiveService.new({
                    id: "bundled-rewards",
                    rewards: [
                        MissionObjectiveRewardService.newPlayMovieReward(
                            "victory-movie"
                        ),
                        MissionObjectiveRewardService.newSetChallengeModifierReward(
                            ChallengeModifierType.TRAINING_WHEELS,
                            true
                        ),
                    ],
                    criteria: [
                        MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                            {
                                affiliations: [SquaddieAffiliation.ENEMY],
                            }
                        ),
                    ],
                })
            )
            harness.defeatSlitherDemon()
            harness.advanceToPlayerTurn()
        })

        it("still applies the challenge modifier reward", () => {
            harness.endSquaddieTurn(harness.getLiniSquaddieId())

            expect(
                harness.getChallengeModifierSetting()?.[
                    ChallengeModifierType.TRAINING_WHEELS
                ]
            ).toBe(true)
        })
    })

    describe("when an objective only has a DIALOGUE reward", () => {
        it("is left unrewarded for the caller to resolve", () => {
            const harness = new MissionEngineTestHarness()
            harness.addObjective(
                MissionObjectiveService.new({
                    id: "dialogue-only",
                    rewards: [
                        MissionObjectiveRewardService.newDialogueReward([
                            "victory-line",
                        ]),
                    ],
                    criteria: [
                        MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                            {
                                affiliations: [SquaddieAffiliation.ENEMY],
                            }
                        ),
                    ],
                })
            )
            harness.defeatSlitherDemon()
            harness.advanceToPlayerTurn()

            harness.endSquaddieTurn(harness.getLiniSquaddieId())

            const objectivesStillNeedingReward =
                harness.getCompletedButNotRewardedMissionObjectives()
            expect(
                objectivesStillNeedingReward.some(
                    (objective) => objective.id === "dialogue-only"
                )
            ).toBe(true)
        })
    })
})
