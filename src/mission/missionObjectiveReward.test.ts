import { describe, expect, it } from "vitest"
import {
    MissionObjectiveRewardService,
    MissionObjectiveRewardType,
} from "./missionObjectiveReward.js"
import { ChallengeModifierType } from "../squaddieAction/calculate/challengeModifier/challengeModifierSetting.js"

describe("Mission Objective Reward", () => {
    describe("given a single next-mission ID", () => {
        it("creates a reward that carries that mission ID", () => {
            const reward = MissionObjectiveRewardService.newNextMissionsReward([
                "mission_2",
            ])

            expect(reward.type).toBe(MissionObjectiveRewardType.NEXT_MISSIONS)
            expect(reward.missionIds).toEqual(["mission_2"])
        })
    })

    describe("given multiple next-mission IDs", () => {
        it("creates a reward that carries all of them", () => {
            const reward = MissionObjectiveRewardService.newNextMissionsReward([
                "mission_2",
                "mission_3",
                "mission_4",
            ])

            expect(reward.missionIds).toEqual([
                "mission_2",
                "mission_3",
                "mission_4",
            ])
        })
    })

    describe("when the mission ID array is mutated after the reward is created", () => {
        it("leaves the reward's mission IDs unchanged", () => {
            const originalIds = ["mission_2", "mission_3"]
            const reward =
                MissionObjectiveRewardService.newNextMissionsReward(originalIds)

            originalIds.push("mission_4")

            expect(reward.missionIds).toEqual(["mission_2", "mission_3"])
        })
    })

    describe("when creating a mission-ends reward", () => {
        it("produces a reward of type MISSION_ENDS", () => {
            const reward = MissionObjectiveRewardService.newMissionEndsReward()

            expect(reward.type).toBe(MissionObjectiveRewardType.MISSION_ENDS)
        })
    })

    describe("when creating a mission-failure reward", () => {
        it("produces a reward of type MISSION_FAILURE", () => {
            const reward =
                MissionObjectiveRewardService.newMissionFailureReward()

            expect(reward.type).toBe(MissionObjectiveRewardType.MISSION_FAILURE)
        })
    })

    describe("when creating a play-movie reward", () => {
        it("carries the given movie ID", () => {
            const reward =
                MissionObjectiveRewardService.newPlayMovieReward(
                    "some-movie-id"
                )

            expect(reward.type).toBe(MissionObjectiveRewardType.PLAY_MOVIE)
            expect(reward.movieId).toBe("some-movie-id")
        })
    })

    describe("when creating a set-challenge-modifier reward", () => {
        it("carries the modifier type and value", () => {
            const reward =
                MissionObjectiveRewardService.newSetChallengeModifierReward(
                    ChallengeModifierType.TRAINING_WHEELS,
                    true
                )

            expect(reward.type).toBe(
                MissionObjectiveRewardType.SET_CHALLENGE_MODIFIER
            )
            expect(reward.challengeModifierType).toBe(
                ChallengeModifierType.TRAINING_WHEELS
            )
            expect(reward.value).toBe(true)
        })
    })

    describe("when deserializing JSON for a next-missions reward", () => {
        it("creates a reward that carries the mission IDs", () => {
            const reward = MissionObjectiveRewardService.createFromJSON({
                type: MissionObjectiveRewardType.NEXT_MISSIONS,
                missionIds: ["mission_2", "mission_3"],
            })

            expect(reward.type).toBe(MissionObjectiveRewardType.NEXT_MISSIONS)
            if (reward.type === MissionObjectiveRewardType.NEXT_MISSIONS) {
                expect(reward.missionIds).toEqual(["mission_2", "mission_3"])
            }
        })
    })

    describe("when deserializing JSON for a mission-ends reward", () => {
        it("creates a reward of type MISSION_ENDS", () => {
            const reward = MissionObjectiveRewardService.createFromJSON({
                type: MissionObjectiveRewardType.MISSION_ENDS,
            })

            expect(reward.type).toBe(MissionObjectiveRewardType.MISSION_ENDS)
        })
    })

    describe("when deserializing JSON for a set-challenge-modifier reward", () => {
        it("creates a reward that carries the modifier type and value", () => {
            const reward = MissionObjectiveRewardService.createFromJSON({
                type: MissionObjectiveRewardType.SET_CHALLENGE_MODIFIER,
                challengeModifierType: ChallengeModifierType.TRAINING_WHEELS,
                value: false,
            })

            expect(reward.type).toBe(
                MissionObjectiveRewardType.SET_CHALLENGE_MODIFIER
            )
            if (
                reward.type ===
                MissionObjectiveRewardType.SET_CHALLENGE_MODIFIER
            ) {
                expect(reward.challengeModifierType).toBe(
                    ChallengeModifierType.TRAINING_WHEELS
                )
                expect(reward.value).toBe(false)
            }
        })
    })

    describe("when the JSON reward type is unrecognized", () => {
        it("throws an error naming the invalid type", () => {
            expect(() => {
                MissionObjectiveRewardService.createFromJSON({
                    type: "INVALID_TYPE",
                })
            }).toThrow(
                "[MissionObjectiveRewardService.createFromJSON]: invalid reward type: INVALID_TYPE"
            )
        })
    })

    describe("when challengeModifierType is missing from a set-challenge-modifier JSON payload", () => {
        it("throws an error", () => {
            expect(() => {
                MissionObjectiveRewardService.createFromJSON({
                    type: MissionObjectiveRewardType.SET_CHALLENGE_MODIFIER,
                    value: true,
                })
            }).toThrow(
                "[MissionObjectiveRewardService.createFromJSON]: challengeModifierType is required for SET_CHALLENGE_MODIFIER reward"
            )
        })
    })

    describe("when challengeModifierType is not a recognized value in a set-challenge-modifier JSON payload", () => {
        it("throws an error naming the invalid value", () => {
            expect(() => {
                MissionObjectiveRewardService.createFromJSON({
                    type: MissionObjectiveRewardType.SET_CHALLENGE_MODIFIER,
                    challengeModifierType: "NOT_A_REAL_MODIFIER",
                    value: true,
                })
            }).toThrow(
                "[MissionObjectiveRewardService.createFromJSON]: 'NOT_A_REAL_MODIFIER' is not a valid challengeModifierType"
            )
        })
    })

    describe("when value is missing from a set-challenge-modifier JSON payload", () => {
        it("throws an error", () => {
            expect(() => {
                MissionObjectiveRewardService.createFromJSON({
                    type: MissionObjectiveRewardType.SET_CHALLENGE_MODIFIER,
                    challengeModifierType:
                        ChallengeModifierType.TRAINING_WHEELS,
                })
            }).toThrow(
                "[MissionObjectiveRewardService.createFromJSON]: value is required for SET_CHALLENGE_MODIFIER reward"
            )
        })
    })

    describe("when a set-challenge-modifier reward is serialized and recreated from JSON", () => {
        it("round-trips to an equivalent reward", () => {
            const reward =
                MissionObjectiveRewardService.newSetChallengeModifierReward(
                    ChallengeModifierType.TRAINING_WHEELS,
                    true
                )

            const restored = MissionObjectiveRewardService.createFromJSON(
                MissionObjectiveRewardService.serialize(reward)
            )

            expect(restored).toEqual(reward)
        })
    })
})
