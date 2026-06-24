import { describe, expect, it } from "vitest"
import {
    MissionObjectiveRewardService,
    MissionObjectiveRewardType,
} from "./missionObjectiveReward"

describe("Mission Objective Reward", () => {
    describe("DialogueReward", () => {
        it("Can create dialogue reward with single dialogue ID", () => {
            const reward = MissionObjectiveRewardService.newDialogueReward([
                "intro_dialogue",
            ])

            expect(reward.type).toBe(MissionObjectiveRewardType.DIALOGUE)
            expect(reward.dialogueIds).toEqual(["intro_dialogue"])
        })

        it("Can create dialogue reward with multiple dialogue IDs", () => {
            const reward = MissionObjectiveRewardService.newDialogueReward([
                "dialogue_1",
                "dialogue_2",
                "dialogue_3",
            ])

            expect(reward.type).toBe(MissionObjectiveRewardType.DIALOGUE)
            expect(reward.dialogueIds).toEqual([
                "dialogue_1",
                "dialogue_2",
                "dialogue_3",
            ])
        })

        it("Throws error when dialogueIds is empty array", () => {
            expect(() => {
                MissionObjectiveRewardService.newDialogueReward([])
            }).toThrow(
                "[MissionObjectiveRewardService.newDialogueReward]: dialogueIds must have at least 1 id"
            )
        })

        it("Throws error when dialogueIds is undefined", () => {
            expect(() => {
                MissionObjectiveRewardService.newDialogueReward(
                    undefined as any
                )
            }).toThrow(
                "[MissionObjectiveRewardService.newDialogueReward]: dialogueIds must have at least 1 id"
            )
        })

        it("Clones dialogueIds array to prevent external mutation", () => {
            const originalIds = ["dialogue_1", "dialogue_2"]
            const reward =
                MissionObjectiveRewardService.newDialogueReward(originalIds)

            originalIds.push("dialogue_3")

            expect(reward.dialogueIds).toEqual(["dialogue_1", "dialogue_2"])
            expect(reward.dialogueIds.length).toBe(2)
        })
    })

    describe("NextMissionsReward", () => {
        it("Can create next missions reward with single mission ID", () => {
            const reward = MissionObjectiveRewardService.newNextMissionsReward([
                "mission_2",
            ])

            expect(reward.type).toBe(MissionObjectiveRewardType.NEXT_MISSIONS)
            expect(reward.missionIds).toEqual(["mission_2"])
        })

        it("Can create next missions reward with multiple mission IDs", () => {
            const reward = MissionObjectiveRewardService.newNextMissionsReward([
                "mission_2",
                "mission_3",
                "mission_4",
            ])

            expect(reward.type).toBe(MissionObjectiveRewardType.NEXT_MISSIONS)
            expect(reward.missionIds).toEqual([
                "mission_2",
                "mission_3",
                "mission_4",
            ])
        })

        it("Clones missionIds array to prevent external mutation", () => {
            const originalIds = ["mission_2", "mission_3"]
            const reward =
                MissionObjectiveRewardService.newNextMissionsReward(originalIds)

            originalIds.push("mission_4")

            expect(reward.missionIds).toEqual(["mission_2", "mission_3"])
            expect(reward.missionIds.length).toBe(2)
        })
    })

    describe("MissionEndsReward", () => {
        it("Can create mission ends reward", () => {
            const reward = MissionObjectiveRewardService.newMissionEndsReward()

            expect(reward.type).toBe(MissionObjectiveRewardType.MISSION_ENDS)
        })
    })

    describe("MissionFailureReward", () => {
        it("Can create mission failure reward", () => {
            const reward =
                MissionObjectiveRewardService.newMissionFailureReward()

            expect(reward.type).toBe(MissionObjectiveRewardType.MISSION_FAILURE)
        })
    })

    describe("JSON Creation", () => {
        it("Can create dialogue reward from JSON", () => {
            const reward = MissionObjectiveRewardService.createFromJSON({
                type: MissionObjectiveRewardType.DIALOGUE,
                dialogueIds: ["dialogue_1", "dialogue_2"],
            })

            expect(reward.type).toBe(MissionObjectiveRewardType.DIALOGUE)
            if (reward.type === MissionObjectiveRewardType.DIALOGUE) {
                expect(reward.dialogueIds).toEqual(["dialogue_1", "dialogue_2"])
            }
        })

        it("Can create next missions reward from JSON", () => {
            const reward = MissionObjectiveRewardService.createFromJSON({
                type: MissionObjectiveRewardType.NEXT_MISSIONS,
                missionIds: ["mission_2", "mission_3"],
            })

            expect(reward.type).toBe(MissionObjectiveRewardType.NEXT_MISSIONS)
            if (reward.type === MissionObjectiveRewardType.NEXT_MISSIONS) {
                expect(reward.missionIds).toEqual(["mission_2", "mission_3"])
            }
        })

        it("Can create mission ends reward from JSON", () => {
            const reward = MissionObjectiveRewardService.createFromJSON({
                type: MissionObjectiveRewardType.MISSION_ENDS,
            })

            expect(reward.type).toBe(MissionObjectiveRewardType.MISSION_ENDS)
        })

        it("Throws error for invalid reward type", () => {
            expect(() => {
                MissionObjectiveRewardService.createFromJSON({
                    type: "INVALID_TYPE",
                })
            }).toThrow(
                "[MissionObjectiveRewardService.createFromJSON]: invalid reward type: INVALID_TYPE"
            )
        })

        it("Throws error when required dialogueIds missing for DIALOGUE type", () => {
            expect(() => {
                MissionObjectiveRewardService.createFromJSON({
                    type: MissionObjectiveRewardType.DIALOGUE,
                })
            }).toThrow(
                "[MissionObjectiveRewardService.newDialogueReward]: dialogueIds must have at least 1 id"
            )
        })
    })

    describe("PlayMovieReward", () => {
        it("creates a reward carrying the movie id", () => {
            const reward =
                MissionObjectiveRewardService.newPlayMovieReward(
                    "some-movie-id"
                )

            expect(reward.type).toBe(MissionObjectiveRewardType.PLAY_MOVIE)
            expect(reward.movieId).toBe("some-movie-id")
        })
    })

    describe("Multiple Rewards Example", () => {
        it("Can create array of multiple rewards for single objective", () => {
            const rewards = [
                MissionObjectiveRewardService.newDialogueReward([
                    "victory_dialogue",
                ]),
                MissionObjectiveRewardService.newNextMissionsReward([
                    "mission_2",
                    "mission_3",
                ]),
                MissionObjectiveRewardService.newMissionEndsReward(),
                MissionObjectiveRewardService.newMissionFailureReward(),
            ]

            expect(rewards.length).toBe(4)
            expect(rewards[0].type).toBe(MissionObjectiveRewardType.DIALOGUE)
            expect(rewards[1].type).toBe(
                MissionObjectiveRewardType.NEXT_MISSIONS
            )
            expect(rewards[2].type).toBe(
                MissionObjectiveRewardType.MISSION_ENDS
            )
            expect(rewards[3].type).toBe(
                MissionObjectiveRewardType.MISSION_FAILURE
            )
        })
    })
})
