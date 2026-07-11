import { beforeEach, describe, expect, it } from "vitest"
import {
    MissionObjectiveCriteriaService,
    MissionObjectiveCriteriaType,
} from "./missionObjectiveCriteria.js"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager.js"
import { OutOfBattleSquaddieService } from "../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { InBattleSquaddieCollectionService } from "../squaddie/inBattle/inBattleSquaddieCollection.js"
import {
    SquaddieAffiliation,
    type TSquaddieAffiliation,
} from "../affiliation/affiliation.js"
import { AttributeScore } from "../proficiency/attributeScore.js"
import {
    ProficiencyLevel,
    ProficiencyType,
} from "../proficiency/proficiencyLevel.js"
import { SquaddieIdConverterService } from "../squaddie/idConverterService.js"
import { OutOfBattleSquaddieTestSetup } from "../testUtils/outOfBattleSquaddieTestSetup.js"

describe("Mission Objective Criteria", () => {
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
        it("Can create criteria with only affiliations filter", () => {
            const criteria =
                MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {
                        affiliations: [SquaddieAffiliation.ENEMY],
                    }
                )

            expect(criteria.type).toBe(
                MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED
            )
            expect(criteria.affiliations).toBeInstanceOf(Set)
            expect(criteria.affiliations?.has(SquaddieAffiliation.ENEMY)).toBe(
                true
            )
            expect(criteria.outOfBattleSquaddieIds).toBeUndefined()
            expect(criteria.battleSquaddieIds).toBeUndefined()
        })

        it("Can create criteria with only outOfBattleSquaddieIds filter", () => {
            const criteria =
                MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {
                        outOfBattleSquaddieIds: ["soldier"],
                    }
                )

            expect(criteria.type).toBe(
                MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED
            )
            expect(criteria.outOfBattleSquaddieIds).toBeInstanceOf(Set)
            expect(criteria.outOfBattleSquaddieIds?.has("soldier")).toBe(true)
            expect(criteria.affiliations).toBeUndefined()
            expect(criteria.battleSquaddieIds).toBeUndefined()
        })

        it("Can create criteria with only battleSquaddieIds filter", () => {
            const criteria =
                MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {
                        battleSquaddieIds: [
                            {
                                inBattleSquaddieId: 0,
                                outOfBattleSquaddieId: "King Betrayer",
                            },
                        ],
                    }
                )

            expect(criteria.type).toBe(
                MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED
            )
            expect(criteria.battleSquaddieIds).toBeInstanceOf(Set)
            expect(
                criteria.battleSquaddieIds?.has(
                    SquaddieIdConverterService.squaddieIdToKey({
                        inBattleSquaddieId: 0,
                        outOfBattleSquaddieId: "King Betrayer",
                    })
                )
            ).toBe(true)
            expect(criteria.affiliations).toBeUndefined()
            expect(criteria.outOfBattleSquaddieIds).toBeUndefined()
        })

        it("Can create criteria with multiple filters combined", () => {
            const criteria =
                MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {
                        affiliations: [SquaddieAffiliation.ENEMY],
                        outOfBattleSquaddieIds: ["soldier"],
                    }
                )

            expect(criteria.affiliations?.has(SquaddieAffiliation.ENEMY)).toBe(
                true
            )
            expect(criteria.outOfBattleSquaddieIds?.has("soldier")).toBe(true)
        })

        it("Throws error when no filters provided", () => {
            expect(() => {
                MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {}
                )
            }).toThrow(
                "[MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria]: at least one filter must be provided"
            )
        })

        it("Clones arrays to prevent external mutation", () => {
            const affiliations: TSquaddieAffiliation[] = [
                SquaddieAffiliation.ENEMY,
            ]
            const outOfBattleIds = ["soldier"]
            const criteria =
                MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {
                        affiliations,
                        outOfBattleSquaddieIds: outOfBattleIds,
                    }
                )

            affiliations.push(SquaddieAffiliation.PLAYER)
            outOfBattleIds.push("knight")

            expect(criteria.affiliations?.size).toBe(1)
            expect(criteria.outOfBattleSquaddieIds?.size).toBe(1)
        })
    })

    describe("JSON Creation Tests", () => {
        it("Can create criteria from JSON with affiliations", () => {
            const criteria = MissionObjectiveCriteriaService.createFromJSON({
                type: MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED,
                affiliations: [SquaddieAffiliation.ENEMY],
            })

            expect(criteria.type).toBe(
                MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED
            )
            if (
                criteria.type ===
                MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED
            ) {
                expect(
                    criteria.affiliations?.has(SquaddieAffiliation.ENEMY)
                ).toBe(true)
            }
        })

        it("Can create criteria from JSON with outOfBattleSquaddieIds", () => {
            const criteria = MissionObjectiveCriteriaService.createFromJSON({
                type: MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED,
                outOfBattleSquaddieIds: ["soldier", "knight"],
            })

            expect(criteria.type).toBe(
                MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED
            )
            if (
                criteria.type ===
                MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED
            ) {
                expect(criteria.outOfBattleSquaddieIds?.has("soldier")).toBe(
                    true
                )
                expect(criteria.outOfBattleSquaddieIds?.has("knight")).toBe(
                    true
                )
            }
        })

        it("Can create criteria from JSON with battleSquaddieIds", () => {
            const criteria = MissionObjectiveCriteriaService.createFromJSON({
                type: MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED,
                battleSquaddieIds: [
                    {
                        inBattleSquaddieId: 0,
                        outOfBattleSquaddieId: "King Betrayer",
                    },
                ],
            })

            expect(criteria.type).toBe(
                MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED
            )
            if (
                criteria.type ===
                MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED
            ) {
                expect(
                    criteria.battleSquaddieIds?.has(
                        SquaddieIdConverterService.squaddieIdToKey({
                            inBattleSquaddieId: 0,
                            outOfBattleSquaddieId: "King Betrayer",
                        })
                    )
                ).toBe(true)
            }
        })

        it("Can create criteria from JSON with multiple filters", () => {
            const criteria = MissionObjectiveCriteriaService.createFromJSON({
                type: MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED,
                affiliations: [SquaddieAffiliation.ENEMY],
                outOfBattleSquaddieIds: ["soldier"],
            })

            expect(criteria.type).toBe(
                MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED
            )
            if (
                criteria.type ===
                MissionObjectiveCriteriaType.ALL_SQUADDIES_DEFEATED
            ) {
                expect(
                    criteria.affiliations?.has(SquaddieAffiliation.ENEMY)
                ).toBe(true)
                expect(criteria.outOfBattleSquaddieIds?.has("soldier")).toBe(
                    true
                )
            }
        })

        it("Throws error for invalid criteria type", () => {
            expect(() => {
                MissionObjectiveCriteriaService.createFromJSON({
                    type: "INVALID_TYPE",
                })
            }).toThrow(
                "[MissionObjectiveCriteriaService.createFromJSON]: invalid criteria type: INVALID_TYPE"
            )
        })
    })

    describe("Satisfaction Check Tests - Affiliation Filter", () => {
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
                    id: "enemy2",
                    name: "Enemy 2",
                    actionIds: [],
                    attributeSheetId: "test sheet",
                    affiliation: SquaddieAffiliation.ENEMY,
                })
            )
            manager.outOfBattleSquaddieManager!.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "player1",
                    name: "Player 1",
                    actionIds: [],
                    attributeSheetId: "test sheet",
                    affiliation: SquaddieAffiliation.PLAYER,
                })
            )

            manager.createNewSquaddie({ outOfBattleSquaddieId: "enemy1" })
            manager.createNewSquaddie({ outOfBattleSquaddieId: "enemy2" })
            manager.createNewSquaddie({ outOfBattleSquaddieId: "player1" })
        })

        it("Returns true when all enemies are defeated", () => {
            const criteria =
                MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {
                        affiliations: [SquaddieAffiliation.ENEMY],
                    }
                )

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
                outOfBattleSquaddieId: "enemy2",
                damage: {
                    amount: 10,
                    type: AttributeScore.BODY,
                },
            })

            const satisfied = MissionObjectiveCriteriaService.isSatisfied(
                criteria,
                manager
            )
            expect(satisfied).toBe(true)
        })

        it("Returns false when some enemies are not defeated", () => {
            const criteria =
                MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {
                        affiliations: [SquaddieAffiliation.ENEMY],
                    }
                )

            manager.dealDamageToSquaddie({
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "enemy1",
                damage: {
                    amount: 10,
                    type: AttributeScore.BODY,
                },
            })

            const satisfied = MissionObjectiveCriteriaService.isSatisfied(
                criteria,
                manager
            )
            expect(satisfied).toBe(false)
        })

        it("Returns false when no enemies exist", () => {
            const emptyManager = new InBattleSquaddieManager(
                InBattleSquaddieCollectionService.new(),
                manager.outOfBattleSquaddieManager!
            )

            const criteria =
                MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {
                        affiliations: [SquaddieAffiliation.ENEMY],
                    }
                )

            const satisfied = MissionObjectiveCriteriaService.isSatisfied(
                criteria,
                emptyManager
            )
            expect(satisfied).toBe(false)
        })

        it("Works with multiple affiliations in filter", () => {
            const criteria =
                MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {
                        affiliations: [
                            SquaddieAffiliation.ENEMY,
                            SquaddieAffiliation.PLAYER,
                        ],
                    }
                )

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
                outOfBattleSquaddieId: "enemy2",
                damage: {
                    amount: 10,
                    type: AttributeScore.BODY,
                },
            })

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager)
            ).toBe(false)

            manager.dealDamageToSquaddie({
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "player1",
                damage: {
                    amount: 10,
                    type: AttributeScore.BODY,
                },
            })

            const satisfied = MissionObjectiveCriteriaService.isSatisfied(
                criteria,
                manager
            )
            expect(satisfied).toBe(true)
        })
    })

    describe("Satisfaction Check Tests - OutOfBattleSquaddieId Filter", () => {
        beforeEach(() => {
            manager.outOfBattleSquaddieManager!.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "soldier",
                    name: "Soldier",
                    actionIds: [],
                    attributeSheetId: "test sheet",
                    affiliation: SquaddieAffiliation.ENEMY,
                })
            )
            manager.outOfBattleSquaddieManager!.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "knight",
                    name: "Knight",
                    actionIds: [],
                    attributeSheetId: "test sheet",
                    affiliation: SquaddieAffiliation.PLAYER,
                })
            )

            manager.createNewSquaddie({ outOfBattleSquaddieId: "soldier" })
            manager.createNewSquaddie({ outOfBattleSquaddieId: "soldier" })
            manager.createNewSquaddie({ outOfBattleSquaddieId: "knight" })
        })

        it("Returns true when all soldiers are defeated", () => {
            const criteria =
                MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {
                        outOfBattleSquaddieIds: ["soldier"],
                    }
                )

            manager.dealDamageToSquaddie({
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "soldier",
                damage: {
                    amount: 10,
                    type: AttributeScore.BODY,
                },
            })
            manager.dealDamageToSquaddie({
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "soldier",
                damage: {
                    amount: 10,
                    type: AttributeScore.BODY,
                },
            })

            const satisfied = MissionObjectiveCriteriaService.isSatisfied(
                criteria,
                manager
            )
            expect(satisfied).toBe(true)
        })

        it("Returns false when some soldiers are not defeated", () => {
            const criteria =
                MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {
                        outOfBattleSquaddieIds: ["soldier"],
                    }
                )

            manager.dealDamageToSquaddie({
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "soldier",
                damage: {
                    amount: 10,
                    type: AttributeScore.BODY,
                },
            })

            const satisfied = MissionObjectiveCriteriaService.isSatisfied(
                criteria,
                manager
            )
            expect(satisfied).toBe(false)
        })

        it("Works with multiple outOfBattleSquaddieIds", () => {
            const criteria =
                MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {
                        outOfBattleSquaddieIds: ["soldier", "knight"],
                    }
                )

            manager.dealDamageToSquaddie({
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "soldier",
                damage: {
                    amount: 10,
                    type: AttributeScore.BODY,
                },
            })
            manager.dealDamageToSquaddie({
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "soldier",
                damage: {
                    amount: 10,
                    type: AttributeScore.BODY,
                },
            })

            expect(
                MissionObjectiveCriteriaService.isSatisfied(criteria, manager)
            ).toBe(false)

            manager.dealDamageToSquaddie({
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "knight",
                damage: {
                    amount: 10,
                    type: AttributeScore.BODY,
                },
            })

            const satisfied = MissionObjectiveCriteriaService.isSatisfied(
                criteria,
                manager
            )
            expect(satisfied).toBe(true)
        })
    })

    describe("Satisfaction Check Tests - BattleSquaddieId Filter", () => {
        beforeEach(() => {
            manager.outOfBattleSquaddieManager!.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "King Betrayer",
                    name: "King Betrayer",
                    actionIds: [],
                    attributeSheetId: "test sheet",
                    affiliation: SquaddieAffiliation.NONE,
                })
            )

            manager.createNewSquaddie({
                outOfBattleSquaddieId: "King Betrayer",
            })
            manager.createNewSquaddie({
                outOfBattleSquaddieId: "King Betrayer",
            })
        })

        it("Returns true when specific squaddie is defeated", () => {
            const criteria =
                MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {
                        battleSquaddieIds: [
                            {
                                inBattleSquaddieId: 0,
                                outOfBattleSquaddieId: "King Betrayer",
                            },
                        ],
                    }
                )

            manager.dealDamageToSquaddie({
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "King Betrayer",
                damage: {
                    amount: 10,
                    type: AttributeScore.BODY,
                },
            })

            const satisfied = MissionObjectiveCriteriaService.isSatisfied(
                criteria,
                manager
            )
            expect(satisfied).toBe(true)
        })

        it("Returns false when specific squaddie is not defeated", () => {
            const criteria =
                MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {
                        battleSquaddieIds: [
                            {
                                inBattleSquaddieId: 0,
                                outOfBattleSquaddieId: "King Betrayer",
                            },
                        ],
                    }
                )

            const satisfied = MissionObjectiveCriteriaService.isSatisfied(
                criteria,
                manager
            )
            expect(satisfied).toBe(false)
        })

        it("Matches exact combination of inBattleSquaddieId and outOfBattleSquaddieId", () => {
            const criteria =
                MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {
                        battleSquaddieIds: [
                            {
                                inBattleSquaddieId: 0,
                                outOfBattleSquaddieId: "King Betrayer",
                            },
                        ],
                    }
                )

            manager.dealDamageToSquaddie({
                inBattleSquaddieId: 1,
                outOfBattleSquaddieId: "King Betrayer",
                damage: {
                    amount: 10,
                    type: AttributeScore.BODY,
                },
            })

            const satisfied = MissionObjectiveCriteriaService.isSatisfied(
                criteria,
                manager
            )
            expect(satisfied).toBe(false)
        })
    })

    describe("Satisfaction Check Tests - Combined Filters (AND Logic)", () => {
        beforeEach(() => {
            manager.outOfBattleSquaddieManager!.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "soldier",
                    name: "Soldier",
                    actionIds: [],
                    attributeSheetId: "test sheet",
                    affiliation: SquaddieAffiliation.ENEMY,
                })
            )
            manager.outOfBattleSquaddieManager!.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "knight",
                    name: "Knight",
                    actionIds: [],
                    attributeSheetId: "test sheet",
                    affiliation: SquaddieAffiliation.PLAYER,
                })
            )
            manager.outOfBattleSquaddieManager!.addOrUpdateSquaddie(
                OutOfBattleSquaddieService.new({
                    id: "King Betrayer",
                    name: "King Betrayer",
                    actionIds: [],
                    attributeSheetId: "test sheet",
                    affiliation: SquaddieAffiliation.NONE,
                })
            )

            manager.createNewSquaddie({ outOfBattleSquaddieId: "soldier" })
            manager.createNewSquaddie({ outOfBattleSquaddieId: "knight" })
            manager.createNewSquaddie({
                outOfBattleSquaddieId: "King Betrayer",
            })
        })

        it("Returns true when all enemy soldiers are defeated", () => {
            const criteria =
                MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {
                        affiliations: [SquaddieAffiliation.ENEMY],
                        outOfBattleSquaddieIds: ["soldier"],
                    }
                )

            manager.dealDamageToSquaddie({
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "soldier",
                damage: {
                    amount: 10,
                    type: AttributeScore.BODY,
                },
            })

            const satisfied = MissionObjectiveCriteriaService.isSatisfied(
                criteria,
                manager
            )
            expect(satisfied).toBe(true)
        })

        it("Only counts squaddies matching ALL filters", () => {
            const criteria =
                MissionObjectiveCriteriaService.newAllSquaddiesDefeatedCriteria(
                    {
                        affiliations: [SquaddieAffiliation.ENEMY],
                        outOfBattleSquaddieIds: ["soldier"],
                    }
                )

            manager.dealDamageToSquaddie({
                inBattleSquaddieId: 0,
                outOfBattleSquaddieId: "knight",
                damage: {
                    amount: 10,
                    type: AttributeScore.BODY,
                },
            })

            const satisfied = MissionObjectiveCriteriaService.isSatisfied(
                criteria,
                manager
            )
            expect(satisfied).toBe(false)
        })
    })
})
