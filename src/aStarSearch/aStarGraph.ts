export interface AStarGraph<T, U> {
    getNeighbors: (node: T) => T[]

    createPath: (node: T) => U
    extendPath: ({
        path,
        neighbor,
        moveCost,
    }: {
        path: U
        neighbor: T
        moveCost: number
    }) => U

    canMoveTo: ({
        from,
        to,
        cost,
        totalCost,
    }: {
        from: T
        to: T
        cost: number
        totalCost: number
    }) => boolean

    getMovementCost: (coordinate: T) => number | undefined

    generateNodeKey: (node: T) => string

    compareNodes: (
        a: { node: T; cost: number; path: U },
        b: { node: T; cost: number; path: U }
    ) => number

    isPathValidToStop: ({
        currentNode,
        path,
    }: {
        currentNode: T
        path: U
    }) => boolean

    postProcess: ({ path }: { path: U | undefined }) => void
}
