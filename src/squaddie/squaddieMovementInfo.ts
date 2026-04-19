export interface SquaddieMovementSpecialTraversalInfo {
    minimumRange?: number
    maximumRange?: number
    actionPointsOfMovement?: number
}

export interface SquaddieMovementInfo {
    movementPointsPerAction: number
    skipOverPits: boolean
    moveThroughWalls: boolean
    stopOnSquaddies: boolean
    reduceMoveCosts: boolean
    squaddieMovementSpecialTraversalInfo?: SquaddieMovementSpecialTraversalInfo
}
