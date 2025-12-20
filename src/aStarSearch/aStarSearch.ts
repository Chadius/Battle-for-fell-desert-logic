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

            processNeighborsForNode({
                node,
                cost,
                path,
                visited,
                openSet,
                graph,
            })
        }

        return undefined
    },
}

const processNeighborsForNode = <T, U>({
    node,
    cost,
    path,
    visited,
    openSet,
    graph,
}: {
    node: T
    cost: number
    path: U
    visited: Set<string>
    openSet: PriorityQueue<{ node: T; cost: number; path: U }>
    graph: AStarGraph<T, U>
}): void => {
    const neighbors = graph.getNeighbors(node)
    for (const neighbor of neighbors) {
        if (
            !shouldProcessNeighbor({
                neighbor,
                currentNode: node,
                currentCost: cost,
                visited,
                graph,
            })
        ) {
            continue
        }

        enqueueNeighborNode({
            neighbor,
            currentCost: cost,
            currentPath: path,
            openSet,
            graph,
        })
    }
}

const shouldProcessNeighbor = <T>({
    neighbor,
    currentNode,
    currentCost,
    visited,
    graph,
}: {
    neighbor: T
    currentNode: T
    currentCost: number
    visited: Set<string>
    graph: AStarGraph<T, any>
}): boolean => {
    const neighborKey = graph.generateNodeKey(neighbor)
    if (visited.has(neighborKey)) return false

    const moveCost = graph.getMovementCost(neighbor)
    if (moveCost == undefined) return false

    return graph.canMoveTo({
        from: currentNode,
        to: neighbor,
        totalCost: currentCost + moveCost,
        cost: moveCost,
    })
}

const enqueueNeighborNode = <T, U>({
    neighbor,
    currentCost,
    currentPath,
    openSet,
    graph,
}: {
    neighbor: T
    currentCost: number
    currentPath: U
    openSet: PriorityQueue<{ node: T; cost: number; path: U }>
    graph: AStarGraph<T, U>
}): void => {
    const moveCost = graph.getMovementCost(neighbor)!
    const newCost = currentCost + moveCost

    const newPath: U = graph.extendPath({
        path: currentPath,
        neighbor,
        moveCost,
    })

    openSet.enqueue({
        node: neighbor,
        cost: newCost,
        path: newPath,
    })
}
