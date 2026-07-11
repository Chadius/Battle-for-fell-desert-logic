import { beforeEach, describe, expect, it } from "vitest"
import {
    type SquaddieAction,
    MovementEffectType,
    SquaddieActionService,
} from "../../squaddieAction.js"
import { SquaddieActionManager } from "../../squaddieActionManager.js"
import {
    type OutOfBattleSquaddie,
    OutOfBattleSquaddieService,
} from "../../../squaddie/outOfBattle/outOfBattleSquaddie.js"
import { InBattleSquaddieManager } from "../../../squaddie/inBattle/inBattleSquaddieManager.js"
import {
    type InBattleSquaddieCollection,
    InBattleSquaddieCollectionService,
} from "../../../squaddie/inBattle/inBattleSquaddieCollection.js"
import { AttributeScore } from "../../../proficiency/attributeScore.js"
import {
    ProficiencyLevel,
    ProficiencyType,
} from "../../../proficiency/proficiencyLevel.js"
import { SquaddieActionCollectionService } from "../../squaddieActionCollection.js"
import { ActionRange } from "../../actionRange.js"
import { CoordinateGeneratorShape } from "../../../coordinateMap/shape.js"
import { DegreeOfSuccess } from "../../../degreesOfSuccess/degreeOfSuccess.js"
import {
    SquaddieConditionDecaysAt,
    SquaddieConditionService,
    SquaddieConditionSource,
    SquaddieConditionType,
} from "../../../proficiency/squaddieCondition.js"
import { ApplyResultService } from "../../apply/applyResultService.js"
import { CoordinateMapCollectionManager } from "../../../coordinateMap/coordinateMapManager.js"
import { CoordinateMapCollectionService } from "../../../coordinateMap/coordinateMapCollection.js"
import { CoordinateMapService } from "../../../coordinateMap/coordinateMap.js"
import { CoordinateMovePathService } from "../../../coordinateMap/path/path.js"
import { SquaddieActionResultCalculator } from "../../calculate/result/squaddieActionResultCalculator.js"
import type { SquaddieActionResult } from "../../calculate/result/squaddieActionResult.js"
import { SquaddieAffiliation } from "../../../affiliation/affiliation.js"
import { OutOfBattleSquaddieTestSetup } from "../../../testUtils/outOfBattleSquaddieTestSetup.js"
import type { OutOfBattleSquaddieManager } from "../../../squaddie/outOfBattle/outOfBattleSquaddieManager.js"

describe("Squaddie resolves actions on themself", () => {
    let endTurnAction: SquaddieAction
    let raiseShieldAction: SquaddieAction
    let actionManager: SquaddieActionManager

    let outOfBattleSquaddie: OutOfBattleSquaddie
    let outOfBattleSquaddieManager: OutOfBattleSquaddieManager
    let outOfBattleSquaddieId: string

    let inBattleSquaddieManager: InBattleSquaddieManager
    let inBattleSquaddieCollection: InBattleSquaddieCollection
    let inBattleSquaddieId: number

    beforeEach(() => {
        const outOfBattleSquaddieManagerResult =
            OutOfBattleSquaddieTestSetup.createManagerWithTestAttributeSheet({
                sheetId: "soldier",
                attributeSheetOptions: {
                    distancePerAction: 2,
                    maxHitPoints: 5,
                    attributeScores: {
                        [AttributeScore.BODY]: 5,
                        [AttributeScore.MIND]: 7,
                        [AttributeScore.SOUL]: 3,
                    },
                    proficiencyLevels: {
                        [ProficiencyType.DEFEND_BODY]: ProficiencyLevel.NOVICE,
                        [ProficiencyType.SKILL_BODY]: ProficiencyLevel.EXPERT,
                    },
                    rank: 3,
                },
            })
        outOfBattleSquaddieManager = outOfBattleSquaddieManagerResult.manager

        outOfBattleSquaddieId = "soldier"
        outOfBattleSquaddie = OutOfBattleSquaddieService.new({
            id: outOfBattleSquaddieId,
            name: "Soldier",
            actionIds: ["endTurn"],
            attributeSheetId: "soldier",
            affiliation: SquaddieAffiliation.PLAYER,
        })
        outOfBattleSquaddieManager.addOrUpdateSquaddie(outOfBattleSquaddie)

        inBattleSquaddieCollection = InBattleSquaddieCollectionService.new()
        inBattleSquaddieManager = new InBattleSquaddieManager(
            inBattleSquaddieCollection,
            outOfBattleSquaddieManager
        )
        ;({ inBattleSquaddieId } = inBattleSquaddieManager.createNewSquaddie({
            outOfBattleSquaddieId,
        }))

        actionManager = new SquaddieActionManager(
            SquaddieActionCollectionService.new()
        )
        endTurnAction = SquaddieActionService.new({
            id: "endTurn",
            name: "End Turn",
            proficiency: ProficiencyType.UNKNOWN,
            targeting: {
                range: ActionRange.SELF,
                shape: CoordinateGeneratorShape.BLOOM,
                affiliationRelationship: {
                    self: true,
                    friend: false,
                    foe: false,
                },
            },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    actionPoints: {
                        spent: "all",
                    },
                },
            },
        })
        actionManager.addOrUpdate(endTurnAction)
        raiseShieldAction = SquaddieActionService.new({
            id: "raiseShield",
            name: "Raise Shield",
            proficiency: ProficiencyType.UNKNOWN,
            targeting: {
                range: ActionRange.SELF,
                shape: CoordinateGeneratorShape.BLOOM,
                affiliationRelationship: {
                    self: true,
                    friend: false,
                    foe: false,
                },
            },
            effectOnActor: {
                [DegreeOfSuccess.SUCCESS]: {
                    conditions: {
                        add: [
                            SquaddieConditionService.new({
                                type: SquaddieConditionType.ARMOR,
                                amount: { amount: 1 },
                                duration: {
                                    duration: 1,
                                    decaysAt:
                                        SquaddieConditionDecaysAt.TURN_END,
                                },
                                source: SquaddieConditionSource.PHYSICAL,
                            }),
                            SquaddieConditionService.new({
                                type: SquaddieConditionType.ARMOR,
                                amount: { amount: 1 },
                                duration: {
                                    duration: 1,
                                    decaysAt:
                                        SquaddieConditionDecaysAt.TURN_END,
                                },
                                source: SquaddieConditionSource.PHYSICAL,
                            }),
                        ],
                    },
                },
            },
        })
        actionManager.addOrUpdate(raiseShieldAction)
    })

    it("will calculate removing all actions when squaddie uses End Turn without actually changing squaddie", () => {
        const startingActionPoints = inBattleSquaddieManager.getActionPoints({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
        }).current

        const results = SquaddieActionResultCalculator.calculateResult({
            degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            managers: {
                inBattleSquaddieManager,
                squaddieActionManager: actionManager,
            },
            actor: {
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            },
            targets: [
                {
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                },
            ],
            action: {
                id: endTurnAction.id,
            },
        })

        expect(results).toHaveLength(1)
        expect(results[0]).toEqual(
            expect.objectContaining({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
                actionPoints: {
                    spent: 3,
                },
            })
        )

        expect(
            inBattleSquaddieManager.getActionPoints({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            }).current
        ).toEqual(startingActionPoints)
    })

    it("will apply removing all actions when squaddie uses End Turn without actually changing squaddie", () => {
        const results = SquaddieActionResultCalculator.calculateResult({
            degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            managers: {
                inBattleSquaddieManager,
                squaddieActionManager: actionManager,
            },
            actor: {
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            },
            targets: [
                {
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                },
            ],
            action: {
                id: endTurnAction.id,
            },
        })

        ApplyResultService.applyResultsToSquaddies({
            inBattleSquaddieManager,
            results,
        })

        expect(
            inBattleSquaddieManager.getActionPoints({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            }).current
        ).toEqual(0)
    })

    it("can add conditions", () => {
        const results = SquaddieActionResultCalculator.calculateResult({
            degreeOfSuccess: DegreeOfSuccess.SUCCESS,
            managers: {
                inBattleSquaddieManager,
                squaddieActionManager: actionManager,
            },
            actor: {
                inBattleSquaddieId,
                outOfBattleSquaddieId,
            },
            targets: [
                {
                    inBattleSquaddieId,
                    outOfBattleSquaddieId,
                },
            ],
            action: {
                id: raiseShieldAction.id,
            },
        })

        expect(results[0]).toEqual({
            inBattleSquaddieId,
            outOfBattleSquaddieId,
            conditionsAdded: [
                SquaddieConditionService.new({
                    type: SquaddieConditionType.ARMOR,
                    amount: { amount: 1 },
                    duration: {
                        duration: 1,
                        decaysAt: SquaddieConditionDecaysAt.TURN_END,
                    },
                    source: SquaddieConditionSource.PHYSICAL,
                }),
            ],
        })

        expect(
            inBattleSquaddieManager.calculateConditionAmountForSquaddie({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
                conditionType: SquaddieConditionType.ARMOR,
            })
        ).toEqual(0)

        ApplyResultService.applyResultsToSquaddies({
            inBattleSquaddieManager,
            results,
        })

        expect(
            inBattleSquaddieManager.calculateConditionAmountForSquaddie({
                inBattleSquaddieId,
                outOfBattleSquaddieId,
                conditionType: SquaddieConditionType.ARMOR,
            })
        ).toEqual(1)
    })

    describe("Simple Movement on a map", () => {
        let moveAction: SquaddieAction
        let mapManager: CoordinateMapCollectionManager

        beforeEach(() => {
            moveAction = SquaddieActionService.new({
                id: "move",
                name: "Move",
                effectOnActor: {
                    [DegreeOfSuccess.SUCCESS]: {
                        actionPoints: {
                            spent: 0,
                            additional: {
                                movementPathActionPointCost: true,
                            },
                        },
                        movement: {
                            movementType: MovementEffectType.ACTOR_CHOSEN,
                        },
                    },
                },
            })
            actionManager.addOrUpdate(moveAction)

            let mapCollection = CoordinateMapCollectionService.new()
            mapCollection = CoordinateMapCollectionService.addOrUpdate({
                collection: mapCollection,
                map: CoordinateMapService.new({
                    id: "map",
                    name: "map",
                    movementProperties: ["1 1 1 1 1 1 1 1 1 1 "],
                }),
            })
            mapManager = new CoordinateMapCollectionManager(mapCollection)
            mapManager.addSquaddie({
                mapId: "map",
                squaddieId: {
                    inBattleSquaddieId: inBattleSquaddieId,
                    outOfBattleSquaddieId: outOfBattleSquaddieId,
                },
                coordinate: { row: 0, col: 0 },
            })
        })

        it("normalizes path tile cost by movementPerAction to get action point cost", () => {
            const longMoveResults =
                SquaddieActionResultCalculator.calculateResult({
                    degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager: actionManager,
                        coordinateMapCollectionManager: mapManager,
                    },
                    actor: { inBattleSquaddieId, outOfBattleSquaddieId },
                    targets: [],
                    map: { mapId: "map" },
                    action: {
                        id: moveAction.id,
                        decisions: {
                            targetDestination: { row: 0, col: 4 },
                        },
                    },
                })

            const resultWithMovement = longMoveResults.find(
                (r) => r.movement != undefined
            )

            expect(resultWithMovement!.actionPoints!.spent).toEqual(2)
        })

        describe("Generate and apply results", () => {
            let results: SquaddieActionResult[]

            beforeEach(() => {
                results = SquaddieActionResultCalculator.calculateResult({
                    degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    managers: {
                        inBattleSquaddieManager,
                        squaddieActionManager: actionManager,
                        coordinateMapCollectionManager: mapManager,
                    },
                    actor: {
                        inBattleSquaddieId,
                        outOfBattleSquaddieId,
                    },
                    targets: [],
                    map: {
                        mapId: "map",
                    },
                    action: {
                        id: moveAction.id,
                        decisions: {
                            targetDestination: {
                                row: 0,
                                col: 2,
                            },
                        },
                    },
                })
            })

            it("can generate a result to move", () => {
                const resultWithMovement = results.find(
                    (r) => r.movement != undefined
                )
                expect(resultWithMovement).toBeDefined()
                expect(
                    CoordinateMovePathService.getStartCoordinate(
                        resultWithMovement!.movement!.expectedPath
                    )
                ).toEqual(
                    expect.objectContaining({
                        row: 0,
                        col: 0,
                    })
                )
                expect(
                    CoordinateMovePathService.getEndCoordinate(
                        resultWithMovement!.movement!.expectedPath
                    )
                ).toEqual(
                    expect.objectContaining({
                        row: 0,
                        col: 2,
                    })
                )
            })

            describe("can apply results to move the squaddie", () => {
                beforeEach(() => {
                    ApplyResultService.applyResultsToSquaddies({
                        inBattleSquaddieManager,
                        results,
                        map: {
                            manager: mapManager,
                            mapId: "map",
                        },
                    })
                })
                it("will update the squaddie's position", () => {
                    expect(
                        CoordinateMapService.getSquaddieCoordinate({
                            map: mapManager.getMapById("map"),
                            squaddieId: {
                                inBattleSquaddieId: inBattleSquaddieId,
                                outOfBattleSquaddieId: outOfBattleSquaddieId,
                            },
                        })
                    ).toEqual(
                        expect.objectContaining({
                            row: 0,
                            col: 2,
                        })
                    )
                })

                it("will consume action points related to the movement cost", () => {
                    const resultWithMovement = results.find(
                        (r) => r.movement != undefined
                    )

                    let actionPointsSpentOnMovement =
                        inBattleSquaddieManager.calculateActionPointsForMovement(
                            {
                                inBattleSquaddieId,
                                outOfBattleSquaddieId,
                                movementCost:
                                    CoordinateMovePathService.getTotalMoveCost(
                                        resultWithMovement!.movement!
                                            .expectedPath
                                    ),
                            }
                        )

                    expect(
                        inBattleSquaddieManager.getActionPoints({
                            inBattleSquaddieId,
                            outOfBattleSquaddieId,
                        }).current
                    ).toEqual(3 - actionPointsSpentOnMovement)
                })
            })
        })
    })
})
