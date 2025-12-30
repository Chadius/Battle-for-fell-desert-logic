import { beforeEach, describe, expect, it } from "vitest"
import { InBattleSquaddieManager } from "../squaddie/inBattle/inBattleSquaddieManager"
import {
    type OutOfBattleSquaddieAttributeSheet,
    OutOfBattleSquaddieAttributeSheetService,
} from "../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheet"
import {
    type OutOfBattleSquaddie,
    OutOfBattleSquaddieService,
} from "../squaddie/outOfBattle/outOfBattleSquaddie"
import {
    type InBattleSquaddieCollection,
    InBattleSquaddieCollectionService,
} from "../squaddie/inBattle/inBattleSquaddieCollection"
import { OutOfBattleSquaddieManager } from "../squaddie/outOfBattle/outOfBattleSquaddieManager"
import { OutOfBattleSquaddieCollectionService } from "../squaddie/outOfBattle/outOfBattleSquaddieCollection"
import { OutOfBattleSquaddieAttributeSheetCollectionService } from "../squaddie/outOfBattle/outOfBattleSquaddieAttributeSheetCollection"
import { AttributeScore } from "../proficiency/attributeScore"
import { SquaddieAffiliation } from "../squaddie/outOfBattle/affiliation"
import {
    CoordinateMapAStarAdapter,
    type CoordinateMapSearchLimits,
} from "./coordinateMapAStarAdapter"
import {
    SquaddieConditionService,
    SquaddieConditionType,
} from "../proficiency/squaddieCondition"
import { type CoordinateMap, CoordinateMapService } from "./coordinateMap"
import { AStarSearchService } from "../aStarSearch/aStarSearch"
import { type CoordinateMovePath, CoordinateMovePathService } from "./path/path"
import type { AStarGraph } from "../aStarSearch/aStarGraph"
import { CoordinatePathMapService } from "./mapTransposition/coordinatePathMap"
import type { OffsetCoordinate } from "./offsetCoordinate"

describe("coordinateMapAStarAdapter", () => {
    let manager: InBattleSquaddieManager
    let attributeSheet: OutOfBattleSquaddieAttributeSheet
    let noAffiliationOutOfBattleSquaddie0: OutOfBattleSquaddie
    let inBattleSquaddieCollection: InBattleSquaddieCollection
    let outOfBattleSquaddieManager: OutOfBattleSquaddieManager

    beforeEach(() => {
        outOfBattleSquaddieManager = new OutOfBattleSquaddieManager(
            OutOfBattleSquaddieCollectionService.new(),
            OutOfBattleSquaddieAttributeSheetCollectionService.new()
        )
        attributeSheet = OutOfBattleSquaddieAttributeSheetService.new({
            id: "test sheet",
            movement: {
                distancePerAction: 4,
                skipOverPits: true,
                moveThroughWalls: true,
                stopOnSquaddies: false,
            },
            attributeScores: {
                [AttributeScore.BODY]: 1,
                [AttributeScore.MIND]: 2,
                [AttributeScore.SOUL]: 3,
            },
        })
        outOfBattleSquaddieManager.addOrUpdateAttributeSheet(attributeSheet)

        noAffiliationOutOfBattleSquaddie0 = OutOfBattleSquaddieService.new({
            id: "noAffiliation",
            name: "noAffiliation",
            actionIds: ["endTurn"],
            attributeSheetId: "test sheet",
            affiliation: SquaddieAffiliation.NONE,
        })

        outOfBattleSquaddieManager.addOrUpdateSquaddie(
            noAffiliationOutOfBattleSquaddie0
        )

        inBattleSquaddieCollection = InBattleSquaddieCollectionService.new()
        manager = new InBattleSquaddieManager(
            inBattleSquaddieCollection,
            outOfBattleSquaddieManager
        )
    })

    describe("can make search parameters from a squaddie", () => {
        let inBattleSquaddie00Id: {
            inBattleSquaddieId: number
            outOfBattleSquaddieId: string
        }

        describe("get map search limits from a squaddie", () => {
            beforeEach(() => {
                inBattleSquaddie00Id = manager.createNewSquaddie({
                    outOfBattleSquaddieId: noAffiliationOutOfBattleSquaddie0.id,
                })
            })
            it("can make search parameters from a squaddie", () => {
                const movementInfo =
                    CoordinateMapAStarAdapter.getCoordinateMapSearchLimitsFromSquaddie(
                        {
                            manager,
                            ...inBattleSquaddie00Id,
                        }
                    )
                expect(movementInfo).toEqual({
                    maximumMoveCost:
                        attributeSheet.movement.distancePerAction * 3,
                    skipOverPits: attributeSheet.movement.skipOverPits,
                    moveThroughWalls: attributeSheet.movement.moveThroughWalls,
                    stopOnSquaddies: attributeSheet.movement.stopOnSquaddies,
                    reduceMoveCosts: false,
                    squaddieId: {
                        ...inBattleSquaddie00Id,
                        affiliation: SquaddieAffiliation.NONE,
                    },
                })
            })
            it("will use the HUSTLE condition to minimize movement costs", () => {
                manager.addConditionsToSquaddie({
                    ...inBattleSquaddie00Id,
                    conditions: [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.HUSTLE,
                            amount: 1,
                            duration: 1,
                        }),
                    ],
                })
                const movementInfo =
                    CoordinateMapAStarAdapter.getCoordinateMapSearchLimitsFromSquaddie(
                        {
                            manager,
                            ...inBattleSquaddie00Id,
                        }
                    )
                expect(movementInfo).toEqual(
                    expect.objectContaining({
                        maximumMoveCost:
                            attributeSheet.movement.distancePerAction * 3,
                        skipOverPits: attributeSheet.movement.skipOverPits,
                        moveThroughWalls:
                            attributeSheet.movement.moveThroughWalls,
                        stopOnSquaddies:
                            attributeSheet.movement.stopOnSquaddies,
                        reduceMoveCosts: true,
                    })
                )
            })
        })
    })

    describe("Movement limits", () => {
        let map: CoordinateMap
        let graph: CoordinateMapAStarAdapter
        beforeEach(() => {
            map = CoordinateMapService.new({
                id: "map",
                name: "map",
                movementProperties: ["1 1 1 1 1 "],
            })
        })
        it("can reach destination with unlimited movement", () => {
            graph = new CoordinateMapAStarAdapter({ map: map })
            const path = AStarSearchService.search<
                OffsetCoordinate,
                CoordinateMovePath,
                AStarGraph<OffsetCoordinate, CoordinateMovePath>
            >({
                start: {
                    row: 0,
                    col: 0,
                },
                graph: graph,
                stopCondition: (c: OffsetCoordinate) =>
                    c.row == 0 && c.col == 4,
            })
            expect(path).toBeDefined()
            expect(CoordinateMovePathService.getEndCoordinate(path!)).toEqual(
                expect.objectContaining({
                    row: 0,
                    col: 4,
                })
            )
            expect(CoordinateMovePathService.getTotalMoveCost(path!)).toEqual(4)
        })
        it("will not reach destination with limited movement", () => {
            graph = new CoordinateMapAStarAdapter({
                map: map,
                searchLimits: {
                    maximumMoveCost: 2,
                },
            })
            const path = AStarSearchService.search<
                OffsetCoordinate,
                CoordinateMovePath,
                AStarGraph<OffsetCoordinate, CoordinateMovePath>
            >({
                start: {
                    row: 0,
                    col: 0,
                },
                graph: graph,
                stopCondition: (c: OffsetCoordinate) =>
                    c.row == 0 && c.col == 4,
            })
            expect(path).toBeUndefined()
            expect(
                CoordinatePathMapService.getPath({
                    coordinatePathMap: graph.coordinatePathMap,
                    row: 0,
                    col: 2,
                })
            ).toBeDefined()
        })
        describe("terrain types", () => {
            describe("High terrain cost", () => {
                it("cannot reach destination because the terrain cost is too high", () => {
                    const mapWithDoubleCostTerrain = CoordinateMapService.new({
                        id: "map",
                        name: "map",
                        movementProperties: ["1 2 2 1 1 "],
                    })
                    graph = new CoordinateMapAStarAdapter({
                        map: mapWithDoubleCostTerrain,
                        searchLimits: {
                            maximumMoveCost: 3,
                        },
                    })
                    const path = AStarSearchService.search<
                        OffsetCoordinate,
                        CoordinateMovePath,
                        AStarGraph<OffsetCoordinate, CoordinateMovePath>
                    >({
                        start: {
                            row: 0,
                            col: 0,
                        },
                        graph: graph,
                        stopCondition: (c: OffsetCoordinate) =>
                            c.row == 0 && c.col == 2,
                    })
                    expect(path).toBeUndefined()
                })
                it("can set search limits to reduce terrain movement costs", () => {
                    const mapWithDoubleCostTerrain = CoordinateMapService.new({
                        id: "map",
                        name: "map",
                        movementProperties: ["1 2 2 1 1 "],
                    })
                    graph = new CoordinateMapAStarAdapter({
                        map: mapWithDoubleCostTerrain,
                        searchLimits: {
                            maximumMoveCost: 3,
                            reduceMoveCosts: true,
                        },
                    })
                    const path = AStarSearchService.search<
                        OffsetCoordinate,
                        CoordinateMovePath,
                        AStarGraph<OffsetCoordinate, CoordinateMovePath>
                    >({
                        start: {
                            row: 0,
                            col: 0,
                        },
                        graph: graph,
                        stopCondition: (c: OffsetCoordinate) =>
                            c.row == 0 && c.col == 2,
                    })
                    expect(path).toBeDefined()
                })
            })

            describe("Pits", () => {
                let mapWithAPit: CoordinateMap
                beforeEach(() => {
                    mapWithAPit = CoordinateMapService.new({
                        id: "map",
                        name: "map",
                        movementProperties: ["1 - - 1 1 "],
                    })
                })
                it("if the squaddie cannot skip over pits the route may be impossible", () => {
                    const graphWithoutPitSkip = new CoordinateMapAStarAdapter({
                        map: mapWithAPit,
                        searchLimits: {
                            maximumMoveCost: 9001,
                        },
                    })
                    const pathWithoutPitSkip = AStarSearchService.search<
                        OffsetCoordinate,
                        CoordinateMovePath,
                        AStarGraph<OffsetCoordinate, CoordinateMovePath>
                    >({
                        start: {
                            row: 0,
                            col: 0,
                        },
                        graph: graphWithoutPitSkip,
                        stopCondition: (c: OffsetCoordinate) =>
                            c.row == 0 && c.col == 4,
                    })
                    expect(pathWithoutPitSkip).toBeUndefined()
                })
                it("will reach the destination because the squaddie can skip over pits", () => {
                    const graphWithPitSkip = new CoordinateMapAStarAdapter({
                        map: mapWithAPit,
                        searchLimits: {
                            maximumMoveCost: 9001,
                            skipOverPits: true,
                        },
                    })
                    const pathWithPitSkip = AStarSearchService.search<
                        OffsetCoordinate,
                        CoordinateMovePath,
                        AStarGraph<OffsetCoordinate, CoordinateMovePath>
                    >({
                        start: {
                            row: 0,
                            col: 0,
                        },
                        graph: graphWithPitSkip,
                        stopCondition: (c: OffsetCoordinate) =>
                            c.row == 0 && c.col == 4,
                    })
                    expect(pathWithPitSkip).toBeDefined()
                })
                it("cannot stop on a pit", () => {
                    const graphWithPitSkip = new CoordinateMapAStarAdapter({
                        map: mapWithAPit,
                        searchLimits: {
                            maximumMoveCost: 9001,
                            skipOverPits: true,
                        },
                    })
                    const pathWithPitSkip = AStarSearchService.search<
                        OffsetCoordinate,
                        CoordinateMovePath,
                        AStarGraph<OffsetCoordinate, CoordinateMovePath>
                    >({
                        start: {
                            row: 0,
                            col: 0,
                        },
                        graph: graphWithPitSkip,
                        stopCondition: (c: OffsetCoordinate) =>
                            c.row == 0 && c.col == 2,
                    })
                    expect(pathWithPitSkip).toBeUndefined()
                    expect(
                        CoordinatePathMapService.getPath({
                            coordinatePathMap:
                                graphWithPitSkip.coordinatePathMap,
                            row: 0,
                            col: 1,
                        })
                    ).toBeUndefined()
                })
            })

            describe("Walls", () => {
                let mapWithAWall: CoordinateMap
                beforeEach(() => {
                    mapWithAWall = CoordinateMapService.new({
                        id: "map",
                        name: "map",
                        movementProperties: ["1 x x 1 1 "],
                    })
                })
                it("if the squaddie cannot move through walls the route may be impossible", () => {
                    const graphWithoutWallSkip = new CoordinateMapAStarAdapter({
                        map: mapWithAWall,
                        searchLimits: {
                            maximumMoveCost: 9001,
                        },
                    })
                    const pathWithoutWallSkip = AStarSearchService.search<
                        OffsetCoordinate,
                        CoordinateMovePath,
                        AStarGraph<OffsetCoordinate, CoordinateMovePath>
                    >({
                        start: {
                            row: 0,
                            col: 0,
                        },
                        graph: graphWithoutWallSkip,
                        stopCondition: (c: OffsetCoordinate) =>
                            c.row == 0 && c.col == 4,
                    })
                    expect(pathWithoutWallSkip).toBeUndefined()
                })
                it("will reach the destination because the squaddie can move through walls", () => {
                    const graphWithWallSkip = new CoordinateMapAStarAdapter({
                        map: mapWithAWall,
                        searchLimits: {
                            maximumMoveCost: 9001,
                            moveThroughWalls: true,
                        },
                    })
                    const pathWithWallSkip = AStarSearchService.search<
                        OffsetCoordinate,
                        CoordinateMovePath,
                        AStarGraph<OffsetCoordinate, CoordinateMovePath>
                    >({
                        start: {
                            row: 0,
                            col: 0,
                        },
                        graph: graphWithWallSkip,
                        stopCondition: (c: OffsetCoordinate) =>
                            c.row == 0 && c.col == 4,
                    })
                    expect(pathWithWallSkip).toBeDefined()
                })
                it("cannot stop in a wall", () => {
                    const graphWithWallSkip = new CoordinateMapAStarAdapter({
                        map: mapWithAWall,
                        searchLimits: {
                            maximumMoveCost: 9001,
                            moveThroughWalls: true,
                        },
                    })
                    const pathWithWallSkip = AStarSearchService.search<
                        OffsetCoordinate,
                        CoordinateMovePath,
                        AStarGraph<OffsetCoordinate, CoordinateMovePath>
                    >({
                        start: {
                            row: 0,
                            col: 0,
                        },
                        graph: graphWithWallSkip,
                        stopCondition: (c: OffsetCoordinate) =>
                            c.row == 0 && c.col == 2,
                    })
                    expect(pathWithWallSkip).toBeUndefined()
                    expect(
                        CoordinatePathMapService.getPath({
                            coordinatePathMap:
                                graphWithWallSkip.coordinatePathMap,
                            row: 0,
                            col: 1,
                        })
                    ).toBeUndefined()
                })
            })
        })

        describe("Other Squaddies", () => {
            beforeEach(() => {
                map = CoordinateMapService.new({
                    id: "map",
                    name: "map",
                    movementProperties: ["1 1 1 1 1 "],
                })

                outOfBattleSquaddieManager.addOrUpdateSquaddie(
                    OutOfBattleSquaddieService.new({
                        id: "player",
                        name: "player",
                        actionIds: ["endTurn"],
                        attributeSheetId: "test sheet",
                        affiliation: SquaddieAffiliation.PLAYER,
                    })
                )

                outOfBattleSquaddieManager.addOrUpdateSquaddie(
                    OutOfBattleSquaddieService.new({
                        id: "ally",
                        name: "ally",
                        actionIds: ["endTurn"],
                        attributeSheetId: "test sheet",
                        affiliation: SquaddieAffiliation.ALLY,
                    })
                )

                outOfBattleSquaddieManager.addOrUpdateSquaddie(
                    OutOfBattleSquaddieService.new({
                        id: "enemy",
                        name: "enemy",
                        actionIds: ["endTurn"],
                        attributeSheetId: "test sheet",
                        affiliation: SquaddieAffiliation.ENEMY,
                    })
                )
            })
            it("squaddie does not block itself", () => {
                const noAffiliation0Id = manager.createNewSquaddie({
                    outOfBattleSquaddieId: noAffiliationOutOfBattleSquaddie0.id,
                })
                map = CoordinateMapService.addSquaddie({
                    map,
                    squaddieId: noAffiliation0Id,
                    coordinate: {
                        row: 0,
                        col: 0,
                    },
                })
                const searchLimits =
                    CoordinateMapAStarAdapter.getCoordinateMapSearchLimitsFromSquaddie(
                        {
                            manager,
                            ...noAffiliation0Id,
                        }
                    )

                graph = new CoordinateMapAStarAdapter({
                    map: map,
                    searchLimits: searchLimits,
                })
                const path = AStarSearchService.search<
                    OffsetCoordinate,
                    CoordinateMovePath,
                    AStarGraph<OffsetCoordinate, CoordinateMovePath>
                >({
                    start: {
                        row: 0,
                        col: 0,
                    },
                    graph: graph,
                    stopCondition: (c: OffsetCoordinate) =>
                        c.row == 0 && c.col == 3,
                })
                expect(path).toBeDefined()
            })
            it("another squaddie of unfriendly affiliation will block", () => {
                const enemySquaddieId = manager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy",
                })
                map = CoordinateMapService.addSquaddie({
                    map,
                    squaddieId: enemySquaddieId,
                    coordinate: {
                        row: 0,
                        col: 0,
                    },
                })

                const playerSquaddieId = manager.createNewSquaddie({
                    outOfBattleSquaddieId: "player",
                })
                map = CoordinateMapService.addSquaddie({
                    map,
                    squaddieId: playerSquaddieId,
                    coordinate: {
                        row: 0,
                        col: 2,
                    },
                })
                const searchLimits =
                    CoordinateMapAStarAdapter.getCoordinateMapSearchLimitsFromSquaddie(
                        {
                            manager,
                            ...enemySquaddieId,
                        }
                    )

                graph = new CoordinateMapAStarAdapter({
                    map: map,
                    searchLimits: searchLimits,
                    inBattleSquaddieManager: manager,
                })
                const path = AStarSearchService.search<
                    OffsetCoordinate,
                    CoordinateMovePath,
                    AStarGraph<OffsetCoordinate, CoordinateMovePath>
                >({
                    start: {
                        row: 0,
                        col: 0,
                    },
                    graph: graph,
                    stopCondition: (c: OffsetCoordinate) =>
                        c.row == 0 && c.col == 3,
                })
                expect(path).toBeUndefined()
            })
            it("ELUSIVE condition will allow squaddies of unfriendly affiliations to pass through", () => {
                const enemySquaddieId = manager.createNewSquaddie({
                    outOfBattleSquaddieId: "enemy",
                })
                manager.addConditionsToSquaddie({
                    ...enemySquaddieId,
                    conditions: [
                        SquaddieConditionService.new({
                            type: SquaddieConditionType.ELUSIVE,
                            amount: 1,
                            duration: 1,
                        }),
                    ],
                })
                map = CoordinateMapService.addSquaddie({
                    map,
                    squaddieId: enemySquaddieId,
                    coordinate: {
                        row: 0,
                        col: 0,
                    },
                })

                const playerSquaddieId = manager.createNewSquaddie({
                    outOfBattleSquaddieId: "player",
                })
                map = CoordinateMapService.addSquaddie({
                    map,
                    squaddieId: playerSquaddieId,
                    coordinate: {
                        row: 0,
                        col: 2,
                    },
                })
                const searchLimits =
                    CoordinateMapAStarAdapter.getCoordinateMapSearchLimitsFromSquaddie(
                        {
                            manager,
                            ...enemySquaddieId,
                        }
                    )

                graph = new CoordinateMapAStarAdapter({
                    map: map,
                    searchLimits: searchLimits,
                    inBattleSquaddieManager: manager,
                })
                const path = AStarSearchService.search<
                    OffsetCoordinate,
                    CoordinateMovePath,
                    AStarGraph<OffsetCoordinate, CoordinateMovePath>
                >({
                    start: {
                        row: 0,
                        col: 0,
                    },
                    graph: graph,
                    stopCondition: (c: OffsetCoordinate) =>
                        c.row == 0 && c.col == 3,
                })
                expect(path).toBeDefined()
            })
            it("you can pass through but not stop on another squaddie", () => {
                const allySquaddieId = manager.createNewSquaddie({
                    outOfBattleSquaddieId: "ally",
                })
                map = CoordinateMapService.addSquaddie({
                    map,
                    squaddieId: allySquaddieId,
                    coordinate: {
                        row: 0,
                        col: 0,
                    },
                })

                const playerSquaddieId = manager.createNewSquaddie({
                    outOfBattleSquaddieId: "player",
                })
                map = CoordinateMapService.addSquaddie({
                    map,
                    squaddieId: playerSquaddieId,
                    coordinate: {
                        row: 0,
                        col: 2,
                    },
                })
                const searchLimits =
                    CoordinateMapAStarAdapter.getCoordinateMapSearchLimitsFromSquaddie(
                        {
                            manager,
                            ...allySquaddieId,
                        }
                    )

                graph = new CoordinateMapAStarAdapter({
                    map: map,
                    searchLimits: searchLimits,
                    inBattleSquaddieManager: manager,
                })
                const path = AStarSearchService.search<
                    OffsetCoordinate,
                    CoordinateMovePath,
                    AStarGraph<OffsetCoordinate, CoordinateMovePath>
                >({
                    start: {
                        row: 0,
                        col: 0,
                    },
                    graph: graph,
                    stopCondition: (c: OffsetCoordinate) =>
                        c.row == 0 && c.col == 3,
                })
                expect(path).toBeDefined()
                expect(
                    CoordinatePathMapService.getPath({
                        coordinatePathMap: graph.coordinatePathMap,
                        row: 0,
                        col: 2,
                    })
                ).toBeUndefined()
            })
            it("squaddie limits can allow you to stop on squaddies", () => {
                const allySquaddieId = manager.createNewSquaddie({
                    outOfBattleSquaddieId: "ally",
                })
                map = CoordinateMapService.addSquaddie({
                    map,
                    squaddieId: allySquaddieId,
                    coordinate: {
                        row: 0,
                        col: 0,
                    },
                })

                const playerSquaddieId = manager.createNewSquaddie({
                    outOfBattleSquaddieId: "player",
                })
                map = CoordinateMapService.addSquaddie({
                    map,
                    squaddieId: playerSquaddieId,
                    coordinate: {
                        row: 0,
                        col: 2,
                    },
                })
                const searchLimits: CoordinateMapSearchLimits = {
                    stopOnSquaddies: true,
                    maximumMoveCost: 9001,
                }

                graph = new CoordinateMapAStarAdapter({
                    map: map,
                    searchLimits: searchLimits,
                    inBattleSquaddieManager: manager,
                })
                const path = AStarSearchService.search<
                    OffsetCoordinate,
                    CoordinateMovePath,
                    AStarGraph<OffsetCoordinate, CoordinateMovePath>
                >({
                    start: {
                        row: 0,
                        col: 0,
                    },
                    graph: graph,
                    stopCondition: (c: OffsetCoordinate) =>
                        c.row == 0 && c.col == 3,
                })
                expect(path).toBeDefined()
                expect(
                    CoordinatePathMapService.getPath({
                        coordinatePathMap: graph.coordinatePathMap,
                        row: 0,
                        col: 2,
                    })
                ).toBeDefined()
            })
        })
    })
})
