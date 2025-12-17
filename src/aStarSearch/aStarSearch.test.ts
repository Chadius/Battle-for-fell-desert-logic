import { beforeEach, describe, expect, it } from "vitest"
import {
    type CoordinateMap,
    CoordinateMapService,
    type OffsetCoordinate,
} from "../coordinateMap/coordinateMap.ts"
import type { AStarGraph } from "./aStarGraph.ts"
import { AStarSearchService } from "./aStarSearch.ts"
import {
    type CoordinateMovementInstruction,
    type CoordinateMovePath,
    CoordinateMovePathService,
} from "../coordinateMap/path/path.ts"
import { CoordinateMapAStarAdapter } from "../coordinateMap/coordinateMapAStarAdapter.ts"
import { CoordinatePathMapService } from "../coordinateMap/mapTransposition/coordinatePathMap.ts"

describe("A* Search", () => {
    let graph: CoordinateMapAStarAdapter

    describe("Simple path test", () => {
        beforeEach(() => {
            const map = CoordinateMapService.new({
                id: "map",
                name: "map",
                movementProperties: ["1 x 1 ", " x x x ", "1 1 1 "],
            })
            graph = new CoordinateMapAStarAdapter(map)
        })

        it("finds path from start to goal", () => {
            const path = AStarSearchService.search<
                OffsetCoordinate,
                CoordinateMovePath,
                AStarGraph<OffsetCoordinate, CoordinateMovePath>
            >({
                start: {
                    row: 2,
                    col: 0,
                },
                graph,
                stopCondition: (c: OffsetCoordinate) =>
                    c.row == 2 && c.col == 2,
            })
            expect(path).toBeDefined()
            const instructions: CoordinateMovementInstruction[] =
                CoordinateMovePathService.getMovementInstructions(path!)
            expect(instructions).toHaveLength(4)
            expect(instructions[0].start).toEqual(
                expect.objectContaining({
                    row: 2,
                    col: 0,
                })
            )
            expect(instructions[1].start).toEqual(
                expect.objectContaining({
                    row: 2,
                    col: 0,
                })
            )
            expect(instructions[2].start).toEqual(
                expect.objectContaining({
                    row: 2,
                    col: 1,
                })
            )
            expect(instructions[3].start).toEqual(
                expect.objectContaining({
                    row: 2,
                    col: 2,
                })
            )
            expect(CoordinateMovePathService.getTotalMoveCost(path!)).toEqual(2)
        })
    })

    describe("Movement limits", () => {
        let map: CoordinateMap
        beforeEach(() => {
            map = CoordinateMapService.new({
                id: "map",
                name: "map",
                movementProperties: ["1 1 1 1 1 "],
            })
        })
        it("can reach destination with unlimited movement", () => {
            graph = new CoordinateMapAStarAdapter(map)
            const path = AStarSearchService.search<
                OffsetCoordinate,
                CoordinateMovePath,
                AStarGraph<OffsetCoordinate, CoordinateMovePath>
            >({
                start: {
                    row: 0,
                    col: 0,
                },
                graph,
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
            graph = new CoordinateMapAStarAdapter(map, {
                maximumMoveCost: 2,
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
                graph,
                stopCondition: (c: OffsetCoordinate) =>
                    c.row == 0 && c.col == 4,
            })
            expect(path).toBeUndefined()
            CoordinatePathMapService.getPath({
                coordinatePathMap: graph.coordinatePathMap,
                row: 0,
                col: 2,
            })
        })
    })
})
