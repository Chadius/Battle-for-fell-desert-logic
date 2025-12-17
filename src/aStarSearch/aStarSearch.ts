import type { AStarGraph } from "./aStarGraph.ts"
import { PriorityQueue } from "../priorityQueue/priorityQueue.ts"

export const AStarSearchService = {
    search: <T, U, Graph extends AStarGraph<T, U>>({
        start,
        graph,
        stopCondition,
    }: {
        start: T
        graph: Graph
        stopCondition: (node: T) => boolean
    }): U | undefined => {
        const visited = new Set<string>()
        const openSet = new PriorityQueue<{ node: T; cost: number; path: U }>(
            (
                a: { node: T; cost: number; path: U },
                b: { node: T; cost: number; path: U }
            ) => graph.compareNodes(a, b)
        )

        openSet.enqueue({
            node: start,
            cost: 0,
            path: graph.createPath(start),
        })

        while (!openSet.isEmpty()) {
            const current = openSet.dequeue()
            if (!current) break

            const { node, cost, path } = current

            if (stopCondition(node)) {
                return path
            }

            const nodeKey = graph.generateNodeKey(node)
            if (visited.has(nodeKey)) continue
            visited.add(nodeKey)

            const neighbors = graph.getNeighbors(node)
            for (const neighbor of neighbors) {
                const neighborKey = graph.generateNodeKey(neighbor)
                if (visited.has(neighborKey)) continue

                const moveCost = graph.getMovementCost(neighbor)
                if (moveCost == undefined) continue

                if (
                    !graph.canMoveTo({
                        from: node,
                        to: neighbor,
                        totalCost: cost + moveCost,
                        cost: moveCost,
                    })
                ) {
                    continue
                }

                const newCost = cost + moveCost

                const newPath: U = graph.extendPath({
                    path,
                    neighbor,
                    moveCost,
                })

                openSet.enqueue({
                    node: neighbor,
                    cost: newCost,
                    path: newPath,
                })
            }
        }

        return undefined
    },
}
