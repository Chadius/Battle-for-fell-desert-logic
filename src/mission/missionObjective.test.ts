import { beforeEach, describe, expect, it } from "vitest"
import {
    type MissionObjective,
    MissionObjectiveService,
} from "./missionObjective"
import {
    MissionObjectiveRewardService,
    MissionObjectiveRewardType,
} from "./missionObjectiveReward"
import {
    MissionObjectiveCriteriaService,
    MissionObjectiveCriteriaType,
} from "./missionObjectiveCriteria"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import { OutOfBattleSquaddieService } from "../squaddie/outOfBattle/outOfBattleSquaddie"
import { InBattleSquaddieCollectionService } from "../squaddie/inBattle/inBattleSquaddieCollection"
import { SquaddieAffiliation } from "../affiliation/affiliation"
import { AttributeScore } from "../proficiency/attributeScore"
import {
    ProficiencyLevel,
    ProficiencyType,
} from "../proficiency/proficiencyLevel"
import { OutOfBattleSquaddieTestSetup } from "../testUtils/outOfBattleSquaddieTestSetup"

describe("Mission Objective", () => {
    let manager: InBattleSquaddieManager

    beforeEach(() => {
        const { manager: outOfBattleSquaddieManager } =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "test sheet",
                attributeSheetOptions: {
                    maxHitPoints: 10,
                    distancePerAction: 2,
                    skipOverPits: false,
                    attributeScores: {
                        [AttributeScore.BODY]: 5,
                        [AttributeScore.MIND]: 3,
                        [AttributeScore.SOUL]: 2,
                    },
                    proficiencyLevels: {
                        [ProficiencyType.DEFEND_BODY]: ProficiencyLevel.NOVICE,
                    },
                    rank: 1,
                    items: { maxCapacity: 2 },
                },
            })

        manager = new InBattleSquaddieManager(
            InBattleSquaddieCollectionService.new(),
            outOfBattleSquaddieManager
        )
    })

    describe("Creation Tests", () => {
        it("Can create objective with single reward and criterion", () => {
            const objective = MissionObjectiveService.new({
                id: "defeat_enemies",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward("victory"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            expect(objective.id).toBe("defeat_enemies")
            expect(objective.rewards).toHaveLength(1)
            expect(objective.criteria).toHaveLength(1)
            expect(objective.hasGivenReward).toBe(false)
        })

        it("Can create objective with multiple rewards and criteria", () => {
            const objective = MissionObjectiveService.new({
                id: "complex_objective",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward(
                        "dialogue1"
                    ),
                    MissionObjectiveRewardService.newNextMissionsReward([
                        "mission2",
                    ]),
                    MissionObjectiveRewardService.newMissionEndsReward(),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            outOfBattleSquaddieIds: ["boss"],
                        }
                    ),
                ],
            })

            expect(objective.rewards).toHaveLength(3)
            expect(objective.criteria).toHaveLength(2)
        })

        it("Can create with hasGivenReward explicitly set", () => {
            const objective = MissionObjectiveService.new({
                id: "test",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward(
                        "dialogue"
                    ),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
                hasGivenReward: true,
            })

            expect(objective.hasGivenReward).toBe(true)
        })

        it("Throws error when id is empty string", () => {
            expect(() => {
                MissionObjectiveService.new({
                    id: "",
                    rewards: [
                        MissionObjectiveRewardService.newPlayMovieReward(
                            "dialogue"
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
            }).toThrow(
                "[MissionObjectiveService.new]: id must be a non-empty string"
            )
        })

        it("Throws error when id is undefined", () => {
            expect(() => {
                MissionObjectiveService.new({
                    id: undefined as any,
                    rewards: [
                        MissionObjectiveRewardService.newPlayMovieReward(
                            "dialogue"
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
            }).toThrow(
                "[MissionObjectiveService.new]: id must be a non-empty string"
            )
        })

        it("Throws error when rewards array is empty", () => {
            expect(() => {
                MissionObjectiveService.new({
                    id: "test",
                    rewards: [],
                    criteria: [
                        MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                            {
                                affiliations: [SquaddieAffiliation.ENEMY],
                            }
                        ),
                    ],
                })
            }).toThrow(
                "[MissionObjectiveService.new]: rewards must have at least 1 reward"
            )
        })

        it("Throws error when criteria array is empty", () => {
            expect(() => {
                MissionObjectiveService.new({
                    id: "test",
                    rewards: [
                        MissionObjectiveRewardService.newPlayMovieReward(
                            "dialogue"
                        ),
                    ],
                    criteria: [],
                })
            }).toThrow(
                "[MissionObjectiveService.new]: criteria must have at least 1 criterion"
            )
        })

        it("Defaults hidden to undefined when not provided", () => {
            const objective = MissionObjectiveService.new({
                id: "test",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward(
                        "dialogue"
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

            expect(objective.hidden).toBeUndefined()
        })

        it("Can create with hidden explicitly set to true", () => {
            const objective = MissionObjectiveService.new({
                id: "test",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward(
                        "dialogue"
                    ),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
                hidden: true,
            })

            expect(objective.hidden).toBe(true)
        })

        it("Clones arrays to prevent external mutation", () => {
            const rewards = [
                MissionObjectiveRewardService.newPlayMovieReward("dialogue1"),
            ]
            const criteria = [
                MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {
                        affiliations: [SquaddieAffiliation.ENEMY],
                    }
                ),
            ]

            const objective = MissionObjectiveService.new({
                id: "test",
                rewards,
                criteria,
            })

            rewards.push(
                MissionObjectiveRewardService.newPlayMovieReward("dialogue2")
            )
            criteria.push(
                MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {
                        outOfBattleSquaddieIds: ["boss"],
                    }
                )
            )

            expect(objective.rewards).toHaveLength(1)
            expect(objective.criteria).toHaveLength(1)
        })
    })

    describe("JSON Creation Tests", () => {
        it("Can create objective from JSON", () => {
            const objective = MissionObjectiveService.createFromJSON({
                id: "defeat_enemies",
                rewards: [
                    {
                        type: MissionObjectiveRewardType.PLAY_MOVIE,
                        movieId: "victory",
                    },
                ],
                criteria: [
                    {
                        type: MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED,
                        affiliations: [SquaddieAffiliation.ENEMY],
                    },
                ],
            })

            expect(objective.id).toBe("defeat_enemies")
            expect(objective.rewards).toHaveLength(1)
            expect(objective.criteria).toHaveLength(1)
            expect(objective.hasGivenReward).toBe(false)
        })

        it("Can create with multiple rewards and criteria from JSON", () => {
            const objective = MissionObjectiveService.createFromJSON({
                id: "complex",
                rewards: [
                    {
                        type: MissionObjectiveRewardType.PLAY_MOVIE,
                        movieId: "dialogue1",
                    },
                    {
                        type: MissionObjectiveRewardType.NEXT_MISSIONS,
                        missionIds: ["mission2"],
                    },
                ],
                criteria: [
                    {
                        type: MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED,
                        affiliations: [SquaddieAffiliation.ENEMY],
                    },
                    {
                        type: MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED,
                        outOfBattleSquaddieIds: ["boss"],
                    },
                ],
            })

            expect(objective.rewards).toHaveLength(2)
            expect(objective.criteria).toHaveLength(2)
        })

        it("Correctly deserializes rewards using MissionObjectiveRewardService", () => {
            const objective = MissionObjectiveService.createFromJSON({
                id: "test",
                rewards: [
                    {
                        type: MissionObjectiveRewardType.PLAY_MOVIE,
                        movieId: "victory",
                    },
                ],
                criteria: [
                    {
                        type: MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED,
                        affiliations: [SquaddieAffiliation.ENEMY],
                    },
                ],
            })

            expect(objective.rewards[0].type).toBe(
                MissionObjectiveRewardType.PLAY_MOVIE
            )
            if (
                objective.rewards[0].type ===
                MissionObjectiveRewardType.PLAY_MOVIE
            ) {
                expect(objective.rewards[0].movieId).toBe("victory")
            }
        })

        it("Preserves hidden flag through serialize/createFromJSON round-trip", () => {
            const original = MissionObjectiveService.new({
                id: "hidden_objective",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward("victory"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
                hidden: true,
            })

            const serialized = MissionObjectiveService.serialize(original)
            const restored = MissionObjectiveService.createFromJSON(
                JSON.parse(JSON.stringify(serialized))
            )

            expect(restored.hidden).toBe(true)
        })

        it("Correctly deserializes criteria using MissionObjectiveCriteriaService", () => {
            const objective = MissionObjectiveService.createFromJSON({
                id: "test",
                rewards: [
                    {
                        type: MissionObjectiveRewardType.PLAY_MOVIE,
                        movieId: "victory",
                    },
                ],
                criteria: [
                    {
                        type: MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED,
                        affiliations: [SquaddieAffiliation.ENEMY],
                    },
                ],
            })

            expect(objective.criteria[0].type).toBe(
                MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED
            )
            if (
                objective.criteria[0].type ===
                MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED
            ) {
                expect(
                    objective.criteria[0].affiliations?.has(
                        SquaddieAffiliation.ENEMY
                    )
                ).toBe(true)
            }
        })
    })

    describe("Completion Check Tests", () => {
        beforeEach(() => {
            manager.outOfBattleSquaddieManager!.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "enemy1",
                    name: "Enemy 1",
                    actionIds: [],
                    attributeSheetId: "test sheet",
                    affiliation: SquaddieAffiliation.ENEMY,
                })
            )
            manager.outOfBattleSquaddieManager!.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "boss",
                    name: "Boss",
                    actionIds: [],
                    attributeSheetId: "test sheet",
                    affiliation: SquaddieAffiliation.ENEMY,
                })
            )

            manager.createNewSquaddie({ outOfBattleSquaddieId: "enemy1" })
            manager.createNewSquaddie({ outOfBattleSquaddieId: "boss" })
        })

        it("Returns true when all criteria are satisfied", () => {
            const objective = MissionObjectiveService.new({
                id: "defeat_enemies",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward("victory"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            manager.dealDamageToSquaddie({
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "enemy1",
                damage: {
                    amount: 10,
                    type: AttributeScore.BODY,
                },
            })
            manager.dealDamageToSquaddie({
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "boss",
                damage: {
                    amount: 10,
                    type: AttributeScore.BODY,
                },
            })

            expect(MissionObjectiveService.isComplete(objective, manager)).toBe(
                true
            )
        })

        it("Returns false when some criteria not satisfied", () => {
            const objective = MissionObjectiveService.new({
                id: "defeat_all",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward("victory"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            manager.dealDamageToSquaddie({
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "enemy1",
                damage: {
                    amount: 10,
                    type: AttributeScore.BODY,
                },
            })

            expect(MissionObjectiveService.isComplete(objective, manager)).toBe(
                false
            )
        })

        it("Returns false when no criteria satisfied", () => {
            const objective = MissionObjectiveService.new({
                id: "defeat_enemies",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward("victory"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            expect(MissionObjectiveService.isComplete(objective, manager)).toBe(
                false
            )
        })

        it("Works with multiple criteria (AND logic)", () => {
            const objective = MissionObjectiveService.new({
                id: "complex",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward("victory"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            outOfBattleSquaddieIds: ["boss"],
                        }
                    ),
                ],
            })

            manager.dealDamageToSquaddie({
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "enemy1",
                damage: {
                    amount: 10,
                    type: AttributeScore.BODY,
                },
            })

            expect(MissionObjectiveService.isComplete(objective, manager)).toBe(
                false
            )

            manager.dealDamageToSquaddie({
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "boss",
                damage: {
                    amount: 10,
                    type: AttributeScore.BODY,
                },
            })

            expect(MissionObjectiveService.isComplete(objective, manager)).toBe(
                true
            )
        })
    })

    describe("markRewardAsGiven Tests", () => {
        it("Creates new object with hasGivenReward set to true", () => {
            const original = MissionObjectiveService.new({
                id: "test",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward(
                        "dialogue"
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

            const updated = MissionObjectiveService.markRewardAsGiven(original)

            expect(updated.hasGivenReward).toBe(true)
            expect(updated.id).toBe(original.id)
            expect(updated.rewards).toHaveLength(original.rewards.length)
            expect(updated.criteria).toHaveLength(original.criteria.length)
        })

        it("Does not mutate original objective", () => {
            const original = MissionObjectiveService.new({
                id: "test",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward(
                        "dialogue"
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

            MissionObjectiveService.markRewardAsGiven(original)

            expect(original.hasGivenReward).toBe(false)
        })

        it("Deep clones arrays", () => {
            const original = MissionObjectiveService.new({
                id: "test",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward(
                        "dialogue"
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

            const updated = MissionObjectiveService.markRewardAsGiven(original)

            expect(updated.rewards).not.toBe(original.rewards)
            expect(updated.criteria).not.toBe(original.criteria)
        })
    })

    describe("getCompletedObjectivesWithoutReward Tests", () => {
        let completedObjective: MissionObjective
        let incompletedObjective: MissionObjective
        let completedWithRewardObjective: MissionObjective

        beforeEach(() => {
            manager.outOfBattleSquaddieManager!.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "enemy1",
                    name: "Enemy 1",
                    actionIds: [],
                    attributeSheetId: "test sheet",
                    affiliation: SquaddieAffiliation.ENEMY,
                })
            )
            manager.outOfBattleSquaddieManager!.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "ally1",
                    name: "Ally 1",
                    actionIds: [],
                    attributeSheetId: "test sheet",
                    affiliation: SquaddieAffiliation.ALLY,
                })
            )

            manager.createNewSquaddie({ outOfBattleSquaddieId: "enemy1" })
            manager.createNewSquaddie({ outOfBattleSquaddieId: "ally1" })

            completedObjective = MissionObjectiveService.new({
                id: "completed",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward("victory"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            incompletedObjective = MissionObjectiveService.new({
                id: "incompleted",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward(
                        "defeat_ally"
                    ),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ALLY],
                        }
                    ),
                ],
            })

            completedWithRewardObjective = MissionObjectiveService.new({
                id: "completed_with_reward",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward(
                        "already_given"
                    ),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
                hasGivenReward: true,
            })

            manager.dealDamageToSquaddie({
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "enemy1",
                damage: {
                    amount: 10,
                    type: AttributeScore.BODY,
                },
            })
        })

        it("Returns objectives that are complete but haven't given rewards", () => {
            const objectives = [
                completedObjective,
                incompletedObjective,
                completedWithRewardObjective,
            ]

            const ready =
                MissionObjectiveService.getCompletedObjectivesWithoutReward(
                    objectives,
                    manager
                )

            expect(ready).toHaveLength(1)
            expect(ready[0].id).toBe("completed")
        })

        it("Excludes objectives that already gave rewards", () => {
            const objectives = [
                completedObjective,
                completedWithRewardObjective,
            ]

            const ready =
                MissionObjectiveService.getCompletedObjectivesWithoutReward(
                    objectives,
                    manager
                )

            expect(ready).toHaveLength(1)
            expect(ready[0].id).toBe("completed")
        })

        it("Excludes objectives that are not complete", () => {
            const objectives = [completedObjective, incompletedObjective]

            const ready =
                MissionObjectiveService.getCompletedObjectivesWithoutReward(
                    objectives,
                    manager
                )

            expect(ready).toHaveLength(1)
            expect(ready[0].id).toBe("completed")
        })

        it("Works with multiple objectives", () => {
            const anotherCompleted = MissionObjectiveService.new({
                id: "another_completed",
                rewards: [
                    MissionObjectiveRewardService.newPlayMovieReward("another"),
                ],
                criteria: [
                    MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                        {
                            affiliations: [SquaddieAffiliation.ENEMY],
                        }
                    ),
                ],
            })

            const objectives = [
                completedObjective,
                incompletedObjective,
                completedWithRewardObjective,
                anotherCompleted,
            ]

            const ready =
                MissionObjectiveService.getCompletedObjectivesWithoutReward(
                    objectives,
                    manager
                )

            expect(ready).toHaveLength(2)
            let objectiveIds = ready.map((o) => o.id)
            expect(objectiveIds).toContain("completed")
            expect(objectiveIds).toContain("another_completed")
        })
    })
})
